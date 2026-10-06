import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { VoiceState, OrbState, STTOptions, TTSOptions, STTResult, TTSResult } from '@dhavon/types';
import { VoiceProviderFactory } from './voice-provider.factory';
import { VoiceEventsService } from './voice-events.service';
import { StateService } from '../core/state/state.service';
import { DhavonCoreService } from '../core/dhavon-core.service';
import { scrubSecrets } from '../core/memory/secret-scrubber.util';

export interface VoiceSession {
  id: string;
  userId: string;
  conversationId: string;
  state: VoiceState;
  activeTranscript?: string;
  activeResponse?: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class VoiceSessionService {
  private readonly logger = new Logger(VoiceSessionService.name);
  private readonly sessions = new Map<string, VoiceSession>();

  // Audio size limits
  readonly maxAudioSizeBytes = 10 * 1024 * 1024; // 10 MB maximum

  constructor(
    private readonly providerFactory: VoiceProviderFactory,
    private readonly eventsService: VoiceEventsService,
    private readonly stateService: StateService,
    private readonly dhavonCore: DhavonCoreService,
  ) {}

  /**
   * Maps voice state to existing DHAVON Orb state without changing Orb artwork.
   */
  mapVoiceStateToOrbState(voiceState: VoiceState): OrbState {
    switch (voiceState) {
      case 'IDLE':
        return 'CALM';
      case 'LISTENING':
        return 'LISTENING';
      case 'TRANSCRIBING':
      case 'THINKING':
        return 'THINKING';
      case 'SPEAKING':
        return 'ACTING';
      case 'INTERRUPTED':
        return 'LISTENING';
      case 'ERROR':
        return 'ERROR';
      default:
        return 'CALM';
    }
  }

  /**
   * Start or retrieve a voice session
   */
  startSession(userId = '00000000-0000-0000-0000-000000000001', conversationId?: string): VoiceSession {
    const id = uuidv4();
    const session: VoiceSession = {
      id,
      userId,
      conversationId: conversationId || `voice-session-${id.slice(0, 8)}`,
      state: 'LISTENING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.sessions.set(id, session);
    this.eventsService.emitVoiceStarted(id);
    this.eventsService.emitVoiceListening(id);

    const orbState = this.mapVoiceStateToOrbState('LISTENING');
    this.stateService.transitionTo(orbState, 'Voice session active: Listening');

    return session;
  }

  getSession(sessionId: string): VoiceSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Process incoming recorded audio through STT -> DHAVON Core -> TTS -> Audio Output
   */
  async processAudioInput(
    sessionId: string,
    audioBuffer: Buffer,
    options?: STTOptions,
  ): Promise<{ transcript: string; response: string; tts: TTSResult }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Voice session ${sessionId} not found`);
    }

    // 1. Validate Audio Payload
    if (!audioBuffer || audioBuffer.length === 0) {
      this.eventsService.emitVoiceError('EMPTY_AUDIO', 'Received empty audio recording', sessionId);
      this.updateSessionState(session, 'ERROR');
      throw new Error('Audio payload cannot be empty');
    }

    if (audioBuffer.length > this.maxAudioSizeBytes) {
      this.eventsService.emitVoiceError(
        'PAYLOAD_TOO_LARGE',
        `Audio exceeds maximum allowed size of ${this.maxAudioSizeBytes / (1024 * 1024)} MB`,
        sessionId,
      );
      this.updateSessionState(session, 'ERROR');
      throw new Error('Audio payload too large');
    }

    // 2. Transcribe Audio (STT)
    this.updateSessionState(session, 'TRANSCRIBING');
    let sttResult: STTResult;
    try {
      const sttProvider = this.providerFactory.getSTTProvider();
      sttResult = await sttProvider.transcribe(audioBuffer, options);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.eventsService.emitVoiceError('STT_FAILURE', msg, sessionId);
      this.updateSessionState(session, 'ERROR');
      throw err;
    }

    // 3. Scrub secrets from transcript before feeding to core/memory
    const cleanTranscript = scrubSecrets(sttResult.text);
    session.activeTranscript = cleanTranscript;
    this.eventsService.emitVoiceTranscript(sessionId, cleanTranscript, true, sttResult.confidence);

    if (!cleanTranscript || cleanTranscript.trim().length === 0) {
      this.eventsService.emitVoiceError('NO_SPEECH_DETECTED', 'No audible speech recognized', sessionId);
      this.updateSessionState(session, 'IDLE');
      return {
        transcript: '',
        response: '',
        tts: { text: '', format: 'browser_native', provider: 'browser-native' },
      };
    }

    // 4. Feed Transcript through DHAVON Core cognitive pipeline
    this.updateSessionState(session, 'THINKING');
    this.eventsService.emitVoiceThinking(sessionId, cleanTranscript);

    let fullResponse = '';
    try {
      const messageStream = this.dhavonCore.processMessage({
        conversationId: session.conversationId,
        content: cleanTranscript,
        userId: session.userId,
        mode: 'ask',
      });

      for await (const chunk of messageStream) {
        if (chunk.type === 'complete' && chunk.content) {
          fullResponse = chunk.content;
        } else if (chunk.type === 'chunk' && chunk.delta) {
          fullResponse += chunk.delta;
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.eventsService.emitVoiceError('CORE_PROCESSING_FAILURE', msg, sessionId);
      this.updateSessionState(session, 'ERROR');
      throw err;
    }

    session.activeResponse = fullResponse;
    this.eventsService.emitVoiceResponse(sessionId, fullResponse);

    // 5. Synthesize Response via TTS Provider
    this.updateSessionState(session, 'SPEAKING');
    this.eventsService.emitVoiceSpeaking(sessionId, fullResponse);

    let ttsResult: TTSResult;
    try {
      const ttsProvider = this.providerFactory.getTTSProvider();
      ttsResult = await ttsProvider.synthesize(fullResponse, { format: 'browser_native' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.eventsService.emitVoiceError('TTS_FAILURE', msg, sessionId);
      this.updateSessionState(session, 'ERROR');
      throw err;
    }

    this.eventsService.emitVoiceCompleted(sessionId, cleanTranscript, fullResponse);
    this.updateSessionState(session, 'IDLE');

    return {
      transcript: cleanTranscript,
      response: fullResponse,
      tts: ttsResult,
    };
  }

  /**
   * Interruption / Barge-in: immediately cancel audio playback and reset to listening state
   */
  interrupt(sessionId: string, reason = 'User interrupted speaking'): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.updateSessionState(session, 'INTERRUPTED');
      this.eventsService.emitVoiceInterrupted(sessionId, reason);
      // Immediately reset to listening for next turn
      this.updateSessionState(session, 'LISTENING');
      this.eventsService.emitVoiceListening(sessionId);
    } else {
      // Global broadcast interruption if sessionId is omitted
      this.eventsService.emitVoiceInterrupted('broadcast', reason);
      const orbState = this.mapVoiceStateToOrbState('INTERRUPTED');
      this.stateService.transitionTo(orbState, 'Interrupted');
    }
  }

  private updateSessionState(session: VoiceSession, newState: VoiceState) {
    session.state = newState;
    session.updatedAt = new Date().toISOString();

    const orbState = this.mapVoiceStateToOrbState(newState);
    this.stateService.transitionTo(orbState, `Voice state: ${newState}`);
  }
}
