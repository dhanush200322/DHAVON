import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import {
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

export interface VoiceEventEnvelope {
  event: string;
  data: unknown;
}

@Injectable()
export class VoiceEventsService {
  private readonly logger = new Logger(VoiceEventsService.name);
  private readonly eventSubject = new Subject<VoiceEventEnvelope>();

  getEventStream(): Observable<VoiceEventEnvelope> {
    return this.eventSubject.asObservable();
  }

  emitVoiceStarted(sessionId: string) {
    const payload: VoiceStartedPayload = {
      sessionId,
      timestamp: new Date().toISOString(),
    };
    this.logger.log(`[Event: dhavon.voice.started] Session: ${sessionId}`);
    this.eventSubject.next({ event: 'dhavon.voice.started', data: payload });
  }

  emitVoiceListening(sessionId: string) {
    const payload: VoiceListeningPayload = {
      sessionId,
      timestamp: new Date().toISOString(),
    };
    this.logger.log(`[Event: dhavon.voice.listening] Session: ${sessionId}`);
    this.eventSubject.next({ event: 'dhavon.voice.listening', data: payload });
  }

  emitVoiceTranscript(sessionId: string, transcript: string, isFinal = true, confidence = 0.95) {
    const payload: VoiceTranscriptPayload = {
      sessionId,
      transcript,
      isFinal,
      confidence,
      timestamp: new Date().toISOString(),
    };
    this.logger.log(`[Event: dhavon.voice.transcript] Session: ${sessionId} -> "${transcript.slice(0, 50)}"`);
    this.eventSubject.next({ event: 'dhavon.voice.transcript', data: payload });
  }

  emitVoiceThinking(sessionId: string, transcript: string) {
    const payload: VoiceThinkingPayload = {
      sessionId,
      transcript,
      timestamp: new Date().toISOString(),
    };
    this.logger.log(`[Event: dhavon.voice.thinking] Session: ${sessionId}`);
    this.eventSubject.next({ event: 'dhavon.voice.thinking', data: payload });
  }

  emitVoiceResponse(sessionId: string, responseText: string) {
    const payload: VoiceResponsePayload = {
      sessionId,
      responseText,
      timestamp: new Date().toISOString(),
    };
    this.logger.log(`[Event: dhavon.voice.response] Session: ${sessionId}`);
    this.eventSubject.next({ event: 'dhavon.voice.response', data: payload });
  }

  emitVoiceSpeaking(sessionId: string, text: string) {
    const payload: VoiceSpeakingPayload = {
      sessionId,
      text,
      timestamp: new Date().toISOString(),
    };
    this.logger.log(`[Event: dhavon.voice.speaking] Session: ${sessionId} -> "${text.slice(0, 50)}"`);
    this.eventSubject.next({ event: 'dhavon.voice.speaking', data: payload });
  }

  emitVoiceInterrupted(sessionId: string, reason = 'User interrupted speaking') {
    const payload: VoiceInterruptedPayload = {
      sessionId,
      reason,
      timestamp: new Date().toISOString(),
    };
    this.logger.warn(`[Event: dhavon.voice.interrupted] Session: ${sessionId} -> Reason: ${reason}`);
    this.eventSubject.next({ event: 'dhavon.voice.interrupted', data: payload });
  }

  emitVoiceCompleted(sessionId: string, transcript: string, response: string) {
    const payload: VoiceCompletedPayload = {
      sessionId,
      transcript,
      response,
      timestamp: new Date().toISOString(),
    };
    this.logger.log(`[Event: dhavon.voice.completed] Session: ${sessionId}`);
    this.eventSubject.next({ event: 'dhavon.voice.completed', data: payload });
  }

  emitVoiceError(code: string, message: string, sessionId?: string) {
    const payload: VoiceErrorPayload = {
      sessionId,
      code,
      message,
      timestamp: new Date().toISOString(),
    };
    this.logger.error(`[Event: dhavon.voice.error] Code: ${code} - ${message}`);
    this.eventSubject.next({ event: 'dhavon.voice.error', data: payload });
  }
}
