import { Injectable, Logger } from '@nestjs/common';
import { RiskLevel, PermissionCheckResult } from '@dhavon/types';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  // In-memory permission state for confirmed actions
  private readonly grantedScopes = new Set<string>();

  constructor(private readonly auditService: AuditService) {}

  /**
   * Classify risk level of a tool or operation
   */
  classifyRisk(toolName: string, actionType: string): RiskLevel {
    const sensitiveTools = ['shell_exec', 'database_drop', 'file_delete', 'auth_reset'];
    const confirmationTools = ['file_write', 'github_push', 'deploy', 'send_email'];
    const readTools = ['search', 'file_read', 'status_check', 'database_query', 'health'];

    if (sensitiveTools.some((t) => toolName.includes(t) || actionType.includes(t))) {
      return 'SENSITIVE';
    }
    if (confirmationTools.some((t) => toolName.includes(t) || actionType.includes(t))) {
      return 'CONFIRMATION_REQUIRED';
    }
    if (readTools.some((t) => toolName.includes(t) || actionType.includes(t))) {
      return 'READ';
    }

    return 'LOW_RISK';
  }

  /**
   * Verify if an action can execute or requires user confirmation
   */
  async checkPermission(
    userId: string,
    toolName: string,
    parameters: Record<string, unknown>,
  ): Promise<PermissionCheckResult> {
    const riskLevel = this.classifyRisk(toolName, 'execute');
    const scopeKey = `${userId}:${toolName}`;

    if (riskLevel === 'SENSITIVE') {
      await this.auditService.record({
        userId,
        actionType: 'permission:blocked_sensitive',
        targetEntity: toolName,
        riskLevel,
        snapshotBefore: parameters,
      });

      return {
        allowed: false,
        requiresUserConfirmation: true,
        reason: `Operation "${toolName}" is SENSITIVE and cannot be run autonomously without explicit approval.`,
      };
    }

    if (riskLevel === 'CONFIRMATION_REQUIRED') {
      const isPreGranted = this.grantedScopes.has(scopeKey);
      if (!isPreGranted) {
        return {
          allowed: false,
          requiresUserConfirmation: true,
          reason: `Operation "${toolName}" modifies system state and requires confirmation.`,
        };
      }
    }

    return {
      allowed: true,
      requiresUserConfirmation: false,
    };
  }

  grantPermission(userId: string, toolName: string): void {
    const scopeKey = `${userId}:${toolName}`;
    this.grantedScopes.add(scopeKey);
    this.logger.log(`Granted temporary permission scope: ${scopeKey}`);
  }

  revokePermission(userId: string, toolName: string): void {
    const scopeKey = `${userId}:${toolName}`;
    this.grantedScopes.delete(scopeKey);
  }
}
