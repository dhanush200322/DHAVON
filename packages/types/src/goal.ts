import { RiskLevel } from './permission.js';

export type GoalStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'PAUSED'
  | 'BLOCKED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'draft'
  | 'active'
  | 'paused'
  | 'blocked'
  | 'completed'
  | 'cancelled'
  | 'achieved'
  | 'abandoned';

export type TaskStatus =
  | 'PENDING'
  | 'READY'
  | 'RUNNING'
  | 'WAITING'
  | 'BLOCKED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'pending'
  | 'ready'
  | 'running'
  | 'waiting'
  | 'blocked'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'in_progress';

export interface Task {
  id: string;
  goalId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority?: number; // 1 to 5
  dependencies?: string[];
  assignedCapability?: string;
  assignedTool?: string;
  toolPayload?: Record<string, unknown>;
  riskLevel?: RiskLevel;
  progress?: number; // 0.0 to 100.0
  result?: Record<string, unknown>;
  verificationStrategy?: string;
  executionOrder?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: GoalStatus;
  priority: number; // 1 (lowest) to 5 (highest)
  progress: number; // 0.0 to 100.0
  deadline?: string;
  parentGoalId?: string;
  metadata?: Record<string, unknown>;
  tasks?: Task[];
  targetCompletionAt?: string; // backwards compatibility
  createdAt: string;
  updatedAt: string;
}
