import { Test, TestingModule } from '@nestjs/testing';
import { DependencyService } from './dependency.service';
import { SupabaseService } from '../../database/supabase.service';
import { Task } from '@dhavon/types';

describe('DependencyService', () => {
  let service: DependencyService;

  beforeEach(async () => {
    const mockSupabase = {
      getClient: jest.fn().mockReturnValue(null),
      configured: false,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DependencyService,
        { provide: SupabaseService, useValue: mockSupabase },
      ],
    }).compile();

    service = module.get<DependencyService>(DependencyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('DAG Validation & Cycle Detection', () => {
    it('should validate a valid linear DAG', () => {
      const tasks: Task[] = [
        {
          id: 'task-1',
          goalId: 'goal-1',
          title: 'Task A',
          status: 'completed',
          dependencies: [],
          executionOrder: 1,
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 'task-2',
          goalId: 'goal-1',
          title: 'Task B',
          status: 'pending',
          dependencies: ['task-1'],
          executionOrder: 2,
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 'task-3',
          goalId: 'goal-1',
          title: 'Task C',
          status: 'pending',
          dependencies: ['task-2'],
          executionOrder: 3,
          createdAt: '',
          updatedAt: '',
        },
      ];

      const result = service.validateGraph(tasks);
      expect(result.valid).toBe(true);
      expect(result.hasCycle).toBe(false);
      expect(result.missingDependencies.length).toBe(0);
    });

    it('should detect circular dependencies', () => {
      const cyclicTasks: Task[] = [
        {
          id: 'task-1',
          goalId: 'goal-1',
          title: 'Task A',
          status: 'pending',
          dependencies: ['task-3'], // A depends on C
          executionOrder: 1,
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 'task-2',
          goalId: 'goal-1',
          title: 'Task B',
          status: 'pending',
          dependencies: ['task-1'], // B depends on A
          executionOrder: 2,
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 'task-3',
          goalId: 'goal-1',
          title: 'Task C',
          status: 'pending',
          dependencies: ['task-2'], // C depends on B -> CYCLE!
          executionOrder: 3,
          createdAt: '',
          updatedAt: '',
        },
      ];

      const result = service.validateGraph(cyclicTasks);
      expect(result.valid).toBe(false);
      expect(result.hasCycle).toBe(true);
      expect(result.errorMessage).toContain('Circular dependency detected');
    });

    it('should detect missing dependencies', () => {
      const tasks: Task[] = [
        {
          id: 'task-1',
          goalId: 'goal-1',
          title: 'Task A',
          status: 'pending',
          dependencies: ['non-existent-task-id'],
          executionOrder: 1,
          createdAt: '',
          updatedAt: '',
        },
      ];

      const result = service.validateGraph(tasks);
      expect(result.valid).toBe(false);
      expect(result.missingDependencies.length).toBe(1);
    });
  });

  describe('Prerequisite Resolution & Topological Order', () => {
    it('should correctly determine when prerequisites are satisfied', () => {
      const taskA: Task = {
        id: 'task-a',
        goalId: 'g1',
        title: 'Task A',
        status: 'completed',
        dependencies: [],
        executionOrder: 1,
        createdAt: '',
        updatedAt: '',
      };
      const taskB: Task = {
        id: 'task-b',
        goalId: 'g1',
        title: 'Task B',
        status: 'pending',
        dependencies: ['task-a'],
        executionOrder: 2,
        createdAt: '',
        updatedAt: '',
      };

      expect(service.arePrerequisitesSatisfied(taskA, [taskA, taskB])).toBe(true);
      expect(service.arePrerequisitesSatisfied(taskB, [taskA, taskB])).toBe(true);

      // If taskA is not completed
      taskA.status = 'pending';
      expect(service.arePrerequisitesSatisfied(taskB, [taskA, taskB])).toBe(false);
    });

    it('should return tasks in topological execution order', () => {
      const tasks: Task[] = [
        {
          id: 'task-3',
          goalId: 'g1',
          title: 'Deploy App',
          status: 'pending',
          dependencies: ['task-2'],
          executionOrder: 3,
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 'task-1',
          goalId: 'g1',
          title: 'Build Project',
          status: 'completed',
          dependencies: [],
          executionOrder: 1,
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 'task-2',
          goalId: 'g1',
          title: 'Run Tests',
          status: 'pending',
          dependencies: ['task-1'],
          executionOrder: 2,
          createdAt: '',
          updatedAt: '',
        },
      ];

      const ordered = service.getTopologicalOrder(tasks);
      expect(ordered[0].id).toBe('task-1');
      expect(ordered[1].id).toBe('task-2');
      expect(ordered[2].id).toBe('task-3');
    });
  });
});
