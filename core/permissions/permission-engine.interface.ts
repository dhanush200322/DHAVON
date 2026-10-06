import { PermissionCheckRequest, PermissionCheckResult, RiskLevel } from '@dhavon/types';

export interface IPermissionEngine {
  evaluateRisk(toolName: string, args: Record<string, unknown>): RiskLevel;
  checkPermission(request: PermissionCheckRequest): Promise<PermissionCheckResult>;
  recordUserConfirmation(executionId: string, approved: boolean, reason?: string): Promise<void>;
}
