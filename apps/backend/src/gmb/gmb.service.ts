import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { Business, SearchParams, AuditResult, DEFAULT_CONFIG } from './types';
import axios from 'axios';
import * as fs from 'fs/promises';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { ClientType, ProjectStatus, PhaseStatus, AttachmentType } from '@prisma/client';
import { CreateProjectDto, UpdateProjectDto, CreatePhaseDto, UpdatePhaseDto, CreateTemplateDto } from './dtos';
import { SerpApiService } from './serp-api.service';

@Injectable()
export class GmbService {
    private readonly logger = new Logger(GmbService.name);

    constructor(
        private prisma: PrismaService,
        private serpApi: SerpApiService
    ) { }

    // --- Utility Functions ---
    private calculateWeightedScore(
        rating: number,
        reviews: number,
        m: number = DEFAULT_CONFIG.m,
        C: number = DEFAULT_CONFIG.C
    ): number {
        if (reviews === 0) return 0;
        return ((reviews * rating) + (m * C)) / (reviews + m);
    }

    private parseCoordinate(value: any): number {
        if (typeof value === 'number') return value;
        if (!value) return 0;
        return parseFloat(String(value)) || 0;
    }

    private getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
        const R = 6371;
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private async deleteFile(filePath: string) {
        try {
            const fullPath = join(process.cwd(), filePath);
            await fs.unlink(fullPath);
            this.logger.log(`Deleted file: ${fullPath}`);
        } catch (error) {
            this.logger.warn(`Failed to delete file ${filePath}: ${error.message}`);
        }
    }

    // --- OSM Helpers ---

    private async getCoordinates(address: string): Promise<{ lat: number; lon: number } | null> {
        try {
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
            const res = await axios.get(url, { headers: { 'User-Agent': 'FormaDigitalApp/1.0' } });
            if (res.data && res.data.length > 0) {
                return { lat: parseFloat(res.data[0].lat), lon: parseFloat(res.data[0].lon) };
            }
            return null;
        } catch (error) {
            this.logger.error("Nominatim Error", error);
            return null;
        }
    }

    private formatOSMAddress(tags: any): string {
        if (!tags) return "Ubicación desconocida";
        const parts = [tags['addr:street'], tags['addr:housenumber'], tags['addr:city']];
        return parts.filter(Boolean).join(' ') || "Dirección no detallada";
    }

    private async fetchOverpassNodes(lat: number, lon: number, radius: number, keywords: string): Promise<Business[]> {
        const query = `
            [out:json][timeout:25];
            (
              node["shop"](around:${radius},${lat},${lon});
              node["amenity"](around:${radius},${lat},${lon});
              node["office"](around:${radius},${lat},${lon});
            );
            out body;
        `;
        const url = 'https://overpass-api.de/api/interpreter';
        try {
            const res = await axios.post(url, `data=${encodeURIComponent(query)}`);
            const elements = res.data.elements || [];
            return elements.map((node: any) => ({
                name: node.tags?.name || node.tags?.brand || "Sin Nombre",
                category: node.tags?.shop || node.tags?.amenity || node.tags?.office || "Negocio",
                address: this.formatOSMAddress(node.tags),
                rating: 0,
                reviewCount: 0,
                latitude: node.lat,
                longitude: node.lon,
                isClient: false,
                googleMapsUri: `https://www.openstreetmap.org/node/${node.id}`
            })).filter((b: Business) => b.name !== "Sin Nombre");
        } catch (error) {
            this.logger.error("Overpass API Error", error);
            return [];
        }
    }

    // --- Main Features ---

    // --- Radar API Helpers ---

