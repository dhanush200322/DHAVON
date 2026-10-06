import { RiskLevel } from './permission.js';

export type SystemEventType =
  | 'session:started'
  | 'session:ended'
  | 'orb:state_changed'
  | 'goal:created'
  | 'goal:updated'
  | 'task:state_changed'
  | 'tool:invoked'
  | 'tool:completed'
  | 'permission:requested'
  | 'permission:granted'
  | 'permission:denied'
  | 'dhavon.goal.created'
  | 'dhavon.goal.planned'
  | 'dhavon.task.created'
  | 'dhavon.task.ready'
  | 'dhavon.task.started'
  | 'dhavon.task.completed'
  | 'dhavon.task.failed'
  | 'dhavon.task.blocked'
  | 'dhavon.goal.progress'
  | 'dhavon.goal.completed'
  | 'dhavon.goal.failed'
  | 'dhavon.memory.created'
  | 'dhavon.memory.updated'
  | 'dhavon.orchestration.paused'
  | 'dhavon.orchestration.resumed';

export interface SystemEvent {
  id: string;
  userId: string;
  eventType: SystemEventType | string;
  payload: Record<string, unknown>;
  sourceSubsystem: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  actionType: string;
  targetEntity: string;
  targetEntityId?: string;
  riskLevel: RiskLevel;
  snapshotBefore?: Record<string, unknown>;
  snapshotAfter?: Record<string, unknown>;
  ipAddress?: string;
  timestamp: string;
}
