import { Injectable, Logger } from '@nestjs/common';
import { SpeechToTextProvider } from './stt-provider.interface';
import { TextToSpeechProvider } from './tts-provider.interface';
import { GroqWhisperSTTProvider } from './providers/groq-whisper.stt-provider';
import { BrowserSpeechTTSProvider } from './providers/browser-speech.tts-provider';

@Injectable()
export class VoiceProviderFactory {
  private readonly logger = new Logger(VoiceProviderFactory.name);
  private readonly sttProviders = new Map<string, SpeechToTextProvider>();
  private readonly ttsProviders = new Map<string, TextToSpeechProvider>();

  private activeSTT = 'groq-whisper';
  private activeTTS = 'browser-native';

  constructor(
    private readonly groqWhisper: GroqWhisperSTTProvider,
    private readonly browserTTS: BrowserSpeechTTSProvider,
  ) {
    this.registerSTT(groqWhisper);
    this.registerTTS(browserTTS);

    this.logger.log(
      `VoiceProviderFactory initialized with STT=[${this.activeSTT}] and TTS=[${this.activeTTS}]`,
    );
  }

  registerSTT(provider: SpeechToTextProvider) {
    this.sttProviders.set(provider.name, provider);
  }

  registerTTS(provider: TextToSpeechProvider) {
    this.ttsProviders.set(provider.name, provider);
  }

  getSTTProvider(name?: string): SpeechToTextProvider {
    const target = name || this.activeSTT;
    const provider = this.sttProviders.get(target);
    if (!provider) {
      throw new Error(`STT Provider "${target}" is not registered.`);
    }
    return provider;
  }

  getTTSProvider(name?: string): TextToSpeechProvider {
    const target = name || this.activeTTS;
    const provider = this.ttsProviders.get(target);
    if (!provider) {
      throw new Error(`TTS Provider "${target}" is not registered.`);
    }
    return provider;
  }

  getActiveSTTName(): string {
    return this.activeSTT;
  }

  getActiveTTSName(): string {
    return this.activeTTS;
  }

  getStatus() {
    return {
      activeSTT: this.activeSTT,
      activeTTS: this.activeTTS,
      availableSTT: Array.from(this.sttProviders.keys()).map((k) => ({
        name: k,
        available: this.sttProviders.get(k)?.isAvailable() ?? false,
      })),
      availableTTS: Array.from(this.ttsProviders.keys()).map((k) => ({
        name: k,
        available: this.ttsProviders.get(k)?.isAvailable() ?? false,
      })),
    };
  }
}
