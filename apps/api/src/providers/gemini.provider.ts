import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  AIProvider,
  AIMessage,
  AIOptions,
  AIResponse,
  AIProviderHealth,
} from './ai-provider.interface';

@Injectable()
export class GeminiProvider implements AIProvider {
  readonly name = 'gemini';
  readonly defaultModel: string;
  private readonly logger = new Logger(GeminiProvider.name);
  private client: GoogleGenerativeAI | null = null;
  private hasKey = false;

  constructor(private readonly configService: ConfigService) {
    const key =
      this.configService.get<string>('GEMINI_API_KEY') ||
      this.configService.get<string>('AI_API_KEY');

    this.defaultModel =
      this.configService.get<string>('AI_MODEL') || 'gemini-2.5-flash';

    if (key && key.trim().length > 0) {
      this.client = new GoogleGenerativeAI(key);
      this.hasKey = true;
      this.logger.log(`GeminiProvider initialized with model: ${this.defaultModel}`);
    } else {
      this.logger.warn(
        'GeminiProvider missing API key (GEMINI_API_KEY or AI_API_KEY not configured)',
      );
    }
  }

  private ensureClient(): GoogleGenerativeAI {
    if (!this.client || !this.hasKey) {
      throw new Error(
        'Gemini AI Provider is not configured. Please supply a valid GEMINI_API_KEY in server environment.',
      );
    }
    return this.client;
  }

  async generate(messages: AIMessage[], options?: AIOptions): Promise<AIResponse> {
    const client = this.ensureClient();
    const model = client.getGenerativeModel({
      model: this.defaultModel,
      systemInstruction: options?.systemInstruction,
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens,
      },
    });

    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const result = await model.generateContent({ contents });
    const response = await result.response;
    const text = response.text();

    return {
      content: text,
      provider: this.name,
      model: this.defaultModel,
      usage: response.usageMetadata
        ? {
            promptTokens: response.usageMetadata.promptTokenCount || 0,
            completionTokens: response.usageMetadata.candidatesTokenCount || 0,
            totalTokens: response.usageMetadata.totalTokenCount || 0,
          }
        : undefined,
    };
  }

  async *stream(messages: AIMessage[], options?: AIOptions): AsyncIterable<string> {
    const client = this.ensureClient();
    const model = client.getGenerativeModel({
      model: this.defaultModel,
      systemInstruction: options?.systemInstruction,
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens,
      },
    });

    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const streamResult = await model.generateContentStream({ contents });

    for await (const chunk of streamResult.stream) {
      const text = chunk.text();
      if (text) {
        yield text;
      }
    }
  }

  async healthCheck(): Promise<AIProviderHealth> {
    if (!this.hasKey) {
      return {
        ok: false,
        provider: this.name,
        model: this.defaultModel,
        error: 'API key not configured in environment',
      };
    }
    return {
      ok: true,
      provider: this.name,
      model: this.defaultModel,
    };
  }
}
