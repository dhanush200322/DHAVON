import { RiskLevel } from './permission.js';
import { TaskStatus } from './goal.js';

export type OrchestrationStatus =
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'BLOCKED';

export interface TaskDependency {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  createdAt: string;
}

export interface VerificationResult {
  id: string;
  taskId: string;
  goalId: string;
  strategy: string;
  verified: boolean;
  evidence: Record<string, unknown>;
  checkedAt: string;
}

export type PreferenceCategory =
  | 'technologies'
  | 'coding_style'
  | 'communication_style'
  | 'project_priorities'
  | 'tools'
  | 'notifications'
  | string;

export interface UserPreference {
  id: string;
  userId: string;
  category: PreferenceCategory;
  preferenceKey: string;
  preferenceValue: unknown;
  confidence: number;
  conflictDetected: boolean;
  previousValue?: unknown;
  source?: string;
  lastUpdatedAt: string;
  createdAt: string;
}

export interface OrchestrationRun {
  id: string;
  goalId: string;
  status: OrchestrationStatus;
  currentTaskId?: string;
  executionDepth: number;
  retryCount: number;
  consecutiveFailures: number;
  pauseReason?: string;
  metadata: Record<string, unknown>;
  startedAt: string;
  completedAt?: string;
}

export interface OrchestrationStep {
  id: string;
  runId: string;
  taskId: string;
  stepNumber: number;
  actionType: string;
  assignedTool?: string;
  inputArguments?: Record<string, unknown>;
  outputResult?: Record<string, unknown>;
  verified: boolean;
  executionDurationMs?: number;
  status: string;
  createdAt: string;
}

export interface PlannedTask {
  id?: string;
  title: string;
  description: string;
  dependencies: string[]; // references task titles or temporary IDs
  assignedCapability?: string;
  estimatedRisk: RiskLevel;
  verificationStrategy: string;
  executionOrder: number;
}

export interface GoalPlan {
  goalId: string;
  title: string;
  description: string;
  tasks: PlannedTask[];
  estimatedTotalRisk: RiskLevel;
  requiredCapabilities: string[];
  createdAt: string;
}
