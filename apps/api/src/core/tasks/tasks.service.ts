import { Injectable, Logger } from '@nestjs/common';
import { Task, TaskStatus, RiskLevel } from '@dhavon/types';
import { SupabaseService } from '../../database/supabase.service';
import { OrchestrationEventsService } from '../events/orchestration-events.service';
import { v4 as uuidv4 } from 'uuid';

import { IsString, IsNotEmpty, IsOptional, MaxLength, IsObject, IsArray } from 'class-validator';

export class CreateTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  goalId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4096)
  description?: string;

  @IsOptional()
  status?: TaskStatus;

  @IsOptional()
  priority?: number;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  assignedCapability?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  assignedTool?: string;

  @IsOptional()
  @IsObject()
  toolPayload?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  dependencies?: string[];

  @IsOptional()
  riskLevel?: RiskLevel;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  verificationStrategy?: string;

  @IsOptional()
  executionOrder?: number;
}

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);
  private localTasks: Task[] = [];

  constructor(
    private readonly supabase: SupabaseService,
    private readonly eventsService: OrchestrationEventsService,
  ) {}

  async createTask(dto: CreateTaskDto): Promise<Task> {
    const now = new Date().toISOString();
    const task: Task = {
      id: uuidv4(),
      goalId: dto.goalId || 'default-goal',
      title: dto.title,
      description: dto.description || '',
      status: dto.status || 'PENDING',
      priority: dto.priority ?? 3,
      assignedCapability: dto.assignedCapability,
      assignedTool: dto.assignedTool,
      toolPayload: dto.toolPayload,
      dependencies: dto.dependencies || [],
      riskLevel: dto.riskLevel || 'LOW_RISK',
      progress: 0,
      verificationStrategy: dto.verificationStrategy,
      executionOrder: dto.executionOrder ?? 1,
      createdAt: now,
      updatedAt: now,
    };

    this.localTasks.push(task);
    this.logger.log(`Created task: "${task.title}" [${task.status}]`);

    const client = this.supabase.getClient();
    if (client) {
      try {
        await client.from('tasks').insert({
          id: task.id,
          goal_id: task.goalId,
          title: task.title,
          description: task.description,
          status: String(task.status).toUpperCase(),
          priority: task.priority,
          assigned_capability: task.assignedCapability,
          assigned_tool: task.assignedTool,
          tool_payload: task.toolPayload,
          dependencies: task.dependencies,
          risk_level: task.riskLevel,
          progress: task.progress,
          execution_order: task.executionOrder,
          created_at: task.createdAt,
          updated_at: task.updatedAt,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.debug(`Supabase task insert deferred: ${msg}`);
      }
    }

    this.eventsService.emitTaskCreated(task);
    return task;
  }

  async getTasks(goalId?: string): Promise<Task[]> {
    const client = this.supabase.getClient();
    if (client) {
      try {
        let query = client
          .from('tasks')
          .select('*')
          .order('execution_order', { ascending: true });

        if (goalId) {
          query = query.eq('goal_id', goalId);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return data.map((row) => ({
            id: row.id,
            goalId: row.goal_id,
            title: row.title,
            description: row.description,
            status: row.status as TaskStatus,
            priority: row.priority,
            assignedCapability: row.assigned_capability,
            assignedTool: row.assigned_tool,
            toolPayload: row.tool_payload,
            dependencies: row.dependencies || [],
            riskLevel: row.risk_level as RiskLevel,
            progress: Number(row.progress || 0),
            result: row.result,
            executionOrder: row.execution_order,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          }));
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.debug(`Supabase tasks fetch fallback: ${msg}`);
      }
    }

    if (goalId) {
      return this.localTasks.filter((t) => t.goalId === goalId);
    }
    return this.localTasks;
  }

  async getTaskById(id: string): Promise<Task | null> {
    const found = this.localTasks.find((t) => t.id === id);
    if (found) return found;

    const client = this.supabase.getClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('tasks')
          .select('*')
          .eq('id', id)
          .single();

        if (!error && data) {
          return {
            id: data.id,
            goalId: data.goal_id,
            title: data.title,
            description: data.description,
            status: data.status as TaskStatus,
            priority: data.priority,
            assignedCapability: data.assigned_capability,
            assignedTool: data.assigned_tool,
            toolPayload: data.tool_payload,
            dependencies: data.dependencies || [],
            riskLevel: data.risk_level as RiskLevel,
            progress: Number(data.progress || 0),
            result: data.result,
            executionOrder: data.execution_order,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          };
        }
      } catch (err: unknown) {
        this.logger.debug(`Supabase task by id fallback: ${err}`);
      }
    }

    return null;
  }

  async updateTaskStatus(
    id: string,
    status: TaskStatus,
    result?: Record<string, unknown>,
    progress?: number,
  ): Promise<Task | null> {
    const task = await this.getTaskById(id);
    if (!task) return null;

    task.status = status;
    if (result) task.result = result;
    if (progress !== undefined) task.progress = progress;
    task.updatedAt = new Date().toISOString();

    const idx = this.localTasks.findIndex((t) => t.id === id);
    if (idx >= 0) {
      this.localTasks[idx] = task;
    }

    const client = this.supabase.getClient();
    if (client) {
      try {
        await client
          .from('tasks')
          .update({
            status: String(task.status).toUpperCase(),
            result: task.result,
            progress: task.progress,
            updated_at: task.updatedAt,
          })
          .eq('id', id);
      } catch (err: unknown) {
        this.logger.debug(`Supabase task update fallback: ${err}`);
      }
    }

    // Emit event based on status
    const statusUpper = String(status).toUpperCase();
    if (statusUpper === 'READY') {
      this.eventsService.emitTaskReady(task.id, task.goalId);
    } else if (statusUpper === 'RUNNING') {
      this.eventsService.emitTaskStarted(task.id, task.goalId, task.assignedTool);
    } else if (statusUpper === 'COMPLETED') {
      this.eventsService.emitTaskCompleted(task.id, task.goalId, task.result);
    } else if (statusUpper === 'FAILED') {
      this.eventsService.emitTaskFailed(
        task.id,
        task.goalId,
        (task.result?.error as string) || 'Task execution failed',
      );
    } else if (statusUpper === 'BLOCKED') {
      this.eventsService.emitTaskBlocked(
        task.id,
        task.goalId,
        'Prerequisite task failed or missing',
      );
    }

    return task;
  }
}
