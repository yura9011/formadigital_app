import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Logger,
} from '@nestjs/common';
import { ProspectService } from './prospect.service';
import {
  GetLeadsDto,
  CreateContactDto,
  UpdateContactStatusDto,
  GetContactHistoryDto,
  GetTemplatesDto,
  SaveTemplateDto,
  UpdateConfigDto,
  ValidateContactDto,
  EnrichContactDto,
  GetStatsDto,
  SearchBusinessesDto,
} from './dto';

// Note: Authentication guard can be added later when JWT is implemented
// import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/prospect')
// @UseGuards(JwtAuthGuard) // Uncomment when JWT auth is implemented
export class ProspectController {
  private readonly logger = new Logger(ProspectController.name);

  constructor(private readonly prospectService: ProspectService) {}

  // ==================== SEARCH (HARV3ST INTEGRATION) ====================

  /**
   * Search for businesses using Harv3st and import to database
   * POST /api/prospect/search
   */
  @Post('search')
  async searchBusinesses(@Body() body: SearchBusinessesDto) {
    this.logger.log(`Searching businesses: "${body.query}"`);
    return this.prospectService.searchBusinesses(body);
  }

  /**
   * Check Harv3st connection status
   * GET /api/prospect/harv3st/status
   */
  @Get('harv3st/status')
  async checkHarv3stStatus() {
    this.logger.log('Checking Harv3st connection');
    return this.prospectService.checkHarv3stConnection();
  }

  // ==================== LEADS ====================

  /**
   * Get leads with filters for prospecting
   * GET /api/prospect/leads
   */
  @Get('leads')
  async getLeads(@Query() query: GetLeadsDto) {
    this.logger.log(`Getting leads with filters: ${JSON.stringify(query)}`);
    return this.prospectService.getLeads(query);
  }

  /**
   * Get detailed information about a specific lead
   * GET /api/prospect/leads/:id
   */
  @Get('leads/:id')
  async getLeadDetail(@Param('id') id: string) {
    this.logger.log(`Getting lead detail: ${id}`);
    return this.prospectService.getLeadDetail(id);
  }

  /**
   * Enrich contact data from website
   * POST /api/prospect/leads/:id/enrich
   */
  @Post('leads/:id/enrich')
  async enrichContact(@Param('id') id: string, @Body() body: EnrichContactDto) {
    this.logger.log(`Enriching contact: ${id}, fields: ${body.fields.join(', ')}`);
    return this.prospectService.enrichContact(id, body);
  }

  // ==================== CONTACTS ====================

  /**
   * Create a new contact record
   * POST /api/prospect/contacts
   */
  @Post('contacts')
  async createContact(@Body() body: CreateContactDto) {
    this.logger.log(`Creating contact for lead: ${body.leadId}`);
    return this.prospectService.createContactRecord(body);
  }

  /**
   * Update contact status
   * PATCH /api/prospect/contacts/:id/status
   */
  @Patch('contacts/:id/status')
  async updateContactStatus(
    @Param('id') id: string,
    @Body() body: UpdateContactStatusDto,
  ) {
    this.logger.log(`Updating contact status: ${id} -> ${body.status}`);
    return this.prospectService.updateContactStatus(id, body);
  }

  /**
   * Get contact history with filters
   * GET /api/prospect/contacts
   */
  @Get('contacts')
  async getContactHistory(@Query() query: GetContactHistoryDto) {
    this.logger.log(`Getting contact history with filters: ${JSON.stringify(query)}`);
    return this.prospectService.getContactHistory(query);
  }

  /**
   * Get contact statistics
   * GET /api/prospect/contacts/stats
   */
  @Get('contacts/stats')
  async getContactStats(@Query() query: GetStatsDto) {
    this.logger.log(`Getting contact stats`);
    return this.prospectService.getContactStats(undefined, query.dateFrom, query.dateTo);
  }

  // ==================== TEMPLATES ====================

  /**
   * Get message templates
   * GET /api/prospect/templates
   */
  @Get('templates')
  async getTemplates(@Query() query: GetTemplatesDto) {
    this.logger.log(`Getting templates with filters: ${JSON.stringify(query)}`);
    return this.prospectService.getTemplates(query);
  }

  /**
   * Save (create or update) a message template
   * POST /api/prospect/templates
   */
  @Post('templates')
  async saveTemplate(@Body() body: SaveTemplateDto) {
    this.logger.log(`Saving template: ${body.name}`);
    return this.prospectService.saveTemplate(body);
  }

  // ==================== CONFIG ====================

  /**
   * Get user prospect configuration
   * GET /api/prospect/config
   */
  @Get('config')
  async getConfig(@Query('userId') userId?: string) {
    this.logger.log(`Getting config for user: ${userId || 'default'}`);
    // For now, use a default user ID if not provided
    return this.prospectService.getConfig(userId || 'default-user');
  }

  /**
   * Update user prospect configuration
   * PATCH /api/prospect/config
   */
  @Patch('config')
  async updateConfig(@Body() body: UpdateConfigDto, @Query('userId') userId?: string) {
    this.logger.log(`Updating config for user: ${userId || 'default'}`);
    return this.prospectService.updateConfig(userId || 'default-user', body);
  }

  // ==================== VALIDATION ====================

  /**
   * Validate contact data (phone, email, instagram)
   * POST /api/prospect/validate
   */
  @Post('validate')
  async validateContactData(@Body() body: ValidateContactDto) {
    this.logger.log(`Validating ${body.channel}: ${body.value}`);
    return this.prospectService.validateContactData(body);
  }
}
