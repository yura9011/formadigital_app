import { Test, TestingModule } from '@nestjs/testing';
import { ProspectService } from './prospect.service';
import { PrismaService } from '../prisma/prisma.service';
import { EnrichmentService } from './services/enrichment.service';
import { EnrichmentService as PipelineEnrichmentService } from '../pipeline/enrichment.service';
import * as fc from 'fast-check';

/**
 * Property-Based Tests for ProspectService
 * 
 * These tests validate the correctness properties defined in the design document.
 */

// Mock PrismaService
const mockPrismaService = {
  client: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  contactRecord: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  messageTemplate: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  prospectConfig: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
};

// Mock EnrichmentService
const mockEnrichmentService = {
  enrichFromWebsite: jest.fn(),
};

// Arbitrary generators for test data
const clientArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  address: fc.string({ minLength: 1, maxLength: 200 }),
  phone: fc.option(fc.string({ minLength: 10, maxLength: 15 })),
  website: fc.option(fc.webUrl()),
  email: fc.option(fc.emailAddress()),
  instagram: fc.option(fc.string({ minLength: 1, maxLength: 30 })),
  facebook: fc.option(fc.string()),
  linkedin: fc.option(fc.string()),
  rating: fc.option(fc.float({ min: 1, max: 5 })),
  reviewCount: fc.option(fc.integer({ min: 0, max: 10000 })),
  category: fc.option(fc.string()),
  latitude: fc.option(fc.float({ min: -90, max: 90 })),
  longitude: fc.option(fc.float({ min: -180, max: 180 })),
  googleMapsUri: fc.option(fc.webUrl()),
  tier: fc.option(fc.constantFrom('HOT', 'WARM', 'COLD')),
  score: fc.option(fc.integer({ min: 0, max: 100 })),
  gaps: fc.option(fc.array(fc.string())),
  summary: fc.option(fc.string()),
  source: fc.option(fc.string()),
  placeId: fc.option(fc.uuid()),
  contactStatus: fc.option(fc.constantFrom('none', 'pending', 'approved', 'sent', 'rejected', 'responded')),
  lastContactedAt: fc.option(fc.date()),
  createdAt: fc.date(),
  updatedAt: fc.date(),
});

const contactArbitrary = fc.record({
  leadId: fc.uuid(),
  channel: fc.constantFrom('instagram', 'whatsapp', 'email') as fc.Arbitrary<'instagram' | 'whatsapp' | 'email'>,
  message: fc.string({ minLength: 1, maxLength: 500 }),
  status: fc.constantFrom('pending', 'approved') as fc.Arbitrary<'pending' | 'approved'>,
  notes: fc.option(fc.string({ maxLength: 200 })),
});

