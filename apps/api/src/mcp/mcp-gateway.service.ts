import { Injectable, Logger } from '@nestjs/common';
import {
  McpServerConfig,
  McpTool,
  McpToolExecutionResult,
} from '@dhavon/mcp';
import { McpRegistryService } from './mcp-registry.service';
import { McpDiscoveryService } from './mcp-discovery.service';
import { McpPermissionService } from './mcp-permission.service';
import { McpExecutionService, ExecuteToolOptions } from './mcp-execution.service';
import { McpToolSelectorService, SelectedToolCandidate } from './mcp-tool-selector.service';
import { McpEventsService } from './mcp-events.service';

@Injectable()
export class McpGatewayService {
  private readonly logger = new Logger(McpGatewayService.name);

  constructor(
    private readonly registry: McpRegistryService,
    private readonly discovery: McpDiscoveryService,
    private readonly permissions: McpPermissionService,
    private readonly execution: McpExecutionService,
    private readonly selector: McpToolSelectorService,
    private readonly events: McpEventsService,
  ) {}

  async discoverAll(): Promise<{ serverCount: number; toolCount: number }> {
    return this.discovery.discoverAll();
  }

  getServers(): McpServerConfig[] {
    return this.registry.getAllServers();
  }

  getServer(id: string): McpServerConfig | undefined {
    return this.registry.getServer(id);
  }

  getTools(serverId?: string): McpTool[] {
    if (serverId) {
      return this.registry.getToolsByServer(serverId);
    }
    return this.registry.getAllTools();
  }

  getTool(toolId: string): McpTool | undefined {
    return this.registry.getTool(toolId);
  }

  /**
   * Determine if user prompt contains intent to execute an MCP tool
   */
  resolveCandidateForQuery(userQuery: string): SelectedToolCandidate | null {
    const candidate = this.selector.selectToolForIntent(userQuery);
    if (candidate) {
      this.events.emitToolSelected(candidate.tool, candidate.reason);
    }
    return candidate;
  }

  /**
   * Execute an MCP tool through the unified Gateway
   */
  async executeTool(options: ExecuteToolOptions): Promise<McpToolExecutionResult> {
    this.logger.log(`Gateway executing: [${options.serverId || 'auto'}] ${options.toolName}`);
    return this.execution.execute(options);
  }

  /**
   * Approve a pending confirmation-required execution
   */
  async approveExecution(
    executionId: string,
    userId = 'system-user',
  ): Promise<McpToolExecutionResult> {
    const record = this.execution.getExecutionRecord(executionId);
    if (!record) {
      throw new Error(`Execution record ${executionId} not found.`);
    }

    if (record.userId && record.userId !== userId && userId !== 'system-user' && record.userId !== 'system-user') {
      throw new Error(`User ${userId} is not authorized to approve execution for ${record.userId}.`);
    }

    this.permissions.approve(executionId, userId);

    return this.execution.execute({
      executionId,
      serverId: record.serverId,
      toolName: record.toolName,
      arguments: record.inputArguments,
      userId,
    });
  }
}
