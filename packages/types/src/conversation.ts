export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export type ActiveMode = 'ask' | 'plan' | 'create' | 'analyze';

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ToolCallPayload {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  toolCalls?: ToolCallPayload[];
  tokenUsage?: TokenUsage;
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  activeMode: ActiveMode;
  sessionContext: Record<string, unknown>;
  lastInteractedAt: string;
  createdAt: string;
}
