import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VoiceController } from './voice.controller';
import { VoiceSessionService } from './voice-session.service';
import { VoiceEventsService } from './voice-events.service';
import { VoiceProviderFactory } from './voice-provider.factory';
import { GroqWhisperSTTProvider } from './providers/groq-whisper.stt-provider';
import { BrowserSpeechTTSProvider } from './providers/browser-speech.tts-provider';
import { CoreModule } from '../core/core.module';

@Module({
  imports: [ConfigModule, CoreModule],
  controllers: [VoiceController],
  providers: [
    GroqWhisperSTTProvider,
    BrowserSpeechTTSProvider,
    VoiceProviderFactory,
    VoiceEventsService,
    VoiceSessionService,
  ],
  exports: [
    VoiceSessionService,
    VoiceEventsService,
    VoiceProviderFactory,
    GroqWhisperSTTProvider,
    BrowserSpeechTTSProvider,
  ],
})
export class VoiceModule {}
