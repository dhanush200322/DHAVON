import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { SupabaseService } from '../database/supabase.service';
import { AIProviderFactory } from '../providers/provider.factory';
import { McpGatewayService } from '../mcp/mcp-gateway.service';

describe('HealthController', () => {
  let healthController: HealthController;

  const mockSupabaseService = {
    configured: true,
    healthCheck: jest.fn().mockResolvedValue({
      ok: true,
      connected: true,
      latencyMs: 15,
    }),
  };

  const mockAIProviderFactory = {
    getActiveProviderName: jest.fn().mockReturnValue('gemini'),
    healthCheckAll: jest.fn().mockResolvedValue({
      gemini: { ok: true, provider: 'gemini', model: 'gemini-2.5-flash' },
      groq: { ok: true, provider: 'groq', model: 'openai/gpt-oss-120b' },
    }),
  };

  const mockMcpGatewayService = {
    getServers: jest.fn().mockReturnValue([
      { id: 'github', name: 'github-mcp-server', status: 'online' },
      { id: 'supabase', name: 'supabase', status: 'online' },
    ]),
    getTools: jest.fn().mockReturnValue(new Array(50).fill({})),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: AIProviderFactory, useValue: mockAIProviderFactory },
        { provide: McpGatewayService, useValue: mockMcpGatewayService },
      ],
    }).compile();

    healthController = app.get<HealthController>(HealthController);
  });

  describe('checkHealth', () => {
    it('should return operational status and subsystem readiness including MCP', async () => {
      const result = await healthController.checkHealth();
      expect(result.status).toBe('online');
      expect(result.service).toContain('DHAVON');
      expect(result.activeProvider).toBe('gemini');
      expect(result.subsystems.core.orchestrator).toBe('ready');
      expect(result.subsystems.mcp.status).toBe('ready');
      expect(result.subsystems.mcp.serversCount).toBe(2);
      expect(result.subsystems.database.status).toBe('healthy');
      expect(result.subsystems.ai.providers.gemini.configured).toBe(true);
    });
  });
});
