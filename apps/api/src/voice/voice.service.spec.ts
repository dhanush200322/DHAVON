import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { VoiceSessionService } from './voice-session.service';
import { VoiceEventsService } from './voice-events.service';
import { VoiceProviderFactory } from './voice-provider.factory';
import { GroqWhisperSTTProvider } from './providers/groq-whisper.stt-provider';
import { BrowserSpeechTTSProvider } from './providers/browser-speech.tts-provider';
import { StateService } from '../core/state/state.service';
import { DhavonCoreService } from '../core/dhavon-core.service';
import { SpeechToTextProvider } from './stt-provider.interface';
import { TextToSpeechProvider } from './tts-provider.interface';

describe('Voice Intelligence Subsystem', () => {
  let sessionService: VoiceSessionService;
  let providerFactory: VoiceProviderFactory;
  let eventsService: VoiceEventsService;
  let stateService: StateService;
  let mockCoreService: jest.Mocked<Partial<DhavonCoreService>>;

  beforeEach(async () => {
    mockCoreService = {
      processMessage: jest.fn().mockImplementation(async function* () {
        yield { type: 'chunk', delta: 'Your main project is DHAVON.' };
        yield { type: 'complete', content: 'Your main project is DHAVON.' };
      }),
    };

    const mockStateService = {
      transitionTo: jest.fn(),
      getState: jest.fn().mockReturnValue({ orbState: 'CALM' }),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'GROQ_API_KEY') return 'gsk_mock_test_key_123456789012345678901234567890';
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoiceSessionService,
        VoiceEventsService,
        VoiceProviderFactory,
        GroqWhisperSTTProvider,
        BrowserSpeechTTSProvider,
        { provide: StateService, useValue: mockStateService },
        { provide: DhavonCoreService, useValue: mockCoreService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    sessionService = module.get<VoiceSessionService>(VoiceSessionService);
    providerFactory = module.get<VoiceProviderFactory>(VoiceProviderFactory);
    eventsService = module.get<VoiceEventsService>(VoiceEventsService);
    stateService = module.get<StateService>(StateService);
  });

  describe('A & B & C: Provider Abstraction & Factory', () => {
    it('should register and retrieve default STT and TTS providers', () => {
      const stt = providerFactory.getSTTProvider();
      expect(stt).toBeDefined();
      expect(stt.name).toBe('groq-whisper');

      const tts = providerFactory.getTTSProvider();
      expect(tts).toBeDefined();
      expect(tts.name).toBe('browser-native');
    });

    it('should allow registering custom or fallback STT and TTS providers', () => {
      const customSTT: SpeechToTextProvider = {
        name: 'custom-stt',
        isAvailable: () => true,
        transcribe: jest.fn().mockResolvedValue({
          text: 'Custom speech recognized',
          provider: 'custom-stt',
        }),
      };

      const customTTS: TextToSpeechProvider = {
        name: 'custom-tts',
        isAvailable: () => true,
        synthesize: jest.fn().mockResolvedValue({
          text: 'Hello world',
          format: 'wav',
          provider: 'custom-tts',
        }),
      };

      providerFactory.registerSTT(customSTT);
      providerFactory.registerTTS(customTTS);

      expect(providerFactory.getSTTProvider('custom-stt')).toBe(customSTT);
      expect(providerFactory.getTTSProvider('custom-tts')).toBe(customTTS);
    });

    it('should throw error when requesting unregistered provider', () => {
      expect(() => providerFactory.getSTTProvider('nonexistent')).toThrow(
        /not registered/,
      );
    });
  });

  describe('D: Voice State Transitions & Orb State Mapping', () => {
    it('should map all voice states to correct DHAVON Orb states', () => {
      expect(sessionService.mapVoiceStateToOrbState('IDLE')).toBe('CALM');
      expect(sessionService.mapVoiceStateToOrbState('LISTENING')).toBe('LISTENING');
      expect(sessionService.mapVoiceStateToOrbState('TRANSCRIBING')).toBe('THINKING');
      expect(sessionService.mapVoiceStateToOrbState('THINKING')).toBe('THINKING');
      expect(sessionService.mapVoiceStateToOrbState('SPEAKING')).toBe('ACTING');
      expect(sessionService.mapVoiceStateToOrbState('INTERRUPTED')).toBe('LISTENING');
      expect(sessionService.mapVoiceStateToOrbState('ERROR')).toBe('ERROR');
    });

    it('should start session in LISTENING state and transition orb to LISTENING', () => {
      const session = sessionService.startSession('user-1', 'conv-1');
      expect(session.id).toBeDefined();
      expect(session.state).toBe('LISTENING');
      expect(stateService.transitionTo).toHaveBeenCalledWith('LISTENING', expect.any(String));
    });
  });

  describe('E: WebSocket Voice Events', () => {
    it('should emit strongly typed events over event stream', (done) => {
      const emittedEvents: string[] = [];

      eventsService.getEventStream().subscribe({
        next: (env) => {
          emittedEvents.push(env.event);
          if (emittedEvents.length === 3) {
            expect(emittedEvents).toContain('dhavon.voice.started');
            expect(emittedEvents).toContain('dhavon.voice.listening');
            expect(emittedEvents).toContain('dhavon.voice.transcript');
            done();
          }
        },
      });

      eventsService.emitVoiceStarted('s-1');
      eventsService.emitVoiceListening('s-1');
      eventsService.emitVoiceTranscript('s-1', 'Test transcript');
    });
  });

  describe('F, G, H: Audio Validation & Limit Checks', () => {
    it('should reject empty audio payload with descriptive error', async () => {
      const session = sessionService.startSession();
      await expect(
        sessionService.processAudioInput(session.id, Buffer.alloc(0)),
      ).rejects.toThrow('Audio payload cannot be empty');
    });

    it('should reject oversized audio exceeding 10MB limit', async () => {
      const session = sessionService.startSession();
      // Exceed 10MB
      const hugeBuffer = Buffer.alloc(11 * 1024 * 1024);
      await expect(
        sessionService.processAudioInput(session.id, hugeBuffer),
      ).rejects.toThrow('Audio payload too large');
    });
  });

  describe('K: Interruption / Barge-in Behavior', () => {
    it('should cancel speaking, emit interrupted event, and reset to LISTENING', () => {
      const session = sessionService.startSession();
      const emitted: string[] = [];

      eventsService.getEventStream().subscribe((e) => emitted.push(e.event));

      sessionService.interrupt(session.id, 'User interrupted');

      expect(emitted).toContain('dhavon.voice.interrupted');
      expect(emitted).toContain('dhavon.voice.listening');
      expect(session.state).toBe('LISTENING');
      expect(stateService.transitionTo).toHaveBeenCalledWith('LISTENING', expect.any(String));
    });
  });

  describe('L, M, N, O: Conversation Integration, Memory Recall & Security Boundary', () => {
    it('should route transcript through DHAVON Core and scrub any accidental secrets', async () => {
      const session = sessionService.startSession();

      // Mock STT to return transcription with a secret
      const mockSTT: SpeechToTextProvider = {
        name: 'mock-stt',
        isAvailable: () => true,
        transcribe: jest.fn().mockResolvedValue({
          text: 'My secret key is AIzaSyD98765432101234567890123456789012 and What is my main project?',
          confidence: 0.98,
          provider: 'mock-stt',
        }),
      };
      providerFactory.registerSTT(mockSTT);

      // Override active STT to mock
      jest.spyOn(providerFactory, 'getSTTProvider').mockReturnValue(mockSTT);

      const audioBuffer = Buffer.from('mock-audio-data');
      const result = await sessionService.processAudioInput(session.id, audioBuffer);

      // Verify secrets were scrubbed before processing
      expect(result.transcript).not.toContain('AIzaSyD98765432101234567890123456789012');
      expect(result.transcript).toContain('[REDACTED_SECRET]');

      // Verify routed through Dhavon Core
      expect(mockCoreService.processMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('[REDACTED_SECRET]'),
        }),
      );

      // Verify AI response returned
      expect(result.response).toBe('Your main project is DHAVON.');
      expect(result.tts).toBeDefined();
      expect(result.tts.provider).toBe('browser-native');
    });

    it('should synthesize speech metadata without crashing', async () => {
      const tts = providerFactory.getTTSProvider();
      const result = await tts.synthesize('Your main project is DHAVON.');

      expect(result.text).toBe('Your main project is DHAVON.');
      expect(result.format).toBe('browser_native');
      expect(result.durationEstimateSeconds).toBeGreaterThan(0);
    });
  });
});
