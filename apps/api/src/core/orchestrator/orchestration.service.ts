import { Injectable, Logger } from '@nestjs/common';
import {
  Goal,
  Task,
  OrchestrationRun,
  OrchestrationStatus,
} from '@dhavon/types';
import { GoalsService } from '../goals/goals.service';
import { TasksService } from '../tasks/tasks.service';
import { PlannerService } from './planner.service';
import { DependencyService } from './dependency.service';
import { VerificationService } from './verification.service';
import { McpGatewayService } from '../../mcp/mcp-gateway.service';
import { MemoryService } from '../memory/memory.service';
import { StateService } from '../state/state.service';
import { OrchestrationEventsService } from '../events/orchestration-events.service';
import { SupabaseService } from '../../database/supabase.service';
import { v4 as uuidv4 } from 'uuid';

export interface OrchestrationResult {
  runId: string;
  goalId: string;
  status: OrchestrationStatus;
  progress: number;
  completedTasks: string[];
  failedTasks: string[];
  blockedTasks: string[];
  waitingTasks: string[];
  explanation: string;
  diagnostic?: {
    failedTaskId?: string;
    failureReason?: string;
    completedCount: number;
    blockedCount: number;
    userActionRequired?: string;
  };
}

@Injectable()
export class OrchestrationService {
  private readonly logger = new Logger(OrchestrationService.name);

  // Supervised Autonomy Limits
  private readonly maxTasksPerGoal = 20;
  private readonly maxExecutionDepth = 10;
  private readonly maxRetries = 2;
  private readonly maxConsecutiveFailures = 3;
  private readonly maxRuntimeMs = 300000; // 5 minutes

  private localRuns: OrchestrationRun[] = [];

  constructor(
    private readonly goalsService: GoalsService,
    private readonly tasksService: TasksService,
    private readonly plannerService: PlannerService,
    private readonly dependencyService: DependencyService,
    private readonly verificationService: VerificationService,
    private readonly mcpGateway: McpGatewayService,
    private readonly memoryService: MemoryService,
    private readonly stateService: StateService,
    private readonly eventsService: OrchestrationEventsService,
    private readonly supabase: SupabaseService,
  ) {}