    private async searchRadarPlaces(lat: number, lon: number, radius: number, query: string): Promise<Business[]> {
        const url = 'https://api.radar.io/v1/search/places';
        const radarSecretKey = process.env.RADAR_SECRET_KEY;

        if (!radarSecretKey) {
            this.logger.error("RADAR_SECRET_KEY not configured");
            return [];
        }

        try {
            const res = await axios.get(url, {
                headers: { 'Authorization': radarSecretKey },
                params: {
                    near: `${lat},${lon}`,
                    radius: radius, // meters
                    limit: 20, // Free tier limit per call is generous, but let's keep it reasonable
                    chains: query, // Search by chain name first
                    // categories: query // Or callback to categories if needed? Radar uses strict params.
                    // For general keywords, we might need 'autocomplete' if 'search/places' is too strict on chains.
                    // Actually, 'search/places' with just 'near' and no chain/cat might return everything?
                    // Let's use 'search/autocomplete' for fuzzy matching or 'search/places' if we want specific categories.
                    // Radar docs say 'chains' or 'categories' are optional. But filtering by text query isn't direct.
                    // BETTER APPROACH: Use /v1/search/autocomplete for the text query, then get details?
                    // No, Autocomplete returns addresses. We want PLACES (competitors).
                    // Radar's /search/places is for specific chains/categories.
                    // If the user searches "Gym", we should pass category="gym".
                    // If user searches "McDonalds", we pass chain="mcdonalds".
                    // For generic text like "Pizza", Radar might expect "food-beverage".
                    // Let's try passing the query as 'chains' as a best effort, or implement a Category Mapper.
                }
            });

            // If simple chain search fails, we might need a more complex strategy,
            // but for now let's implement the basic call.
            // Wait, Radar /search/places requires 'chains' OR 'categories'.
            // If the user inputs a random keyword like "Crossfit", that's neither a known chain slug nor a category.
            // The User Request "searchCompetitors" usually expects keyword search.
            // OSM Overpass was great for this ("node[shop]...").
            // Radar is structured.
            // Strategy: We will try to map the keyword to a category, or defaulting to a broad category if possible?
            // "search/places" DOES NOT support free text query.
            // Alternative: "search/autocomplete" supports 'query' and returns places.
            // Let's use /v1/search/autocomplete with layers=place.
        } catch (error) {
            this.logger.error("Radar API Error", error);
            return [];
        }
        return [];
    }

    // --- Main Features ---

    async searchCompetitors(params: SearchParams): Promise<Business[]> {
        const cacheKey = `${params.keywords.toLowerCase().trim()}|${params.address.toLowerCase().trim()}|${params.radius}`;
        const cachedSearch = await this.prisma.gmbSearch.findFirst({
            where: {
                query: params.keywords,
                location: params.address,
                radius: params.radius,
            }
        });

        if (cachedSearch) {
            this.logger.log(`Cache HIT for search: ${params.keywords}`);
            return cachedSearch.results as any as Business[];
        }

        try {
            this.logger.log(`Radar Search: ${params.keywords} near ${params.address}`);

            // 1. Geocode the center address
            const coords = await this.getCoordinates(params.address); // Keeping OSM Geocoder for now as it works (or use Radar Geocode?)
            // Let's switch to Radar Geocode for consistency if we have the key.
            // But to save changes, let's stick to existing geocode unless broken.
            if (!coords) {
                this.logger.warn(`Could not geocode address: ${params.address}`);
                return [];
            }

            const radiusMeters = (params.radius || 2) * 1000;

            // 2. Perform Search
            // Using Autocomplete API for free text search behavior
            // Docs: GET https://api.radar.io/v1/search/autocomplete?query=pizza&near=lat,lon&layers=place
            const searchUrl = 'https://api.radar.io/v1/search/autocomplete';
            const radarSecretKey = process.env.RADAR_SECRET_KEY; // User must set this

            if (!radarSecretKey) {
                this.logger.warn("RADAR_SECRET_KEY not set. Returning empty.");
                return [];
            }

            const res = await axios.get(searchUrl, {
                headers: { 'Authorization': radarSecretKey },
                params: {
                    query: params.keywords,
                    near: `${coords.lat},${coords.lon}`,
                    radius: radiusMeters,
                    layers: 'place', // distinct places
                    limit: 20
                }
            });

            const businesses: Business[] = res.data.addresses.map((addr: any) => ({
                id: addr.placeLabel || addr.formattedAddress, // Radar doesn't give stable IDs in autocomplete easily?
                name: addr.placeLabel || addr.addressLabel || "Unknown",
                category: addr.category || "Place",
                address: addr.formattedAddress,
                rating: 0, // Radar doesn't have ratings
                reviewCount: 0,
                latitude: addr.latitude,
                longitude: addr.longitude,
                isClient: false,
                googleMapsUri: `https://www.google.com/maps/search/?api=1&query=${addr.latitude},${addr.longitude}`
            }));


            // Client placeholder
            const clientBusiness: Business = {
                id: 'client-placeholder',
                name: params.keywords.split(',')[0] + " (Cliente)",
                category: "Target",
                address: params.address,
                rating: 5.0,
                reviewCount: 0,
                latitude: coords.lat,
                longitude: coords.lon,
                isClient: true
            };

            const results = [clientBusiness, ...businesses];

            // Save Cache
            if (results.length > 0) {
                await this.prisma.gmbSearch.create({
                    data: {
                        query: params.keywords,
                        location: params.address,
                        radius: params.radius,
                        results: results as any,
                    }
                });
            }
            return results;

        } catch (error) {
            this.logger.error("Error in Radar searchCompetitors", error);
            throw error;
        }
    }

