import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PipelineStage, ActorType, Client, Project } from '@prisma/client';
import { TransitionService, TransitionActor } from './transition.service';

export interface ConversionInput {
  projectName: string;
  projectDetails?: string;
  assignedToId?: string;
}

export interface ConversionResult {
  success: boolean;
  client: Client;
  project: Project;
}

@Injectable()
export class ConversionService {
  private readonly logger = new Logger(ConversionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly transitionService: TransitionService,
  ) {}

  /**
   * Convert a lead to a client and create associated project
   */
  async convertLead(
    clientId: string,
    input: ConversionInput,
    actor: TransitionActor,
  ): Promise<ConversionResult> {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new NotFoundException(`Lead not found: ${clientId}`);
    }

    // Validate current stage allows conversion
    if (client.stage !== PipelineStage.RESPONDED) {
      throw new BadRequestException(
        `Cannot convert lead in stage ${client.stage}. Lead must be in RESPONDED stage.`,
      );
    }

    // Execute conversion in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Update client to CLIENT type and CONVERTED stage
      const updatedClient = await tx.client.update({
        where: { id: clientId },
        data: {
          type: 'CLIENT',
          stage: PipelineStage.CONVERTED,
          convertedAt: new Date(),
        },
      });

      // Create project
      const project = await tx.project.create({
        data: {
          name: input.projectName,
          clientId: clientId,
          status: 'PLANNING',
          assignedToId: input.assignedToId,
        },
      });

      // Create transition record
      await tx.stageTransition.create({
        data: {
          clientId,
          fromStage: PipelineStage.RESPONDED,
          toStage: PipelineStage.CONVERTED,
          reason: `Converted to client. Project: ${input.projectName}`,
          actorType: actor.type,
          actorId: actor.id,
        },
      });

      // If project details provided, create a note
      if (input.projectDetails) {
        await tx.clientNote.create({
          data: {
            clientId,
            content: `Detalles del proyecto: ${input.projectDetails}`,
          },
        });
      }

      return { client: updatedClient, project };
    });

    this.logger.log(
      `Lead ${client.name} converted to client. Project "${input.projectName}" created.`,
    );

    return {
      success: true,
      client: result.client,
      project: result.project,
    };
  }

  /**
   * Quick convert - for leads that can skip stages
   * Only allowed from ANALYZED or CONTACTED stages with admin override
   */
  async quickConvert(
    clientId: string,
    input: ConversionInput,
    actor: TransitionActor,
    skipValidation = false,
  ): Promise<ConversionResult> {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new NotFoundException(`Lead not found: ${clientId}`);
    }

    const allowedStages: PipelineStage[] = [
      PipelineStage.ANALYZED,
      PipelineStage.CONTACTED,
      PipelineStage.RESPONDED,
    ];

    if (!skipValidation && !(allowedStages as PipelineStage[]).includes(client.stage)) {
      throw new BadRequestException(
        `Cannot quick-convert lead in stage ${client.stage}. Allowed stages: ${allowedStages.join(', ')}`,
      );
    }

    // Execute conversion in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const updatedClient = await tx.client.update({
        where: { id: clientId },
        data: {
          type: 'CLIENT',
          stage: PipelineStage.CONVERTED,
          convertedAt: new Date(),
        },
      });

      const project = await tx.project.create({
        data: {
          name: input.projectName,
          clientId: clientId,
          status: 'PLANNING',
          assignedToId: input.assignedToId,
        },
      });

      await tx.stageTransition.create({
        data: {
          clientId,
          fromStage: client.stage,
          toStage: PipelineStage.CONVERTED,
          reason: `Quick conversion from ${client.stage}. Project: ${input.projectName}`,
          actorType: actor.type,
          actorId: actor.id,
        },
      });

      if (input.projectDetails) {
        await tx.clientNote.create({
          data: {
            clientId,
            content: `Detalles del proyecto: ${input.projectDetails}`,
          },
        });
      }

      return { client: updatedClient, project };
    });

    this.logger.log(
      `Lead ${client.name} quick-converted from ${client.stage}. Project "${input.projectName}" created.`,
    );

    return {
      success: true,
      client: result.client,
      project: result.project,
    };
  }

  /**
   * Get conversion statistics
   */
  async getConversionStats(): Promise<{
    totalConverted: number;
    thisMonth: number;
    thisWeek: number;
    averageTimeToConvert: number;
  }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const [totalConverted, thisMonth, thisWeek] = await Promise.all([
      this.prisma.client.count({ where: { type: 'CLIENT' } }),
      this.prisma.client.count({
        where: {
          type: 'CLIENT',
          convertedAt: { gte: startOfMonth },
        },
      }),
      this.prisma.client.count({
        where: {
          type: 'CLIENT',
          convertedAt: { gte: startOfWeek },
        },
      }),
    ]);

    // Calculate average time to convert
    const convertedClients = await this.prisma.client.findMany({
      where: {
        type: 'CLIENT',
        convertedAt: { not: null },
      },
      select: {
        createdAt: true,
        convertedAt: true,
      },
    });

    let averageTimeToConvert = 0;
    if (convertedClients.length > 0) {
      const totalDays = convertedClients.reduce((sum, c) => {
        if (c.convertedAt) {
          const diffMs = c.convertedAt.getTime() - c.createdAt.getTime();
          return sum + diffMs / (1000 * 60 * 60 * 24);
        }
        return sum;
      }, 0);
      averageTimeToConvert = Math.round((totalDays / convertedClients.length) * 10) / 10;
    }

    return {
      totalConverted,
      thisMonth,
      thisWeek,
      averageTimeToConvert,
    };
  }
}
