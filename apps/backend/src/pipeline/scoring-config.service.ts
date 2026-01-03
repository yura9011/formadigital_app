import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface RuleCondition {
  field: string;
  operator: 'equals' | 'notEquals' | 'lessThan' | 'greaterThan' | 'isNull' | 'isNotNull' | 'olderThanDays';
  value?: any;
  additionalCondition?: RuleCondition;
}

export interface ScoringRule {
  id: string;
  name: string;
  description: string;
  weight: number;
  condition: RuleCondition;
}

export interface ScoringRulesConfig {
  version: string;
  maxScore: number;
  description: string;
  rules: ScoringRule[];
}

@Injectable()
export class ScoringConfigService {
  private readonly logger = new Logger(ScoringConfigService.name);
  private config: ScoringRulesConfig;
  private readonly configPath: string;

  constructor() {
    this.configPath = path.join(process.cwd(), 'config', 'scoring-rules.json');
    this.loadConfig();
  }

  private loadConfig(): void {
    try {
      const configContent = fs.readFileSync(this.configPath, 'utf-8');
      this.config = JSON.parse(configContent);
      this.logger.log(`Loaded scoring rules v${this.config.version} with ${this.config.rules.length} rules`);
    } catch (error) {
      this.logger.error('Failed to load scoring rules config, using defaults', error);
      this.config = this.getDefaultConfig();
    }
  }

  private getDefaultConfig(): ScoringRulesConfig {
    return {
      version: '1.0',
      maxScore: 100,
      description: 'Default scoring rules',
      rules: [
        {
          id: 'no_website',
          name: 'Sin sitio web',
          description: 'El negocio no tiene sitio web',
          weight: 25,
          condition: { field: 'website', operator: 'isNull' },
        },
        {
          id: 'no_instagram',
          name: 'Sin Instagram',
          description: 'No tiene cuenta de Instagram',
          weight: 10,
          condition: { field: 'instagram', operator: 'isNull' },
        },
      ],
    };
  }

  getRules(): ScoringRule[] {
    return this.config.rules;
  }

  getConfig(): ScoringRulesConfig {
    return { ...this.config };
  }

  getMaxScore(): number {
    return this.config.maxScore;
  }

  getRuleById(id: string): ScoringRule | undefined {
    return this.config.rules.find((rule) => rule.id === id);
  }

  updateRules(newRules: ScoringRule[]): ScoringRulesConfig {
    this.config.rules = newRules;
    this.config.version = this.incrementVersion(this.config.version);
    this.saveConfig();
    return this.config;
  }

  updateConfig(newConfig: Partial<ScoringRulesConfig>): ScoringRulesConfig {
    this.config = {
      ...this.config,
      ...newConfig,
      version: this.incrementVersion(this.config.version),
    };
    this.saveConfig();
    return this.config;
  }

  private incrementVersion(version: string): string {
    const parts = version.split('.');
    const minor = parseInt(parts[1] || '0', 10) + 1;
    return `${parts[0]}.${minor}`;
  }

  private saveConfig(): void {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
      this.logger.log(`Saved scoring rules v${this.config.version}`);
    } catch (error) {
      this.logger.error('Failed to save scoring rules config', error);
      throw error;
    }
  }

  reloadConfig(): void {
    this.loadConfig();
  }
}
