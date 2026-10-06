import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { SystemEventType } from '@dhavon/types';

export interface OrchestrationEventPayload {
  event: SystemEventType | string;
  data: unknown;
  timestamp: string;
}

@Injectable()
export class OrchestrationEventsService {
  private readonly logger = new Logger(OrchestrationEventsService.name);
  private readonly eventSubject = new Subject<OrchestrationEventPayload>();

  getEventStream(): Observable<OrchestrationEventPayload> {
    return this.eventSubject.asObservable();
  }

  emitEvent(event: SystemEventType | string, data: unknown): void {
    this.logger.log(`Emitting event: [${event}]`);
    this.eventSubject.next({
      event,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  emitGoalCreated(goal: unknown): void {
    this.emitEvent('dhavon.goal.created', goal);
  }

  emitGoalPlanned(plan: unknown): void {
    this.emitEvent('dhavon.goal.planned', plan);
  }

  emitGoalProgress(goalId: string, progress: number, status: string): void {
    this.emitEvent('dhavon.goal.progress', { goalId, progress, status });
  }

  emitGoalCompleted(goal: unknown): void {
    this.emitEvent('dhavon.goal.completed', goal);
  }

  emitGoalFailed(goalId: string, reason: string): void {
    this.emitEvent('dhavon.goal.failed', { goalId, reason });
  }

  emitTaskCreated(task: unknown): void {
    this.emitEvent('dhavon.task.created', task);
  }

  emitTaskReady(taskId: string, goalId: string): void {
    this.emitEvent('dhavon.task.ready', { taskId, goalId });
  }

  emitTaskStarted(taskId: string, goalId: string, toolName?: string): void {
    this.emitEvent('dhavon.task.started', { taskId, goalId, toolName });
  }

  emitTaskCompleted(taskId: string, goalId: string, result: unknown): void {
    this.emitEvent('dhavon.task.completed', { taskId, goalId, result });
  }

  emitTaskFailed(taskId: string, goalId: string, error: string): void {
    this.emitEvent('dhavon.task.failed', { taskId, goalId, error });
  }

  emitTaskBlocked(taskId: string, goalId: string, reason: string): void {
    this.emitEvent('dhavon.task.blocked', { taskId, goalId, reason });
  }

  emitMemoryCreated(memory: unknown): void {
    this.emitEvent('dhavon.memory.created', memory);
  }

  emitMemoryUpdated(memory: unknown): void {
    this.emitEvent('dhavon.memory.updated', memory);
  }

  emitOrchestrationPaused(runId: string, reason: string): void {
    this.emitEvent('dhavon.orchestration.paused', { runId, reason });
  }

  emitOrchestrationResumed(runId: string): void {
    this.emitEvent('dhavon.orchestration.resumed', { runId });
  }
}
