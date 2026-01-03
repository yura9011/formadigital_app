import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EnrichmentService } from './services/enrichment.service';
import {
  GetLeadsDto,
  GetLeadsResult,
  LeadSummary,
  GetLeadDetailResult,
  CreateContactDto,
  UpdateContactStatusDto,
  GetContactHistoryDto,
  GetContactHistoryResult,
  ContactStats,
  GetTemplatesDto,
  SaveTemplateDto,
  UpdateConfigDto,
  ValidateContactDto,
  ValidateContactResult,
  EnrichContactDto,
  EnrichContactResult,
  SearchBusinessesDto,
  SearchBusinessesResult,
} from './dto';

// Harv3st types
interface HarvestedLead {
  placeId: string;
  name: string;
  averageRating: number | null;
  reviewCount: number | null;
  phones: string | null;
  website: string | null;
  latitude: number | null;
  longitude: number | null;
  categories: string | null;
  fullAddress: string | null;
  reviewsUrl: string | null;
  photoCount: number | null;
  priceLevel: number | null;
  hours: any[] | null;
  isOpenNow: boolean | null;
  attributes: string[] | null;
  _captured_at: number;
}

// Types
export type ContactStatus = 'none' | 'pending' | 'approved' | 'sent' | 'rejected' | 'responded';
export type OutreachChannel = 'instagram' | 'whatsapp' | 'email';
export type TemplateScenario = 'sin_sitio' | 'rating_bajo' | 'sin_fotos' | 'sin_redes' | 'general';

@Injectable()
export class ProspectService {
  private readonly logger = new Logger(ProspectService.name);

  constructor(
    private prisma: PrismaService,
    private enrichmentService: EnrichmentService,
  ) {}

  // ==================== LEAD METHODS ====================

