import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AgencyClient {
    id: string;
    name: string;
    email?: string;
    googleConnected: boolean;
    gbpLocations: number;
    pendingReviews: number;
    lastActivity?: Date;
}

export interface AgencyOverview {
    totalClients: number;
    connectedClients: number;
    totalLocations: number;
    totalPendingReviews: number;
    clients: AgencyClient[];
}

@Injectable()
export class AgencyService {
    private readonly logger = new Logger(AgencyService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Get all clients managed by the agency
     */
    async getAgencyClients(): Promise<AgencyClient[]> {
        const users = await this.prisma.user.findMany({
            include: {
                googleCredential: true,
                gbpLocations: true,
            },
        });

        return users.map((user) => ({
            id: user.id,
            name: user.name || user.email,
            email: user.email,
            googleConnected: !!user.googleCredential,
            gbpLocations: user.gbpLocations?.length || 0,
            pendingReviews: 0, // Would calculate from reviews
            lastActivity: user.updatedAt,
        }));
    }

    /**
     * Get agency overview statistics
     */
    async getAgencyOverview(): Promise<AgencyOverview> {
        const clients = await this.getAgencyClients();

        const connectedClients = clients.filter((c) => c.googleConnected).length;
        const totalLocations = clients.reduce((sum, c) => sum + c.gbpLocations, 0);
        const totalPendingReviews = clients.reduce((sum, c) => sum + c.pendingReviews, 0);

        return {
            totalClients: clients.length,
            connectedClients,
            totalLocations,
            totalPendingReviews,
            clients,
        };
    }

    /**
     * Create a new client (sub-account)
     */
    async createClient(data: { name: string; email: string }): Promise<AgencyClient> {
        const user = await this.prisma.user.create({
            data: {
                name: data.name,
                email: data.email,
                password: '', // No password - OAuth only
            },
        });

        return {
            id: user.id,
            name: user.name || user.email,
            email: user.email,
            googleConnected: false,
            gbpLocations: 0,
            pendingReviews: 0,
            lastActivity: user.createdAt,
        };
    }

    /**
     * Get client invite link for OAuth
     */
    async getClientInviteLink(clientId: string, baseUrl: string): Promise<string> {
        // In production, would generate a secure token
        return `${baseUrl}/connect?clientId=${clientId}`;
    }

    /**
     * Delete a client and their data
     */
    async deleteClient(clientId: string): Promise<void> {
        await this.prisma.user.delete({
            where: { id: clientId },
        });
    }

    /**
     * Get aggregated review alerts across all clients
     */
    async getReviewAlerts(): Promise<any[]> {
        // Would fetch negative reviews from all connected clients
        return [
            {
                clientId: 'mock-client-1',
                clientName: 'Cafetería Luna',
                reviewId: 'rev-007',
                rating: 1,
                comment: 'Terrible service...',
                timeAgo: '12 hours ago',
                urgent: true,
            },
            {
                clientId: 'mock-client-2',
                clientName: 'Dental Pro',
                reviewId: 'rev-004',
                rating: 2,
                comment: 'Long wait times...',
                timeAgo: '3 days ago',
                urgent: false,
            },
        ];
    }
}
