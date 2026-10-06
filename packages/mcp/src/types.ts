import { RiskLevel } from '@dhavon/types';

export type McpTransportType = 'stdio' | 'sse' | 'websocket' | 'native';

export type McpServerStatus = 'online' | 'offline' | 'degraded' | 'unauthorized';

export interface McpServerConfig {
  id: string;
  name: string;
  description: string;
  provider: string;
  status: McpServerStatus;
  transport: McpTransportType;
  endpoint?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  defaultRiskLevel?: RiskLevel;
  enabled: boolean;
  capabilities: string[];
  lastHealthCheck?: string;
  metadata?: Record<string, unknown>;
}

export interface McpToolInputProperty {
  type: string;
  description?: string;
  enum?: string[];
  items?: Record<string, unknown>;
  properties?: Record<string, unknown>;
  required?: string[];
}

export interface McpToolInputSchema {
  type: 'object';
  properties: Record<string, McpToolInputProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface McpToolMetadata {
  serverName: string;
  category?: string;
  version?: string;
  author?: string;
  isSandboxed: boolean;
  timeoutMs: number;
}

export interface McpTool {
  toolId: string;
  serverId: string;
  serverName: string;
  name: string;
  description: string;
  inputSchema: McpToolInputSchema;
  outputSchema?: Record<string, unknown>;
  riskLevel: RiskLevel;
  enabled: boolean;
  requiresConfirmation: boolean;
  available: boolean;
  metadata?: McpToolMetadata;
}

export type McpExecutionStatus =
  | 'PENDING'
  | 'AUTHORIZING'
  | 'APPROVED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'REJECTED'
  | 'FAILED';

export interface McpExecutionRequest {
  executionId?: string;
  userId?: string;
  serverId: string;
  toolName: string;
  arguments: Record<string, unknown>;
  mode?: string;
  reason?: string;
}

export interface McpToolOutput {
  contentType: 'text' | 'json' | 'image' | 'binary';
  content: unknown;
  isError?: boolean;
  isSanitized?: boolean;
}

export interface McpToolExecutionResult {
  executionId: string;
  toolName: string;
  serverName: string;
  status: McpExecutionStatus;
  riskLevel: RiskLevel;
  success: boolean;
  output?: McpToolOutput;
  errorMessage?: string;
  executionDurationMs: number;
  auditId?: string;
}

export interface McpConfirmationPayload {
  executionId: string;
  toolName: string;
  serverName: string;
  riskLevel: RiskLevel;
  summary: string;
  requestedAction: string;
  parameters: Record<string, unknown>;
}

export interface McpExecutionRecord {
  id: string;
  executionId: string;
  userId: string;
  serverId: string;
  toolId: string;
  toolName: string;
  status: McpExecutionStatus;
  riskLevel: RiskLevel;
  inputArguments: Record<string, unknown>;
  outputResult?: unknown;
  errorCode?: string;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
}
