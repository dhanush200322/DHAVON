import { Injectable, Logger } from '@nestjs/common';
import { Goal, GoalStatus } from '@dhavon/types';
import { SupabaseService } from '../../database/supabase.service';
import { OrchestrationEventsService } from '../events/orchestration-events.service';
import { v4 as uuidv4 } from 'uuid';

const SYSTEM_USER_UUID = '00000000-0000-0000-0000-000000000001';

import { IsString, IsNotEmpty, IsOptional, MaxLength, IsObject } from 'class-validator';

export class CreateGoalDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  userId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4096)
  description?: string;

  @IsOptional()
  priority?: number;

  @IsOptional()
  @IsString()
  status?: GoalStatus;

  @IsOptional()
  progress?: number;

  @IsOptional()
  @IsString()
  deadline?: string;

  @IsOptional()
  @IsString()
  parentGoalId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  targetCompletionAt?: string; // backwards compatibility
}

@Injectable()
export class GoalsService {
  private readonly logger = new Logger(GoalsService.name);
  private localGoals: Goal[] = [];

  constructor(
    private readonly supabase: SupabaseService,
    private readonly eventsService: OrchestrationEventsService,
  ) {}

  private normalizeUserId(userId?: string): string {
    if (!userId || userId === 'system-user') return SYSTEM_USER_UUID;
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(userId) ? userId : SYSTEM_USER_UUID;
  }

  async createGoal(dto: CreateGoalDto): Promise<Goal> {
    const now = new Date().toISOString();
    const userId = this.normalizeUserId(dto.userId);
    const deadline = dto.deadline || dto.targetCompletionAt;

    const goal: Goal = {
      id: uuidv4(),
      userId,
      title: dto.title,
      description: dto.description || '',
      status: dto.status || 'ACTIVE',
      priority: dto.priority ?? 3,
      progress: dto.progress ?? 0,
      deadline,
      targetCompletionAt: deadline,
      parentGoalId: dto.parentGoalId,
      metadata: dto.metadata || {},
      createdAt: now,
      updatedAt: now,
    };

    this.localGoals.push(goal);
    this.logger.log(`Created goal: "${goal.title}" [${goal.status}]`);

    const client = this.supabase.getClient();
    if (client) {
      try {
        await client.from('goals').insert({
          id: goal.id,
          user_id: goal.userId,
          title: goal.title,
          description: goal.description,
          status: String(goal.status).toUpperCase(),
          priority: goal.priority,
          progress: goal.progress,
          deadline: goal.deadline,
          target_completion_at: goal.targetCompletionAt,
          parent_goal_id: goal.parentGoalId,
          metadata: goal.metadata,
          created_at: goal.createdAt,
          updated_at: goal.updatedAt,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.debug(`Supabase goal insert deferred: ${msg}`);
      }
    }

    this.eventsService.emitGoalCreated(goal);
    return goal;
  }

  async getGoals(userId = SYSTEM_USER_UUID): Promise<Goal[]> {
    const normUser = this.normalizeUserId(userId);
    const client = this.supabase.getClient();

    if (client) {
      try {
        const { data, error } = await client
          .from('goals')
          .select('*')
          .eq('user_id', normUser)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map((row) => ({
            id: row.id,
            userId: row.user_id,
            title: row.title,
            description: row.description,
            status: row.status as GoalStatus,
            priority: row.priority,
            progress: Number(row.progress),
            deadline: row.deadline || row.target_completion_at,
            targetCompletionAt: row.target_completion_at || row.deadline,
            parentGoalId: row.parent_goal_id,
            metadata: row.metadata || {},
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          }));
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.debug(`Supabase goals fetch fallback: ${msg}`);
      }
    }

    return this.localGoals.filter((g) => g.userId === normUser);
  }

  async getGoalById(id: string): Promise<Goal | null> {
    const found = this.localGoals.find((g) => g.id === id);
    if (found) return found;

    const client = this.supabase.getClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('goals')
          .select('*')
          .eq('id', id)
          .single();

        if (!error && data) {
          return {
            id: data.id,
            userId: data.user_id,
            title: data.title,
            description: data.description,
            status: data.status as GoalStatus,
            priority: data.priority,
            progress: Number(data.progress),
            deadline: data.deadline || data.target_completion_at,
            targetCompletionAt: data.target_completion_at || data.deadline,
            parentGoalId: data.parent_goal_id,
            metadata: data.metadata || {},
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          };
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.debug(`Supabase goal by id fallback: ${msg}`);
      }
    }

    return null;
  }

  async updateGoalStatus(
    id: string,
    status: GoalStatus,
    progress?: number,
  ): Promise<Goal | null> {
    const goal = await this.getGoalById(id);
    if (!goal) return null;

    goal.status = status;
    if (progress !== undefined) {
      goal.progress = progress;
    }
    goal.updatedAt = new Date().toISOString();

    const idx = this.localGoals.findIndex((g) => g.id === id);
    if (idx >= 0) {
      this.localGoals[idx] = goal;
    }

    const client = this.supabase.getClient();
    if (client) {
      try {
        await client
          .from('goals')
          .update({
            status: String(goal.status).toUpperCase(),
            progress: goal.progress,
            updated_at: goal.updatedAt,
          })
          .eq('id', id);
      } catch (err: unknown) {
        this.logger.debug(`Supabase goal update fallback: ${err}`);
      }
    }

    this.eventsService.emitGoalProgress(goal.id, goal.progress, String(goal.status));

    if (String(status).toUpperCase() === 'COMPLETED') {
      this.eventsService.emitGoalCompleted(goal);
    } else if (String(status).toUpperCase() === 'BLOCKED' || String(status).toUpperCase() === 'FAILED') {
      this.eventsService.emitGoalFailed(goal.id, `Goal transitioned to ${status}`);
    }

    return goal;
  }
}
