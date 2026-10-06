import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import {
  McpTool,
  McpConfirmationPayload,
  McpToolExecutionResult,
} from '@dhavon/mcp';

export interface McpEventPayload {
  event:
    | 'dhavon.mcp.discovery'
    | 'dhavon.tool.selected'
    | 'dhavon.tool.confirmation_required'
    | 'dhavon.tool.execution_started'
    | 'dhavon.tool.execution_completed'
    | 'dhavon.tool.execution_failed';
  data: unknown;
  timestamp: string;
}

@Injectable()
export class McpEventsService {
  private readonly logger = new Logger(McpEventsService.name);
  private readonly eventSubject = new Subject<McpEventPayload>();

  getEventStream(): Observable<McpEventPayload> {
    return this.eventSubject.asObservable();
  }

  emitDiscovery(serverCount: number, toolCount: number): void {
    this.logger.log(`MCP Discovery Event: ${serverCount} servers, ${toolCount} tools.`);
    this.eventSubject.next({
      event: 'dhavon.mcp.discovery',
      data: { serverCount, toolCount },
      timestamp: new Date().toISOString(),
    });
  }

  emitToolSelected(tool: McpTool, reason?: string): void {
    this.logger.log(`MCP Tool Selected: [${tool.serverName}] ${tool.name}`);
    this.eventSubject.next({
      event: 'dhavon.tool.selected',
      data: {
        toolName: tool.name,
        serverName: tool.serverName,
        riskLevel: tool.riskLevel,
        reason,
      },
      timestamp: new Date().toISOString(),
    });
  }

  emitConfirmationRequired(payload: McpConfirmationPayload): void {
    this.logger.warn(
      `MCP Confirmation Required: [${payload.serverName}] ${payload.toolName} (Execution ID: ${payload.executionId})`,
    );
    this.eventSubject.next({
      event: 'dhavon.tool.confirmation_required',
      data: payload,
      timestamp: new Date().toISOString(),
    });
  }

  emitExecutionStarted(executionId: string, toolName: string, serverName: string): void {
    this.logger.log(`MCP Execution Started: [${serverName}] ${toolName} (${executionId})`);
    this.eventSubject.next({
      event: 'dhavon.tool.execution_started',
      data: { executionId, toolName, serverName },
      timestamp: new Date().toISOString(),
    });
  }

  emitExecutionCompleted(result: McpToolExecutionResult): void {
    this.logger.log(
      `MCP Execution Completed: [${result.serverName}] ${result.toolName} (${result.executionDurationMs}ms)`,
    );
    this.eventSubject.next({
      event: 'dhavon.tool.execution_completed',
      data: result,
      timestamp: new Date().toISOString(),
    });
  }

  emitExecutionFailed(executionId: string, toolName: string, serverName: string, error: string): void {
    this.logger.error(`MCP Execution Failed: [${serverName}] ${toolName} - ${error}`);
    this.eventSubject.next({
      event: 'dhavon.tool.execution_failed',
      data: { executionId, toolName, serverName, error },
      timestamp: new Date().toISOString(),
    });
  }
}
