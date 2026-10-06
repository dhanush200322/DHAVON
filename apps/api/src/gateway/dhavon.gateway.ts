import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { DhavonCoreService } from '../core/dhavon-core.service';
import { StateService } from '../core/state/state.service';
import { McpEventsService } from '../mcp/mcp-events.service';
import { McpGatewayService } from '../mcp/mcp-gateway.service';
import { OrchestrationEventsService } from '../core/events/orchestration-events.service';
import { VoiceEventsService } from '../voice/voice-events.service';
import { VoiceSessionService } from '../voice/voice-session.service';
import { ActiveMode } from '@dhavon/types';

export interface SendMessagePayload {
  conversationId: string;
  content: string;
  mode?: ActiveMode;
  userId?: string;
}

export interface ConfirmToolPayload {
  executionId: string;
  userId?: string;
}

@WebSocketGateway({
  cors: {
    origin: (origin: string, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow localhost frontend, vercel.app, onrender.com, configured CORS_ORIGINS, and direct socket/tool clients
      const corsEnv = process.env.CORS_ORIGINS
        ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
        : [];
      const allowed =
        !origin ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.onrender.com') ||
        corsEnv.includes(origin);
      callback(null, allowed);
    },
    credentials: true,
  },
})
export class DhavonGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(DhavonGateway.name);
  private readonly rateLimits = new Map<string, { count: number; resetAt: number }>();
  private readonly maxRequestsPerWindow = 60;
  private readonly windowMs = 10000; // 10s window

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly dhavonCore: DhavonCoreService,
    private readonly stateService: StateService,
    private readonly mcpEvents: McpEventsService,
    private readonly mcpGateway: McpGatewayService,
    private readonly orchestrationEvents: OrchestrationEventsService,
    private readonly voiceEvents: VoiceEventsService,
    private readonly voiceSession: VoiceSessionService,
  ) {}

  private checkRateLimit(client: Socket): boolean {
    const now = Date.now();
    let record = this.rateLimits.get(client.id);
    if (!record || now > record.resetAt) {
      record = { count: 1, resetAt: now + this.windowMs };
      this.rateLimits.set(client.id, record);
      return true;
    }
    record.count++;
    if (record.count > this.maxRequestsPerWindow) {
      this.logger.warn(`Rate limit exceeded for socket client ${client.id}`);
      return false;
    }
    return true;
  }

  afterInit() {
    this.logger.log('DhavonGateway initialized. Subscribing to MCP, Orchestration, and Voice event streams...');
    this.mcpEvents.getEventStream().subscribe((mcpEvent) => {
      if (this.server) {
        this.server.emit(mcpEvent.event, mcpEvent.data);
      }
    });

    this.orchestrationEvents.getEventStream().subscribe((orchEvent) => {
      if (this.server) {
        this.server.emit(orchEvent.event, orchEvent.data);
      }
    });

    this.voiceEvents.getEventStream().subscribe((voiceEvent) => {
      if (this.server) {
        this.server.emit(voiceEvent.event, voiceEvent.data);
      }
    });
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected to DHAVON Gateway: ${client.id}`);

    // Send initial state to newly connected client
    const currentState = this.stateService.getState();
    client.emit('dhavon.state', {
      state: currentState.orbState,
      phase: currentState.activePhase,
      mode: currentState.activeMode,
      timestamp: new Date().toISOString(),
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from DHAVON Gateway: ${client.id}`);
    this.rateLimits.delete(client.id);
  }

  @SubscribeMessage('dhavon.message.send')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SendMessagePayload,
  ) {
    if (!this.checkRateLimit(client)) {
      client.emit('dhavon.error', {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Message rate limit exceeded. Please throttle requests.',
      });
      return;
    }

    if (!payload || !payload.content) {
      client.emit('dhavon.error', {
        code: 'INVALID_PAYLOAD',
        message: 'Message content cannot be empty.',
      });
      return;
    }

    if (payload.content.length > 65536) {
      client.emit('dhavon.error', {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Message content exceeds maximum allowed limit of 64KB.',
      });
      return;
    }

    const conversationId = payload.conversationId || 'default-session';
    const mode = payload.mode || 'ask';

    this.logger.log(
      `Received user message for conversation [${conversationId}] via socket [${client.id}]`,
    );

    try {
      const stream = this.dhavonCore.processMessage({
        conversationId,
        content: payload.content,
        mode,
        userId: payload.userId,
      });

      for await (const event of stream) {
        if (event.type === 'state') {
          client.emit('dhavon.state', {
            state: event.state,
            conversationId: event.conversationId,
            timestamp: new Date().toISOString(),
          });
        } else if (event.type === 'chunk') {
          client.emit('dhavon.message.chunk', {
            delta: event.delta,
            conversationId: event.conversationId,
          });
        } else if (event.type === 'complete') {
          client.emit('dhavon.message.complete', {
            content: event.content,
            conversationId: event.conversationId,
          });
        } else if (event.type === 'tool') {
          client.emit('dhavon.tool.selected', event.toolData);
        } else if (event.type === 'error') {
          client.emit('dhavon.error', {
            code: 'AI_EXECUTION_ERROR',
            message: event.error,
            conversationId: event.conversationId,
          });
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error during socket processing: ${msg}`);
      client.emit('dhavon.error', {
        code: 'INTERNAL_ERROR',
        message: msg,
      });
    }
  }

  @SubscribeMessage('dhavon.tool.confirm')
  async handleToolConfirm(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ConfirmToolPayload,
  ) {
    if (!payload?.executionId) {
      client.emit('dhavon.error', {
        code: 'INVALID_CONFIRMATION',
        message: 'executionId is required.',
      });
      return;
    }

    try {
      const result = await this.mcpGateway.approveExecution(
        payload.executionId,
        payload.userId,
      );
      client.emit('dhavon.tool.execution_completed', result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      client.emit('dhavon.tool.execution_failed', {
        executionId: payload.executionId,
        error: msg,
      });
    }
  }

  @SubscribeMessage('dhavon.mode.change')
  handleModeChange(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { mode: ActiveMode },
  ) {
    if (payload?.mode) {
      this.stateService.setActiveMode(payload.mode);
      client.emit('dhavon.mode.changed', { mode: payload.mode });
    }
  }

  @SubscribeMessage('dhavon.voice.start')
  handleVoiceStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { userId?: string; conversationId?: string },
  ) {
    const session = this.voiceSession.startSession(payload?.userId, payload?.conversationId);
    client.emit('dhavon.voice.started', {
      sessionId: session.id,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('dhavon.voice.audio')
  async handleVoiceAudio(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      sessionId: string;
      audioBase64: string;
      mimeType?: string;
      language?: string;
    },
  ) {
    if (!payload?.sessionId || !payload?.audioBase64) {
      client.emit('dhavon.voice.error', {
        code: 'INVALID_AUDIO_PAYLOAD',
        message: 'sessionId and audioBase64 are required.',
      });
      return;
    }

    if (payload.audioBase64.length > 15000000) {
      client.emit('dhavon.voice.error', {
        sessionId: payload.sessionId,
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Audio payload exceeds maximum 10MB limit.',
      });
      return;
    }

    try {
      const buffer = Buffer.from(payload.audioBase64, 'base64');
      const result = await this.voiceSession.processAudioInput(payload.sessionId, buffer, {
        mimeType: payload.mimeType,
        language: payload.language,
      });
      client.emit('dhavon.voice.completed', {
        sessionId: payload.sessionId,
        transcript: result.transcript,
        response: result.response,
        tts: result.tts,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      client.emit('dhavon.voice.error', {
        sessionId: payload.sessionId,
        code: 'VOICE_PROCESSING_ERROR',
        message: msg,
      });
    }
  }

  @SubscribeMessage('dhavon.voice.interrupt')
  handleVoiceInterrupt(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { sessionId?: string; reason?: string },
  ) {
    this.voiceSession.interrupt(payload?.sessionId || 'default', payload?.reason);
    client.emit('dhavon.voice.interrupted', {
      sessionId: payload?.sessionId,
      reason: payload?.reason || 'User interrupted speaking',
      timestamp: new Date().toISOString(),
    });
  }
}
