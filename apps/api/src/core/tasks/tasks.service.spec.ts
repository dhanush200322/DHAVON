import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { SupabaseService } from '../../database/supabase.service';
import { OrchestrationEventsService } from '../events/orchestration-events.service';

describe('TasksService', () => {
  let service: TasksService;

  beforeEach(async () => {
    const mockSupabase = {
      getClient: jest.fn().mockReturnValue(null),
      configured: false,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        OrchestrationEventsService,
        { provide: SupabaseService, useValue: mockSupabase },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create task with dependencies and risk level', async () => {
    const task = await service.createTask({
      goalId: 'test-goal-id',
      title: 'Inspect GitHub Repositories',
      description: 'Fetch active repos',
      riskLevel: 'READ',
      assignedCapability: 'github-mcp-server',
      dependencies: [],
    });

    expect(task.id).toBeDefined();
    expect(task.status).toBe('PENDING');
    expect(task.riskLevel).toBe('READ');
    expect(task.assignedCapability).toBe('github-mcp-server');
  });

  it('should transition task statuses through lifecycle', async () => {
    const task = await service.createTask({
      goalId: 'test-goal-id',
      title: 'Verify Database Schema',
      riskLevel: 'READ',
    });

    await service.updateTaskStatus(task.id, 'READY');
    let fetched = await service.getTaskById(task.id);
    expect(fetched?.status).toBe('READY');

    await service.updateTaskStatus(task.id, 'RUNNING');
    fetched = await service.getTaskById(task.id);
    expect(fetched?.status).toBe('RUNNING');

    await service.updateTaskStatus(task.id, 'COMPLETED', { verified: true }, 100);
    fetched = await service.getTaskById(task.id);
    expect(fetched?.status).toBe('COMPLETED');
    expect(fetched?.progress).toBe(100);
  });
});
