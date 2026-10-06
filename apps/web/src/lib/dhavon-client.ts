import { io, Socket } from 'socket.io-client';
import type {
  OrbState,
  ActiveMode,
  RiskLevel,
  VoiceStartedPayload,
  VoiceListeningPayload,
  VoiceTranscriptPayload,
  VoiceThinkingPayload,
  VoiceResponsePayload,
  VoiceSpeakingPayload,
  VoiceInterruptedPayload,
  VoiceCompletedPayload,
  VoiceErrorPayload,
} from '@dhavon/types';

export interface StateEventPayload {
  state: OrbState;
  phase?: string;
  mode?: ActiveMode;
  conversationId?: string;
  timestamp: string;
}

export interface ChunkEventPayload {
  delta: string;
  conversationId?: string;
}

export interface CompleteEventPayload {
  content: string;
  conversationId?: string;
}

export interface ErrorEventPayload {
  code: string;
  message: string;
  conversationId?: string;
}

export interface ToolSelectedPayload {
  serverName: string;
  toolName: string;
  riskLevel: RiskLevel;
  reason?: string;
}

export interface ToolConfirmationPayload {
  executionId: string;
  toolName: string;
  serverName: string;
  riskLevel: RiskLevel;
  summary: string;
  requestedAction: string;
  parameters: Record<string, unknown>;
}

export interface ToolExecutionCompletedPayload {
  executionId: string;
  toolName: string;
  serverName: string;
  status: string;
  success: boolean;
  output?: { content: unknown };
}

export class DhavonClient {
  private socket: Socket | null = null;
  private readonly apiUrl: string;
  private connectionListeners: Array<(connected: boolean) => void> = [];
  private stateListeners: Array<(payload: StateEventPayload) => void> = [];
  private chunkListeners: Array<(payload: ChunkEventPayload) => void> = [];
  private completeListeners: Array<(payload: CompleteEventPayload) => void> = [];
  private errorListeners: Array<(payload: ErrorEventPayload) => void> = [];
  private toolSelectedListeners: Array<(payload: ToolSelectedPayload) => void> = [];
  private confirmationListeners: Array<(payload: ToolConfirmationPayload) => void> = [];
  private toolCompletedListeners: Array<(payload: ToolExecutionCompletedPayload) => void> = [];
  private goalProgressListeners: Array<(payload: { goalId: string; progress: number; status: string }) => void> = [];
  private taskStartedListeners: Array<(payload: { taskId: string; goalId: string; toolName?: string }) => void> = [];
  private taskCompletedListeners: Array<(payload: { taskId: string; goalId: string; result: unknown }) => void> = [];
  private orchestrationPausedListeners: Array<(payload: { runId: string; reason: string }) => void> = [];

  // Voice Event Listeners
  private voiceStartedListeners: Array<(payload: VoiceStartedPayload) => void> = [];
  private voiceListeningListeners: Array<(payload: VoiceListeningPayload) => void> = [];
  private voiceTranscriptListeners: Array<(payload: VoiceTranscriptPayload) => void> = [];
  private voiceThinkingListeners: Array<(payload: VoiceThinkingPayload) => void> = [];
  private voiceResponseListeners: Array<(payload: VoiceResponsePayload) => void> = [];
  private voiceSpeakingListeners: Array<(payload: VoiceSpeakingPayload) => void> = [];
  private voiceInterruptedListeners: Array<(payload: VoiceInterruptedPayload) => void> = [];
  private voiceCompletedListeners: Array<(payload: VoiceCompletedPayload) => void> = [];
  private voiceErrorListeners: Array<(payload: VoiceErrorPayload) => void> = [];

  constructor(apiUrl?: string) {
    this.apiUrl =
      apiUrl ||
      (typeof window !== 'undefined'
        ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000')
        : 'http://localhost:4000');
  }

  connect(): void {
    if (this.socket && this.socket.connected) {
      return;
    }

    this.socket = io(this.apiUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('[DHAVON Client] Connected to WebSocket Gateway at', this.apiUrl);
      this.connectionListeners.forEach((fn) => fn(true));
    });

    this.socket.on('connect_error', () => {
      this.connectionListeners.forEach((fn) => fn(false));
    });

    this.socket.on('dhavon.state', (payload: StateEventPayload) => {
      this.stateListeners.forEach((fn) => fn(payload));
    });

    this.socket.on('dhavon.message.chunk', (payload: ChunkEventPayload) => {
      this.chunkListeners.forEach((fn) => fn(payload));
    });

    this.socket.on('dhavon.message.complete', (payload: CompleteEventPayload) => {
      this.completeListeners.forEach((fn) => fn(payload));
    });

    this.socket.on('dhavon.error', (payload: ErrorEventPayload) => {
      this.errorListeners.forEach((fn) => fn(payload));
    });

    this.socket.on('dhavon.tool.selected', (payload: ToolSelectedPayload) => {
      this.toolSelectedListeners.forEach((fn) => fn(payload));
    });