  /**
   * Main supervised autonomous orchestration pipeline.
   * Transforms user objective into goal, plans tasks, validates dependencies,
   * executes authorized capabilities, verifies evidence, and learns.
   */
  async executeGoal(goalId: string, userId = 'system-user'): Promise<OrchestrationResult> {
    const startTime = Date.now();
    this.logger.log(`Beginning orchestration loop for goal: ${goalId}`);

    // 1. Fetch Goal
    const goal = await this.goalsService.getGoalById(goalId);
    if (!goal) {
      throw new Error(`Goal with ID "${goalId}" not found`);
    }

    // 2. Planning: Check if tasks already exist; if not, plan and decompose
    let tasks = await this.tasksService.getTasks(goalId);
    if (tasks.length === 0) {
      this.stateService.transitionTo('THINKING', `Planning execution strategy for: ${goal.title}`);
      const plan = await this.plannerService.planGoal({
        goalId: goal.id,
        title: goal.title,
        description: goal.description,
        userId,
      });

      // Create decomposed tasks
      for (const planned of plan.tasks) {
        await this.tasksService.createTask({
          goalId: goal.id,
          title: planned.title,
          description: planned.description,
          status: 'PENDING',
          assignedCapability: planned.assignedCapability,
          dependencies: planned.dependencies,
          riskLevel: planned.estimatedRisk,
          verificationStrategy: planned.verificationStrategy,
          executionOrder: planned.executionOrder,
        });
      }
      tasks = await this.tasksService.getTasks(goalId);
    }

    // Cap tasks at autonomy limit
    if (tasks.length > this.maxTasksPerGoal) {
      tasks = tasks.slice(0, this.maxTasksPerGoal);
    }

    // 3. Initialize Orchestration Run
    const run: OrchestrationRun = {
      id: uuidv4(),
      goalId: goal.id,
      status: 'RUNNING',
      executionDepth: 0,
      retryCount: 0,
      consecutiveFailures: 0,
      metadata: { initiatedBy: userId, totalTasks: tasks.length },
      startedAt: new Date().toISOString(),
    };
    this.localRuns.push(run);
    await this.persistRun(run);

    let consecutiveFailures = 0;
    const completedTaskTitles: string[] = [];
    const failedTaskTitles: string[] = [];
    const blockedTaskTitles: string[] = [];
    const waitingTaskTitles: string[] = [];

    // 4. Execution Loop
    while (Date.now() - startTime < this.maxRuntimeMs) {
      run.executionDepth++;

      // Check Autonomy Limit: Execution Depth
      if (run.executionDepth > this.maxExecutionDepth) {
        return this.pauseForLimit(
          run,
          goal,
          `Exceeded maximum execution depth limit of ${this.maxExecutionDepth} steps.`,
          completedTaskTitles,
          failedTaskTitles,
          blockedTaskTitles,
          waitingTaskTitles,
        );
      }

      // Check Autonomy Limit: Consecutive Failures
      if (consecutiveFailures >= this.maxConsecutiveFailures) {
        return this.pauseForLimit(
          run,
          goal,
          `Exceeded maximum consecutive failure threshold (${this.maxConsecutiveFailures}). Halting autonomy.`,
          completedTaskTitles,
          failedTaskTitles,
          blockedTaskTitles,
          waitingTaskTitles,
        );
      }

      // Refresh task states
      tasks = await this.tasksService.getTasks(goal.id);

      // Resolve READY tasks based on DAG dependencies
      for (const t of tasks) {
        const statusUpper = String(t.status).toUpperCase();
        if (statusUpper === 'PENDING') {
          if (this.dependencyService.arePrerequisitesSatisfied(t, tasks)) {
            await this.tasksService.updateTaskStatus(t.id, 'READY');
            t.status = 'READY';
          }
        }
      }

      // Check overall progress
      const allCompleted = tasks.every((t) => String(t.status).toUpperCase() === 'COMPLETED');
      if (allCompleted) {
        await this.goalsService.updateGoalStatus(goal.id, 'COMPLETED', 100);
        run.status = 'COMPLETED';
        run.completedAt = new Date().toISOString();
        await this.persistRun(run);

        // Store learned project memory
        await this.memoryService.storeMemory({
          userId,
          type: 'project',
          content: `Successfully completed goal "${goal.title}". All ${tasks.length} tasks executed and verified.`,
          importance: 0.9,
          source: 'orchestration',
        });

        this.stateService.transitionTo('CALM', `Goal "${goal.title}" successfully completed.`);
        return {
          runId: run.id,
          goalId: goal.id,
          status: 'COMPLETED',
          progress: 100,
          completedTasks: tasks.map((t) => t.title),
          failedTasks: [],
          blockedTasks: [],
          waitingTasks: [],
          explanation: `Objective "${goal.title}" was fully completed with all ${tasks.length} tasks verified.`,
        };
      }

      // Find next task to execute
      const nextTask = tasks.find((t) => String(t.status).toUpperCase() === 'READY');

      if (!nextTask) {
        // If no ready task, check if there are tasks waiting for user confirmation
        const waiting = tasks.filter((t) => String(t.status).toUpperCase() === 'WAITING');
        if (waiting.length > 0) {
          run.status = 'PAUSED';
          await this.persistRun(run);
          this.stateService.transitionTo('THINKING', 'Waiting for explicit user confirmation.');
          return {
            runId: run.id,
            goalId: goal.id,
            status: 'PAUSED',
            progress: this.calculateProgress(tasks),
            completedTasks: completedTaskTitles,
            failedTasks: failedTaskTitles,
            blockedTasks: blockedTaskTitles,
            waitingTasks: waiting.map((w) => w.title),
            explanation: `Execution paused. Task "${waiting[0].title}" requires explicit user confirmation.`,
            diagnostic: {
              completedCount: completedTaskTitles.length,
              blockedCount: blockedTaskTitles.length,
              userActionRequired: `Approve execution for "${waiting[0].title}"`,
            },
          };
        }

        // If tasks are stuck or blocked
        const failed = tasks.filter((t) => String(t.status).toUpperCase() === 'FAILED');
        if (failed.length > 0) {
          await this.goalsService.updateGoalStatus(goal.id, 'BLOCKED');
          run.status = 'BLOCKED';
          await this.persistRun(run);
          this.stateService.transitionTo('ERROR', `Goal blocked due to failure in task "${failed[0].title}"`);

          return {
            runId: run.id,
            goalId: goal.id,
            status: 'BLOCKED',
            progress: this.calculateProgress(tasks),
            completedTasks: completedTaskTitles,
            failedTasks: failed.map((f) => f.title),
            blockedTasks: tasks
              .filter((t) => String(t.status).toUpperCase() === 'BLOCKED')
              .map((b) => b.title),
            waitingTasks: [],
            explanation: `Goal execution blocked. Task "${failed[0].title}" failed, preventing dependent downstream tasks.`,
            diagnostic: {
              failedTaskId: failed[0].id,
              failureReason: (failed[0].result?.error as string) || 'Task execution failed',
              completedCount: completedTaskTitles.length,
              blockedCount: tasks.filter((t) => String(t.status).toUpperCase() === 'BLOCKED').length,
              userActionRequired: 'Inspect failed task inputs or approve retry.',
            },
          };
        }

        // All active tasks processed or none ready
        break;
      }

      // Execute nextTask
      run.currentTaskId = nextTask.id;
      await this.tasksService.updateTaskStatus(nextTask.id, 'RUNNING');
      this.stateService.transitionTo('ACTING', `Executing task: ${nextTask.title}`);

      // Resolve candidate tool via MCP Gateway
      let candidate = null;
      if (nextTask.assignedCapability && nextTask.assignedCapability.toLowerCase() !== 'internal') {
        candidate = this.mcpGateway.resolveCandidateForQuery(
          `${nextTask.assignedCapability} ${nextTask.title} ${nextTask.description || ''}`,
        );
      } else if (!nextTask.assignedCapability) {
        candidate = this.mcpGateway.resolveCandidateForQuery(
          `${nextTask.title} ${nextTask.description || ''}`,
        );
      }

      // Supervised Autonomy: evaluate risk level
      const taskRisk = nextTask.riskLevel || (candidate ? candidate.tool.riskLevel : 'LOW_RISK');

      if (taskRisk === 'CONFIRMATION_REQUIRED' || taskRisk === 'SENSITIVE') {
        this.logger.warn(
          `Supervised Autonomy: Pausing execution for high-risk task "${nextTask.title}" (${taskRisk})`,
        );
        await this.tasksService.updateTaskStatus(nextTask.id, 'WAITING');
        waitingTaskTitles.push(nextTask.title);
        run.status = 'PAUSED';
        run.pauseReason = `Requires confirmation for high-risk capability (${taskRisk})`;
        await this.persistRun(run);

        this.eventsService.emitOrchestrationPaused(run.id, run.pauseReason);
        this.stateService.transitionTo('THINKING', 'Awaiting user authorization.');

        return {
          runId: run.id,
          goalId: goal.id,
          status: 'PAUSED',
          progress: this.calculateProgress(tasks),
          completedTasks: completedTaskTitles,
          failedTasks: failedTaskTitles,
          blockedTasks: blockedTaskTitles,
          waitingTasks: [nextTask.title],
          explanation: `Task "${nextTask.title}" requires explicit authorization before execution (${taskRisk}).`,
          diagnostic: {
            userActionRequired: `Authorize ${candidate ? candidate.tool.name : nextTask.title}`,
            completedCount: completedTaskTitles.length,
            blockedCount: blockedTaskTitles.length,
          },
        };
      }

      // Execute Approved / Read / Low-Risk task with retry policy
      let executionSuccess = false;
      let outputData: unknown = null;
      let executionError = '';
      let retriesLeft = this.maxRetries;

      while (retriesLeft >= 0 && !executionSuccess) {
        try {
          if (candidate) {
            const execResult = await this.mcpGateway.executeTool({
              serverId: candidate.tool.serverId,
              toolName: candidate.tool.name,
              arguments: candidate.suggestedArgs || nextTask.toolPayload || {},
              userId,
            });

            if (execResult.success) {
              executionSuccess = true;
              outputData = execResult.output?.content;
            } else {
              executionError = execResult.errorMessage || 'MCP execution returned unsuccessful status';
              if (execResult.status === 'REJECTED') {
                // Do NOT retry permission rejection
                retriesLeft = 0;
                break;
              }
            }
          } else {
            // Internal deterministic task execution
            executionSuccess = true;
            outputData = {
              status: 'synthesized',
              task: nextTask.title,
              summary: `Completed processing for: ${nextTask.description || nextTask.title}`,
            };
          }
        } catch (err: unknown) {
          executionError = err instanceof Error ? err.message : String(err);
        }

        if (!executionSuccess) {
          retriesLeft--;
          if (retriesLeft >= 0) {
            run.retryCount++;
            this.logger.warn(`Task "${nextTask.title}" failed. Retrying... (${retriesLeft} retries remaining)`);
          }
        }
      }

      // Verification Step: NEVER declare success without verification
      this.stateService.transitionTo('THINKING', `Verifying execution evidence for "${nextTask.title}"`);
      const verification = await this.verificationService.verifyTask({
        task: nextTask,
        goalId: goal.id,
        toolOutput: outputData,
        status: executionSuccess ? 'COMPLETED' : 'FAILED',
      });

      if (executionSuccess && verification.verified) {
        consecutiveFailures = 0;
        await this.tasksService.updateTaskStatus(
          nextTask.id,
          'COMPLETED',
          { output: outputData, verified: true },
          100,
        );
        completedTaskTitles.push(nextTask.title);

        // Record step in Supabase
        await this.recordStep(run.id, nextTask.id, run.executionDepth, outputData, true);

        // If output contains valuable info, persist to memory
        if (candidate) {
          await this.memoryService.storeMemory({
            userId,
            type: 'project',
            content: `Task "${nextTask.title}" (${candidate.tool.serverName}:${candidate.tool.name}) returned verified data.`,
            importance: 0.7,
            source: 'task_verification',
          });
        }

        // Update goal progress
        const currentProgress = this.calculateProgress(tasks);
        await this.goalsService.updateGoalStatus(goal.id, 'ACTIVE', currentProgress);
      } else {
        // Failure Handling
        consecutiveFailures++;
        const finalError = verification.verified
          ? executionError
          : (verification.evidence.failureReason as string) || executionError;

        await this.tasksService.updateTaskStatus(
          nextTask.id,
          'FAILED',
          { error: finalError, verified: false },
        );
        failedTaskTitles.push(nextTask.title);

        // Block all dependent downstream tasks
        for (const depTask of tasks) {
          if (
            depTask.dependencies?.includes(nextTask.id) ||
            depTask.dependencies?.includes(nextTask.title)
          ) {
            await this.tasksService.updateTaskStatus(depTask.id, 'BLOCKED');
            blockedTaskTitles.push(depTask.title);
          }
        }

        await this.goalsService.updateGoalStatus(goal.id, 'BLOCKED');
        run.status = 'BLOCKED';
        await this.persistRun(run);

        this.stateService.transitionTo('ERROR', `Task "${nextTask.title}" failed verification.`);

        return {
          runId: run.id,
          goalId: goal.id,
          status: 'BLOCKED',
          progress: this.calculateProgress(tasks),
          completedTasks: completedTaskTitles,
          failedTasks: failedTaskTitles,
          blockedTasks: blockedTaskTitles,
          waitingTasks: [],
          explanation: `Task "${nextTask.title}" failed execution/verification: ${finalError}. Dependent tasks blocked.`,
          diagnostic: {
            failedTaskId: nextTask.id,
            failureReason: finalError,
            completedCount: completedTaskTitles.length,
            blockedCount: blockedTaskTitles.length,
            userActionRequired: 'Inspect tool permissions and arguments before retrying.',
          },
        };
      }
    }

    // Finished loop
    const finalTasks = await this.tasksService.getTasks(goal.id);
    const finalProgress = this.calculateProgress(finalTasks);
    return {
      runId: run.id,
      goalId: goal.id,
      status: run.status,
      progress: finalProgress,
      completedTasks: completedTaskTitles,
      failedTasks: failedTaskTitles,
      blockedTasks: blockedTaskTitles,
      waitingTasks: waitingTaskTitles,
      explanation: `Orchestration loop concluded at progress ${finalProgress.toFixed(0)}%.`,
    };
  }