  /**
   * Get leads with filters for prospecting
   */
  async getLeads(dto: GetLeadsDto, userId?: string): Promise<GetLeadsResult> {
    // Parse query params (they come as strings from URL)
    const minScore = dto.minScore !== undefined ? Number(dto.minScore) : undefined;
    const maxScore = dto.maxScore !== undefined ? Number(dto.maxScore) : undefined;
    const hasWebsite = dto.hasWebsite !== undefined ? String(dto.hasWebsite) === 'true' : undefined;
    const hasPhone = dto.hasPhone !== undefined ? String(dto.hasPhone) === 'true' : undefined;
    const hasInstagram = dto.hasInstagram !== undefined ? String(dto.hasInstagram) === 'true' : undefined;
    const hasEmail = dto.hasEmail !== undefined ? String(dto.hasEmail) === 'true' : undefined;
    const includeContacted = dto.includeContacted !== undefined ? String(dto.includeContacted) === 'true' : false;
    const limit = dto.limit !== undefined ? Number(dto.limit) : 20;
    const offset = dto.offset !== undefined ? Number(dto.offset) : 0;
    const category = dto.category;

    // Build where clause
    const where: any = {};

    if (minScore !== undefined && !isNaN(minScore)) {
      where.score = { ...where.score, gte: minScore };
    }
    if (maxScore !== undefined && !isNaN(maxScore)) {
      where.score = { ...where.score, lte: maxScore };
    }
    if (hasWebsite !== undefined) {
      where.website = hasWebsite ? { not: null } : null;
    }
    if (hasPhone !== undefined) {
      where.phone = hasPhone ? { not: null } : null;
    }
    if (hasInstagram !== undefined) {
      where.instagram = hasInstagram ? { not: null } : null;
    }
    if (hasEmail !== undefined) {
      where.email = hasEmail ? { not: null } : null;
    }
    if (category) {
      where.category = { contains: category, mode: 'insensitive' };
    }
    if (!includeContacted) {
      where.OR = [
        { contactStatus: null },
        { contactStatus: 'none' },
      ];
    }

    // Get total count
    const total = await this.prisma.client.count({ where });

    // Get leads
    const clients = await this.prisma.client.findMany({
      where,
      orderBy: { score: 'desc' },
      skip: offset,
      take: limit,
    });

    // Map to LeadSummary
    const leads: LeadSummary[] = clients.map((client) => ({
      id: client.id,
      name: client.name,
      address: client.address,
      phone: client.phone,
      website: client.website,
      instagram: client.instagram,
      email: client.email,
      rating: client.rating,
      reviewCount: client.reviewCount,
      opportunityScore: client.score || 0,
      categories: client.category,
      contactStatus: (client.contactStatus as ContactStatus) || 'none',
      availableChannels: this.getAvailableChannels(client),
    }));

    return {
      leads,
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Get detailed information about a specific lead
   */
  async getLeadDetail(leadId: string): Promise<GetLeadDetailResult> {
    const client = await this.prisma.client.findUnique({
      where: { id: leadId },
      include: {
        contacts: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!client) {
      throw new NotFoundException(`Lead not found: ${leadId}`);
    }

    const opportunities = this.detectOpportunities(client);
    const suggestedScenario = this.suggestScenario(client);

    return {
      lead: {
        id: client.id,
        name: client.name,
        address: client.address,
        phone: client.phone,
        website: client.website,
        email: client.email,
        instagram: client.instagram,
        facebook: client.facebook,
        linkedin: client.linkedin,
        rating: client.rating,
        reviewCount: client.reviewCount,
        category: client.category,
        latitude: client.latitude,
        longitude: client.longitude,
        googleMapsUri: client.googleMapsUri,
        tier: client.tier,
        score: client.score,
        gaps: client.gaps as string[] | null,
        summary: client.summary,
        source: client.source,
        placeId: client.placeId,
        contactStatus: (client.contactStatus as ContactStatus) || 'none',
        lastContactedAt: client.lastContactedAt?.toISOString(),
        createdAt: client.createdAt.toISOString(),
        updatedAt: client.updatedAt.toISOString(),
      },
      contactHistory: client.contacts.map((c) => ({
        id: c.id,
        leadId: c.clientId,
        leadName: client.name,
        channel: c.channel as OutreachChannel,
        message: c.message,
        status: c.status as ContactStatus,
        notes: c.notes,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        sentAt: c.sentAt?.toISOString(),
        respondedAt: c.respondedAt?.toISOString(),
      })),
      suggestedScenario,
      opportunities,
    };
  }

  // ==================== CONTACT METHODS ====================

  /**
   * Create a new contact record
   */
  async createContactRecord(dto: CreateContactDto, userId?: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: dto.leadId },
    });

    if (!client) {
      throw new NotFoundException(`Lead not found: ${dto.leadId}`);
    }

    const now = new Date();

    // Create contact record
    const contactRecord = await this.prisma.contactRecord.create({
      data: {
        clientId: dto.leadId,
        channel: dto.channel,
        message: dto.message,
        status: dto.status || 'pending',
        notes: dto.notes,
        userId,
      },
    });

    // Update client contact status
    await this.prisma.client.update({
      where: { id: dto.leadId },
      data: {
        contactStatus: dto.status || 'pending',
        lastContactedAt: now,
      },
    });

    return {
      contactRecord: {
        id: contactRecord.id,
        leadId: contactRecord.clientId,
        leadName: client.name,
        channel: contactRecord.channel as OutreachChannel,
        message: contactRecord.message,
        status: contactRecord.status as ContactStatus,
        notes: contactRecord.notes,
        createdAt: contactRecord.createdAt.toISOString(),
        updatedAt: contactRecord.updatedAt.toISOString(),
        sentAt: contactRecord.sentAt?.toISOString(),
        respondedAt: contactRecord.respondedAt?.toISOString(),
      },
      leadUpdated: true,
    };
  }

  /**
   * Update contact status
   */
  async updateContactStatus(contactId: string, dto: UpdateContactStatusDto) {
    const contact = await this.prisma.contactRecord.findUnique({
      where: { id: contactId },
      include: { client: true },
    });

    if (!contact) {
      throw new NotFoundException(`Contact not found: ${contactId}`);
    }

    const previousStatus = contact.status;
    const now = new Date();

    // Prepare update data
    const updateData: any = {
      status: dto.status,
    };

    if (dto.notes) {
      updateData.notes = dto.notes;
    }
    if (dto.status === 'sent') {
      updateData.sentAt = now;
    }
    if (dto.status === 'responded') {
      updateData.respondedAt = now;
    }

    // Update contact record
    const updatedContact = await this.prisma.contactRecord.update({
      where: { id: contactId },
      data: updateData,
    });

    // Update client contact status
    await this.prisma.client.update({
      where: { id: contact.clientId },
      data: {
        contactStatus: dto.status,
        lastContactedAt: now,
      },
    });

    return {
      contactRecord: {
        id: updatedContact.id,
        leadId: updatedContact.clientId,
        leadName: contact.client.name,
        channel: updatedContact.channel as OutreachChannel,
        message: updatedContact.message,
        status: updatedContact.status as ContactStatus,
        notes: updatedContact.notes,
        createdAt: updatedContact.createdAt.toISOString(),
        updatedAt: updatedContact.updatedAt.toISOString(),
        sentAt: updatedContact.sentAt?.toISOString(),
        respondedAt: updatedContact.respondedAt?.toISOString(),
      },
      previousStatus,
    };
  }

  /**
   * Get contact history with filters
   */
  async getContactHistory(dto: GetContactHistoryDto, userId?: string): Promise<GetContactHistoryResult> {
    const { status, channel, leadId, dateFrom, dateTo, limit = 50, offset = 0 } = dto;

    const where: any = {};

    if (userId) {
      where.userId = userId;
    }
    if (status) {
      where.status = status;
    }
    if (channel) {
      where.channel = channel;
    }
    if (leadId) {
      where.clientId = leadId;
    }
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo);
      }
    }

    const total = await this.prisma.contactRecord.count({ where });

    const contacts = await this.prisma.contactRecord.findMany({
      where,
      include: { client: true },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    return {
      contacts: contacts.map((c) => ({
        id: c.id,
        leadId: c.clientId,
        leadName: c.client.name,
        channel: c.channel as OutreachChannel,
        message: c.message,
        status: c.status as ContactStatus,
        notes: c.notes,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        sentAt: c.sentAt?.toISOString(),
        respondedAt: c.respondedAt?.toISOString(),
      })),
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Get contact statistics with detailed breakdown
   */
  async getContactStats(userId?: string, dateFrom?: string, dateTo?: string): Promise<ContactStats> {
    const where: any = {};

    if (userId) {
      where.userId = userId;
    }
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo);
      }
    }

    const contacts = await this.prisma.contactRecord.findMany({ 
      where,
      include: { client: true },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate stats
    const totalContacts = contacts.length;
    const byStatus: Record<string, number> = {
      none: 0,
      pending: 0,
      approved: 0,
      sent: 0,
      rejected: 0,
      responded: 0,
    };
    const byChannel: Record<string, number> = {
      instagram: 0,
      whatsapp: 0,
      email: 0,
    };
    const byCategory: Record<string, number> = {};

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    let contactsToday = 0;
    let contactsThisWeek = 0;
    let sentCount = 0;
    let respondedCount = 0;

    for (const contact of contacts) {
      byStatus[contact.status] = (byStatus[contact.status] || 0) + 1;
      byChannel[contact.channel] = (byChannel[contact.channel] || 0) + 1;

      // Count by category
      if (contact.client?.category) {
        const mainCategory = contact.client.category.split(',')[0].trim();
        byCategory[mainCategory] = (byCategory[mainCategory] || 0) + 1;
      }

      if (contact.createdAt >= today) {
        contactsToday++;
      }
      if (contact.createdAt >= weekAgo) {
        contactsThisWeek++;
      }
      if (contact.status === 'sent' || contact.status === 'responded') {
        sentCount++;
      }
      if (contact.status === 'responded') {
        respondedCount++;
      }
    }

    const responseRate = sentCount > 0 ? (respondedCount / sentCount) * 100 : 0;

    // Get recent contacts with lead info (last 10)
    const recentContacts = contacts.slice(0, 10).map(c => ({
      id: c.id,
      leadId: c.clientId,
      leadName: c.client?.name || 'Unknown',
      leadCategory: c.client?.category?.split(',')[0].trim() || null,
      channel: c.channel as OutreachChannel,
      status: c.status as ContactStatus,
      createdAt: c.createdAt.toISOString(),
      sentAt: c.sentAt?.toISOString(),
      respondedAt: c.respondedAt?.toISOString(),
    }));

    // Get leads with most contacts
    const leadContactCounts: Record<string, { id: string; name: string; count: number }> = {};
    for (const contact of contacts) {
      const leadId = contact.clientId;
      if (!leadContactCounts[leadId]) {
        leadContactCounts[leadId] = {
          id: leadId,
          name: contact.client?.name || 'Unknown',
          count: 0,
        };
      }
      leadContactCounts[leadId].count++;
    }
    const topLeads = Object.values(leadContactCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalContacts,
      byStatus,
      byChannel,
      byCategory,
      contactsToday,
      contactsThisWeek,
      responseRate: Math.round(responseRate * 100) / 100,
      recentContacts,
      topLeads,
    };
  }

  // ==================== TEMPLATE METHODS ====================

  /**
   * Get message templates
   */
  async getTemplates(dto: GetTemplatesDto, userId?: string) {
    const where: any = {
      OR: [
        { userId: null }, // Global templates
        { userId }, // User's templates
      ],
    };

    if (dto.channel) {
      where.channel = dto.channel;
    }
    if (dto.scenario) {
      where.scenario = dto.scenario;
    }

    const templates = await this.prisma.messageTemplate.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return templates.map((t) => ({
      id: t.id,
      name: t.name,
      channel: t.channel as OutreachChannel,
      scenario: t.scenario as TemplateScenario,
      content: t.content,
      isDefault: t.isDefault,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));
  }

  /**
   * Save (create or update) a message template
   */
  async saveTemplate(dto: SaveTemplateDto, userId?: string) {
    if (dto.id) {
      // Update existing
      const template = await this.prisma.messageTemplate.update({
        where: { id: dto.id },
        data: {
          name: dto.name,
          channel: dto.channel,
          scenario: dto.scenario,
          content: dto.content,
          isDefault: dto.isDefault ?? false,
        },
      });

      return {
        template: {
          id: template.id,
          name: template.name,
          channel: template.channel as OutreachChannel,
          scenario: template.scenario as TemplateScenario,
          content: template.content,
          isDefault: template.isDefault,
          createdAt: template.createdAt.toISOString(),
          updatedAt: template.updatedAt.toISOString(),
        },
        created: false,
      };
    } else {
      // Create new
      const template = await this.prisma.messageTemplate.create({
        data: {
          name: dto.name,
          channel: dto.channel,
          scenario: dto.scenario,
          content: dto.content,
          isDefault: dto.isDefault ?? false,
          userId,
        },
      });

      return {
        template: {
          id: template.id,
          name: template.name,
          channel: template.channel as OutreachChannel,
          scenario: template.scenario as TemplateScenario,
          content: template.content,
          isDefault: template.isDefault,
          createdAt: template.createdAt.toISOString(),
          updatedAt: template.updatedAt.toISOString(),
        },
        created: true,
      };
    }
  }

  // ==================== CONFIG METHODS ====================

  /**
   * Get user prospect configuration
   */
  async getConfig(userId: string) {
    let config = await this.prisma.prospectConfig.findUnique({
      where: { userId },
    });

    const isDefault = !config;

    if (!config) {
      // Return default config
      return {
        config: {
          userName: '',
          companyName: '',
          defaultChannel: 'instagram' as OutreachChannel,
          maxContactsPerSession: 10,
          signature: '',
          instagramHandle: '',
          whatsappNumber: '',
          emailAddress: '',
        },
        isDefault: true,
      };
    }

    return {
      config: {
        userName: config.userName || '',
        companyName: config.companyName || '',
        defaultChannel: config.defaultChannel as OutreachChannel,
        maxContactsPerSession: config.maxContactsPerSession,
        signature: config.signature || '',
        instagramHandle: config.instagramHandle || '',
        whatsappNumber: config.whatsappNumber || '',
        emailAddress: config.emailAddress || '',
      },
      isDefault,
    };
  }

  /**
   * Update user prospect configuration
   */
  async updateConfig(userId: string, dto: UpdateConfigDto) {
    const updated: string[] = [];
    const data: any = {};

    if (dto.userName !== undefined) {
      data.userName = dto.userName;
      updated.push('userName');
    }
    if (dto.companyName !== undefined) {
      data.companyName = dto.companyName;
      updated.push('companyName');
    }
    if (dto.defaultChannel !== undefined) {
      data.defaultChannel = dto.defaultChannel;
      updated.push('defaultChannel');
    }
    if (dto.maxContactsPerSession !== undefined) {
      data.maxContactsPerSession = dto.maxContactsPerSession;
      updated.push('maxContactsPerSession');
    }
    if (dto.signature !== undefined) {
      data.signature = dto.signature;
      updated.push('signature');
    }
    if (dto.instagramHandle !== undefined) {
      data.instagramHandle = dto.instagramHandle;
      updated.push('instagramHandle');
    }
    if (dto.whatsappNumber !== undefined) {
      data.whatsappNumber = dto.whatsappNumber;
      updated.push('whatsappNumber');
    }
    if (dto.emailAddress !== undefined) {
      data.emailAddress = dto.emailAddress;
      updated.push('emailAddress');
    }

    const config = await this.prisma.prospectConfig.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...data,
      },
    });

    return {
      config: {
        userName: config.userName || '',
        companyName: config.companyName || '',
        defaultChannel: config.defaultChannel as OutreachChannel,
        maxContactsPerSession: config.maxContactsPerSession,
        signature: config.signature || '',
        instagramHandle: config.instagramHandle || '',
        whatsappNumber: config.whatsappNumber || '',
        emailAddress: config.emailAddress || '',
      },
      updated,
    };
  }

  // ==================== VALIDATION METHODS ====================

  /**
   * Validate contact data (phone, email, instagram)
   */
  validateContactData(dto: ValidateContactDto): ValidateContactResult {
    const { channel, value } = dto;

    switch (channel) {
      case 'whatsapp':
        return this.validatePhone(value);
      case 'email':
        return this.validateEmail(value);
      case 'instagram':
        return this.validateInstagram(value);
      default:
        return {
          isValid: false,
          errorMessage: `Unknown channel: ${channel}`,
        };
    }
  }

  private validatePhone(value: string): ValidateContactResult {
    // Remove all non-digit characters except +
    let normalized = value.replace(/[^\d+]/g, '');

    // Check if it starts with + or add country code
    if (!normalized.startsWith('+')) {
      // Assume Argentina if no country code
      if (normalized.startsWith('54')) {
        normalized = '+' + normalized;
      } else if (normalized.startsWith('9')) {
        normalized = '+54' + normalized;
      } else {
        normalized = '+54' + normalized;
      }
    }

    // Validate length (Argentina numbers are typically 13 digits with +54)
    if (normalized.length < 10 || normalized.length > 15) {
      return {
        isValid: false,
        errorMessage: 'Phone number must be between 10 and 15 digits',
      };
    }

    return {
      isValid: true,
      normalizedValue: normalized,
    };
  }

  private validateEmail(value: string): ValidateContactResult {
    const normalized = value.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalized)) {
      return {
        isValid: false,
        errorMessage: 'Invalid email format',
      };
    }

    return {
      isValid: true,
      normalizedValue: normalized,
    };
  }

  private validateInstagram(value: string): ValidateContactResult {
    // Remove @ if present
    let normalized = value.startsWith('@') ? value.slice(1) : value;
    normalized = normalized.toLowerCase().trim();

    // Instagram handle rules: 1-30 chars, alphanumeric, underscores, periods
    const instagramRegex = /^[a-z0-9._]{1,30}$/;

    if (!instagramRegex.test(normalized)) {
      return {
        isValid: false,
        errorMessage: 'Instagram handle must be 1-30 characters, alphanumeric with underscores and periods only',
      };
    }

    return {
      isValid: true,
      normalizedValue: normalized,
    };
  }

  // ==================== ENRICHMENT METHODS ====================

  /**
   * Enrich contact data from website using Playwright
   */
  async enrichContact(leadId: string, dto: EnrichContactDto): Promise<EnrichContactResult> {
    const client = await this.prisma.client.findUnique({
      where: { id: leadId },
    });

    if (!client) {
      throw new NotFoundException(`Lead not found: ${leadId}`);
    }

    if (!client.website) {
      return {
        leadId,
        found: {},
        notFound: dto.fields,
        error: 'Lead has no website to enrich from',
      };
    }

    this.logger.log(`Enriching contact ${leadId} from ${client.website}, fields: ${dto.fields.join(', ')}`);

    try {
      // Use enrichment service to extract data
      const enrichmentResult = await this.enrichmentService.enrichFromWebsite(
        client.website,
        dto.fields,
      );

      const found: { email?: string; instagram?: string } = {};
      const notFound: string[] = [];
      const updateData: any = {};

      // Process results
      for (const field of dto.fields) {
        if (field === 'email' && enrichmentResult.email) {
          found.email = enrichmentResult.email;
          updateData.email = enrichmentResult.email;
        } else if (field === 'instagram' && enrichmentResult.instagram) {
          found.instagram = enrichmentResult.instagram;
          updateData.instagram = enrichmentResult.instagram;
        } else {
          notFound.push(field);
        }
      }

      // Update client with found data
      if (Object.keys(updateData).length > 0) {
        updateData.enrichedAt = new Date();
        updateData.source = 'Playwright';
        
        await this.prisma.client.update({
          where: { id: leadId },
          data: updateData,
        });
        
        this.logger.log(`Updated client ${leadId} with enriched data: ${JSON.stringify(updateData)}`);
      }

      return {
        leadId,
        found,
        notFound,
      };

    } catch (error) {
      this.logger.error(`Enrichment failed for ${leadId}: ${error.message}`);
      return {
        leadId,
        found: {},
        notFound: dto.fields,
        error: `Enrichment failed: ${error.message}`,
      };
    }
  }

  // ==================== HELPER METHODS ====================

  private getAvailableChannels(client: any): OutreachChannel[] {
    const channels: OutreachChannel[] = [];
    if (client.instagram) channels.push('instagram');
    if (client.phone) channels.push('whatsapp');
    if (client.email) channels.push('email');
    return channels;
  }

  private detectOpportunities(client: any): string[] {
    const opportunities: string[] = [];

    if (!client.website) {
      opportunities.push('No tiene sitio web - oportunidad de desarrollo web');
    }

    if (client.rating && client.rating < 4.0 && client.reviewCount && client.reviewCount > 20) {
      opportunities.push(
        `Rating de ${client.rating} con ${client.reviewCount} reseñas - oportunidad de gestión de reputación`,
      );
    }

    if (!client.instagram) {
      opportunities.push('Sin presencia en Instagram - oportunidad de redes sociales');
    }

    if (client.rating && client.rating >= 4.5 && client.reviewCount && client.reviewCount > 100) {
      opportunities.push('Negocio exitoso - oportunidad de expansión digital');
    }

    // Check gaps if available
    if (client.gaps && Array.isArray(client.gaps)) {
      for (const gap of client.gaps) {
        if (!opportunities.some((o) => o.includes(gap))) {
          opportunities.push(gap);
        }
      }
    }

    return opportunities;
  }

  private suggestScenario(client: any): TemplateScenario {
    if (!client.website) return 'sin_sitio';
    if (client.rating && client.rating < 4.0) return 'rating_bajo';
    if (!client.instagram) return 'sin_redes';
    return 'general';
  }

  // ==================== HARV3ST INTEGRATION ====================

  private readonly HARV3ST_URL = process.env.HARV3ST_URL || 'http://localhost:5050';

  /**
   * Search for businesses using Harv3st and import results to database
   */
  async searchBusinesses(dto: SearchBusinessesDto): Promise<SearchBusinessesResult> {
    const { query, headless = true, waitForResults = true, maxWaitSeconds = 120 } = dto;

    this.logger.log(`Starting Harv3st search: "${query}"`);

    try {
      // 1. Trigger search in Harv3st
      const searchResponse = await fetch(`${this.HARV3ST_URL}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, headless }),
      });

      if (!searchResponse.ok) {
        const error = await searchResponse.text();
        throw new Error(`Harv3st search failed: ${error}`);
      }

      this.logger.log(`Harv3st search triggered for: "${query}"`);

      if (!waitForResults) {
        return {
          query,
          status: 'started',
          leadsFound: 0,
          leadsImported: 0,
          leadsUpdated: 0,
        };
      }

      // 2. Wait for search to complete (poll status)
      const startTime = Date.now();
      let isComplete = false;

      while (!isComplete && (Date.now() - startTime) < maxWaitSeconds * 1000) {
        await this.sleep(2000); // Wait 2 seconds between polls

        const statusResponse = await fetch(`${this.HARV3ST_URL}/api/status`);
        if (statusResponse.ok) {
          const status = await statusResponse.json();
          // Check if our query is still running
          const activeTasks = status.active_tasks || [];
          isComplete = !activeTasks.some((task: string) => 
            task.toLowerCase().includes(query.toLowerCase().split(' ')[0])
          );
        }
      }

      // 3. Get results from Harv3st
      const dataResponse = await fetch(`${this.HARV3ST_URL}/api/data/scored`);
      if (!dataResponse.ok) {
        throw new Error('Failed to get Harv3st data');
      }

      const harvestedLeads: HarvestedLead[] = await dataResponse.json();
      this.logger.log(`Harv3st returned ${harvestedLeads.length} leads`);

      // 4. Import leads to database
      const importResult = await this.importHarvestedLeads(harvestedLeads, query);

      return {
        query,
        status: 'completed',
        leadsFound: harvestedLeads.length,
        leadsImported: importResult.imported,
        leadsUpdated: importResult.updated,
        leads: importResult.leads,
      };

    } catch (error) {
      this.logger.error(`Harv3st search failed: ${error.message}`);
      return {
        query,
        status: 'error',
        leadsFound: 0,
        leadsImported: 0,
        leadsUpdated: 0,
        error: error.message,
      };
    }
  }

  /**
   * Import harvested leads to database, deduplicating by placeId
   * Updates existing leads with new data but preserves pipeline stage
   */
  private async importHarvestedLeads(
    harvestedLeads: HarvestedLead[],
    searchQuery: string,
  ): Promise<{ imported: number; updated: number; leads: LeadSummary[] }> {
    let imported = 0;
    let updated = 0;
    const importedLeads: LeadSummary[] = [];

    for (const lead of harvestedLeads) {
      try {
        // Check if already exists by placeId
        const existing = await this.prisma.client.findFirst({
          where: { placeId: lead.placeId },
        });

        if (existing) {
          // Update existing lead with new data but preserve stage and pipeline fields
          const updatedClient = await this.prisma.client.update({
            where: { id: existing.id },
            data: {
              // Update basic info
              name: lead.name,
              address: lead.fullAddress || existing.address,
              phone: lead.phones || existing.phone,
              website: this.normalizeWebsite(lead.website) || existing.website,
              rating: lead.averageRating ?? existing.rating,
              reviewCount: lead.reviewCount ?? existing.reviewCount,
              latitude: lead.latitude ?? existing.latitude,
              longitude: lead.longitude ?? existing.longitude,
              category: lead.categories || existing.category,
              googleMapsUri: lead.reviewsUrl?.replace('/reviews', '') || existing.googleMapsUri,
              // Update extended GMB fields
              photoCount: lead.photoCount ?? existing.photoCount,
              priceLevel: this.parsePriceLevel(lead.priceLevel) ?? existing.priceLevel,
              hours: (lead.hours ?? existing.hours) || undefined,
              attributes: (lead.attributes ?? existing.attributes) || undefined,
              reviewsUrl: lead.reviewsUrl || existing.reviewsUrl,
              // Recalculate score with new data
              score: this.calculateOpportunityScore(lead),
              gaps: this.detectGapsFromHarvest(lead),
              // DO NOT update: stage, discardedAt, convertedAt, revivedAt, type, contactStatus
            },
          });

          updated++;
          importedLeads.push({
            id: updatedClient.id,
            name: updatedClient.name,
            address: updatedClient.address,
            phone: updatedClient.phone,
            website: updatedClient.website,
            instagram: updatedClient.instagram,
            email: updatedClient.email,
            rating: updatedClient.rating,
            reviewCount: updatedClient.reviewCount,
            opportunityScore: updatedClient.score || 0,
            categories: updatedClient.category,
            contactStatus: (updatedClient.contactStatus as ContactStatus) || 'none',
            availableChannels: this.getAvailableChannels(updatedClient),
          });
          continue;
        }

        // Calculate opportunity score
        const score = this.calculateOpportunityScore(lead);

        // Detect gaps
        const gaps = this.detectGapsFromHarvest(lead);

        // Create new client/lead with extended GMB fields
        const client = await this.prisma.client.create({
          data: {
            name: lead.name,
            address: lead.fullAddress || '',
            phone: lead.phones,
            website: this.normalizeWebsite(lead.website),
            rating: lead.averageRating,
            reviewCount: lead.reviewCount,
            latitude: lead.latitude,
            longitude: lead.longitude,
            category: lead.categories,
            placeId: lead.placeId,
            googleMapsUri: lead.reviewsUrl?.replace('/reviews', '') || null,
            source: 'Harv3st',
            type: 'LEAD',
            stage: 'DISCOVERED',
            score,
            gaps,
            contactStatus: 'none',
            // Extended GMB fields
            photoCount: lead.photoCount,
            priceLevel: this.parsePriceLevel(lead.priceLevel),
            hours: lead.hours || undefined,
            attributes: lead.attributes || undefined,
            reviewsUrl: lead.reviewsUrl,
          },
        });

        imported++;
        importedLeads.push({
          id: client.id,
          name: client.name,
          address: client.address,
          phone: client.phone,
          website: client.website,
          instagram: client.instagram,
          email: client.email,
          rating: client.rating,
          reviewCount: client.reviewCount,
          opportunityScore: client.score || 0,
          categories: client.category,
          contactStatus: 'none',
          availableChannels: this.getAvailableChannels(client),
        });

      } catch (error) {
        this.logger.warn(`Failed to import lead ${lead.name}: ${error.message}`);
      }
    }

    this.logger.log(`Imported ${imported} new leads, updated ${updated} existing leads`);
    return { imported, updated, leads: importedLeads };
  }

  /**
   * Calculate opportunity score for a harvested lead
   */
  private calculateOpportunityScore(lead: HarvestedLead): number {
    let score = 0;

    // No website = marketing opportunity (+25)
    if (!lead.website || this.isGoogleReviewsUrl(lead.website)) {
      score += 25;
    }

    // Low rating with traffic = struggling business (+20)
    const rating = lead.averageRating ?? 5;
    const reviewCount = lead.reviewCount ?? 0;
    if (reviewCount > 30 && rating < 4.0) {
      score += 20;
    } else if (reviewCount > 100 && rating < 4.5) {
      score += 15;
    }

    // No photos = neglected listing (+15)
    const photoCount = lead.photoCount ?? 0;
    if (photoCount === 0) {
      score += 15;
    } else if (photoCount < 5) {
      score += 5;
    }

    // High success = may want expansion (+10)
    if (rating >= 4.5 && reviewCount > 100) {
      score += 10;
    }

    // Has phone = contactable (+5)
    if (lead.phones) {
      score += 5;
    }

    // Currently open = active (+5)
    if (lead.isOpenNow === true) {
      score += 5;
    }

    return Math.min(score, 100);
  }

  /**
   * Get score breakdown for UI display
   * Shows which rules contributed to the score
   */
  getScoreBreakdown(lead: {
    website?: string | null;
    rating?: number | null;
    reviewCount?: number | null;
    photoCount?: number | null;
    phone?: string | null;
    isOpenNow?: boolean | null;
  }): { total: number; components: Array<{ label: string; points: number; applied: boolean }> } {
    const rating = lead.rating ?? 5;
    const reviewCount = lead.reviewCount ?? 0;
    const photoCount = lead.photoCount ?? 0;
    const noWebsite = !lead.website || (lead.website ? lead.website.includes('search.google.com') : false);

    const components: Array<{ label: string; points: number; applied: boolean }> = [
      {
        label: 'Sin sitio web',
        points: 25,
        applied: noWebsite,
      },
      {
        label: 'Rating bajo con tráfico',
        points: 20,
        applied: reviewCount > 30 && rating < 4.0,
      },
      {
        label: 'Rating moderado, alto tráfico',
        points: 15,
        applied: reviewCount > 100 && rating < 4.5 && !(reviewCount > 30 && rating < 4.0),
      },
      {
        label: 'Sin fotos',
        points: 15,
        applied: photoCount === 0,
      },
      {
        label: 'Pocas fotos',
        points: 5,
        applied: photoCount > 0 && photoCount < 5,
      },
      {
        label: 'Negocio exitoso',
        points: 10,
        applied: rating >= 4.5 && reviewCount > 100,
      },
      {
        label: 'Tiene teléfono',
        points: 5,
        applied: Boolean(lead.phone),
      },
      {
        label: 'Actualmente abierto',
        points: 5,
        applied: lead.isOpenNow === true,
      },
    ];

    const total = Math.min(
      components.reduce((sum, c) => sum + (c.applied ? c.points : 0), 0),
      100
    );

    return { total, components };
  }

  /**
   * Detect gaps/opportunities from harvested lead data
   */
  private detectGapsFromHarvest(lead: HarvestedLead): string[] {
    const gaps: string[] = [];

    if (!lead.website || this.isGoogleReviewsUrl(lead.website)) {
      gaps.push('Sin sitio web');
    }

    if (lead.averageRating && lead.averageRating < 4.0) {
      gaps.push('Rating bajo');
    }

    if (!lead.photoCount || lead.photoCount < 5) {
      gaps.push('Pocas fotos');
    }

    if (!lead.phones) {
      gaps.push('Sin teléfono visible');
    }

    return gaps;
  }

  /**
   * Check if URL is a Google reviews URL (not a real website)
   */
  private isGoogleReviewsUrl(url: string | null): boolean {
    if (!url) return true;
    return url.includes('search.google.com/local/reviews');
  }

  /**
   * Normalize website URL
   */
  private normalizeWebsite(url: string | null): string | null {
    if (!url) return null;
    if (this.isGoogleReviewsUrl(url)) return null;
    return url;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Parse priceLevel from various formats to Int or null
   * Google Maps returns priceLevel as string like "$20,000-30,000" or number 1-4
   */
  private parsePriceLevel(priceLevel: any): number | null {
    if (priceLevel === null || priceLevel === undefined) return null;
    if (typeof priceLevel === 'number') return priceLevel;
    if (typeof priceLevel === 'string') {
      // Try to extract a number from strings like "$", "$$", "$$$", "$$$$"
      const dollarCount = (priceLevel.match(/\$/g) || []).length;
      if (dollarCount > 0 && dollarCount <= 4) return dollarCount;
      // Try to parse as integer
      const parsed = parseInt(priceLevel, 10);
      if (!isNaN(parsed)) return parsed;
    }
    return null;
  }

  /**
   * Check Harv3st connection status
   */
  async checkHarv3stConnection(): Promise<{ connected: boolean; url: string }> {
    try {
      const response = await fetch(`${this.HARV3ST_URL}/api/status`, {
        signal: AbortSignal.timeout(5000),
      });
      return { connected: response.ok, url: this.HARV3ST_URL };
    } catch {
      return { connected: false, url: this.HARV3ST_URL };
    }
  }
}
