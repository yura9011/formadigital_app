import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Client } from '@prisma/client';
import { ScoringConfigService, ScoringRule, RuleCondition } from './scoring-config.service';

export interface ScoreComponent {
  ruleId: string;
  ruleName: string;
  description: string;
  points: number;
  applied: boolean;
  reason?: string;
}

export interface ScoreBreakdown {
  total: number;
  maxScore: number;
  components: ScoreComponent[];
  calculatedAt: Date;
}

@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scoringConfig: ScoringConfigService,
  ) {}

  /**
   * Calculate score for a single client with full breakdown
   */
  calculateScore(client: Client): ScoreBreakdown {
    const rules = this.scoringConfig.getRules();
    const maxScore = this.scoringConfig.getMaxScore();
    const components: ScoreComponent[] = [];

    for (const rule of rules) {
      const { applied, reason } = this.evaluateCondition(rule.condition, client);
      components.push({
        ruleId: rule.id,
        ruleName: rule.name,
        description: rule.description,
        points: rule.weight,
        applied,
        reason,
      });
    }

    const total = Math.min(
      components.reduce((sum, c) => sum + (c.applied ? c.points : 0), 0),
      maxScore,
    );

    return {
      total,
      maxScore,
      components,
      calculatedAt: new Date(),
    };
  }

  /**
   * Evaluate a rule condition against a client
   */
  private evaluateCondition(
    condition: RuleCondition,
    client: Client,
  ): { applied: boolean; reason?: string } {
    const fieldValue = this.getFieldValue(client, condition.field);
    let applied = false;
    let reason: string | undefined;

    switch (condition.operator) {
      case 'isNull':
        applied = fieldValue === null || fieldValue === undefined;
        reason = applied ? `${condition.field} is null` : `${condition.field} has value`;
        break;

      case 'isNotNull':
        applied = fieldValue !== null && fieldValue !== undefined;
        reason = applied ? `${condition.field} has value` : `${condition.field} is null`;
        break;

      case 'equals':
        applied = fieldValue === condition.value;
        reason = applied ? `${condition.field} equals ${condition.value}` : `${condition.field} is ${fieldValue}`;
        break;

      case 'notEquals':
        applied = fieldValue !== condition.value;
        reason = applied ? `${condition.field} is not ${condition.value}` : `${condition.field} equals ${condition.value}`;
        break;

      case 'lessThan':
        applied = typeof fieldValue === 'number' && fieldValue < condition.value;
        reason = applied ? `${condition.field} (${fieldValue}) < ${condition.value}` : `${condition.field} (${fieldValue}) >= ${condition.value}`;
        break;

      case 'greaterThan':
        applied = typeof fieldValue === 'number' && fieldValue > condition.value;
        reason = applied ? `${condition.field} (${fieldValue}) > ${condition.value}` : `${condition.field} (${fieldValue}) <= ${condition.value}`;
        break;

      case 'olderThanDays':
        if (fieldValue instanceof Date) {
          const daysDiff = this.daysSince(fieldValue);
          applied = daysDiff > condition.value;
          reason = applied ? `${condition.field} is ${daysDiff} days old (> ${condition.value})` : `${condition.field} is ${daysDiff} days old`;
        } else {
          applied = false;
          reason = `${condition.field} is not a date`;
        }
        break;

      default:
        applied = false;
        reason = `Unknown operator: ${condition.operator}`;
    }

    // Check additional condition (AND logic)
    if (applied && condition.additionalCondition) {
      const additional = this.evaluateCondition(condition.additionalCondition, client);
      applied = applied && additional.applied;
      if (additional.reason) {
        reason = `${reason} AND ${additional.reason}`;
      }
    }

    return { applied, reason };
  }

  /**
   * Get field value from client, handling nested paths
   */
  private getFieldValue(client: Client, field: string): any {
    // Handle direct fields
    if (field in client) {
      return (client as any)[field];
    }
    // Handle nested paths like "hours.monday"
    const parts = field.split('.');
    let value: any = client;
    for (const part of parts) {
      if (value === null || value === undefined) return null;
      value = value[part];
    }
    return value;
  }

  /**
   * Calculate days since a date
   */
  private daysSince(date: Date): number {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculate and save score for a client
   */
  async calculateAndSaveScore(clientId: string): Promise<ScoreBreakdown> {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new Error(`Client not found: ${clientId}`);
    }

    const breakdown = this.calculateScore(client);

    // Determine tier based on score
    const tier = this.determineTier(breakdown.total);

    // Calculate gaps (rules that applied)
    const gaps = breakdown.components
      .filter((c) => c.applied)
      .map((c) => c.ruleName);

    await this.prisma.client.update({
      where: { id: clientId },
      data: {
        score: breakdown.total,
        tier,
        gaps,
      },
    });

    return breakdown;
  }

  /**
   * Determine tier based on score
   */
  private determineTier(score: number): string {
    if (score >= 60) return 'HOT';
    if (score >= 30) return 'WARM';
    return 'COLD';
  }

  /**
   * Recalculate scores for all clients
   */
  async recalculateAllScores(): Promise<{ updated: number; errors: number }> {
    this.logger.log('Starting recalculation of all client scores...');

    const clients = await this.prisma.client.findMany({
      where: { type: 'LEAD' },
    });

    let updated = 0;
    let errors = 0;

    for (const client of clients) {
      try {
        await this.calculateAndSaveScore(client.id);
        updated++;
      } catch (error) {
        this.logger.error(`Failed to recalculate score for client ${client.id}`, error);
        errors++;
      }
    }

    this.logger.log(`Recalculation complete: ${updated} updated, ${errors} errors`);
    return { updated, errors };
  }

  /**
   * Get score breakdown for a client without saving
   */
  async getScoreBreakdown(clientId: string): Promise<ScoreBreakdown> {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new Error(`Client not found: ${clientId}`);
    }

    return this.calculateScore(client);
  }
}
