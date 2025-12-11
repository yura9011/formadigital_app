import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI, Type } from '@google/genai';
import { Business, SearchParams, AuditResult, DEFAULT_CONFIG } from './types';
import * as fs from 'fs/promises';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { ClientType, ProjectStatus, PhaseStatus, AttachmentType } from '@prisma/client';
import { CreateProjectDto, UpdateProjectDto, CreatePhaseDto, UpdatePhaseDto, CreateTemplateDto } from './dtos';

@Injectable()
export class GmbService {
    private readonly logger = new Logger(GmbService.name);
    private genAI: GoogleGenAI;

    constructor(private prisma: PrismaService) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            this.logger.warn('GEMINI_API_KEY is not defined in environment variables');
        } else {
            this.genAI = new GoogleGenAI({ apiKey });
        }
    }

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

        const str = String(value).toLowerCase();
        let multiplier = 1;
        if (str.includes('s') || str.includes('w')) multiplier = -1;

        const match = str.match(/[+-]?([0-9]*[.])?[0-9]+/);
        if (match) {
            return parseFloat(match[0]) * multiplier;
        }
        return 0;
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

    // --- Reliability Features ---
    private async deleteFile(filePath: string) {
        try {
            // filePath is relative like /uploads/xyz.jpg. We need absolute or relative to root.
            // Assuming '.' is root of app when running.
            const fullPath = join(process.cwd(), filePath);
            await fs.unlink(fullPath);
            this.logger.log(`Deleted file: ${fullPath}`);
        } catch (error) {
            this.logger.warn(`Failed to delete file ${filePath}: ${error.message}`);
        }
    }

    private async generateContentWithRetry(modelName: string, prompt: string, config: any, retries = 3): Promise<any> {
        for (let i = 0; i < retries; i++) {
            try {
                return await this.genAI.models.generateContent({
                    model: modelName,
                    contents: prompt,
                    config: config
                });
            } catch (error: any) {
                const isRetryable = error.status === 503 || error.status === 429 || (error.message && error.message.includes('overloaded'));
                if (isRetryable && i < retries - 1) {
                    const delay = Math.pow(2, i) * 1000 + (Math.random() * 1000); // Exponential backoff + jitter
                    this.logger.warn(`Gemini API overloaded (Attempt ${i + 1}/${retries}). Retrying in ${Math.round(delay)}ms...`);
                    await new Promise(res => setTimeout(res, delay));
                } else {
                    throw error;
                }
            }
        }
    }

    // --- Main Features ---

    async searchCompetitors(params: SearchParams): Promise<Business[]> {
        // 1. Check Cache
        const cacheKey = `${params.keywords.toLowerCase().trim()}|${params.address.toLowerCase().trim()}|${params.radius}`;
        const cachedSearch = await this.prisma.gmbSearch.findFirst({
            where: {
                query: params.keywords,
                location: params.address,
                radius: params.radius,
                // Removed 7-day limit as per user request: "we need the info there forever"
                // createdAt: {
                //    gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) 
                // }
            }
        });

        if (cachedSearch) {
            this.logger.log(`Cache HIT for search: ${params.keywords}`);
            return cachedSearch.results as any as Business[];
        }

        if (!this.genAI) {
            throw new Error("AI Client not initialized");
        }

        try {
            const searchRadius = Math.max(params.radius * 3, 5);
            const prompt = `
        Act as a local business data extractor.
        
        SEARCH CONTEXT:
        - User Input Keywords: "${params.keywords}"
        - Search Center Address: "${params.address}"
        
        CRITICAL MISSION 1: THE CLIENT (Target Address Lookup)
        You MUST identify the specific business entity located EXACTLY at "${params.address}".
        - Even if its name (e.g., "LN DRUGSTORE") does not perfectly match the keywords (e.g., "Kiosco"), YOU MUST INCLUDE IT.
        - This specific business at this address is the "Client". 
        - Mark it as 'isClient': true.
        - Use Google Maps knowledge to find the real name of the business at this address.

        CRITICAL MISSION 2: INTELLIGENT COMPETITOR SEARCH
        The user input might be colloquial (e.g., "Kiosco") or contain multiple terms.
        1. INTERPRET the keywords: If the user types "Kiosco", you MUST also search for "Convenience store", "Drugstore", "Newsstand", "Almacén", "Maxikiosco".
        2. HANDLE LISTS: If the user provides multiple terms, search for businesses matching ANY of those categories.
        
        TASK:
        Find a comprehensive list of as many competitors as possible (target 60+) matching the EXPANDED understanding of the keywords near the address.

        OUTPUT REQUIREMENTS:
        1. The FIRST item in the JSON array MUST be the business at "${params.address}" (The Client).
        2. For all competitors, provide precise coordinates.
        3. Search Scope: Look broadly within ${searchRadius} km.
        
        Output Format:
        Return ONLY a JSON array. 
        
        JSON Structure per item:
        - name (string)
        - category (string, THE EXACT SPECIFIC CATEGORY from Google Maps. Do not generalize. Do not translate. Example: "Verdulería", NOT "Store". "Kiosco", NOT "Shop".)
        - address (string)
        - rating (number, default 0 if unknown)
        - reviewCount (integer, default 0)
        - website (string, optional)
        - googleMapsUri (string, optional)
        - phone (string, optional)
        - latitude (number, decimal)
        - longitude (number, decimal)
        - isClient (boolean, true ONLY for the business at ${params.address})
        `;

            this.logger.log(`Performing search for: ${params.keywords} near ${params.address}`);

            const response = await this.generateContentWithRetry("gemini-2.5-flash", prompt, {
                tools: [{ googleMaps: {} }],
                systemInstruction: "You are a geospatial expert. Always return valid JSON. Priority #1 is identifying the business at the requested address correctly. Priority #2 is using the most specific business category available."
            });



            let rawText = response.text;
            if (!rawText) return [];

            // Robust JSON extraction
            const firstBracket = rawText.indexOf('[');
            if (firstBracket !== -1) {
                let openBrackets = 0;
                let lastBracket = -1;

                // Iterate from first bracket to find the matching closing bracket
                for (let i = firstBracket; i < rawText.length; i++) {
                    if (rawText[i] === '[') openBrackets++;
                    if (rawText[i] === ']') openBrackets--;

                    if (openBrackets === 0) {
                        lastBracket = i;
                        break;
                    }
                }

                if (lastBracket !== -1) {
                    rawText = rawText.substring(firstBracket, lastBracket + 1);
                } else {
                    // Fallback: Model might have returned truncated JSON or markdown issue
                    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
                }
            } else {
                rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
            }

            let businesses: Business[] = JSON.parse(rawText).map((b: any, index: number) => ({
                ...b,
                id: `biz-${index}-${Date.now()}`,
                category: b.category || "Local Business",
                rating: Number(b.rating) || 0,
                reviewCount: Number(b.reviewCount) || 0,
                latitude: this.parseCoordinate(b.latitude),
                longitude: this.parseCoordinate(b.longitude),
                isClient: !!b.isClient,
                weightedScore: this.calculateWeightedScore(Number(b.rating), Number(b.reviewCount))
            }));

            // --- Robust Persistence (Transactional) ---
            const clientNode = businesses.find(b => b.isClient) || businesses[0];

            // Filter unique businesses to process
            // We use a Map to ensure we don't try to upsert duplicates within the same batch
            const uniqueBusinesses = new Map<string, Business>();
            businesses.forEach(b => {
                // Create a unique key based on name + address (normalized)
                const key = `${b.name.toLowerCase().trim()}|${b.address.toLowerCase().trim()}`;
                if (!uniqueBusinesses.has(key)) {
                    uniqueBusinesses.set(key, b);
                }
            });

            const operations = Array.from(uniqueBusinesses.values()).map(biz => {
                const isTargetClient = clientNode && biz.name === clientNode.name && biz.address === clientNode.address;
                const clientType = isTargetClient ? 'CLIENT' : 'LEAD'; // Use string literal to match enum if not imported, or import ClientType

                return this.prisma.client.upsert({
                    where: {
                        name_address: {
                            name: biz.name,
                            address: biz.address
                        }
                    },
                    update: { // Update existing record with fresh data
                        phone: biz.phone,
                        website: biz.website,
                        category: biz.category,
                        rating: biz.rating,
                        reviewCount: biz.reviewCount,
                        latitude: biz.latitude,
                        longitude: biz.longitude,
                        googleMapsUri: biz.googleMapsUri,
                        // Do NOT downgrade a CLIENT to a LEAD/COMPETITOR if they already exist as CLIENT
                        // type: clientType 
                    },
                    create: {
                        name: biz.name,
                        address: biz.address,
                        phone: biz.phone,
                        website: biz.website,
                        category: biz.category,
                        rating: biz.rating,
                        reviewCount: biz.reviewCount,
                        latitude: biz.latitude,
                        longitude: biz.longitude,
                        googleMapsUri: biz.googleMapsUri,
                        type: clientType as any // Cast to any to avoid TS issues if enum isn't perfectly typed in this context yet
                    }
                });
            });

            // Calculate Distance only for returning to UI (not needed for DB saving of all)
            if (clientNode && clientNode.latitude !== 0) {
                businesses = businesses.filter(b => {
                    if (b.isClient) return true;
                    if (b.latitude === 0 || b.longitude === 0) return true;

                    const dist = this.getDistanceFromLatLonInKm(
                        clientNode.latitude,
                        clientNode.longitude,
                        b.latitude,
                        b.longitude
                    );
                    return dist <= (params.radius * 1.5);
                });
            }

            // Execute Transaction
            this.logger.log(`Persisting ${operations.length} businesses to database...`);
            const results = await this.prisma.$transaction(operations);
            this.logger.log(`Successfully persisted ${results.length} businesses.`);

            // Save to Cache
            await this.prisma.gmbSearch.create({
                data: {
                    query: params.keywords,
                    location: params.address,
                    radius: params.radius,
                    results: businesses as any
                }
            });

            return businesses;

        } catch (error) {
            this.logger.error("Error fetching competitors", error);
            if (error instanceof Error) {
                this.logger.error(error.stack);
            }
            throw error;
        }
    }

    async performAudit(
        clientData: Business | undefined,
        competitors: Business[],
        language: 'en' | 'es',
        userSearchAddress: string,
        productsList: string = "",
        zoneContext: string = ""
    ): Promise<AuditResult> {
        // 1. Check Cache
        if (clientData?.name && clientData?.address) {
            const cachedAudit = await this.prisma.gmbAudit.findFirst({
                where: {
                    businessName: clientData.name,
                    businessAddress: clientData.address,
                    createdAt: {
                        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days valid
                    }
                }
            });

            if (cachedAudit) {
                const data = cachedAudit.auditData as any;
                // Version Check: Ensure the cached audit has the new v0.3.1 fields
                if (data.phasedActionPlan && data.seoInsights && data.gapAnalysis) {
                    this.logger.log(`Cache HIT for audit: ${clientData.name}`);
                    return data as AuditResult;
                } else {
                    this.logger.log(`Cache HIT but OUTDATED schema for: ${clientData.name}. Refreshing...`);
                }
            }
        }

        if (!this.genAI) {
            throw new Error("AI Client not initialized");
        }

        try {
            const validCompetitors = competitors.filter(c => !c.isClient);
            const avgRating = validCompetitors.length ? (validCompetitors.reduce((acc, c) => acc + c.rating, 0) / validCompetitors.length).toFixed(1) : "0";
            const avgReviews = validCompetitors.length ? Math.floor(validCompetitors.reduce((acc, c) => acc + c.reviewCount, 0) / validCompetitors.length) : 0;

            const topCompetitors = competitors
                .filter(c => !c.isClient)
                .sort((a, b) => (b.weightedScore || 0) - (a.weightedScore || 0))
                .slice(0, 5)
                .map(c => `${c.name} (${c.category || 'Biz'}) - R:${c.rating}, V:${c.reviewCount}`)
                .join(", ");

            const clientInfo = clientData
                ? JSON.stringify(clientData)
                : `Client Data not fully loaded`;

            // Dynamic logic for prompt
            const reviewCount = clientData?.reviewCount || 0;
            const reputationTrigger = reviewCount < 50
                ? "CRITICAL ALERT: The client has fewer than 50 reviews. You MUST include 'Review Generation Campaign' as the HIGHEST PRIORITY Immediate Action."
                : "Review count is healthy, focus on quality and sentiment.";

            const zoneInstruction = zoneContext
                ? `ZONE CONTEXT: The area is described as "${zoneContext}". Adjust keywords and strategy to fit this vibe (e.g., if 'University', focus on students/cheap eats).`
                : "ZONE CONTEXT: Standard urban area.";

            const prompt = `
        You are an Elite Digital Marketing Consultant specializing in Local SEO (GMB) and Strategic Analysis.
        Your output must be strictly JSON. No markdown. No conversational filler.
        Language: ${language === 'en' ? 'English' : 'Spanish'}.

        CLIENT PROFILE:
        ${clientInfo}

        LOCATION & PRODUCT CONTEXT:
        - Address: "${userSearchAddress}"
        - Products/Services: "${productsList || 'Not specified - Infer from Category'}"
        ${zoneInstruction}

        COMPETITIVE LANDSCAPE:
        - Market Avg Rating: ${avgRating}
        - Market Avg Reviews: ${avgReviews}
        - Top Competitors: ${topCompetitors}

        ${reputationTrigger}

        TASK: Perform a deep-dive local SEO audit.

        1. SWOT ANALYSIS:
           - Strengths/Weaknesses: Based on data (rating, photos, category).
           - Opportunities/Threats: Based on market gaps and competitors.
        
        2. SEO INTELLIGENCE:
           - Keywords: Generate 10-15 high-intent local keywords. ESTIMATE volume/intent based on your semantic knowledge.
           - Hyper-Local Tips: Specific advice for this location/zone.
        
        3. GAP ANALYSIS:
           - Compare client vs market averages qualitatively.
        
        4. MASTER PLAN:
           - Immediate (Week 1): Quick wins.
           - Short Term (Month 1): Content & Reputation.
           - Long Term (Quarter 1): Authority & Expansion.

        RETURN JSON ONLY matching this exact schema.
        `;

            this.logger.log(`Performing audit for: ${userSearchAddress} (Zone: ${zoneContext})`);

            const response = await this.genAI.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            lastUpdated: { type: Type.INTEGER },
                            completenessScore: { type: Type.NUMBER },
                            executiveSummary: { type: Type.STRING },
                            nameCompliance: {
                                type: Type.OBJECT,
                                properties: {
                                    status: { type: Type.STRING, enum: ["pass", "fail", "warning"] },
                                    details: { type: Type.STRING },
                                    suggestedName: { type: Type.STRING }
                                }
                            },
                            basicChecklist: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        item: { type: Type.STRING },
                                        status: { type: Type.STRING, enum: ["ok", "missing", "fix"] },
                                        note: { type: Type.STRING }
                                    }
                                }
                            },
                            swotAnalysis: {
                                type: Type.OBJECT,
                                properties: {
                                    strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    opportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    threats: { type: Type.ARRAY, items: { type: Type.STRING } }
                                }
                            },
                            seoInsights: {
                                type: Type.OBJECT,
                                properties: {
                                    topLocalKeywords: {
                                        type: Type.ARRAY,
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                keyword: { type: Type.STRING },
                                                volumeEstimate: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
                                                competition: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
                                                userIntent: { type: Type.STRING, enum: ["Transactional", "Informational", "Navigation"] }
                                            }
                                        }
                                    },
                                    contentOpportunities: {
                                        type: Type.ARRAY,
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                title: { type: Type.STRING },
                                                description: { type: Type.STRING },
                                                targetProduct: { type: Type.STRING }
                                            }
                                        }
                                    },
                                    hyperLocalTips: { type: Type.ARRAY, items: { type: Type.STRING } }
                                }
                            },
                            gapAnalysis: {
                                type: Type.OBJECT,
                                properties: {
                                    reviewGap: { type: Type.STRING },
                                    ratingGap: { type: Type.STRING },
                                    contentGap: { type: Type.STRING }
                                }
                            },
                            phasedActionPlan: {
                                type: Type.OBJECT,
                                properties: {
                                    immediate: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    shortTerm: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    longTerm: { type: Type.ARRAY, items: { type: Type.STRING } }
                                }
                            }
                        }
                    }
                }
            });

            const text = response.text;
            if (!text) throw new Error("No response from AI");

            const result = JSON.parse(text);
            result.lastUpdated = Date.now();

            // Save to Cache
            if (clientData?.name && clientData?.address) {
                // Find Client first
                const client = await this.prisma.client.findFirst({
                    where: {
                        name: clientData.name,
                        address: clientData.address
                    }
                });

                await this.prisma.gmbAudit.create({
                    data: {
                        businessName: clientData.name,
                        businessAddress: clientData.address,
                        auditData: result,
                        clientId: client?.id
                    }
                });
            }

            return result as AuditResult;

        } catch (error) {
            this.logger.error("Audit failed", error);
            throw error;
        }
    }

    async getAllLeads(limit = 100) {
        return this.prisma.client.findMany({
            orderBy: { createdAt: 'desc' },
            take: limit
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
                client: { select: { name: true } },
                phases: {
                    select: { status: true }
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
}
