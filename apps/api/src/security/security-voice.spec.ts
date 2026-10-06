import { VoiceSessionService } from '../voice/voice-session.service';

describe('Phase 7 Security: Voice Intelligence Boundary & Limits', () => {
  let sessionService: VoiceSessionService;
  let mockProviderFactory: any;
  let mockEventsService: any;
  let mockCoreService: any;
  let mockStateService: any;

  beforeEach(() => {
    mockProviderFactory = {
      getSTTProvider: jest.fn().mockReturnValue({
        transcribe: jest.fn().mockResolvedValue({
          text: 'What is my main project? Also my key is gsk_1234567890123456789012345678901234567890',
          confidence: 0.95,
        }),
      }),
      getTTSProvider: jest.fn().mockReturnValue({
        synthesize: jest.fn().mockResolvedValue({
          text: 'Answer',
          format: 'browser_native',
          durationEstimateSeconds: 1.5,
        }),
      }),
    };
    mockEventsService = {
      emitVoiceStarted: jest.fn(),
      emitVoiceListening: jest.fn(),
      emitVoiceTranscript: jest.fn(),
      emitVoiceThinking: jest.fn(),
      emitVoiceSpeaking: jest.fn(),
      emitVoiceResponse: jest.fn(),
      emitVoiceCompleted: jest.fn(),
      emitVoiceInterrupted: jest.fn(),
      emitVoiceError: jest.fn(),
    };
    mockCoreService = {
      processMessage: jest.fn().mockReturnValue((async function* () {
        yield { type: 'complete', content: 'Your project is DHAVON.' };
      })()),
    };
    mockStateService = {
      transitionTo: jest.fn(),
    };

    sessionService = new VoiceSessionService(
      mockProviderFactory,
      mockEventsService,
      mockStateService,
      mockCoreService,
    );
  });

  it('should reject empty audio buffers with EMPTY_AUDIO error', async () => {
    const session = sessionService.startSession();
    const emptyBuffer = Buffer.alloc(0);

    await expect(
      sessionService.processAudioInput(session.id, emptyBuffer),
    ).rejects.toThrow('Audio payload cannot be empty');

    expect(mockEventsService.emitVoiceError).toHaveBeenCalledWith(
      'EMPTY_AUDIO',
      'Received empty audio recording',
      session.id,
    );
  });

  it('should reject oversized audio payloads exceeding 10MB limit', async () => {
    const session = sessionService.startSession();
    const oversizedBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB

    await expect(
      sessionService.processAudioInput(session.id, oversizedBuffer),
    ).rejects.toThrow('Audio payload too large');

    expect(mockEventsService.emitVoiceError).toHaveBeenCalledWith(
      'PAYLOAD_TOO_LARGE',
      expect.stringContaining('10 MB'),
      session.id,
    );
  });

  it('should scrub accidental credentials uttered in voice transcripts', async () => {
    const session = sessionService.startSession();
    const audioBuffer = Buffer.from('mock-audio-data');

    await sessionService.processAudioInput(session.id, audioBuffer);

    // Check emitted transcript
    expect(mockEventsService.emitVoiceTranscript).toHaveBeenCalledWith(
      session.id,
      expect.not.stringContaining('gsk_123456'),
      true,
      0.95,
    );
    expect(mockEventsService.emitVoiceTranscript).toHaveBeenCalledWith(
      session.id,
      expect.stringContaining('[REDACTED_SECRET]'),
      true,
      0.95,
    );
  });

  it('should safely interrupt and transition state upon barge-in', () => {
    const session = sessionService.startSession();
    sessionService.interrupt(session.id, 'User began speaking');

    expect(mockEventsService.emitVoiceInterrupted).toHaveBeenCalledWith(
      session.id,
      'User began speaking',
    );
    expect(mockStateService.transitionTo).toHaveBeenCalledWith(
      'LISTENING',
      expect.any(String),
    );
  });
});
