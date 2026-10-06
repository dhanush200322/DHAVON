export type RiskLevel = 'READ' | 'LOW_RISK' | 'CONFIRMATION_REQUIRED' | 'SENSITIVE';

export interface Permission {
  id: string;
  userId: string;
  toolIdentifier: string;
  riskLevel: RiskLevel;
  autoApproved: boolean;
  expiresAt?: string;
  createdAt: string;
}

export interface PermissionCheckRequest {
  userId: string;
  toolName: string;
  riskLevel: RiskLevel;
  arguments: Record<string, unknown>;
}

export interface PermissionCheckResult {
  allowed: boolean;
  requiresUserConfirmation: boolean;
  reason?: string;
  executionId?: string;
}
