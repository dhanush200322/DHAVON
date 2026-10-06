import { Injectable, Logger } from '@nestjs/common';
import { Task, TaskStatus } from '@dhavon/types';
import { SupabaseService } from '../../database/supabase.service';
import { v4 as uuidv4 } from 'uuid';

export interface DependencyValidationResult {
  valid: boolean;
  hasCycle: boolean;
  missingDependencies: string[];
  cyclePath?: string[];
  errorMessage?: string;
}

@Injectable()
export class DependencyService {
  private readonly logger = new Logger(DependencyService.name);

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Validate that the task dependency graph is a valid Directed Acyclic Graph (DAG).
   */
  validateGraph(tasks: Task[]): DependencyValidationResult {
    const taskMap = new Map<string, Task>();
    const taskTitleMap = new Map<string, Task>();

    for (const t of tasks) {
      taskMap.set(t.id, t);
      taskTitleMap.set(t.title.toLowerCase().trim(), t);
    }

    const missingDependencies: string[] = [];

    // Check for missing dependencies
    for (const t of tasks) {
      for (const dep of t.dependencies || []) {
        if (!taskMap.has(dep) && !taskTitleMap.has(dep.toLowerCase().trim())) {
          missingDependencies.push(`Task "${t.title}" depends on unknown task "${dep}"`);
        }
      }
    }

    if (missingDependencies.length > 0) {
      return {
        valid: false,
        hasCycle: false,
        missingDependencies,
        errorMessage: missingDependencies.join('; '),
      };
    }

    // Cycle detection using Depth-First Search with 3-color marking
    const visited = new Map<string, 'unvisited' | 'visiting' | 'visited'>();
    for (const t of tasks) {
      visited.set(t.id, 'unvisited');
    }

    const cyclePath: string[] = [];

    const hasCycleDfs = (taskId: string, currentPath: string[]): boolean => {
      visited.set(taskId, 'visiting');
      currentPath.push(taskId);

      const task = taskMap.get(taskId);
      if (task) {
        for (const dep of task.dependencies || []) {
          const depTask =
            taskMap.get(dep) || taskTitleMap.get(dep.toLowerCase().trim());
          if (!depTask) continue;

          const state = visited.get(depTask.id);
          if (state === 'visiting') {
            cyclePath.push(...currentPath, depTask.id);
            return true;
          }
          if (state === 'unvisited') {
            if (hasCycleDfs(depTask.id, currentPath)) {
              return true;
            }
          }
        }
      }

      currentPath.pop();
      visited.set(taskId, 'visited');
      return false;
    };

    for (const t of tasks) {
      if (visited.get(t.id) === 'unvisited') {
        if (hasCycleDfs(t.id, [])) {
          const names = cyclePath.map((id) => taskMap.get(id)?.title || id);
          const errorMsg = `Circular dependency detected: ${names.join(' -> ')}`;
          this.logger.error(errorMsg);
          return {
            valid: false,
            hasCycle: true,
            missingDependencies: [],
            cyclePath,
            errorMessage: errorMsg,
          };
        }
      }
    }

    return {
      valid: true,
      hasCycle: false,
      missingDependencies: [],
    };
  }

  /**
   * Determine if all prerequisites for a task are successfully completed.
   */
  arePrerequisitesSatisfied(task: Task, allTasks: Task[]): boolean {
    if (!task.dependencies || task.dependencies.length === 0) {
      return true;
    }

    const taskMap = new Map<string, Task>();
    const titleMap = new Map<string, Task>();
    for (const t of allTasks) {
      taskMap.set(t.id, t);
      titleMap.set(t.title.toLowerCase().trim(), t);
    }

    for (const dep of task.dependencies) {
      const depTask =
        taskMap.get(dep) || titleMap.get(dep.toLowerCase().trim());
      if (!depTask) {
        return false;
      }
      const statusLower = String(depTask.status).toLowerCase();
      if (statusLower !== 'completed') {
        return false;
      }
    }

    return true;
  }

  /**
   * Return tasks in topological execution order.
   */
  getTopologicalOrder(tasks: Task[]): Task[] {
    const taskMap = new Map<string, Task>();
    const titleMap = new Map<string, Task>();
    for (const t of tasks) {
      taskMap.set(t.id, t);
      titleMap.set(t.title.toLowerCase().trim(), t);
    }

    const inDegree = new Map<string, number>();
    const adj = new Map<string, string[]>();

    for (const t of tasks) {
      inDegree.set(t.id, 0);
      adj.set(t.id, []);
    }

    for (const t of tasks) {
      for (const dep of t.dependencies || []) {
        const depTask =
          taskMap.get(dep) || titleMap.get(dep.toLowerCase().trim());
        if (depTask) {
          adj.get(depTask.id)?.push(t.id);
          inDegree.set(t.id, (inDegree.get(t.id) || 0) + 1);
        }
      }
    }

    const queue: string[] = [];
    for (const [id, deg] of inDegree.entries()) {
      if (deg === 0) {
        queue.push(id);
      }
    }

    // Sort queue by executionOrder/priority for deterministic scheduling
    queue.sort((a, b) => {
      const taskA = taskMap.get(a);
      const taskB = taskMap.get(b);
      return (taskA?.executionOrder || 1) - (taskB?.executionOrder || 1);
    });

    const ordered: Task[] = [];
    while (queue.length > 0) {
      const currId = queue.shift()!;
      const currTask = taskMap.get(currId);
      if (currTask) {
        ordered.push(currTask);
      }

      for (const neighborId of adj.get(currId) || []) {
        inDegree.set(neighborId, (inDegree.get(neighborId) || 0) - 1);
        if (inDegree.get(neighborId) === 0) {
          queue.push(neighborId);
        }
      }
    }

    return ordered.length === tasks.length ? ordered : tasks;
  }

  /**
   * Persist dependencies for a task to Supabase task_dependencies table.
   */
  async recordDependencies(
    taskId: string,
    dependencyTaskIds: string[],
  ): Promise<void> {
    const client = this.supabase.getClient();
    if (!client || dependencyTaskIds.length === 0) return;

    try {
      const records = dependencyTaskIds.map((depId) => ({
        id: uuidv4(),
        task_id: taskId,
        depends_on_task_id: depId,
      }));

      await client
        .from('task_dependencies')
        .upsert(records, { onConflict: 'task_id,depends_on_task_id' });
    } catch (err: unknown) {
      this.logger.debug(`Supabase task_dependencies record fallback: ${err}`);
    }
  }
}
