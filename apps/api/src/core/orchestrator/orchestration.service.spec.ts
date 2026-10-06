import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { OrchestrationService } from './orchestration.service';
import { GoalsService } from '../goals/goals.service';
import { TasksService } from '../tasks/tasks.service';
import { PlannerService } from './planner.service';
import { DependencyService } from './dependency.service';
import { VerificationService } from './verification.service';
import { McpGatewayService } from '../../mcp/mcp-gateway.service';
import { MemoryService } from '../memory/memory.service';
import { MemoryEmbeddingService } from '../memory/memory-embedding.service';
import { StateService } from '../state/state.service';
import { OrchestrationEventsService } from '../events/orchestration-events.service';
import { SupabaseService } from '../../database/supabase.service';
import { AIProviderFactory } from '../../providers/provider.factory';

describe('OrchestrationService', () => {
  let service: OrchestrationService;
  let goalsService: GoalsService;
  let tasksService: TasksService;
  let mockMcpGateway: any;

  beforeEach(async () => {
    mockMcpGateway = {
      getTools: jest.fn().mockReturnValue([
        {
          serverId: 'github-mcp-server',
          serverName: 'github-mcp-server',
          name: 'get_repository',
          riskLevel: 'READ',
        },
      ]),
      resolveCandidateForQuery: jest.fn().mockReturnValue({
        tool: {
          serverId: 'github-mcp-server',
          serverName: 'github-mcp-server',
          name: 'get_repository',
          riskLevel: 'READ',
        },
        confidence: 0.9,
        suggestedArgs: {},
      }),
      executeTool: jest.fn().mockResolvedValue({
        executionId: 'mock-exec-1',
        toolName: 'get_repository',
        serverName: 'github-mcp-server',
        status: 'COMPLETED',
        riskLevel: 'READ',
        success: true,
        output: {
          contentType: 'json',
          content: [{ name: 'dhavon', active: true }],
        },
        executionDurationMs: 45,
      }),
    };

    const mockSupabase = {
      getClient: jest.fn().mockReturnValue(null),
      configured: false,
    };

    const mockAIProvider = {
      name: 'gemini',
      defaultModel: 'gemini-2.5-flash',
      generate: jest.fn().mockRejectedValue(new Error('AI offline in test')),
    };

    const mockProviderFactory = {
      getActiveProvider: jest.fn().mockReturnValue(mockAIProvider),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [
        OrchestrationService,
        GoalsService,
        TasksService,
        PlannerService,
        DependencyService,
        VerificationService,
        MemoryService,
        MemoryEmbeddingService,
        StateService,
        OrchestrationEventsService,
        { provide: McpGatewayService, useValue: mockMcpGateway },
        { provide: SupabaseService, useValue: mockSupabase },
        { provide: AIProviderFactory, useValue: mockProviderFactory },
      ],
    }).compile();

    service = module.get<OrchestrationService>(OrchestrationService);
    goalsService = module.get<GoalsService>(GoalsService);
    tasksService = module.get<TasksService>(TasksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Supervised Autonomy & Safe Execution', () => {
    it('should automatically execute and complete a safe read task', async () => {
      const goal = await goalsService.createGoal({
        title: 'Check GitHub Repositories',
        description: 'Read active repositories',
      });

      await tasksService.createTask({
        goalId: goal.id,
        title: 'Fetch Repositories',
        status: 'PENDING',
        riskLevel: 'READ',
        assignedCapability: 'github-mcp-server',
        dependencies: [],
      });

      const result = await service.executeGoal(goal.id);
      expect(result.status).toBe('COMPLETED');
      expect(result.progress).toBe(100);
      expect(result.completedTasks).toContain('Fetch Repositories');
    });

    it('should pause execution and await approval for CONFIRMATION_REQUIRED tasks', async () => {
      const goal = await goalsService.createGoal({
        title: 'Deploy Production Release',
      });

      await tasksService.createTask({
        goalId: goal.id,
        title: 'Deploy to Cloud',
        status: 'PENDING',
        riskLevel: 'CONFIRMATION_REQUIRED',
        assignedCapability: 'render',
        dependencies: [],
      });

      const result = await service.executeGoal(goal.id);
      expect(result.status).toBe('PAUSED');
      expect(result.waitingTasks).toContain('Deploy to Cloud');
      expect(result.explanation).toContain('requires explicit authorization');
    });

    it('should handle task failure by blocking dependent tasks and updating goal to BLOCKED', async () => {
      // Mock MCP failure
      mockMcpGateway.executeTool.mockRejectedValue(new Error('Network connection timeout'));

      const goal = await goalsService.createGoal({
        title: 'Multi-step Pipeline with Failure',
      });

      const task1 = await tasksService.createTask({
        goalId: goal.id,
        title: 'Step 1 - Retrieve Data',
        status: 'PENDING',
        riskLevel: 'READ',
        dependencies: [],
      });

      await tasksService.createTask({
        goalId: goal.id,
        title: 'Step 2 - Dependent Processing',
        status: 'PENDING',
        riskLevel: 'LOW_RISK',
        dependencies: [task1.id],
      });

      const result = await service.executeGoal(goal.id);
      expect(result.status).toBe('BLOCKED');
      expect(result.failedTasks).toContain('Step 1 - Retrieve Data');
      expect(result.blockedTasks).toContain('Step 2 - Dependent Processing');
      expect(result.diagnostic).toBeDefined();
      expect(result.diagnostic?.failedTaskId).toBe(task1.id);
    });
  });
});
