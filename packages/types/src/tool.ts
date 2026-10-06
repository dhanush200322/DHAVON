import { RiskLevel } from './permission.js';

export type ToolExecutionStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'running'
  | 'completed'
  | 'failed'
  | 'timed_out';

export interface ToolParameter {
  type: string;
  description: string;
  required?: boolean;
  default?: unknown;
  enum?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  riskLevel: RiskLevel;
  parameters: {
    type: 'object';
    properties: Record<string, ToolParameter>;
    required?: string[];
  };
}

export interface ToolExecution {
  id: string;
  userId: string;
  conversationId?: string;
  taskId?: string;
  toolName: string;
  riskLevel: RiskLevel;
  inputArguments: Record<string, unknown>;
  executionResult?: Record<string, unknown>;
  status: ToolExecutionStatus;
  executionDurationMs?: number;
  initiatedAt: string;
  completedAt?: string;
}
