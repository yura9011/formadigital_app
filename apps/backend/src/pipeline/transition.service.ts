import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PipelineStage, ActorType, Client, StageTransition } from '@prisma/client';

export interface TransitionActor {
  type: ActorType;
  id?: string; // userId for USER, agentName for AGENT, null for SYSTEM
}

export interface TransitionResult {
  success: boolean;
  client: Client;
  transition: StageTransition;
}

/**
 * Valid transitions map - defines which stage transitions are allowed
 * Key: fromStage, Value: array of valid toStages
 */
const VALID_TRANSITIONS: Record<PipelineStage, PipelineStage[]> = {
  [PipelineStage.DISCOVERED]: [
    PipelineStage.ANALYZED,
    PipelineStage.DISCARDED,
  ],
  [PipelineStage.ANALYZED]: [
    PipelineStage.CONTACTED,
    PipelineStage.DISCARDED,
  ],
  [PipelineStage.CONTACTED]: [
    PipelineStage.RESPONDED,
    PipelineStage.DISCARDED,
  ],
  [PipelineStage.RESPONDED]: [
    PipelineStage.CONVERTED,
    PipelineStage.DISCARDED,
  ],
  [PipelineStage.CONVERTED]: [], // Terminal state - no transitions out
  [PipelineStage.DISCARDED]: [
    PipelineStage.DISCOVERED, // Revival
  ],
};

@Injectable()
export class TransitionService {
  private readonly logger = new Logger(TransitionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if a transition is valid
   */
  canTransition(from: PipelineStage, to: PipelineStage): boolean {
    const validTargets = VALID_TRANSITIONS[from] || [];
    return validTargets.includes(to);
  }

  /**
   * Get valid next stages for a given stage
   */
  getValidNextStages(from: PipelineStage): PipelineStage[] {
    return VALID_TRANSITIONS[from] || [];
  }

  /**
   * Execute a stage transition
   */
  async executeTransition(
    clientId: string,
    toStage: PipelineStage,
    actor: TransitionActor,
    reason?: string,
  ): Promise<TransitionResult> {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new BadRequestException(`Client not found: ${clientId}`);
    }

    const fromStage = client.stage;

    // Validate transition
    if (!this.canTransition(fromStage, toStage)) {
      throw new BadRequestException(
        `Invalid transition from ${fromStage} to ${toStage}. Valid targets: ${VALID_TRANSITIONS[fromStage].join(', ')}`,
      );
    }

    // Prepare update data
    const updateData: any = {
      stage: toStage,
    };

    // Handle special cases
    if (toStage === PipelineStage.DISCARDED) {
      updateData.discardedAt = new Date();
      updateData.discardReason = reason || null;
    } else if (toStage === PipelineStage.CONVERTED) {
      updateData.convertedAt = new Date();
      updateData.type = 'CLIENT';
    } else if (fromStage === PipelineStage.DISCARDED && toStage === PipelineStage.DISCOVERED) {
      // Revival
      updateData.revivedAt = new Date();
      updateData.discardedAt = null;
      updateData.discardReason = null;
    }

    // Execute in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Update client
      const updatedClient = await tx.client.update({
        where: { id: clientId },
        data: updateData,
      });

      // Create transition record
      const transition = await tx.stageTransition.create({
        data: {
          clientId,
          fromStage,
          toStage,
          reason,
          actorType: actor.type,
          actorId: actor.id,
        },
      });

      return { client: updatedClient, transition };
    });

    this.logger.log(
      `Transition: ${client.name} moved from ${fromStage} to ${toStage} by ${actor.type}${actor.id ? `:${actor.id}` : ''}`,
    );

    return {
      success: true,
      client: result.client,
      transition: result.transition,
    };
  }

  /**
   * Discard a lead with reason
   */
  async discardLead(
    clientId: string,
    actor: TransitionActor,
    reason: string,
  ): Promise<TransitionResult> {
    return this.executeTransition(clientId, PipelineStage.DISCARDED, actor, reason);
  }

  /**
   * Revive a discarded lead
   */
  async reviveLead(
    clientId: string,
    actor: TransitionActor,
    reason?: string,
  ): Promise<TransitionResult> {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new BadRequestException(`Client not found: ${clientId}`);
    }

    if (client.stage !== PipelineStage.DISCARDED) {
      throw new BadRequestException(
        `Cannot revive client that is not discarded. Current stage: ${client.stage}`,
      );
    }

    return this.executeTransition(
      clientId,
      PipelineStage.DISCOVERED,
      actor,
      reason || 'Revived from discarded',
    );
  }

  /**
   * Get transition history for a client
   */
  async getTransitionHistory(clientId: string): Promise<StageTransition[]> {
    return this.prisma.stageTransition.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Move lead to next logical stage (auto-advance)
   */
  async advanceToNextStage(
    clientId: string,
    actor: TransitionActor,
    reason?: string,
  ): Promise<TransitionResult> {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new BadRequestException(`Client not found: ${clientId}`);
    }

    const nextStages = this.getValidNextStages(client.stage);
    
    // Filter out DISCARDED for auto-advance
    const progressStages = nextStages.filter(s => s !== PipelineStage.DISCARDED);

    if (progressStages.length === 0) {
      throw new BadRequestException(
        `No valid progression from ${client.stage}. Lead may be in terminal state.`,
      );
    }

    // Take the first valid progression stage
    return this.executeTransition(clientId, progressStages[0], actor, reason);
  }
}
