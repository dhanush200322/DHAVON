import { Test, TestingModule } from '@nestjs/testing';
import { GoalsService } from './goals.service';
import { SupabaseService } from '../../database/supabase.service';
import { OrchestrationEventsService } from '../events/orchestration-events.service';

describe('GoalsService', () => {
  let service: GoalsService;

  beforeEach(async () => {
    const mockSupabase = {
      getClient: jest.fn().mockReturnValue(null),
      configured: false,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoalsService,
        OrchestrationEventsService,
        { provide: SupabaseService, useValue: mockSupabase },
      ],
    }).compile();

    service = module.get<GoalsService>(GoalsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create and retrieve goals', async () => {
    const goal = await service.createGoal({
      title: 'Launch DHAVON Portfolio',
      description: 'Decompose and build full portfolio site',
      priority: 4,
    });

    expect(goal).toBeDefined();
    expect(goal.id).toBeDefined();
    expect(goal.title).toBe('Launch DHAVON Portfolio');
    expect(goal.status).toBe('ACTIVE');

    const fetched = await service.getGoalById(goal.id);
    expect(fetched).toBeDefined();
    expect(fetched?.title).toBe('Launch DHAVON Portfolio');
  });

  it('should update goal status and progress', async () => {
    const goal = await service.createGoal({
      title: 'API Performance Audit',
    });

    const updated = await service.updateGoalStatus(goal.id, 'COMPLETED', 100);
    expect(updated?.status).toBe('COMPLETED');
    expect(updated?.progress).toBe(100);
  });
});
