import { Test, TestingModule } from '@nestjs/testing';
import { GmbService } from './gmb.service';
import { SerpApiService } from './serp-api.service';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('GmbService', () => {
    let service: GmbService;
    let serpApiService: SerpApiService;
    let prismaService: PrismaService;

    const mockSerpApiService = {
        getAccountUsage: jest.fn(),
        fetchBusinessDetails: jest.fn(),
    };

    const mockPrismaService = {
        client: {
            create: jest.fn(),
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            findMany: jest.fn(),
        },
        gmbSearch: {
            findFirst: jest.fn(),
            create: jest.fn(),
            update: jest.fn()
        },
        gmbAudit: {
            create: jest.fn(),
        }
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GmbService,
                { provide: SerpApiService, useValue: mockSerpApiService },
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<GmbService>(GmbService);
        serpApiService = module.get<SerpApiService>(SerpApiService);
        prismaService = module.get<PrismaService>(PrismaService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getCreditsUsage', () => {
        it('should call serpApi.getAccountUsage', async () => {
            const mockCredits = { total: 250, used: 10, remaining: 240 };
            mockSerpApiService.getAccountUsage.mockResolvedValue(mockCredits);

            const result = await service.getCreditsUsage();

            expect(serpApiService.getAccountUsage).toHaveBeenCalled();
            expect(result).toEqual(mockCredits);
        });
    });

    describe('searchCompetitors', () => {
        it('should use Nominatim for Geocoding and Radar API for Search', async () => {
            const params = {
                address: 'Test Address',
                keywords: 'Kiosco',
                radius: 1000,
                products: ''
            };

            // 1. Mock Nominatim Geocode Response (OSM)
            mockedAxios.get.mockResolvedValueOnce({
                data: [{ lat: "-31.0", lon: "-64.0" }]
            });

            // 2. Mock Radar Places Response (Autocomplete)
            mockedAxios.get.mockResolvedValueOnce({
                data: {
                    addresses: [
                        {
                            placeLabel: 'Kiosco Test',
                            latitude: -31.001,
                            longitude: -64.001,
                            formattedAddress: 'Calle Falsa 123',
                        }
                    ]
                }
            });

            const result = await service.searchCompetitors(params);

            // Verify Nominatim Geocode call
            expect(mockedAxios.get).toHaveBeenCalledWith(
                expect.stringContaining('nominatim.openstreetmap.org/search'),
                expect.any(Object)
            );

            // Verify Radar Search call
            expect(mockedAxios.get).toHaveBeenCalledWith(
                expect.stringContaining('api.radar.io/v1/search/autocomplete'),
                expect.any(Object)
            );

            expect(result).toBeDefined();
            expect(result.length).toBeGreaterThan(1);
            expect(result[1].name).toBe('Kiosco Test');
        });

        it('should handle Radar API errors gracefully by throwing', async () => {
            const params = { address: 'Test Address', keywords: 'Kiosco', radius: 1000, products: '' };

            // 1. Mock Nominatim Success
            mockedAxios.get.mockResolvedValueOnce({
                data: [{ lat: "-31.0", lon: "-64.0" }]
            });

            // 2. Mock Radar Error
            mockedAxios.get.mockRejectedValue(new Error('Radar Error'));

            await expect(service.searchCompetitors(params)).rejects.toThrow();
        });
    });

    describe('performAudit', () => {
        const mockClientData = {
            id: 'test-id',
            name: 'Kiosco Test',
            address: 'Calle Test 123',
            category: 'Convenience Store',
            latitude: -31.0,
            longitude: -64.0,
        };

        const mockCompetitors = [
            { name: 'Competitor 1', rating: 4.5 },
            { name: 'Competitor 2', rating: 4.0 },
        ];

        beforeEach(() => {
            // Mock findFirst to return null (new client)
            mockPrismaService.client.findFirst = jest.fn().mockResolvedValue(null);
            // Mock create to return the client
            mockPrismaService.client.create = jest.fn().mockResolvedValue({
                id: 'new-client-id',
                ...mockClientData,
            });
            // Mock gmbAudit create
            mockPrismaService.gmbAudit = {
                create: jest.fn().mockResolvedValue({ id: 'audit-id' }),
            };
        });

        it('should throw error if clientData is undefined', async () => {
            await expect(
                service.performAudit(undefined, mockCompetitors, 'es', 'Test Address')
            ).rejects.toThrow('Client data is required for audit');
        });

        it('should create client if not exists in database', async () => {
            // This test will fail without the Python agent running
            // but validates the DB lookup logic
            try {
                await service.performAudit(
                    mockClientData as any,
                    mockCompetitors as any,
                    'es',
                    'Test Address'
                );
            } catch (e) {
                // Expected to fail due to subprocess
            }

            // Verify findFirst was called
            expect(mockPrismaService.client.findFirst).toHaveBeenCalledWith({
                where: {
                    name: mockClientData.name,
                    address: mockClientData.address,
                }
            });
        });

        it('should upsert client with correct data', async () => {
            try {
                await service.performAudit(
                    mockClientData as any,
                    mockCompetitors as any,
                    'es',
                    'Test Address'
                );
            } catch (e) {
                // Expected to fail due to subprocess
            }

            // Verify create was called with correct schema
            expect(mockPrismaService.client.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    name: mockClientData.name,
                    address: mockClientData.address,
                    category: mockClientData.category,
                    type: 'LEAD',
                })
            });
        });
    });

    describe('getAllLeads', () => {
        it('should include audits relation', async () => {
            mockPrismaService.client.findMany = jest.fn().mockResolvedValue([]);

            await service.getAllLeads();

            expect(mockPrismaService.client.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    include: expect.objectContaining({
                        audits: expect.any(Object),
                    })
                })
            );
        });
    });
});
