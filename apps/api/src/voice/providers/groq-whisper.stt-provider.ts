import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq, { toFile } from 'groq-sdk';
import { SpeechToTextProvider } from '../stt-provider.interface';
import { STTOptions, STTResult } from '@dhavon/types';

@Injectable()
export class GroqWhisperSTTProvider implements SpeechToTextProvider {
  readonly name = 'groq-whisper';
  private readonly logger = new Logger(GroqWhisperSTTProvider.name);
  private client: Groq | null = null;
  private readonly model: string;
  private hasKey = false;

  constructor(private readonly configService: ConfigService) {
    const key =
      this.configService.get<string>('GROQ_API_KEY') ||
      this.configService.get<string>('AI_API_KEY');

    this.model =
      this.configService.get<string>('GROQ_WHISPER_MODEL') ||
      'whisper-large-v3-turbo';

    if (key && key.trim().length > 0) {
      this.client = new Groq({ apiKey: key });
      this.hasKey = true;
      this.logger.log(`GroqWhisperSTTProvider initialized with model: ${this.model}`);
    } else {
      this.logger.warn('GroqWhisperSTTProvider: GROQ_API_KEY not configured.');
    }
  }

  isAvailable(): boolean {
    return this.hasKey && !!this.client;
  }

  async transcribe(audio: Buffer, options?: STTOptions): Promise<STTResult> {
    if (!audio || audio.length === 0) {
      throw new Error('Audio payload cannot be empty');
    }

    if (!this.client || !this.hasKey) {
      throw new Error('Groq Whisper STT provider is not configured. Supply a valid GROQ_API_KEY.');
    }

    const mimeType = options?.mimeType || 'audio/webm';
    const extension = mimeType.includes('wav') ? 'wav' : mimeType.includes('mp3') ? 'mp3' : 'webm';
    const filename = `recording_${Date.now()}.${extension}`;

    const startTime = Date.now();
    try {
      const file = await toFile(audio, filename, { type: mimeType });

      const transcription = await this.client.audio.transcriptions.create({
        file,
        model: this.model,
        language: options?.language,
        prompt: options?.prompt || 'DHAVON personal AI intelligence assistant command',
        response_format: 'verbose_json',
      });

      const latency = Date.now() - startTime;
      const text = transcription.text ? transcription.text.trim() : '';

      this.logger.log(
        `Transcribed ${audio.length} bytes in ${latency}ms: "${text.slice(0, 60)}${text.length > 60 ? '...' : ''}"`,
      );

      return {
        text,
        language: (transcription as { language?: string }).language || options?.language || 'en',
        durationSeconds: (transcription as { duration?: number }).duration || latency / 1000,
        confidence: 0.95,
        provider: this.name,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Groq Whisper transcription failed: ${msg}`);
      throw new Error(`STT transcription failed: ${msg}`);
    }
  }
}