    async getCreditsUsage() {
        return this.serpApi.getAccountUsage();
    }

    async performAudit(
        clientData: Business | undefined,
        competitors: Business[],
        language: 'en' | 'es',
        userSearchAddress: string,
        productsList: string = "",
        zoneContext: string = ""
    ): Promise<AuditResult> {

        if (!clientData) {
            throw new HttpException("Se requieren datos del cliente para la auditoría", HttpStatus.BAD_REQUEST);
        }

        this.logger.log(`🔍 Starting AI Audit for: ${clientData.name}`);

        // 1. Persistence: Ensure Client Exists
        // We assume 'clientData' has at least name and address.
        // If it came from 'map', it might have a temporary ID.
        // We upsert based on name+address to get a stable DB ID.
        let dbClient = await this.prisma.client.findFirst({
            where: {
                name: clientData.name,
                address: clientData.address
            }
        });

        if (!dbClient) {
            this.logger.log(`Creating new client record for: ${clientData.name}`);
            dbClient = await this.prisma.client.create({
                data: {
                    name: clientData.name,
                    address: clientData.address,
                    category: clientData.category || "Unknown",
                    latitude: clientData.latitude || 0,
                    longitude: clientData.longitude || 0,
                    type: 'LEAD'
                }
            });
        }

        // 2. Prepare Payload for Agent
        const payload = {
            client: {
                ...clientData,
                products: productsList,
                zone: zoneContext,
                language: language
            },
            competitors: competitors.slice(0, 5) // Limit to top 5 to save tokens
        };

        // 3. Write Temp File
        const tempFileName = `audit_${Date.now()}_${Math.random().toString(36).substring(7)}.json`;
        const tempFilePath = join(process.cwd(), '..', '..', 'scripts', 'agent_v2', tempFileName);

        await fs.writeFile(tempFilePath, JSON.stringify(payload, null, 2));
        this.logger.log(`   📄 Payload written to: ${tempFilePath}`);

        // 4. Spawn Python Agent in Audit Mode
        try {
            const { exec } = await import('child_process');
            const path = await import('path');
            const scriptPath = path.resolve(process.cwd(), '..', '..', 'scripts', 'agent_v2', 'main.py');
            const cwd = path.resolve(process.cwd(), '..', '..', 'scripts', 'agent_v2');

            const command = `python "${scriptPath}" --mode audit --input "${tempFileName}"`;

            this.logger.log(`   🚀 Executing: ${command}`);

            const stdout = await new Promise<string>((resolve, reject) => {
                exec(command, { cwd, timeout: 180000 }, (error, stdout, stderr) => {
                    if (error) {
                        this.logger.error(`Agent Error: ${stderr}`);
                        reject(error);
                    } else {
                        resolve(stdout);
                    }
                });
            });

            // 5. Parse Result
            const response = JSON.parse(stdout);
            if (!response.success || !response.result) {
                throw new Error(response.error || "Agent returned failure");
            }

            const auditResult = response.result as AuditResult;
            auditResult.lastUpdated = Date.now();

            // 6. Persist Audit to DB
            await this.prisma.gmbAudit.create({
                data: {
                    businessName: clientData.name,
                    businessAddress: clientData.address,
                    auditData: auditResult as any,
                    clientId: dbClient.id
                }
            });
            this.logger.log(`   ✅ Audit saved to database for client: ${dbClient.name}`);

            // Cleanup
            await this.deleteFile(tempFilePath); // Path relative to Backend CWD? No, deleteFile uses join(process.cwd(), filePath).
            // Wait, deleteFile implementation is: fullPath = join(process.cwd(), filePath). 
            // We passed absolute path above? No, we constructed tempFilePath using absolute path logic.
            // Let's just use fs.unlink directly to be safe as we have the full path.
            await fs.unlink(tempFilePath).catch(e => this.logger.warn("Failed to delete temp file"));

            return auditResult;

        } catch (error) {
            this.logger.error(`Audit Failed: ${error.message}`);
            // Cleanup on error
            await fs.unlink(tempFilePath).catch(() => { });
            throw error;
        }
    }


