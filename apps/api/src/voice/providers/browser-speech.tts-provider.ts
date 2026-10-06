import { Injectable, Logger } from '@nestjs/common';
import { TextToSpeechProvider } from '../tts-provider.interface';
import { TTSOptions, TTSResult } from '@dhavon/types';

@Injectable()
export class BrowserSpeechTTSProvider implements TextToSpeechProvider {
  readonly name = 'browser-native';
  private readonly logger = new Logger(BrowserSpeechTTSProvider.name);

  isAvailable(): boolean {
    return true; // Browser-native speech synthesis is always available with zero cost
  }

  async synthesize(text: string, options?: TTSOptions): Promise<TTSResult> {
    if (!text || text.trim().length === 0) {
      throw new Error('TTS text payload cannot be empty');
    }

    const trimmed = text.trim();
    // Words per minute benchmark: ~150 wpm -> 2.5 words per second
    const wordCount = trimmed.split(/\s+/).length;
    const speed = options?.speed || 1.0;
    const durationEstimateSeconds = Math.max(0.5, (wordCount / (2.5 * speed)));

    this.logger.log(
      `Synthesized speech metadata for ${wordCount} words (~${durationEstimateSeconds.toFixed(1)}s): "${trimmed.slice(0, 50)}..."`,
    );

    return {
      text: trimmed,
      format: options?.format || 'browser_native',
      provider: this.name,
      durationEstimateSeconds,
    };
  }
}
