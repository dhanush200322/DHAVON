import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { McpRegistryService } from './mcp-registry.service';
import { McpEventsService } from './mcp-events.service';
import { McpServerConfig, McpTool, McpToolInputSchema } from '@dhavon/mcp';
import { RiskLevel } from '@dhavon/types';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class McpDiscoveryService implements OnModuleInit {
  private readonly logger = new Logger(McpDiscoveryService.name);

  // Path resolution supporting local development, container runtime, and bundled definitions
  private readonly mcpBasePath = this.resolveMcpBasePath();

  private resolveMcpBasePath(): string {
    const candidates = [
      process.env.MCP_DEFINITIONS_PATH,
      path.resolve(process.cwd(), 'mcp-definitions'),
      path.resolve(__dirname, '..', '..', '..', '..', 'mcp-definitions'),
      path.resolve(__dirname, '..', '..', 'mcp-definitions'),
      path.join(process.env.USERPROFILE || '', '.gemini', 'antigravity-ide', 'mcp'),
      path.join(process.env.HOME || '', '.gemini', 'antigravity-ide', 'mcp'),
      'C:\\Users\\ro224\\.gemini\\antigravity-ide\\mcp',
    ].filter(Boolean) as string[];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    return path.resolve(process.cwd(), 'mcp-definitions');
  }

  constructor(
    private readonly registry: McpRegistryService,
    private readonly events: McpEventsService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.discoverAll();
  }

  /**
   * Deterministically classify the risk of an MCP tool based on its name and operation
   */
  classifyToolRisk(serverName: string, toolName: string): RiskLevel {
    const lowerName = toolName.toLowerCase();

    // SENSITIVE: Deletion, schema dropping, secret management, raw execution
    if (
      lowerName.includes('delete') ||
      lowerName.includes('drop') ||
      lowerName.includes('secret') ||
      lowerName.includes('execute_sql') ||
      lowerName.includes('pause_project') ||
      lowerName.includes('reset')
    ) {
      return 'SENSITIVE';
    }

    // CONFIRMATION_REQUIRED: Writes, commits, PR merges, deployments, creations that mutate state
    if (
      lowerName.includes('create') ||
      lowerName.includes('update') ||
      lowerName.includes('push') ||
      lowerName.includes('merge') ||
      lowerName.includes('deploy') ||
      lowerName.includes('apply_migration') ||
      lowerName.includes('patch') ||
      lowerName.includes('put')
    ) {
      return 'CONFIRMATION_REQUIRED';
    }

    // LOW_RISK: Comments, drafts, lightweight mutations
    if (lowerName.includes('comment') || lowerName.includes('fork')) {
      return 'LOW_RISK';
    }

    // Default to READ for list, get, search, query, etc.
    return 'READ';
  }

  async discoverAll(): Promise<{ serverCount: number; toolCount: number }> {
    this.logger.log(`Scanning MCP definitions at: ${this.mcpBasePath}`);

    const serversToDiscover: Array<{
      id: string;
      name: string;
      description: string;
      folderName: string;
      capabilities: string[];
    }> = [
      {
        id: 'github',
        name: 'github-mcp-server',
        description: 'GitHub source control, repositories, commits, and pull requests',
        folderName: 'github-mcp-server',
        capabilities: ['code_search', 'repo_inspect', 'issues', 'pull_requests'],
      },
      {
        id: 'supabase',
        name: 'supabase',
        description: 'Supabase PostgreSQL, database schema, projects, and migrations',
        folderName: 'supabase',
        capabilities: ['database_query', 'table_inspect', 'project_status'],
      },
      {
        id: 'postman',
        name: 'postman-mcp-server',
        description: 'Postman API collections, environments, specifications, and test runs',
        folderName: 'postman-mcp-server',
        capabilities: ['api_testing', 'collection_inspect', 'workspace_management'],
      },
      {
        id: 'notion',
        name: 'notion-mcp-server',
        description: 'Notion knowledge base, workspace pages, databases, and blocks',
        folderName: 'notion-mcp-server',
        capabilities: ['knowledge_search', 'page_read', 'database_query'],
      },
      {
        id: 'render',
        name: 'render',
        description: 'Render cloud infrastructure, web services, postgres, and deploys',
        folderName: 'render',
        capabilities: ['service_status', 'deploy_inspect', 'metrics'],
      },
    ];

    let totalTools = 0;

    for (const serverDef of serversToDiscover) {
      const serverDir = path.join(this.mcpBasePath, serverDef.folderName);
      const isAvailable = fs.existsSync(serverDir);

      const serverConfig: McpServerConfig = {
        id: serverDef.id,
        name: serverDef.name,
        description: serverDef.description,
        provider: 'native',
        status: isAvailable ? 'online' : 'offline',
        transport: 'native',
        enabled: isAvailable,
        capabilities: serverDef.capabilities,
        lastHealthCheck: new Date().toISOString(),
      };

      this.registry.registerServer(serverConfig);

      if (!isAvailable) {
        this.logger.warn(`MCP Server directory not found for: ${serverDef.name}`);
        continue;
      }

      try {
        const files = fs.readdirSync(serverDir);
        for (const file of files) {
          if (file.endsWith('.json')) {
            const toolName = path.basename(file, '.json');
            const filePath = path.join(serverDir, file);

            try {
              const fileContent = fs.readFileSync(filePath, 'utf8');
              const schema = JSON.parse(fileContent);

              const riskLevel = this.classifyToolRisk(serverDef.name, toolName);
              const tool: McpTool = {
                toolId: `${serverDef.id}:${toolName}`,
                serverId: serverDef.id,
                serverName: serverDef.name,
                name: toolName,
                description:
                  schema.description ||
                  `Executes ${toolName} on ${serverDef.name}`,
                inputSchema: (schema.parameters ||
                  schema.inputSchema || {
                    type: 'object',
                    properties: {},
                  }) as McpToolInputSchema,
                riskLevel,
                enabled: true,
                requiresConfirmation:
                  riskLevel === 'CONFIRMATION_REQUIRED' || riskLevel === 'SENSITIVE',
                available: true,
                metadata: {
                  serverName: serverDef.name,
                  category: serverDef.id,
                  isSandboxed: true,
                  timeoutMs: 30000,
                },
              };

              this.registry.registerTool(tool);
              totalTools++;
            } catch (jsonErr: unknown) {
              this.logger.warn(
                `Failed to parse schema for tool [${serverDef.name}:${toolName}]: ${jsonErr}`,
              );
            }
          }
        }
      } catch (err: unknown) {
        this.logger.error(`Error reading tools for server ${serverDef.name}: ${err}`);
      }
    }

    const serverCount = this.registry.getAllServers().length;
    this.events.emitDiscovery(serverCount, totalTools);
    this.logger.log(
      `MCP Discovery Complete: ${serverCount} servers registered, ${totalTools} tools discovered.`,
    );

    return { serverCount, toolCount: totalTools };
  }
}
