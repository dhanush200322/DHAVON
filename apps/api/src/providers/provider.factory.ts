import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIProvider, AIProviderHealth } from './ai-provider.interface';
import { GeminiProvider } from './gemini.provider';
import { GroqProvider } from './groq.provider';

@Injectable()
export class AIProviderFactory {
  private readonly logger = new Logger(AIProviderFactory.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly geminiProvider: GeminiProvider,
    private readonly groqProvider: GroqProvider,
  ) {}

  getActiveProviderName(): string {
    return (
      this.configService.get<string>('AI_PROVIDER') || 'gemini'
    ).toLowerCase();
  }

  getActiveProvider(): AIProvider {
    const providerName = this.getActiveProviderName();

    if (providerName === 'groq') {
      return this.groqProvider;
    }

    if (providerName === 'gemini') {
      return this.geminiProvider;
    }

    this.logger.warn(
      `Unknown AI_PROVIDER "${providerName}". Falling back to GeminiProvider.`,
    );
    return this.geminiProvider;
  }

  getProvider(name: string): AIProvider {
    if (name.toLowerCase() === 'groq') {
      return this.groqProvider;
    }
    return this.geminiProvider;
  }

  async healthCheckAll(): Promise<Record<string, AIProviderHealth>> {
    const [geminiHealth, groqHealth] = await Promise.all([
      this.geminiProvider.healthCheck(),
      this.groqProvider.healthCheck(),
    ]);

    return {
      gemini: geminiHealth,
      groq: groqHealth,
    };
  }
}