  async getOrchestrationRun(runId: string): Promise<OrchestrationRun | null> {
    const local = this.localRuns.find((r) => r.id === runId);
    if (local) return local;

    const client = this.supabase.getClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('orchestration_runs')
          .select('*')
          .eq('id', runId)
          .single();

        if (!error && data) {
          return {
            id: data.id,
            goalId: data.goal_id,
            status: data.status,
            currentTaskId: data.current_task_id,
            executionDepth: data.execution_depth,
            retryCount: data.retry_count,
            consecutiveFailures: data.consecutive_failures,
            pauseReason: data.pause_reason,
            metadata: data.metadata || {},
            startedAt: data.started_at,
            completedAt: data.completed_at,
          };
        }
      } catch (err: unknown) {
        this.logger.debug(`Supabase orchestration_run fetch fallback: ${err}`);
      }
    }
    return null;
  }

  private calculateProgress(tasks: Task[]): number {
    if (tasks.length === 0) return 0;
    const completed = tasks.filter((t) => String(t.status).toUpperCase() === 'COMPLETED').length;
    return Math.round((completed / tasks.length) * 100);
  }

  private pauseForLimit(
    run: OrchestrationRun,
    goal: Goal,
    reason: string,
    completed: string[],
    failed: string[],
    blocked: string[],
    waiting: string[],
  ): OrchestrationResult {
    this.logger.warn(`Autonomy limit exceeded: ${reason}`);
    run.status = 'PAUSED';
    run.pauseReason = reason;
    this.eventsService.emitOrchestrationPaused(run.id, reason);
    this.stateService.transitionTo('THINKING', `Autonomy paused: ${reason}`);

    return {
      runId: run.id,
      goalId: goal.id,
      status: 'PAUSED',
      progress: 50,
      completedTasks: completed,
      failedTasks: failed,
      blockedTasks: blocked,
      waitingTasks: waiting,
      explanation: `Execution paused due to safety limit: ${reason}`,
      diagnostic: {
        completedCount: completed.length,
        blockedCount: blocked.length,
        userActionRequired: 'Review run status and manually resume.',
      },
    };
  }

  private async persistRun(run: OrchestrationRun): Promise<void> {
    const client = this.supabase.getClient();
    if (client) {
      try {
        await client.from('orchestration_runs').upsert({
          id: run.id,
          goal_id: run.goalId,
          status: run.status,
          current_task_id: run.currentTaskId,
          execution_depth: run.executionDepth,
          retry_count: run.retryCount,
          consecutive_failures: run.consecutiveFailures,
          pause_reason: run.pauseReason,
          metadata: run.metadata,
          started_at: run.startedAt,
          completed_at: run.completedAt,
        });
      } catch (err: unknown) {
        this.logger.debug(`Supabase orchestration_run upsert fallback: ${err}`);
      }
    }
  }

  private async recordStep(
    runId: string,
    taskId: string,
    stepNumber: number,
    outputResult: unknown,
    verified: boolean,
  ): Promise<void> {
    const client = this.supabase.getClient();
    if (client) {
      try {
        await client.from('orchestration_steps').insert({
          id: uuidv4(),
          run_id: runId,
          task_id: taskId,
          step_number: stepNumber,
          action_type: 'TOOL_EXECUTION',
          output_result: typeof outputResult === 'object' ? outputResult : { result: outputResult },
          verified,
          status: 'COMPLETED',
          created_at: new Date().toISOString(),
        });
      } catch (err: unknown) {
        this.logger.debug(`Supabase orchestration_steps insert fallback: ${err}`);
      }
    }
  }
}
