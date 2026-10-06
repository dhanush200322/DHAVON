import { Test, TestingModule } from '@nestjs/testing';
import { VerificationService } from './verification.service';
import { SupabaseService } from '../../database/supabase.service';
import { Task } from '@dhavon/types';

describe('VerificationService', () => {
  let service: VerificationService;

  beforeEach(async () => {
    const mockSupabase = {
      getClient: jest.fn().mockReturnValue(null),
      configured: false,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerificationService,
        { provide: SupabaseService, useValue: mockSupabase },
      ],
    }).compile();

    service = module.get<VerificationService>(VerificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should verify structured GitHub payload successfully', async () => {
    const task: Task = {
      id: 'task-1',
      goalId: 'goal-1',
      title: 'Retrieve GitHub Repositories',
      status: 'COMPLETED',
      assignedCapability: 'github-mcp-server',
      verificationStrategy: 'inspect_repositories_payload',
      executionOrder: 1,
      createdAt: '',
      updatedAt: '',
    };

    const output = [
      { name: 'dhavon', full_name: 'user/dhavon', private: false },
      { name: 'portfolio', full_name: 'user/portfolio', private: false },
    ];

    const result = await service.verifyTask({
      task,
      goalId: 'goal-1',
      toolOutput: output,
      status: 'COMPLETED',
    });

    expect(result.verified).toBe(true);
    expect(result.strategy).toBe('inspect_repositories_payload');
    expect(result.evidence.containsData).toBe(true);
  });

  it('should reject verification if task produced null output', async () => {
    const task: Task = {
      id: 'task-2',
      goalId: 'goal-1',
      title: 'Inspect Deployment',
      status: 'COMPLETED',
      verificationStrategy: 'inspect_deployment_status',
      executionOrder: 2,
      createdAt: '',
      updatedAt: '',
    };

    const result = await service.verifyTask({
      task,
      goalId: 'goal-1',
      toolOutput: null,
      status: 'COMPLETED',
    });

    expect(result.verified).toBe(false);
    expect(result.evidence.failureReason).toContain('null or undefined');
  });

  it('should reject verification if output contains error markers', async () => {
    const task: Task = {
      id: 'task-3',
      goalId: 'goal-1',
      title: 'Database Query',
      status: 'COMPLETED',
      verificationStrategy: 'read_record_back',
      executionOrder: 3,
      createdAt: '',
      updatedAt: '',
    };

    const result = await service.verifyTask({
      task,
      goalId: 'goal-1',
      toolOutput: { error: 'Connection refused', code: 'ECONNREFUSED' },
      status: 'COMPLETED',
    });

    expect(result.verified).toBe(false);
  });
});
