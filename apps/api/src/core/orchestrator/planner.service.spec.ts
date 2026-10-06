import { Test, TestingModule } from '@nestjs/testing';
import { PlannerService } from './planner.service';
import { DependencyService } from './dependency.service';
import { McpGatewayService } from '../../mcp/mcp-gateway.service';
import { AIProviderFactory } from '../../providers/provider.factory';
import { OrchestrationEventsService } from '../events/orchestration-events.service';
import { SupabaseService } from '../../database/supabase.service';

describe('PlannerService', () => {
  let service: PlannerService;

  beforeEach(async () => {
    const mockMcpGateway = {
      getTools: jest.fn().mockReturnValue([
        {
          serverId: 'github-mcp-server',
          serverName: 'github-mcp-server',
          name: 'get_repository',
          description: 'Get details of a GitHub repository',
          riskLevel: 'READ',
        },
        {
          serverId: 'supabase',
          serverName: 'supabase',
          name: 'list_tables',
          description: 'List tables in Supabase',
          riskLevel: 'READ',
        },
      ]),
      resolveCandidateForQuery: jest.fn().mockImplementation((query: string) => {
        if (query.toLowerCase().includes('github') || query.toLowerCase().includes('repo')) {
          return {
            tool: {
              serverId: 'github-mcp-server',
              serverName: 'github-mcp-server',
              name: 'get_repository',
              riskLevel: 'READ',
            },
            confidence: 0.9,
            suggestedArgs: {},
          };
        }
        return null;
      }),
    };

    const mockAIProvider = {
      name: 'gemini',
      defaultModel: 'gemini-2.5-flash',
      generate: jest.fn().mockRejectedValue(new Error('AI offline in test')),
    };

    const mockProviderFactory = {
      getActiveProvider: jest.fn().mockReturnValue(mockAIProvider),
    };

    const mockSupabase = {
      getClient: jest.fn().mockReturnValue(null),
      configured: false,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlannerService,
        DependencyService,
        OrchestrationEventsService,
        { provide: McpGatewayService, useValue: mockMcpGateway },
        { provide: AIProviderFactory, useValue: mockProviderFactory },
        { provide: SupabaseService, useValue: mockSupabase },
      ],
    }).compile();

    service = module.get<PlannerService>(PlannerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should plan a goal and produce ordered, dependency-checked tasks with capabilities', async () => {
    const plan = await service.planGoal({
      goalId: 'goal-github-check',
      title: 'Check my GitHub repositories and tell me which ones are active',
    });

    expect(plan).toBeDefined();
    expect(plan.tasks.length).toBeGreaterThanOrEqual(2);
    expect(plan.tasks[0].executionOrder).toBe(1);
    expect(plan.requiredCapabilities).toContain('github-mcp-server');
    expect(plan.estimatedTotalRisk).toBeDefined();
  });
});
