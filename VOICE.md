# DHAVON — Voice Intelligence System (Phase 6 Architecture & Specification)

## 1. Executive Summary & Purpose

The **DHAVON Voice Intelligence System** provides a production-grade, bi-directional voice interface for the DHAVON Personal AI Operating System. It enables frictionless, low-latency conversational audio interaction while maintaining absolute adherence to the **DHAVON CORE** control plane.

```
VOICE INPUT
    ↓
Microphone Capture (Browser MediaRecorder)
    ↓
Audio Slicing & Transport (WebM / WAV via REST / WebSocket)
    ↓
STT Provider (Groq Whisper large-v3-turbo)
    ↓
Transcript Normalization & Secret Scrubbing
    ↓
DHAVON CORE Pipeline (Permission Engine, Memory Engine, Planner, MCP Gateway)
    ↓
AI Response Generation (Streaming / Turn-based)
    ↓
TTS Provider (Browser-Native Web Speech Synthesis / Edge TTS Abstraction)
    ↓
Audio Playback & Barge-In Monitor
    ↓
VOICE OUTPUT
```

### Strict Architectural Rule
Voice is purely an **Input / Output interface**. It does **NOT** bypass:
1. DHAVON CORE conversation pipeline
2. Permission Engine (Four-Tier Risk Matrix)
3. Memory Engine (Supabase pgvector recall & episodic storage)
4. Planner & Goal Orchestrator
5. MCP Gateway (all tools remain strictly gated; sensitive actions still require confirmation)
6. Security boundaries & secret scrubbing

---

## 2. Voice State Lifecycle & Orb Synchronization

Voice interaction operates via an explicit, deterministic state machine that mirrors the locked **DHAVON Orb** visual states without requiring any visual redesign:

| Voice State | Orb State | Trigger / Description |
| :--- | :--- | :--- |
| `IDLE` | `CALM` | System is quiet, awaiting user voice activation or command. |
| `LISTENING` | `LISTENING` | Microphone capture active; streaming user speech. |
| `TRANSCRIBING` | `THINKING` | Audio packet received; STT provider transcribing speech. |
| `THINKING` | `THINKING` | Transcript routed to DHAVON Core; memory retrieval & AI reasoning. |
| `SPEAKING` | `ACTING` | Synthesized voice output is being played back to the user. |
| `INTERRUPTED` | `LISTENING` | User initiated barge-in; active playback cancelled; immediate listening. |
| `ERROR` | `ERROR` | Microphone permission denied, empty audio, or provider failure. |

---

## 3. Provider Abstractions