    this.socket.on('dhavon.tool.confirmation_required', (payload: ToolConfirmationPayload) => {
      this.confirmationListeners.forEach((fn) => fn(payload));
    });

    this.socket.on('dhavon.tool.execution_completed', (payload: ToolExecutionCompletedPayload) => {
      this.toolCompletedListeners.forEach((fn) => fn(payload));
    });

    this.socket.on('dhavon.goal.progress', (payload: { goalId: string; progress: number; status: string }) => {
      this.goalProgressListeners.forEach((fn) => fn(payload));
    });

    this.socket.on('dhavon.task.started', (payload: { taskId: string; goalId: string; toolName?: string }) => {
      this.taskStartedListeners.forEach((fn) => fn(payload));
    });

    this.socket.on('dhavon.task.completed', (payload: { taskId: string; goalId: string; result: unknown }) => {
      this.taskCompletedListeners.forEach((fn) => fn(payload));
    });

    this.socket.on('dhavon.orchestration.paused', (payload: { runId: string; reason: string }) => {
      this.orchestrationPausedListeners.forEach((fn) => fn(payload));
    });

    // Voice Event Subscriptions
    this.socket.on('dhavon.voice.started', (payload: VoiceStartedPayload) => {
      this.voiceStartedListeners.forEach((fn) => fn(payload));
    });

    this.socket.on('dhavon.voice.listening', (payload: VoiceListeningPayload) => {
      this.voiceListeningListeners.forEach((fn) => fn(payload));
    });

    this.socket.on('dhavon.voice.transcript', (payload: VoiceTranscriptPayload) => {
      this.voiceTranscriptListeners.forEach((fn) => fn(payload));
    });

    this.socket.on('dhavon.voice.thinking', (payload: VoiceThinkingPayload) => {
      this.voiceThinkingListeners.forEach((fn) => fn(payload));
    });

    this.socket.on('dhavon.voice.response', (payload: VoiceResponsePayload) => {
      this.voiceResponseListeners.forEach((fn) => fn(payload));
    });

    this.socket.on('dhavon.voice.speaking', (payload: VoiceSpeakingPayload) => {
      this.voiceSpeakingListeners.forEach((fn) => fn(payload));
    });

    this.socket.on('dhavon.voice.interrupted', (payload: VoiceInterruptedPayload) => {
      this.voiceInterruptedListeners.forEach((fn) => fn(payload));
    });

    this.socket.on('dhavon.voice.completed', (payload: VoiceCompletedPayload) => {
      this.voiceCompletedListeners.forEach((fn) => fn(payload));
    });

    this.socket.on('dhavon.voice.error', (payload: VoiceErrorPayload) => {
      this.voiceErrorListeners.forEach((fn) => fn(payload));
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[DHAVON Client] Disconnected from WebSocket Gateway:', reason);
      this.connectionListeners.forEach((fn) => fn(false));
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connectionListeners.forEach((fn) => fn(false));
    }
  }

  isConnected(): boolean {
    return Boolean(this.socket && this.socket.connected);
  }

  onConnectionChange(callback: (connected: boolean) => void): () => void {
    this.connectionListeners.push(callback);
    callback(this.isConnected());
    return () => {
      this.connectionListeners = this.connectionListeners.filter((fn) => fn !== callback);
    };
  }

  sendMessage(
    content: string,
    mode: ActiveMode = 'ask',
    conversationId = 'master-session',
  ): void {
    if (!this.socket || !this.socket.connected) {
      this.connect();
    }

    this.socket?.emit('dhavon.message.send', {
      conversationId,
      content,
      mode,
      userId: 'system-user',
    });
  }

  confirmTool(executionId: string, userId = 'system-user'): void {
    this.socket?.emit('dhavon.tool.confirm', {
      executionId,
      userId,
    });
  }

  onState(callback: (payload: StateEventPayload) => void): () => void {
    this.stateListeners.push(callback);
    return () => {
      this.stateListeners = this.stateListeners.filter((fn) => fn !== callback);
    };
  }

  onChunk(callback: (payload: ChunkEventPayload) => void): () => void {
    this.chunkListeners.push(callback);
    return () => {
      this.chunkListeners = this.chunkListeners.filter((fn) => fn !== callback);
    };
  }

  onComplete(callback: (payload: CompleteEventPayload) => void): () => void {
    this.completeListeners.push(callback);
    return () => {
      this.completeListeners = this.completeListeners.filter((fn) => fn !== callback);
    };
  }

  onError(callback: (payload: ErrorEventPayload) => void): () => void {
    this.errorListeners.push(callback);
    return () => {
      this.errorListeners = this.errorListeners.filter((fn) => fn !== callback);
    };
  }

  onToolSelected(callback: (payload: ToolSelectedPayload) => void): () => void {
    this.toolSelectedListeners.push(callback);
    return () => {
      this.toolSelectedListeners = this.toolSelectedListeners.filter((fn) => fn !== callback);
    };
  }

