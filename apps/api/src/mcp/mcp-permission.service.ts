import { Injectable, Logger } from '@nestjs/common';
import { McpTool, McpConfirmationPayload } from '@dhavon/mcp';
import { RiskLevel } from '@dhavon/types';
import { PermissionsService } from '../core/permissions/permissions.service';
import { AuditService } from '../core/audit/audit.service';
import { McpEventsService } from './mcp-events.service';

export interface PermissionEvaluationResult {
  allowed: boolean;
  requiresConfirmation: boolean;
  riskLevel: RiskLevel;
  reason?: string;
  confirmationPayload?: McpConfirmationPayload;
}

@Injectable()
export class McpPermissionService {
  private readonly logger = new Logger(McpPermissionService.name);
  private readonly userApprovals = new Map<string, number>();
  private readonly approvalTtlMs = 300000; // 5 minutes TTL

  constructor(
    private readonly permissionsService: PermissionsService,
    private readonly auditService: AuditService,
    private readonly eventsService: McpEventsService,
  ) {}

  /**
   * Evaluate whether a tool execution can proceed or requires confirmation
   */
  async evaluate(
    executionId: string,
    tool: McpTool,
    parameters: Record<string, unknown>,
    userId = 'system-user',
  ): Promise<PermissionEvaluationResult> {
    const riskLevel = tool.riskLevel;
    const approvalKey = `${executionId}:${userId}`;

    // 1. Check if user already explicitly approved this execution within TTL
    const approvedAt = this.userApprovals.get(approvalKey);
    if (approvedAt && Date.now() - approvedAt < this.approvalTtlMs) {
      this.logger.log(`Execution ${executionId} approved by user ${userId} (single-use valid)`);
      return {
        allowed: true,
        requiresConfirmation: false,
        riskLevel,
      };
    } else if (approvedAt) {
      // Expired approval
      this.userApprovals.delete(approvalKey);
      this.logger.warn(`Execution approval for ${executionId} has expired.`);
    }

    // 2. SENSITIVE: Explicit human confirmation is strictly mandatory
    if (riskLevel === 'SENSITIVE') {
      const confirmationPayload: McpConfirmationPayload = {
        executionId,
        toolName: tool.name,
        serverName: tool.serverName,
        riskLevel,
        summary: `SENSITIVE OPERATION: "${tool.name}" on ${tool.serverName}. High risk action requires explicit authorization.`,
        requestedAction: `Execute ${tool.name} with supplied parameters.`,
        parameters,
      };

      await this.auditService.record({
        userId,
        actionType: 'mcp:sensitive_blocked',
        targetEntity: `${tool.serverName}:${tool.name}`,
        targetEntityId: executionId,
        riskLevel,
        snapshotBefore: parameters,
      });

      this.eventsService.emitConfirmationRequired(confirmationPayload);

      return {
        allowed: false,
        requiresConfirmation: true,
        riskLevel,
        reason: `Operation is SENSITIVE and cannot be run autonomously without explicit user confirmation.`,
        confirmationPayload,
      };
    }

    // 3. CONFIRMATION_REQUIRED: Writes, deployments, state modifications
    if (riskLevel === 'CONFIRMATION_REQUIRED') {
      const confirmationPayload: McpConfirmationPayload = {
        executionId,
        toolName: tool.name,
        serverName: tool.serverName,
        riskLevel,
        summary: `Confirmation required for "${tool.name}" on ${tool.serverName}.`,
        requestedAction: `Execute ${tool.name} to modify external resources.`,
        parameters,
      };

      this.eventsService.emitConfirmationRequired(confirmationPayload);

      return {
        allowed: false,
        requiresConfirmation: true,
        riskLevel,
        reason: `Tool modifies external system state and requires confirmation.`,
        confirmationPayload,
      };
    }

    // 4. READ and LOW_RISK are allowed
    return {
      allowed: true,
      requiresConfirmation: false,
      riskLevel,
    };
  }

  approve(executionId: string, userId = 'system-user'): void {
    const key = `${executionId}:${userId}`;
    this.userApprovals.set(key, Date.now());
    this.logger.log(`Approved execution permission scope: ${key} (expires in 5m)`);
  }

  consumeApproval(executionId: string, userId = 'system-user'): boolean {
    const key = `${executionId}:${userId}`;
    const existed = this.userApprovals.delete(key);
    if (existed) {
      this.logger.log(`Consumed single-use execution approval: ${key}`);
    }
    return existed;
  }

  reject(executionId: string, userId = 'system-user'): void {
    const key = `${executionId}:${userId}`;
    this.userApprovals.delete(key);
    this.logger.log(`Rejected execution: ${key}`);
  }
}
