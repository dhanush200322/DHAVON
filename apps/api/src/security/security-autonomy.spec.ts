import { DependencyService } from '../core/orchestrator/dependency.service';
import { Task } from '@dhavon/types';

describe('Phase 7 Security: Autonomy Limits & Graph Integrity', () => {
  let dependencyService: DependencyService;
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {};
    dependencyService = new DependencyService(mockSupabase);
  });

  const createTask = (id: string, title: string, dependencies: string[] = []): Task => ({
    id,
    goalId: 'goal-1',
    title,
    status: 'PENDING',
    dependencies,
    executionOrder: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  it('should detect and reject circular dependency cycles (A -> B -> C -> A)', () => {
    const tasks: Task[] = [
      createTask('task-a', 'Task A', ['task-c']),
      createTask('task-b', 'Task B', ['task-a']),
      createTask('task-c', 'Task C', ['task-b']),
    ];

    const result = dependencyService.validateGraph(tasks);
    expect(result.valid).toBe(false);
    expect(result.hasCycle).toBe(true);
    expect(result.cyclePath).toBeDefined();
    expect(result.cyclePath!.length).toBeGreaterThanOrEqual(3);
  });

  it('should detect and reject direct self-referencing tasks (A -> A)', () => {
    const tasks: Task[] = [createTask('task-self', 'Self Task', ['task-self'])];

    const result = dependencyService.validateGraph(tasks);
    expect(result.valid).toBe(false);
    expect(result.hasCycle).toBe(true);
  });

  it('should detect missing or unresolvable dependencies', () => {
    const tasks: Task[] = [
      createTask('task-1', 'Task 1', ['non-existent-task-id']),
    ];

    const result = dependencyService.validateGraph(tasks);
    expect(result.valid).toBe(false);
    expect(result.missingDependencies.length).toBe(1);
    expect(result.errorMessage).toContain('depends on unknown task');
  });

  it('should validate a clean Directed Acyclic Graph (A -> B -> C)', () => {
    const tasks: Task[] = [
      createTask('task-a', 'Task A', []),
      createTask('task-b', 'Task B', ['task-a']),
      createTask('task-c', 'Task C', ['task-b']),
    ];

    const result = dependencyService.validateGraph(tasks);
    expect(result.valid).toBe(true);
    expect(result.hasCycle).toBe(false);
    expect(result.missingDependencies.length).toBe(0);
  });
});