  onConfirmationRequired(callback: (payload: ToolConfirmationPayload) => void): () => void {
    this.confirmationListeners.push(callback);
    return () => {
      this.confirmationListeners = this.confirmationListeners.filter((fn) => fn !== callback);
    };
  }

  onToolCompleted(callback: (payload: ToolExecutionCompletedPayload) => void): () => void {
    this.toolCompletedListeners.push(callback);
    return () => {
      this.toolCompletedListeners = this.toolCompletedListeners.filter((fn) => fn !== callback);
    };
  }

  onGoalProgress(callback: (payload: { goalId: string; progress: number; status: string }) => void): () => void {
    this.goalProgressListeners.push(callback);
    return () => {
      this.goalProgressListeners = this.goalProgressListeners.filter((fn) => fn !== callback);
    };
  }

  onTaskStarted(callback: (payload: { taskId: string; goalId: string; toolName?: string }) => void): () => void {
    this.taskStartedListeners.push(callback);
    return () => {
      this.taskStartedListeners = this.taskStartedListeners.filter((fn) => fn !== callback);
    };
  }

  onTaskCompleted(callback: (payload: { taskId: string; goalId: string; result: unknown }) => void): () => void {
    this.taskCompletedListeners.push(callback);
    return () => {
      this.taskCompletedListeners = this.taskCompletedListeners.filter((fn) => fn !== callback);
    };
  }

  onOrchestrationPaused(callback: (payload: { runId: string; reason: string }) => void): () => void {
    this.orchestrationPausedListeners.push(callback);
    return () => {
      this.orchestrationPausedListeners = this.orchestrationPausedListeners.filter((fn) => fn !== callback);
    };
  }

  // Voice Interaction Emitters
  startVoiceSession(userId = 'system-user', conversationId?: string): void {
    if (!this.socket || !this.socket.connected) {
      this.connect();
    }
    this.socket?.emit('dhavon.voice.start', { userId, conversationId });
  }

  sendVoiceAudio(
    sessionId: string,
    audioBase64: string,
    mimeType = 'audio/webm',
    language?: string,
  ): void {
    if (!this.socket || !this.socket.connected) {
      this.connect();
    }
    this.socket?.emit('dhavon.voice.audio', {
      sessionId,
      audioBase64,
      mimeType,
      language,
    });
  }

  interruptVoice(sessionId?: string, reason = 'User interrupted speaking'): void {
    this.socket?.emit('dhavon.voice.interrupt', { sessionId, reason });
  }

  // Voice Event Listeners
  onVoiceStarted(callback: (payload: VoiceStartedPayload) => void): () => void {
    this.voiceStartedListeners.push(callback);
    return () => {
      this.voiceStartedListeners = this.voiceStartedListeners.filter((fn) => fn !== callback);
    };
  }

  onVoiceListening(callback: (payload: VoiceListeningPayload) => void): () => void {
    this.voiceListeningListeners.push(callback);
    return () => {
      this.voiceListeningListeners = this.voiceListeningListeners.filter((fn) => fn !== callback);
    };
  }

  onVoiceTranscript(callback: (payload: VoiceTranscriptPayload) => void): () => void {
    this.voiceTranscriptListeners.push(callback);
    return () => {
      this.voiceTranscriptListeners = this.voiceTranscriptListeners.filter((fn) => fn !== callback);
    };
  }

  onVoiceThinking(callback: (payload: VoiceThinkingPayload) => void): () => void {
    this.voiceThinkingListeners.push(callback);
    return () => {
      this.voiceThinkingListeners = this.voiceThinkingListeners.filter((fn) => fn !== callback);
    };
  }

  onVoiceResponse(callback: (payload: VoiceResponsePayload) => void): () => void {
    this.voiceResponseListeners.push(callback);
    return () => {
      this.voiceResponseListeners = this.voiceResponseListeners.filter((fn) => fn !== callback);
    };
  }

  onVoiceSpeaking(callback: (payload: VoiceSpeakingPayload) => void): () => void {
    this.voiceSpeakingListeners.push(callback);
    return () => {
      this.voiceSpeakingListeners = this.voiceSpeakingListeners.filter((fn) => fn !== callback);
    };
  }

  onVoiceInterrupted(callback: (payload: VoiceInterruptedPayload) => void): () => void {
    this.voiceInterruptedListeners.push(callback);
    return () => {
      this.voiceInterruptedListeners = this.voiceInterruptedListeners.filter((fn) => fn !== callback);
    };
  }

  onVoiceCompleted(callback: (payload: VoiceCompletedPayload) => void): () => void {
    this.voiceCompletedListeners.push(callback);
    return () => {
      this.voiceCompletedListeners = this.voiceCompletedListeners.filter((fn) => fn !== callback);
    };
  }

  onVoiceError(callback: (payload: VoiceErrorPayload) => void): () => void {
    this.voiceErrorListeners.push(callback);
    return () => {
      this.voiceErrorListeners = this.voiceErrorListeners.filter((fn) => fn !== callback);
    };
  }
}

// Singleton instance
export const dhavonClient = new DhavonClient();
