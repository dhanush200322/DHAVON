import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GeminiProvider } from './gemini.provider';
import { GroqProvider } from './groq.provider';
import { AIProviderFactory } from './provider.factory';
import { AI_PROVIDER_TOKEN } from './provider.tokens';

@Module({
  imports: [ConfigModule],
  providers: [
    GeminiProvider,
    GroqProvider,
    AIProviderFactory,
    {
      provide: AI_PROVIDER_TOKEN,
      useFactory: (factory: AIProviderFactory) => factory.getActiveProvider(),
      inject: [AIProviderFactory],
    },
  ],
  exports: [
    GeminiProvider,
    GroqProvider,
    AIProviderFactory,
    AI_PROVIDER_TOKEN,
  ],
})
export class ProvidersModule {}
