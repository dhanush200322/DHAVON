import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import { RiskLevel } from '@dhavon/types';
import { v4 as uuidv4 } from 'uuid';

export interface AuditRecord {
  id?: string;
  userId?: string;
  actionType: string;
  targetEntity: string;
  targetEntityId?: string;
  riskLevel: RiskLevel;
  snapshotBefore?: Record<string, unknown>;
  snapshotAfter?: Record<string, unknown>;
  ipAddress?: string;
  timestamp?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private localAuditLog: AuditRecord[] = [];

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Sanitizes any potential secrets (keys, passwords, tokens) before logging
   */
  private sanitize(obj?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!obj) return undefined;
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (
        /key|token|secret|password|auth|authorization|credential/i.test(key) &&
        typeof value === 'string'
      ) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitize(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  async record(entry: AuditRecord): Promise<void> {
    const record: AuditRecord = {
      id: entry.id || uuidv4(),
      userId: entry.userId || 'system',
      actionType: entry.actionType,
      targetEntity: entry.targetEntity,
      targetEntityId: entry.targetEntityId,
      riskLevel: entry.riskLevel,
      snapshotBefore: this.sanitize(entry.snapshotBefore),
      snapshotAfter: this.sanitize(entry.snapshotAfter),
      ipAddress: entry.ipAddress,
      timestamp: entry.timestamp || new Date().toISOString(),
    };

    this.logger.log(
      `[AUDIT] Action: ${record.actionType} | Target: ${record.targetEntity} | Risk: ${record.riskLevel}`,
    );

    this.localAuditLog.push(record);
    if (this.localAuditLog.length > 500) {
      this.localAuditLog.shift();
    }

    const client = this.supabase.getClient();
    if (client) {
      try {
        await client.from('audit_logs').insert({
          id: record.id,
          user_id: record.userId === 'system' ? null : record.userId,
          action_type: record.actionType,
          target_entity: record.targetEntity,
          target_entity_id: record.targetEntityId,
          risk_level: record.riskLevel,
          snapshot_before: record.snapshotBefore,
          snapshot_after: record.snapshotAfter,
          ip_address: record.ipAddress,
          timestamp: record.timestamp,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.debug(`Supabase audit persist deferred: ${msg}`);
      }
    }
  }

  getRecentLogs(limit = 50): AuditRecord[] {
    return this.localAuditLog.slice(-limit);
  }
}
