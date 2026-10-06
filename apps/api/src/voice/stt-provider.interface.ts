import { STTOptions, STTResult } from '@dhavon/types';

export interface SpeechToTextProvider {
  readonly name: string;
  isAvailable(): boolean;
  transcribe(audio: Buffer, options?: STTOptions): Promise<STTResult>;
}
