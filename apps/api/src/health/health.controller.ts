import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { SupabaseService } from '../database/supabase.service';
import { AIProviderFactory } from '../providers/provider.factory';
import { McpGatewayService } from '../mcp/mcp-gateway.service';

@Public()
@Controller('health')
export class HealthController {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly providerFactory: AIProviderFactory,
    private readonly mcpGateway: McpGatewayService,
  ) {}

  @Get('live')
  checkLiveness() {
    return {
      status: 'ok',
      service: 'dhavon-api',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  async checkReadiness() {
    const dbHealth = await this.supabaseService.healthCheck();
    const isReady = Boolean(dbHealth.connected);
    return {
      status: isReady ? 'ok' : 'degraded',
      ready: isReady,
      timestamp: new Date().toISOString(),
    };
  }

  @Get()
  async checkHealth() {
    const [dbHealth, aiProvidersHealth] = await Promise.all([
      this.supabaseService.healthCheck(),
      this.providerFactory.healthCheckAll(),
    ]);

    const activeProviderName = this.providerFactory.getActiveProviderName();
    const activeProvider = aiProvidersHealth[activeProviderName];

    const overallHealthy =
      (activeProvider?.ok ?? false) && (dbHealth.connected ?? true);

    const servers = this.mcpGateway.getServers();
    const tools = this.mcpGateway.getTools();

    return {
      status: overallHealthy ? 'online' : 'degraded',
      service: 'DHAVON Personal Intelligence Operating System API',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      activeProvider: activeProviderName,
      subsystems: {
        api: { status: 'healthy' },
        database: {
          status: dbHealth.connected ? 'healthy' : 'disconnected',
          configured: this.supabaseService.configured,
          latencyMs: dbHealth.latencyMs,
          message: dbHealth.error,
        },
        ai: {
          active: activeProviderName,
          providers: {
            gemini: {
              configured: aiProvidersHealth.gemini.ok,
              model: aiProvidersHealth.gemini.model,
            },
            groq: {
              configured: aiProvidersHealth.groq.ok,
              model: aiProvidersHealth.groq.model,
            },
          },
        },
        mcp: {
          status: 'ready',
          serversCount: servers.length,
          toolsCount: tools.length,
          onlineServers: servers.filter((s) => s.status === 'online').map((s) => s.name),
        },
        core: {
          orchestrator: 'ready',
          stateEngine: 'ready',
          goals: 'ready',
          tasks: 'ready',
          memory: 'ready',
          permissions: 'ready',
          gateway: 'ready',
        },
      },
    };
  }
}
