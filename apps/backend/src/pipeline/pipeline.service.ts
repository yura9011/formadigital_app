import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PipelineStage, Client } from '@prisma/client';
import { ScoringService, ScoreBreakdown } from './scoring.service';

export interface PipelineSummary {
  total: number;
  byStage: Record<PipelineStage, number>;
}

export interface LeadWithDaysInStage extends Client {
  daysInStage: number;
}

export interface LeadsQueryOptions {
  stage?: PipelineStage;
  page?: number;
  limit?: number;
  sortBy?: 'score' | 'createdAt' | 'name' | 'daysInStage';
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface PaginatedLeads {
  leads: LeadWithDaysInStage[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface LeadDetail extends Client {
  daysInStage: number;
  scoreBreakdown: ScoreBreakdown;
  transitionHistory: any[];
}

export interface PipelineMetrics {
  totalLeads: number;
  conversionRate: number;
  averageDaysPerStage: Record<PipelineStage, number>;
  leadsConvertedThisMonth: number;
  leadsDiscardedThisMonth: number;
  topCategories: { category: string; count: number }[];
}

@Injectable()
export class PipelineService {
  private readonly logger = new Logger(PipelineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scoringService: ScoringService,
  ) {}

  /**
   * Get pipeline summary with counts per stage
   */
  async getPipelineSummary(): Promise<PipelineSummary> {
    const counts = await this.prisma.client.groupBy({
      by: ['stage'],
      where: { type: 'LEAD' },
      _count: { id: true },
    });

    const byStage: Record<PipelineStage, number> = {
      [PipelineStage.DISCOVERED]: 0,
      [PipelineStage.ANALYZED]: 0,
      [PipelineStage.CONTACTED]: 0,
      [PipelineStage.RESPONDED]: 0,
      [PipelineStage.CONVERTED]: 0,
      [PipelineStage.DISCARDED]: 0,
    };

    let total = 0;
    for (const count of counts) {
      byStage[count.stage] = count._count.id;
      total += count._count.id;
    }

    // Also count converted clients (type = CLIENT)
    const convertedCount = await this.prisma.client.count({
      where: { type: 'CLIENT' },
    });
    byStage[PipelineStage.CONVERTED] = convertedCount;

    return { total: total + convertedCount, byStage };
  }

  /**
   * Get leads by stage with pagination and sorting
   */
  async getLeadsByStage(options: LeadsQueryOptions): Promise<PaginatedLeads> {
    const {
      stage,
      page = 1,
      limit = 50,
      sortBy = 'score',
      sortOrder = 'desc',
      search,
    } = options;

    const where: any = {};
    
    if (stage) {
      if (stage === PipelineStage.CONVERTED) {
        where.type = 'CLIENT';
      } else {
        where.stage = stage;
        where.type = 'LEAD';
      }
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Build orderBy
    let orderBy: any = {};
    if (sortBy === 'daysInStage') {
      // For daysInStage, we sort by createdAt (inverse)
      orderBy = { createdAt: sortOrder === 'desc' ? 'asc' : 'desc' };
    } else {
      orderBy = { [sortBy]: sortOrder };
    }

    const [leads, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.client.count({ where }),
    ]);

    // Calculate daysInStage for each lead
    const leadsWithDays: LeadWithDaysInStage[] = leads.map((lead) => ({
      ...lead,
      daysInStage: this.calculateDaysInStage(lead),
    }));

    return {
      leads: leadsWithDays,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Calculate days in current stage
   */
  private calculateDaysInStage(client: Client): number {
    // Get the last transition to current stage
    // For now, use createdAt as approximation
    // TODO: Use actual transition timestamp when available
    const now = new Date();
    const stageDate = client.updatedAt || client.createdAt;
    const diffMs = now.getTime() - stageDate.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Get detailed lead information
   */
  async getLeadDetail(clientId: string): Promise<LeadDetail> {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: {
        transitions: {
          orderBy: { createdAt: 'desc' },
        },
        contacts: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        notes: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!client) {
      throw new NotFoundException(`Lead not found: ${clientId}`);
    }

    const scoreBreakdown = this.scoringService.calculateScore(client);

    return {
      ...client,
      daysInStage: this.calculateDaysInStage(client),
      scoreBreakdown,
      transitionHistory: client.transitions,
    };
  }

  /**
   * Get pipeline metrics
   */
  async getPipelineMetrics(): Promise<PipelineMetrics> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalLeads,
      totalConverted,
      convertedThisMonth,
      discardedThisMonth,
      topCategories,
    ] = await Promise.all([
      this.prisma.client.count({ where: { type: 'LEAD' } }),
      this.prisma.client.count({ where: { type: 'CLIENT' } }),
      this.prisma.client.count({
        where: {
          type: 'CLIENT',
          convertedAt: { gte: startOfMonth },
        },
      }),
      this.prisma.client.count({
        where: {
          stage: PipelineStage.DISCARDED,
          discardedAt: { gte: startOfMonth },
        },
      }),
      this.prisma.client.groupBy({
        by: ['category'],
        where: { category: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
    ]);

    // Calculate conversion rate
    const conversionRate = totalLeads > 0 
      ? (totalConverted / (totalLeads + totalConverted)) * 100 
      : 0;

    // Calculate average days per stage (simplified)
    const averageDaysPerStage = await this.calculateAverageDaysPerStage();

    return {
      totalLeads: totalLeads + totalConverted,
      conversionRate: Math.round(conversionRate * 100) / 100,
      averageDaysPerStage,
      leadsConvertedThisMonth: convertedThisMonth,
      leadsDiscardedThisMonth: discardedThisMonth,
      topCategories: topCategories.map((c) => ({
        category: c.category || 'Sin categoría',
        count: c._count.id,
      })),
    };
  }

  /**
   * Calculate average days spent in each stage
   */
  private async calculateAverageDaysPerStage(): Promise<Record<PipelineStage, number>> {
    // Get all transitions
    const transitions = await this.prisma.stageTransition.findMany({
      orderBy: { createdAt: 'asc' },
    });

    const stageDurations: Record<PipelineStage, number[]> = {
      [PipelineStage.DISCOVERED]: [],
      [PipelineStage.ANALYZED]: [],
      [PipelineStage.CONTACTED]: [],
      [PipelineStage.RESPONDED]: [],
      [PipelineStage.CONVERTED]: [],
      [PipelineStage.DISCARDED]: [],
    };

    // Group transitions by client
    const byClient = new Map<string, typeof transitions>();
    for (const t of transitions) {
      if (!byClient.has(t.clientId)) {
        byClient.set(t.clientId, []);
      }
      byClient.get(t.clientId)!.push(t);
    }

    // Calculate duration for each stage transition
    for (const [, clientTransitions] of byClient) {
      for (let i = 0; i < clientTransitions.length; i++) {
        const current = clientTransitions[i];
        const next = clientTransitions[i + 1];
        
        if (next) {
          const durationMs = next.createdAt.getTime() - current.createdAt.getTime();
          const durationDays = durationMs / (1000 * 60 * 60 * 24);
          stageDurations[current.toStage].push(durationDays);
        }
      }
    }

    // Calculate averages
    const averages: Record<PipelineStage, number> = {
      [PipelineStage.DISCOVERED]: 0,
      [PipelineStage.ANALYZED]: 0,
      [PipelineStage.CONTACTED]: 0,
      [PipelineStage.RESPONDED]: 0,
      [PipelineStage.CONVERTED]: 0,
      [PipelineStage.DISCARDED]: 0,
    };

    for (const stage of Object.keys(stageDurations) as PipelineStage[]) {
      const durations = stageDurations[stage];
      if (durations.length > 0) {
        const sum = durations.reduce((a, b) => a + b, 0);
        averages[stage] = Math.round((sum / durations.length) * 10) / 10;
      }
    }

    return averages;
  }
}
