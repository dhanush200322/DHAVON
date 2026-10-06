import { AuditLog, SystemEvent, SystemEventType } from '@dhavon/types';

export type EventHandler<T = Record<string, unknown>> = (payload: T) => void | Promise<void>;

export interface IEventEngine {
  emit<T = Record<string, unknown>>(eventType: SystemEventType, payload: T, userId: string, source: string): Promise<SystemEvent>;
  subscribe<T = Record<string, unknown>>(eventType: SystemEventType, handler: EventHandler<T>): () => void;
  recordAudit(audit: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog>;
}
