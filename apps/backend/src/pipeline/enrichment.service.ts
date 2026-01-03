import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { Client } from '@prisma/client';

export interface InstagramEnrichmentData {
  handle: string;
  fullName?: string;
  bio?: string;
  followers: number;
  following?: number;
  posts: number;
  isPrivate: boolean;
  isVerified?: boolean;
  profilePicUrl?: string;
  externalUrl?: string;
  lastPostDate?: string;
  fetchedAt: string;
}

export interface EnrichmentResult {
  success: boolean;
  client?: Client;
  data?: InstagramEnrichmentData;
  error?: string;
  errorCode?: string;
}

@Injectable()
export class EnrichmentService {
  private readonly logger = new Logger(EnrichmentService.name);
  private readonly harv3stUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.harv3stUrl = this.configService.get<string>('HARV3ST_URL') || 'http://localhost:5001';
  }

  /**
   * Enrich a client with Instagram data
   */
  async enrichInstagram(clientId: string, handle?: string): Promise<EnrichmentResult> {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new NotFoundException(`Client not found: ${clientId}`);
    }

    // Use provided handle or existing instagram field
    const instagramHandle = handle || client.instagram;

    if (!instagramHandle) {
      throw new BadRequestException('No Instagram handle provided or stored for this client');
    }

    try {
      // Call Harv3st Instagram enrichment endpoint
      const response = await fetch(`${this.harv3stUrl}/api/instagram/enrich`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: instagramHandle }),
      });

      const result = await response.json();

      if (!result.success) {
        this.logger.warn(`Instagram enrichment failed for ${instagramHandle}: ${result.error}`);
        return {
          success: false,
          error: result.error,
          errorCode: result.error_code,
        };
      }

      const data: InstagramEnrichmentData = result.data;

      // Update client with Instagram data
      const updatedClient = await this.prisma.client.update({
        where: { id: clientId },
        data: {
          instagram: instagramHandle,
          instagramFollowers: data.followers,
          instagramPosts: data.posts,
          instagramLastPostDate: data.lastPostDate ? new Date(data.lastPostDate) : null,
          instagramBio: data.bio,
          enrichedAt: new Date(),
        },
      });

      this.logger.log(`Enriched Instagram data for ${client.name}: @${instagramHandle}`);

      return {
        success: true,
        client: updatedClient,
        data,
      };

    } catch (error) {
      this.logger.error(`Failed to enrich Instagram for ${clientId}: ${error.message}`);
      return {
        success: false,
        error: error.message,
        errorCode: 'FETCH_ERROR',
      };
    }
  }

  /**
   * Batch enrich multiple clients
   */
  async batchEnrichInstagram(clientIds: string[]): Promise<{
    success: number;
    failed: number;
    results: EnrichmentResult[];
  }> {
    const results: EnrichmentResult[] = [];
    let success = 0;
    let failed = 0;

    for (const clientId of clientIds) {
      const result = await this.enrichInstagram(clientId);
      results.push(result);
      
      if (result.success) {
        success++;
      } else {
        failed++;
      }

      // Small delay between requests to respect rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return { success, failed, results };
  }
}
