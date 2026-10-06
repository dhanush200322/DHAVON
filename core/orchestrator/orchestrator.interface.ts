import { ActiveMode, DHAVONState, Message, ToolExecution } from '@dhavon/types';

export interface OrchestrationRequest {
  userId: string;
  conversationId: string;
  prompt: string;
  activeMode: ActiveMode;
  audioInput?: boolean;
}

export interface OrchestrationDelta {
  type: 'token' | 'phase' | 'state' | 'action_required' | 'tool_call';
  content?: string;
  state?: DHAVONState;
  toolExecution?: ToolExecution;
  isComplete: boolean;
}

export interface OrchestrationResult {
  message: Message;
  toolExecutions: ToolExecution[];
  finalState: DHAVONState;
}

export interface IOrchestrator {
  readonly id: string;
  processRequest(request: OrchestrationRequest): Promise<OrchestrationResult>;
  streamRequest(request: OrchestrationRequest): AsyncIterable<OrchestrationDelta>;
}
