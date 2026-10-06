import { ToolDefinition, ToolExecution } from '@dhavon/types';

export interface ToolExecutionContext {
  userId: string;
  conversationId?: string;
  taskId?: string;
  timeoutMs?: number;
}

export interface IToolEngine {
  registerTool(tool: ToolDefinition): void;
  getTool(name: string): ToolDefinition | undefined;
  listAvailableTools(userId: string): Promise<ToolDefinition[]>;
  executeTool(name: string, args: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolExecution>;
}
