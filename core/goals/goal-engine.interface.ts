import { Goal, GoalStatus, Task, TaskStatus } from '@dhavon/types';

export interface CreateGoalInput {
  userId: string;
  title: string;
  description?: string;
  priority?: number;
  targetCompletionAt?: string;
}

export interface IGoalEngine {
  createGoal(input: CreateGoalInput): Promise<Goal>;
  getGoalById(goalId: string): Promise<Goal | null>;
  getActiveGoals(userId: string): Promise<Goal[]>;
  updateGoalStatus(goalId: string, status: GoalStatus): Promise<Goal>;
  decomposeGoalToTasks(goalId: string, objective: string): Promise<Task[]>;
  updateTaskStatus(taskId: string, status: TaskStatus, resultPayload?: Record<string, unknown>): Promise<Task>;
}