    async getAllLeads(limit = 100) {
        return this.prisma.client.findMany({
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                notes: {
                    orderBy: { createdAt: 'desc' }
                },
                audits: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: { id: true, createdAt: true }
                }
            }
        });
    }

    async getClient(id: string) {
        return this.prisma.client.findUnique({
            where: { id },
            include: {
                notes: {
                    orderBy: { createdAt: 'desc' }
                },
                audits: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        });
    }

    async updateClient(id: string, data: any) {
        return this.prisma.client.update({
            where: { id },
            data: {
                name: data.name,
                address: data.address,
                phone: data.phone,
                website: data.website,
                type: data.type, // Allow updating status/type
                category: data.category
            }
        });
    }

    async addNote(clientId: string, content: string) {
        return this.prisma.clientNote.create({
            data: {
                clientId,
                content
            }
        });
    }

    async deleteNote(id: string) {
        return this.prisma.clientNote.delete({
            where: { id }
        });
    }

    // --- Projects ---

    async createProject(clientId: string, data: CreateProjectDto) {
        if (!data.name) throw new Error("Project name is required");

        // Check for template
        let phasesCreate: any[] = [];
        if (data.templateId) {
            const template = await this.prisma.projectTemplate.findUnique({ where: { id: data.templateId } });
            if (template && Array.isArray(template.phases)) {
                phasesCreate = (template.phases as any[]).map((p, index) => ({
                    name: p.name,
                    description: p.description,
                    order: index,
                    status: PhaseStatus.PENDING
                }));
            }
        }

        return this.prisma.project.create({
            data: {
                name: data.name,
                clientId: clientId,
                startDate: new Date(),
                status: ProjectStatus.PLANNING,
                budget: data.budget ? Number(data.budget) : undefined,
                phases: {
                    create: phasesCreate
                }
            },
            include: { phases: { include: { attachments: true }, orderBy: { order: 'asc' } } }
        });
    }



    async getClientProjects(clientId: string) {
        return this.prisma.project.findMany({
            where: { clientId },
            include: {
                phases: {
                    include: { attachments: true },
                    orderBy: { order: 'asc' }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async getAllProjects() {
        return this.prisma.project.findMany({
            include: {
                client: { select: { name: true, category: true } },
                phases: {
                    include: { attachments: true },
                    orderBy: { order: 'asc' }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });
    }

    async updateProject(id: string, data: UpdateProjectDto) {
        return this.prisma.project.update({
            where: { id },
            data: {
                status: data.status,
                endDate: data.status === 'COMPLETED' ? new Date() : undefined,
                budget: data.budget ? Number(data.budget) : undefined,
                actualCost: data.actualCost ? Number(data.actualCost) : undefined,
            }
        });
    }

    async deleteProject(id: string) {
        // Find all attachments in this project
        const project = await this.prisma.project.findUnique({
            where: { id },
            include: { phases: { include: { attachments: true } } }
        });

        if (project) {
            for (const phase of project.phases) {
                for (const attachment of phase.attachments) {
                    await this.deleteFile(attachment.filePath);
                }
            }
        }

        return this.prisma.project.delete({
            where: { id }
        });
    }

    // --- Phases ---

    async addPhase(projectId: string, data: CreatePhaseDto) {
        if (!data.name) throw new Error("Phase name is required");

        // Get max order
        const lastPhase = await this.prisma.projectPhase.findFirst({
            where: { projectId },
            orderBy: { order: 'desc' }
        });
        const order = lastPhase ? lastPhase.order + 1 : 0;

        return this.prisma.projectPhase.create({
            data: {
                projectId,
                name: data.name,
                description: data.description,
                order: order,
                status: PhaseStatus.PENDING
            }
        });
    }

    async updatePhase(id: string, data: UpdatePhaseDto) {
        return this.prisma.projectPhase.update({
            where: { id },
            data: {
                name: data.name,
                description: data.description,
                status: data.status,
                startDate: data.status === 'IN_PROGRESS' ? new Date() : undefined,
                endDate: data.status === 'DONE' ? new Date() : undefined
            },
            include: { attachments: true }
        });
    }

    async deletePhase(id: string) {
        const phase = await this.prisma.projectPhase.findUnique({
            where: { id },
            include: { attachments: true }
        });

        if (phase) {
            for (const attachment of phase.attachments) {
                await this.deleteFile(attachment.filePath);
            }
        }

        return this.prisma.projectPhase.delete({
            where: { id }
        });
    }

    async reorderPhase(id: string, direction: 'UP' | 'DOWN') {
        const phase = await this.prisma.projectPhase.findUnique({ where: { id } });
        if (!phase) throw new Error("Phase not found");

        const projectId = phase.projectId;
        const currentOrder = phase.order;

        // Find swap target
        const swapPhase = await this.prisma.projectPhase.findFirst({
            where: {
                projectId,
                order: direction === 'UP' ? { lt: currentOrder } : { gt: currentOrder }
            },
            orderBy: { order: direction === 'UP' ? 'desc' : 'asc' }
        });

        if (!swapPhase) return phase; // Already at top/bottom

        // Swap orders using transaction
        return this.prisma.$transaction([
            this.prisma.projectPhase.update({
                where: { id: phase.id },
                data: { order: swapPhase.order }
            }),
            this.prisma.projectPhase.update({
                where: { id: swapPhase.id },
                data: { order: currentOrder }
            })
        ]);
    }

    async addAttachment(phaseId: string, file: Express.Multer.File) {
        const type = file.mimetype.startsWith('image/') ? AttachmentType.IMAGE :
            file.mimetype.startsWith('audio/') ? AttachmentType.AUDIO : AttachmentType.FILE;

        return this.prisma.phaseAttachment.create({
            data: {
                phaseId,
                type: type,
                fileName: file.originalname,
                filePath: `/uploads/${file.filename}`
            }
        });
    }

    // --- Templates ---

    async createTemplate(data: CreateTemplateDto) {
        if (!data.name) throw new Error("Template name is required");

        const existing = await this.prisma.projectTemplate.findFirst({
            where: { name: data.name }
        });
        if (existing) {
            throw new Error(`Template with name "${data.name}" already exists.`);
        }

        return this.prisma.projectTemplate.create({
            data: {
                name: data.name,
                description: data.description,
                phases: data.phases // Expecting JSON array
            }
        });
    }

    async getTemplates() {
        return this.prisma.projectTemplate.findMany();
    }

    async deleteTemplate(id: string) {
        return this.prisma.projectTemplate.delete({
            where: { id }
        });
    }

    // --- Clients ---

    async createClient(data: { name: string; address: string; phone?: string; category?: string; type?: 'LEAD' | 'CLIENT' }) {
        // Use upsert to handle cases where client with same name+address already exists
        return this.prisma.client.upsert({
            where: {
                name_address: {
                    name: data.name,
                    address: data.address
                }
            },
            update: {
                // If exists, optionally update phone/category/type if provided
                ...(data.phone && { phone: data.phone }),
                ...(data.category && { category: data.category }),
                ...(data.type && { type: data.type })
            },
            create: {
                name: data.name,
                address: data.address,
                phone: data.phone,
                category: data.category,
                type: data.type || 'LEAD'
            }
        });
    }

    async deleteClient(id: string) {
        return this.prisma.client.delete({
            where: { id }
        });
    }

    // --- Reminders ---

    async getReminders(userId?: string) {
        const now = new Date();
        const reminders = await this.prisma.reminder.findMany({
            where: userId ? { userId } : {},
            orderBy: { dueDate: 'asc' },
            include: {
                user: { select: { id: true, name: true, email: true } },
                project: { select: { id: true, name: true } },
                client: { select: { id: true, name: true } }
            }
        });

        // Auto-update status: PENDING -> ACTIVE if dueDate has passed
        for (const reminder of reminders) {
            if (reminder.status === 'PENDING' && reminder.dueDate <= now) {
                await this.prisma.reminder.update({
                    where: { id: reminder.id },
                    data: { status: 'ACTIVE' }
                });
                reminder.status = 'ACTIVE';
            }
        }

        return reminders;
    }

    async createReminder(data: {
        title: string;
        description?: string;
        dueDate: string;
        userId: string;
        projectId?: string;
        clientId?: string;
    }) {
        return this.prisma.reminder.create({
            data: {
                title: data.title,
                description: data.description,
                dueDate: new Date(data.dueDate),
                userId: data.userId,
                projectId: data.projectId,
                clientId: data.clientId
            },
            include: {
                user: { select: { id: true, name: true, email: true } },
                project: { select: { id: true, name: true } },
                client: { select: { id: true, name: true } }
            }
        });
    }

    async updateReminder(id: string, data: { status?: string }) {
        return this.prisma.reminder.update({
            where: { id },
            data: {
                ...(data.status && { status: data.status as any })
            }
        });
    }

    async deleteReminder(id: string) {
        return this.prisma.reminder.delete({
            where: { id }
        });
    }

    // --- Project Assignment ---

    async assignProject(projectId: string, userId?: string) {
        return this.prisma.project.update({
            where: { id: projectId },
            data: { assignedToId: userId || null }
        });
    }

    // --- Users ---

    async getUsers() {
        return this.prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true
            },
            orderBy: { name: 'asc' }
        });
    }

    // =========================================================================
    // AGENT INTEGRATION (Agent V2)
    // =========================================================================

    /**
     * Start the Python analysis agent as a subprocess.
     * Returns a job ID for tracking (or the result if sync mode).
     */
    async startAgentAnalysis(params: {
        query: string;
        location?: string;
        limit?: number;
        dryRun?: boolean;
        apiKeys?: Record<string, string>;
    }) {
        const { exec } = await import('child_process');
        const path = await import('path');

        // Resolve path relative to process.cwd() (apps/backend)
        // We need to go up 2 levels: backend -> apps -> root -> scripts
        const scriptPath = path.resolve(process.cwd(), '..', '..', 'scripts', 'agent_v2', 'main.py');
        const cwd = path.resolve(process.cwd(), '..', '..', 'scripts', 'agent_v2');

        // Build command as single string for exec (handles spaces in args better on Windows)
        const locationArg = (params.location || 'Buenos Aires').replace(/"/g, '\\"');
        const queryArg = (params.query || 'negocio').replace(/"/g, '\\"');

        let command = `python "${scriptPath}" --query "${queryArg}" --location "${locationArg}" --limit ${params.limit || 10}`;

        if (params.dryRun) {
            command += ' --dry-run';
        }

        this.logger.log(`🚀 Starting Agent: ${command}`);
        this.logger.log(`   CWD: ${cwd}`);
        let env = { ...process.env };

        if (params.apiKeys) {
            // Only inject keys that have a non-empty value
            const validKeys = Object.entries(params.apiKeys).reduce((acc, [key, value]) => {
                if (value && value.trim().length > 0) {
                    acc[key] = value;
                }
                return acc;
            }, {} as Record<string, string>);

            if (Object.keys(validKeys).length > 0) {
                this.logger.log(`   🔑 Injecting custom API keys: ${Object.keys(validKeys).join(', ')}`);
                env = { ...env, ...validKeys };
            }
        }

        return new Promise((resolve, reject) => {
            exec(command, {
                cwd,
                timeout: 120000,
                env
            }, (error, stdout, stderr) => {
                if (stderr) {
                    this.logger.warn(`Agent stderr: ${stderr}`);
                }

                if (error) {
                    this.logger.error(`Agent failed: ${error.message}`);
                    reject(new Error(`Agent failed: ${error.message}`));
                    return;
                }

                try {
                    const result = JSON.parse(stdout);
                    this.logger.log(`✅ Agent completed: ${result.stats?.total || 0} leads`);
                    resolve(result);
                } catch (e) {
                    this.logger.warn('Agent output not JSON, returning raw');
                    resolve({ success: true, raw: stdout });
                }
            });
        });
    }

    /**
     * Batch upsert clients from the Python agent.
     * Uses placeId for deduplication, falls back to name+address.
     */
    async batchUpsertClients(clients: Array<{
        name: string;
        address?: string;
        phone?: string;
        website?: string;
        category?: string;
        rating?: number;
        reviewCount?: number;
        latitude?: number;
        longitude?: number;
        googleMapsUri?: string;
        placeId?: string;
        email?: string;
        instagram?: string;
        facebook?: string;
        linkedin?: string;
        tier?: string;
        score?: number;
        gaps?: any;
        summary?: string;
        source?: string;
    }>) {
        const results = {
            created: 0,
            updated: 0,
            errors: [] as string[],
        };

        for (const client of clients) {
            try {
                // Try to find by placeId first (most reliable)
                let existing = client.placeId
                    ? await this.prisma.client.findUnique({ where: { placeId: client.placeId } })
                    : null;

                // Fallback to name+address
                if (!existing && client.name && client.address) {
                    existing = await this.prisma.client.findUnique({
                        where: { name_address: { name: client.name, address: client.address } }
                    });
                }

                const data = {
                    name: client.name,
                    address: client.address || 'Unknown',
                    phone: client.phone,
                    website: client.website,
                    category: client.category,
                    rating: client.rating,
                    reviewCount: client.reviewCount,
                    latitude: client.latitude,
                    longitude: client.longitude,
                    googleMapsUri: client.googleMapsUri,
                    placeId: client.placeId,
                    email: client.email,
                    instagram: client.instagram,
                    facebook: client.facebook,
                    linkedin: client.linkedin,
                    tier: client.tier,
                    score: client.score,
                    gaps: client.gaps,
                    summary: client.summary,
                    source: client.source || 'Agent',
                    enrichedAt: new Date(),
                    type: 'LEAD' as const,
                };

                if (existing) {
                    await this.prisma.client.update({
                        where: { id: existing.id },
                        data,
                    });
                    results.updated++;
                } else {
                    await this.prisma.client.create({ data });
                    results.created++;
                }
            } catch (e) {
                results.errors.push(`${client.name}: ${e.message}`);
            }
        }

        this.logger.log(`📊 Batch upsert: ${results.created} created, ${results.updated} updated, ${results.errors.length} errors`);
        return results;
    }
}
