import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
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
  ) { }

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

  /**
   * Get leads ready to contact today (Prospecting v2.0)
   * Criteria:
   * - Stage: DISCOVERED or ANALYZED
   * - contactAttempts < 10
   * - Not snoozed or snooze expired
   * - Has valid contact channel (whatsapp OR instagram OR email)
   * - Rating >= 4.0
   * - In Buenos Aires zone
   */
  async getReadyToContact(limit: number = 20): Promise<LeadWithDaysInStage[]> {
    const now = new Date();

    const leads = await this.prisma.client.findMany({
      where: {
        type: 'LEAD',
        stage: { in: [PipelineStage.DISCOVERED, PipelineStage.ANALYZED] },
        contactAttempts: { lt: 10 },
        OR: [
          { snoozedUntil: null },
          { snoozedUntil: { lte: now } },
        ],
        AND: [
          {
            OR: [
              { hasValidWhatsapp: true },
              { hasValidInstagram: true },
              { hasValidEmail: true },
              // Fallback: has phone or instagram field
              { phone: { not: null } },
              { instagram: { not: null } },
            ],
          },
          { rating: { gte: 4.0 } },
          // Note: Removed zone filter - each installation is local
        ],
      },
      orderBy: { score: 'desc' },
      take: limit,
    });

    return leads.map((lead) => ({
      ...lead,
      daysInStage: this.calculateDaysInStage(lead),
    }));
  }

  /**
   * Snooze a lead until a future date
   */
  async snoozeLead(clientId: string, until: Date, reason?: string): Promise<Client> {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new NotFoundException(`Lead not found: ${clientId}`);
    }

    return this.prisma.client.update({
      where: { id: clientId },
      data: {
        snoozedUntil: until,
        snoozeReason: reason || null,
      },
    });
  }

  /**
   * Quick contact: transition to CONTACTED and create contact record in one action
   */
  async quickContact(
    clientId: string,
    channel: string,
    message: string,
    userId?: string,
  ): Promise<{ client: Client; contactRecord: any }> {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new NotFoundException(`Lead not found: ${clientId}`);
    }

    // Execute in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. If DISCOVERED, move to ANALYZED first
      if (client.stage === PipelineStage.DISCOVERED) {
        await tx.stageTransition.create({
          data: {
            clientId,
            fromStage: PipelineStage.DISCOVERED,
            toStage: PipelineStage.ANALYZED,
            actorType: 'USER',
            actorId: userId,
          },
        });
      }

      // 2. Move to CONTACTED
      await tx.stageTransition.create({
        data: {
          clientId,
          fromStage: client.stage === PipelineStage.DISCOVERED
            ? PipelineStage.ANALYZED
            : client.stage,
          toStage: PipelineStage.CONTACTED,
          actorType: 'USER',
          actorId: userId,
        },
      });

      // 3. Create contact record
      const contactRecord = await tx.contactRecord.create({
        data: {
          clientId,
          channel,
          message,
          status: 'sent',
          sentAt: new Date(),
          userId,
        },
      });

      // 4. Update client
      const updatedClient = await tx.client.update({
        where: { id: clientId },
        data: {
          stage: PipelineStage.CONTACTED,
          contactStatus: 'sent',
          lastContactedAt: new Date(),
          contactAttempts: { increment: 1 },
          // Clear snooze when contacted
          snoozedUntil: null,
          snoozeReason: null,
        },
      });

      return { client: updatedClient, contactRecord };
    });

    this.logger.log(`Quick contact completed for ${clientId} via ${channel}`);
    return result;
  }

  /**
   * Validate and update contact channels for a lead
   */
  async validateContactChannels(clientId: string): Promise<Client> {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new NotFoundException(`Lead not found: ${clientId}`);
    }

    // Validate WhatsApp (Argentine mobile format)
    const hasValidWhatsapp = client.phone
      ? /^(011|11|15|\+54)[\s-]?\d{4}[\s-]?\d{4}$/.test(client.phone.replace(/\s/g, ''))
      : false;

    // Validate Instagram
    const hasValidInstagram = !!client.instagram && client.instagram.length > 0;

    // Validate Email
    const hasValidEmail = !!client.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email);

    return this.prisma.client.update({
      where: { id: clientId },
      data: {
        hasValidWhatsapp,
        hasValidInstagram,
        hasValidEmail,
      },
    });
  }

  /**
   * Batch validate contact channels for all leads
   */
  async validateAllContactChannels(): Promise<{ updated: number }> {
    const leads = await this.prisma.client.findMany({
      where: { type: 'LEAD' },
    });

    let updated = 0;
    for (const lead of leads) {
      await this.validateContactChannels(lead.id);
      updated++;
    }

    this.logger.log(`Validated contact channels for ${updated} leads`);
    return { updated };
  }

  /**
   * Register a manual/retroactive contact (Prospecting v2.0)
   * Used when contact was made outside the app
   */
  async registerManualContact(
    clientId: string,
    channel: string,
    contactedAt: Date,
    notes?: string,
  ): Promise<{ client: Client; contactRecord: any; warning?: string }> {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new NotFoundException(`Lead not found: ${clientId}`);
    }

    // Validate: date not in future
    const now = new Date();
    if (contactedAt > now) {
      throw new BadRequestException('Contact date cannot be in the future');
    }

    // Validate: no duplicate in last 24h for same channel
    const oneDayAgo = new Date(contactedAt.getTime() - 24 * 60 * 60 * 1000);
    const existingContact = await this.prisma.contactRecord.findFirst({
      where: {
        clientId,
        channel,
        sentAt: {
          gte: oneDayAgo,
          lte: new Date(contactedAt.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });

    if (existingContact) {
      throw new BadRequestException(
        `Already registered a ${channel} contact within 24 hours of this date`,
      );
    }

    // Check for warning (channel without data)
    let warning: string | undefined;
    if (channel === 'whatsapp' && !client.phone) {
      warning = 'Lead does not have a phone number registered';
    } else if (channel === 'instagram' && !client.instagram) {
      warning = 'Lead does not have an Instagram handle registered';
    } else if (channel === 'email' && !client.email) {
      warning = 'Lead does not have an email registered';
    }

    // Create contact record
    const contactRecord = await this.prisma.contactRecord.create({
      data: {
        clientId,
        channel,
        message: notes || 'Contacto manual registrado',
        sentAt: contactedAt,
      },
    });

    // Determine new stage (only upgrade, never downgrade)
    let newStage = client.stage;
    if (client.stage === 'DISCOVERED' || client.stage === 'ANALYZED') {
      newStage = PipelineStage.CONTACTED;
    }
    // If already CONTACTED, RESPONDED, CONVERTED, or DISCARDED, keep current stage

    // Update client
    const updatedClient = await this.prisma.client.update({
      where: { id: clientId },
      data: {
        stage: newStage,
        lastContactedAt: contactedAt,
        contactAttempts: { increment: 1 },
        // Clear snooze since we're contacting
        snoozedUntil: null,
        snoozeReason: null,
      },
    });

    this.logger.log(
      `Registered manual contact for ${client.name} via ${channel} on ${contactedAt.toISOString()}`,
    );

    return { client: updatedClient, contactRecord, warning };
  }
}