### 3.1 Speech-to-Text (`SpeechToTextProvider`)
Defined in [`apps/api/src/voice/stt-provider.interface.ts`](file:///c:/Users/ro224/OneDrive/Desktop/DHAVON/apps/api/src/voice/stt-provider.interface.ts):

```typescript
export interface SpeechToTextProvider {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  transcribe(audio: Buffer, options: STTOptions): Promise<STTResult>;
}
```

#### Primary STT Implementation: `GroqWhisperSTTProvider`
- **Engine**: Groq Cloud SDK (`whisper-large-v3-turbo`)
- **Latency**: ~180ms – 350ms average transcription time
- **Zero Cost / High Velocity**: Leverages existing server-side `GROQ_API_KEY`
- **Supported Formats**: `audio/webm`, `audio/wav`, `audio/mp3`, `audio/ogg`, `audio/m4a`
- **Fallback**: Graceful fallback to browser Web Speech Recognition API if network fails.

### 3.2 Text-to-Speech (`TextToSpeechProvider`)
Defined in [`apps/api/src/voice/tts-provider.interface.ts`](file:///c:/Users/ro224/OneDrive/Desktop/DHAVON/apps/api/src/voice/tts-provider.interface.ts):

```typescript
export interface TextToSpeechProvider {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  synthesize(text: string, options?: TTSOptions): Promise<TTSResult>;
}
```

#### Primary TTS Implementation: `BrowserSpeechTTSProvider`
- **Engine**: Client-side Web Speech Synthesis API (`window.speechSynthesis`)
- **Zero Cost / Zero Cloud Latency**: 0ms network latency; instant utterance start
- **Audio Control**: Configurable pitch (`1.0`), rate (`1.05`), natural voice matching
- **Duration Estimation**: Accurate token-to-second calculation computed server-side (`~130-150 WPM`)

### 3.3 Dynamic Provider Factory (`VoiceProviderFactory`)
Registered in [`apps/api/src/voice/voice-provider.factory.ts`](file:///c:/Users/ro224/OneDrive/Desktop/DHAVON/apps/api/src/voice/voice-provider.factory.ts):
- Resolves active providers dynamically
- Allows future self-hosted Piper / Whisper / Kokoro additions without refactoring callers

---

## 4. WebSocket Voice Events Specification

Voice events are strongly typed in [`packages/types/src/voice.ts`](file:///c:/Users/ro224/OneDrive/Desktop/DHAVON/packages/types/src/voice.ts) and broadcast through `DhavonGateway`:

| Event Name | Direction | Payload Structure |
| :--- | :--- | :--- |
| `dhavon.voice.start` | Client $\rightarrow$ Server | `{ conversationId?: string, clientTimestamp: number }` |
| `dhavon.voice.audio` | Client $\rightarrow$ Server | `{ sessionId: string, audioBase64: string, mimeType: string }` |
| `dhavon.voice.interrupt` | Client $\rightarrow$ Server | `{ sessionId?: string, reason: string }` |
| `dhavon.voice.started` | Server $\rightarrow$ Client | `{ sessionId: string, timestamp: string }` |
| `dhavon.voice.listening` | Server $\rightarrow$ Client | `{ sessionId: string, timestamp: string }` |
| `dhavon.voice.transcript` | Server $\rightarrow$ Client | `{ sessionId: string, transcript: string, confidence: number }` |
| `dhavon.voice.thinking` | Server $\rightarrow$ Client | `{ sessionId: string, timestamp: string }` |
| `dhavon.voice.response` | Server $\rightarrow$ Client | `{ sessionId: string, text: string }` |
| `dhavon.voice.speaking` | Server $\rightarrow$ Client | `{ sessionId: string, text: string, durationEstimateSeconds: number }` |
| `dhavon.voice.interrupted` | Server $\rightarrow$ Client | `{ sessionId: string, reason: string, timestamp: string }` |
| `dhavon.voice.completed` | Server $\rightarrow$ Client | `{ sessionId: string, timestamp: string }` |
| `dhavon.voice.error` | Server $\rightarrow$ Client | `{ code: string, message: string, fatal: boolean }` |

---

## 5. Frontend Microphone Control & Interruption (Barge-in)

Implemented in [`apps/web/src/hooks/useVoiceIntelligence.ts`](file:///c:/Users/ro224/OneDrive/Desktop/DHAVON/apps/web/src/hooks/useVoiceIntelligence.ts):

### User Flow
1. User clicks the microphone button in `CommandPod`.
2. Browser displays native microphone permission prompt if not yet granted.
3. MediaStream is acquired (`audio: true, echoCancellation: true, noiseSuppression: true`).
4. `MediaRecorder` starts recording audio chunks (`timeslice: 250ms`).
5. Orb transitions to `LISTENING`.
6. User clicks mic again or pauses: `MediaRecorder.stop()` triggers.
7. Blob is converted to Base64 and transmitted via WebSocket (`dhavon.voice.audio`) or REST (`POST /voice/transcribe`).
8. Orb transitions to `THINKING` during transcription and core cognitive processing.
9. Response is received; Orb transitions to `ACTING`; `window.speechSynthesis` speaks response.

### Barge-In / Interruption Implementation
- If user clicks the microphone or triggers audio input while DHAVON is speaking:
  1. `window.speechSynthesis.cancel()` is immediately invoked.
  2. Active audio streams and timers are cleared.
  3. Client emits `dhavon.voice.interrupt`.
  4. Orb transitions directly to `LISTENING`.
  5. New voice session commences seamlessly with zero hanging processes.

---

## 6. Security Model & Safeguards

1. **Zero Secret Exposure**:
   - `GROQ_API_KEY` and all AI provider credentials reside **strictly server-side** in `apps/api/.env`.
   - Frontend and WebSocket payloads never receive or expose raw API keys or provider secrets.
2. **Audio Ephemerality**:
   - Audio is processed entirely in memory (`Buffer`).
   - Raw audio buffers are **NOT stored on disk or in the database**.
3. **Secret Scrubbing**:
   - Transcripts undergo regex pattern scrubbing before routing to `DhavonCoreService` or persistent episodic storage.
4. **Payload Constraints**:
   - Maximum audio payload size strictly enforced at **10 MB**.
   - Empty audio buffers (`size === 0`) are rejected immediately with `EMPTY_AUDIO` error without triggering downstream LLM tokens.
5. **Permission Gating Gated Operations**:
   - Voice inputs that request actions classified as `CONFIRMATION_REQUIRED` or `SENSITIVE` (e.g., executing arbitrary Git mutations or creating external resources) still pause and require explicit user UI approval. Voice cannot bypass the permission matrix.

---

## 7. Database Decision

**Decision**: **Zero new database tables created for Phase 6.**
- Transcripts and resulting conversations are stored natively in the existing `conversations` and `messages` tables via `DhavonCoreService`.
- Memories extracted from voice turns are stored in the existing pgvector `memories` table.
- Ephemeral audio files are not stored, eliminating GDPR/privacy compliance risks and unnecessary cloud storage costs.

---

## 8. Verification & Test Coverage

### Automated Test Suites
- **Unit Tests**: `apps/api/src/voice/voice.service.spec.ts` (11 test cases covering providers, factory, state transitions, limits, barge-in, secret scrubbing, and core routing).
- **Monorepo Suite**: 14 test suites, **60/60 tests passed** (100% pass rate).
- **TypeScript**: `pnpm type-check` passed with 0 errors across all 5 workspace projects.
- **Lint**: `pnpm lint` passed with 0 errors, 0 warnings.
- **Production Build**: `pnpm build` passed with 0 errors (Next.js 15.5.27 static export & NestJS dist built cleanly).

### Integration Test Scripts
- `test-voice-e2e.js`: Status check, session creation, synthesis, barge-in interrupt, and WebSocket event emission — **100% OK**.
- `test-memory-recall.js`: Persisted Supabase pgvector recall ("What is my current main project?" $\rightarrow$ "DHAVON") — **100% OK**.
- `test-dependency-engine.js`: DAG topological execution ordering — **100% OK**.
- `test-failure-handling.js`: Controlled verification failure containment — **100% OK**.
- `test-multi-step.js`: Supervised multi-step autonomous execution — **100% OK**.
- `test-e2e.js`: Full MCP Gateway + WebSocket stream — **100% OK**.
- `test-postman-api-verification.js`: All REST endpoints — **100% OK**.

---

## 9. Known Limitations & Browser Compatibility

1. **Browser Support for Web Speech Synthesis**: Supported in all modern Chromium, WebKit, and Gecko browsers (Chrome, Edge, Safari, Firefox). Voices may vary across operating systems.
2. **Audio Codecs**: Client defaults to `audio/webm;codecs=opus` on Chrome/Firefox and `audio/mp4` on Safari; backend handles both formats transparently.
3. **Background Tab Audio Capture**: Browsers suspend microphone access when backgrounded or permissions are revoked; the system safely catches this and transitions cleanly to `IDLE` / `ERROR`.
