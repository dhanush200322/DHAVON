import { TTSOptions, TTSResult } from '@dhavon/types';

export interface TextToSpeechProvider {
  readonly name: string;
  isAvailable(): boolean;
  synthesize(text: string, options?: TTSOptions): Promise<TTSResult>;
}
