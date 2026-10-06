import { Injectable, Logger } from '@nestjs/common';
import { McpServerConfig, McpTool, McpServerStatus } from '@dhavon/mcp';

@Injectable()
export class McpRegistryService {
  private readonly logger = new Logger(McpRegistryService.name);

  private readonly servers = new Map<string, McpServerConfig>();
  private readonly tools = new Map<string, McpTool>();

  registerServer(config: McpServerConfig): void {
    this.servers.set(config.id, config);
    this.logger.log(`Registered MCP Server: "${config.name}" [${config.status}]`);
  }

  getServer(id: string): McpServerConfig | undefined {
    return this.servers.get(id);
  }

  getServerByName(name: string): McpServerConfig | undefined {
    for (const server of this.servers.values()) {
      if (
        server.name.toLowerCase() === name.toLowerCase() ||
        server.id.toLowerCase() === name.toLowerCase()
      ) {
        return server;
      }
    }
    return undefined;
  }

  getAllServers(): McpServerConfig[] {
    return Array.from(this.servers.values());
  }

  updateServerStatus(id: string, status: McpServerStatus, lastHealthCheck?: string): void {
    const server = this.servers.get(id);
    if (server) {
      server.status = status;
      if (lastHealthCheck) {
        server.lastHealthCheck = lastHealthCheck;
      }
    }
  }

  registerTool(tool: McpTool): void {
    this.tools.set(tool.toolId, tool);
  }

  getTool(toolId: string): McpTool | undefined {
    return this.tools.get(toolId);
  }

  getToolByName(serverName: string, toolName: string): McpTool | undefined {
    for (const tool of this.tools.values()) {
      if (
        tool.serverName.toLowerCase() === serverName.toLowerCase() &&
        tool.name.toLowerCase() === toolName.toLowerCase()
      ) {
        return tool;
      }
    }
    return undefined;
  }

  getAllTools(): McpTool[] {
    return Array.from(this.tools.values());
  }

  getToolsByServer(serverIdOrName: string): McpTool[] {
    return Array.from(this.tools.values()).filter(
      (t) =>
        t.serverId.toLowerCase() === serverIdOrName.toLowerCase() ||
        t.serverName.toLowerCase() === serverIdOrName.toLowerCase(),
    );
  }

  findToolsByQuery(query: string): McpTool[] {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return this.getAllTools();

    return Array.from(this.tools.values()).filter((tool) => {
      const target = `${tool.name} ${tool.description} ${tool.serverName}`.toLowerCase();
      return terms.some((term) => target.includes(term));
    });
  }
}