describe('ProspectService', () => {
  let service: ProspectService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProspectService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: EnrichmentService,
          useValue: mockEnrichmentService,
        },
        {
          provide: PipelineEnrichmentService,
          useValue: { enrichInstagram: jest.fn().mockResolvedValue({ success: true }) },
        },
      ],
    }).compile();

    service = module.get<ProspectService>(ProspectService);
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Property 1: Lead Filtering Correctness', () => {
    /**
     * Property 1: Lead Filtering Correctness
     * For any set of leads and any filter criteria, all returned leads must satisfy the filter conditions.
     * 
     * **Validates: Requirements 1.2, 1.3, 1.4**
     */
    it('should return only leads that match minScore filter', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(clientArbitrary, { minLength: 1, maxLength: 20 }),
          fc.integer({ min: 0, max: 100 }),
          async (clients, minScore) => {
            const filteredClients = clients.filter(c => (c.score ?? 0) >= minScore);
            mockPrismaService.client.count.mockResolvedValue(filteredClients.length);
            mockPrismaService.client.findMany.mockResolvedValue(filteredClients);

            const result = await service.getLeads({ minScore });

            for (const lead of result.leads) {
              expect(lead.opportunityScore).toBeGreaterThanOrEqual(minScore);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return only leads with website when hasWebsite=true', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(clientArbitrary, { minLength: 1, maxLength: 20 }),
          async (clients) => {
            const filteredClients = clients.filter(c => c.website !== null && c.website !== undefined);
            mockPrismaService.client.count.mockResolvedValue(filteredClients.length);
            mockPrismaService.client.findMany.mockResolvedValue(filteredClients);

            const result = await service.getLeads({ hasWebsite: true });

            for (const lead of result.leads) {
              expect(lead.website).toBeTruthy();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return only leads with phone when hasPhone=true', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(clientArbitrary, { minLength: 1, maxLength: 20 }),
          async (clients) => {
            const filteredClients = clients.filter(c => c.phone !== null && c.phone !== undefined);
            mockPrismaService.client.count.mockResolvedValue(filteredClients.length);
            mockPrismaService.client.findMany.mockResolvedValue(filteredClients);

            const result = await service.getLeads({ hasPhone: true });

            for (const lead of result.leads) {
              expect(lead.phone).toBeTruthy();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 2: Contacted Leads Exclusion', () => {
    /**
     * Property 2: Contacted Leads Exclusion
     * For any query without includeContacted=true, no returned leads should have contactStatus of 'sent' or 'responded'.
     * 
     * **Validates: Requirements 1.4**
     */
    it('should exclude contacted leads by default', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(clientArbitrary, { minLength: 1, maxLength: 20 }),
          async (clients) => {
            const filteredClients = clients.filter(
              c => !c.contactStatus || c.contactStatus === 'none'
            );
            mockPrismaService.client.count.mockResolvedValue(filteredClients.length);
            mockPrismaService.client.findMany.mockResolvedValue(filteredClients);

            const result = await service.getLeads({});

            for (const lead of result.leads) {
              expect(['none', 'pending', 'approved', 'rejected', undefined]).toContain(lead.contactStatus);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include contacted leads when includeContacted=true', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(clientArbitrary, { minLength: 1, maxLength: 20 }),
          async (clients) => {
            mockPrismaService.client.count.mockResolvedValue(clients.length);
            mockPrismaService.client.findMany.mockResolvedValue(clients);

            const result = await service.getLeads({ includeContacted: true });

            expect(result.total).toBe(clients.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 3: Contact Record Round-Trip', () => {
    /**
     * Property 3: Contact Record Round-Trip
     * For any valid contact creation request, creating a contact and then retrieving it
     * should return the same data that was submitted.
     * 
     * **Validates: Requirements 5.1, 5.2**
     */
    it('should preserve contact data through creation', async () => {
      await fc.assert(
        fc.asyncProperty(
          contactArbitrary,
          clientArbitrary,
          async (contactData, clientData) => {
            const mockClient = { ...clientData, id: contactData.leadId };
            mockPrismaService.client.findUnique.mockResolvedValue(mockClient);
            
            const createdContact = {
              id: 'contact-' + Date.now(),
              clientId: contactData.leadId,
              channel: contactData.channel,
              message: contactData.message,
              status: contactData.status || 'pending',
              notes: contactData.notes ?? null,
              sentAt: null,
              respondedAt: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            mockPrismaService.contactRecord.create.mockResolvedValue(createdContact);
            mockPrismaService.client.update.mockResolvedValue({ ...mockClient, contactStatus: contactData.status });

            const result = await service.createContactRecord({
              leadId: contactData.leadId,
              channel: contactData.channel,
              message: contactData.message,
              status: contactData.status,
              notes: contactData.notes ?? undefined,
            });

            expect(result.contactRecord.leadId).toBe(contactData.leadId);
            expect(result.contactRecord.channel).toBe(contactData.channel);
            expect(result.contactRecord.message).toBe(contactData.message);
            expect(result.contactRecord.status).toBe(contactData.status || 'pending');
            expect(result.leadUpdated).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 4: Contact Status Update Integrity', () => {
    /**
     * Property 4: Contact Status Update Integrity
     * For any contact status update, the new status should be correctly persisted
     * and timestamps should be set appropriately.
     * 
     * **Validates: Requirements 5.4, 5.5**
     */
    it('should correctly update contact status and set timestamps', async () => {
      const statusArbitrary = fc.constantFrom('pending', 'approved', 'sent', 'rejected', 'responded') as fc.Arbitrary<'pending' | 'approved' | 'sent' | 'rejected' | 'responded'>;
      
      await fc.assert(
        fc.asyncProperty(
          contactArbitrary,
          clientArbitrary,
          statusArbitrary,
          async (contactData, clientData, newStatus) => {
            const contactId = 'contact-' + Date.now();
            const mockClient = { ...clientData, id: contactData.leadId };
            
            const existingContact = {
              id: contactId,
              clientId: contactData.leadId,
              client: mockClient,
              channel: contactData.channel,
              message: contactData.message,
              status: 'pending',
              notes: null,
              sentAt: null,
              respondedAt: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            
            mockPrismaService.contactRecord.findUnique.mockResolvedValue(existingContact);
            
            const updatedContact = {
              ...existingContact,
              status: newStatus,
              sentAt: newStatus === 'sent' ? new Date() : null,
              respondedAt: newStatus === 'responded' ? new Date() : null,
              updatedAt: new Date(),
            };
            mockPrismaService.contactRecord.update.mockResolvedValue(updatedContact);
            mockPrismaService.client.update.mockResolvedValue({ ...mockClient, contactStatus: newStatus });

            const result = await service.updateContactStatus(contactId, { status: newStatus });

            // Verify status was updated
            expect(result.contactRecord.status).toBe(newStatus);
            expect(result.previousStatus).toBe('pending');
            
            // Verify timestamps are set correctly
            if (newStatus === 'sent') {
              expect(result.contactRecord.sentAt).toBeTruthy();
            }
            if (newStatus === 'responded') {
              expect(result.contactRecord.respondedAt).toBeTruthy();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 11: Contact Statistics Consistency', () => {
    /**
     * Property 11: Contact Statistics Consistency
     * For any set of contacts, the statistics should accurately reflect the data:
     * - totalContacts equals the sum of all byStatus counts
     * - byChannel counts sum to totalContacts
     * - responseRate is correctly calculated
     * 
     * **Validates: Requirements 6.5, 6.6**
     */
    it('should calculate consistent statistics', async () => {
      const contactRecordArbitrary = fc.record({
        id: fc.uuid(),
        clientId: fc.uuid(),
        channel: fc.constantFrom('instagram', 'whatsapp', 'email'),
        message: fc.string(),
        status: fc.constantFrom('none', 'pending', 'approved', 'sent', 'rejected', 'responded'),
        notes: fc.option(fc.string()),
        sentAt: fc.option(fc.date({ noInvalidDate: true })),
        respondedAt: fc.option(fc.date({ noInvalidDate: true })),
        createdAt: fc.date({ min: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), noInvalidDate: true }), // Within last week
        updatedAt: fc.date({ noInvalidDate: true }),
      });

      await fc.assert(
        fc.asyncProperty(
          fc.array(contactRecordArbitrary, { minLength: 0, maxLength: 50 }),
          async (contacts) => {
            mockPrismaService.contactRecord.findMany.mockResolvedValue(contacts);

            const stats = await service.getContactStats();

            // Verify totalContacts
            expect(stats.totalContacts).toBe(contacts.length);

            // Verify byStatus sums to total
            const statusSum = Object.values(stats.byStatus).reduce((a, b) => a + b, 0);
            expect(statusSum).toBe(contacts.length);

            // Verify byChannel sums to total
            const channelSum = Object.values(stats.byChannel).reduce((a, b) => a + b, 0);
            expect(channelSum).toBe(contacts.length);

            // Verify response rate calculation
            const sentCount = contacts.filter(c => c.status === 'sent' || c.status === 'responded').length;
            const respondedCount = contacts.filter(c => c.status === 'responded').length;
            const expectedRate = sentCount > 0 ? Math.round((respondedCount / sentCount) * 100 * 100) / 100 : 0;
            expect(stats.responseRate).toBe(expectedRate);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 8: Template Persistence Round-Trip', () => {
    /**
     * Property 8: Template Persistence Round-Trip
     * For any valid template, saving it and then retrieving it should return
     * the same data that was submitted.
     * 
     * **Validates: Requirements 4.2, 4.3**
     */
    const templateArbitrary = fc.record({
      name: fc.string({ minLength: 1, maxLength: 100 }),
      channel: fc.constantFrom('instagram', 'whatsapp', 'email') as fc.Arbitrary<'instagram' | 'whatsapp' | 'email'>,
      scenario: fc.constantFrom('sin_sitio', 'rating_bajo', 'sin_fotos', 'sin_redes', 'general') as fc.Arbitrary<'sin_sitio' | 'rating_bajo' | 'sin_fotos' | 'sin_redes' | 'general'>,
      content: fc.string({ minLength: 1, maxLength: 1000 }),
      isDefault: fc.boolean(),
    });

    it('should preserve template data through creation', async () => {
      await fc.assert(
        fc.asyncProperty(
          templateArbitrary,
          async (templateData) => {
            const createdTemplate = {
              id: 'template-' + Date.now(),
              name: templateData.name,
              channel: templateData.channel,
              scenario: templateData.scenario,
              content: templateData.content,
              isDefault: templateData.isDefault,
              userId: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            mockPrismaService.messageTemplate.create.mockResolvedValue(createdTemplate);

            const result = await service.saveTemplate({
              name: templateData.name,
              channel: templateData.channel,
              scenario: templateData.scenario,
              content: templateData.content,
              isDefault: templateData.isDefault,
            });

            // Verify: returned data matches input
            expect(result.template.name).toBe(templateData.name);
            expect(result.template.channel).toBe(templateData.channel);
            expect(result.template.scenario).toBe(templateData.scenario);
            expect(result.template.content).toBe(templateData.content);
            expect(result.template.isDefault).toBe(templateData.isDefault);
            expect(result.created).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve template data through update', async () => {
      await fc.assert(
        fc.asyncProperty(
          templateArbitrary,
          fc.uuid(),
          async (templateData, templateId) => {
            const updatedTemplate = {
              id: templateId,
              name: templateData.name,
              channel: templateData.channel,
              scenario: templateData.scenario,
              content: templateData.content,
              isDefault: templateData.isDefault,
              userId: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            mockPrismaService.messageTemplate.update.mockResolvedValue(updatedTemplate);

            const result = await service.saveTemplate({
              id: templateId,
              name: templateData.name,
              channel: templateData.channel,
              scenario: templateData.scenario,
              content: templateData.content,
              isDefault: templateData.isDefault,
            });

            // Verify: returned data matches input
            expect(result.template.id).toBe(templateId);
            expect(result.template.name).toBe(templateData.name);
            expect(result.template.channel).toBe(templateData.channel);
            expect(result.template.scenario).toBe(templateData.scenario);
            expect(result.template.content).toBe(templateData.content);
            expect(result.created).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 5, 6, 7: Contact Data Validation', () => {
    /**
     * Property 5: Phone Number Validation and Normalization
     * For any valid phone number, validation should return isValid=true and a normalized value.
     * 
     * Property 6: Email Validation
     * For any valid email, validation should return isValid=true and a normalized (lowercase) value.
     * 
     * Property 7: Instagram Handle Validation
     * For any valid Instagram handle, validation should return isValid=true and a normalized value.
     * 
     * **Validates: Requirements 10.1, 10.2, 10.3, 10.5**
     */

    it('Property 5: should validate and normalize phone numbers with country code', () => {
      // Phone numbers that already have country code (+54)
      const validPhoneArbitrary = fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 10, maxLength: 12 })
        .map(digits => '+54' + digits.join(''));

      fc.assert(
        fc.property(
          validPhoneArbitrary,
          (phone) => {
            const result = service.validateContactData({ channel: 'whatsapp', value: phone });
            
            // Valid phones should pass validation
            expect(result.isValid).toBe(true);
            // Normalized value should start with +
            expect(result.normalizedValue).toMatch(/^\+/);
            // Normalized value should only contain digits and +
            expect(result.normalizedValue).toMatch(/^\+\d+$/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 5: should normalize phone numbers by adding country code', () => {
      // Phone numbers without country code (will get +54 added)
      const phoneArbitrary = fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 7, maxLength: 12 })
        .map(digits => digits.join(''));

      fc.assert(
        fc.property(
          phoneArbitrary,
          (phone) => {
            const result = service.validateContactData({ channel: 'whatsapp', value: phone });
            
            // After normalization, should have country code
            if (result.isValid && result.normalizedValue) {
              expect(result.normalizedValue).toMatch(/^\+54/);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 6: should validate and normalize emails', () => {
      fc.assert(
        fc.property(
          fc.emailAddress(),
          (email) => {
            const result = service.validateContactData({ channel: 'email', value: email });
            
            expect(result.isValid).toBe(true);
            // Normalized value should be lowercase
            expect(result.normalizedValue).toBe(email.toLowerCase().trim());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 6: should reject invalid emails', () => {
      const invalidEmailArbitrary = fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('@') || !s.includes('.'));

      fc.assert(
        fc.property(
          invalidEmailArbitrary,
          (email) => {
            const result = service.validateContactData({ channel: 'email', value: email });
            expect(result.isValid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 7: should validate and normalize Instagram handles', () => {
      // Valid Instagram handle: 1-30 chars, alphanumeric, underscores, periods
      const chars = 'abcdefghijklmnopqrstuvwxyz0123456789_.';
      const validInstagramArbitrary = fc.array(
        fc.integer({ min: 0, max: chars.length - 1 }).map(i => chars[i]),
        { minLength: 1, maxLength: 30 }
      ).map(arr => arr.join(''));

      fc.assert(
        fc.property(
          validInstagramArbitrary,
          (handle) => {
            const result = service.validateContactData({ channel: 'instagram', value: handle });
            
            expect(result.isValid).toBe(true);
            // Normalized value should be lowercase without @
            expect(result.normalizedValue).toBe(handle.toLowerCase().trim());
            expect(result.normalizedValue).not.toContain('@');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 7: should remove @ from Instagram handles', () => {
      const chars = 'abcdefghijklmnopqrstuvwxyz0123456789_.';
      const validInstagramArbitrary = fc.array(
        fc.integer({ min: 0, max: chars.length - 1 }).map(i => chars[i]),
        { minLength: 1, maxLength: 30 }
      ).map(arr => arr.join(''));

      fc.assert(
        fc.property(
          validInstagramArbitrary,
          (handle) => {
            const handleWithAt = '@' + handle;
            const result = service.validateContactData({ channel: 'instagram', value: handleWithAt });
            
            expect(result.isValid).toBe(true);
            expect(result.normalizedValue).toBe(handle.toLowerCase());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 7: should reject Instagram handles that are too long', () => {
      const chars = 'abcdefghijklmnopqrstuvwxyz0123456789_.';
      const longHandleArbitrary = fc.array(
        fc.integer({ min: 0, max: chars.length - 1 }).map(i => chars[i]),
        { minLength: 31, maxLength: 50 }
      ).map(arr => arr.join(''));

      fc.assert(
        fc.property(
          longHandleArbitrary,
          (handle) => {
            const result = service.validateContactData({ channel: 'instagram', value: handle });
            expect(result.isValid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 9: User Config Persistence Round-Trip', () => {
    /**
     * Property 9: User Config Persistence Round-Trip
     * For any valid config update, updating config and then retrieving it should return
     * the same data that was submitted.
     * 
     * **Validates: Requirements 8.1, 8.2**
     */
    const configArbitrary = fc.record({
      userName: fc.string({ minLength: 0, maxLength: 100 }),
      companyName: fc.string({ minLength: 0, maxLength: 100 }),
      defaultChannel: fc.constantFrom('instagram', 'whatsapp', 'email') as fc.Arbitrary<'instagram' | 'whatsapp' | 'email'>,
      maxContactsPerSession: fc.integer({ min: 1, max: 100 }),
      signature: fc.string({ minLength: 0, maxLength: 500 }),
      instagramHandle: fc.string({ minLength: 0, maxLength: 30 }),
      whatsappNumber: fc.string({ minLength: 0, maxLength: 20 }),
      emailAddress: fc.option(fc.emailAddress()).map(e => e ?? ''),
    });

    it('should preserve config data through update', async () => {
      await fc.assert(
        fc.asyncProperty(
          configArbitrary,
          fc.uuid(),
          async (configData, userId) => {
            const savedConfig = {
              id: 'config-' + Date.now(),
              userId,
              userName: configData.userName,
              companyName: configData.companyName,
              defaultChannel: configData.defaultChannel,
              maxContactsPerSession: configData.maxContactsPerSession,
              signature: configData.signature,
              instagramHandle: configData.instagramHandle,
              whatsappNumber: configData.whatsappNumber,
              emailAddress: configData.emailAddress,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            mockPrismaService.prospectConfig.upsert.mockResolvedValue(savedConfig);

            const result = await service.updateConfig(userId, {
              userName: configData.userName,
              companyName: configData.companyName,
              defaultChannel: configData.defaultChannel,
              maxContactsPerSession: configData.maxContactsPerSession,
              signature: configData.signature,
              instagramHandle: configData.instagramHandle,
              whatsappNumber: configData.whatsappNumber,
              emailAddress: configData.emailAddress,
            });

            // Verify: returned data matches input
            expect(result.config.userName).toBe(configData.userName);
            expect(result.config.companyName).toBe(configData.companyName);
            expect(result.config.defaultChannel).toBe(configData.defaultChannel);
            expect(result.config.maxContactsPerSession).toBe(configData.maxContactsPerSession);
            expect(result.config.signature).toBe(configData.signature);
            expect(result.config.instagramHandle).toBe(configData.instagramHandle);
            expect(result.config.whatsappNumber).toBe(configData.whatsappNumber);
            expect(result.config.emailAddress).toBe(configData.emailAddress);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return default config when none exists', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          async (userId) => {
            mockPrismaService.prospectConfig.findUnique.mockResolvedValue(null);

            const result = await service.getConfig(userId);

            // Verify: default config is returned
            expect(result.isDefault).toBe(true);
            expect(result.config.defaultChannel).toBe('instagram');
            expect(result.config.maxContactsPerSession).toBe(10);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should return existing config when it exists', async () => {
      await fc.assert(
        fc.asyncProperty(
          configArbitrary,
          fc.uuid(),
          async (configData, userId) => {
            const existingConfig = {
              id: 'config-' + Date.now(),
              userId,
              userName: configData.userName,
              companyName: configData.companyName,
              defaultChannel: configData.defaultChannel,
              maxContactsPerSession: configData.maxContactsPerSession,
              signature: configData.signature,
              instagramHandle: configData.instagramHandle,
              whatsappNumber: configData.whatsappNumber,
              emailAddress: configData.emailAddress,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            mockPrismaService.prospectConfig.findUnique.mockResolvedValue(existingConfig);

            const result = await service.getConfig(userId);

            // Verify: existing config is returned
            expect(result.isDefault).toBe(false);
            expect(result.config.userName).toBe(configData.userName);
            expect(result.config.companyName).toBe(configData.companyName);
            expect(result.config.defaultChannel).toBe(configData.defaultChannel);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
