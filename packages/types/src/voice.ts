/**
 * DHAVON — Voice Intelligence System Types
 * Defines voice session states, STT/TTS abstractions, and WebSocket event payloads.
 */

export type VoiceState =
  | 'IDLE'
  | 'LISTENING'
  | 'TRANSCRIBING'
  | 'THINKING'
  | 'SPEAKING'
  | 'INTERRUPTED'
  | 'ERROR';

export interface STTOptions {
  language?: string;
  sampleRate?: number;
  mimeType?: string;
  prompt?: string;
}

export interface STTResult {
  text: string;
  language?: string;
  confidence?: number;
  durationSeconds?: number;
  provider: string;
}

export interface TTSOptions {
  voice?: string;
  language?: string;
  speed?: number;
  pitch?: number;
  volume?: number;
  format?: 'mp3' | 'wav' | 'browser_native';
}

export interface TTSResult {
  text: string;
  format: string;
  audioUrl?: string;
  audioBufferBase64?: string;
  provider: string;
  durationEstimateSeconds?: number;
}

// WebSocket Voice Events
export interface VoiceStartedPayload {
  sessionId: string;
  timestamp: string;
}

export interface VoiceListeningPayload {
  sessionId: string;
  timestamp: string;
}

export interface VoiceTranscriptPayload {
  sessionId: string;
  transcript: string;
  isFinal: boolean;
  confidence?: number;
  timestamp: string;
}

export interface VoiceThinkingPayload {
  sessionId: string;
  transcript: string;
  timestamp: string;
}

export interface VoiceResponsePayload {
  sessionId: string;
  responseText: string;
  timestamp: string;
}

export interface VoiceSpeakingPayload {
  sessionId: string;
  text: string;
  timestamp: string;
}

export interface VoiceInterruptedPayload {
  sessionId: string;
  reason: string;
  timestamp: string;
}

export interface VoiceCompletedPayload {
  sessionId: string;
  transcript: string;
  response: string;
  timestamp: string;
}

export interface VoiceErrorPayload {
  sessionId?: string;
  code: string;
  message: string;
  timestamp: string;
}
