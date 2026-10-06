import { McpServerConfig, McpTool, McpToolExecutionResult } from './types.js';

export interface IMcpClientAdapter {
  readonly serverConfig: McpServerConfig;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  listTools(): Promise<McpTool[]>;
  executeTool(toolName: string, args: Record<string, unknown>): Promise<McpToolExecutionResult>;
}

export abstract class BaseMcpClientAdapter implements IMcpClientAdapter {
  protected connected = false;

  constructor(public readonly serverConfig: McpServerConfig) {}

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract listTools(): Promise<McpTool[]>;
  abstract executeTool(toolName: string, args: Record<string, unknown>): Promise<McpToolExecutionResult>;

  isConnected(): boolean {
    return this.connected;
  }
}
