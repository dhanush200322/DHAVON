import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import {
  AIProvider,
  AIMessage,
  AIOptions,
  AIResponse,
  AIProviderHealth,
} from './ai-provider.interface';

@Injectable()
export class GroqProvider implements AIProvider {
  readonly name = 'groq';
  readonly defaultModel: string;
  private readonly logger = new Logger(GroqProvider.name);
  private client: Groq | null = null;
  private hasKey = false;

  constructor(private readonly configService: ConfigService) {
    const key =
      this.configService.get<string>('GROQ_API_KEY') ||
      this.configService.get<string>('AI_API_KEY');

    this.defaultModel =
      this.configService.get<string>('GROQ_MODEL') ||
      'openai/gpt-oss-120b';

    if (key && key.trim().length > 0) {
      this.client = new Groq({ apiKey: key });
      this.hasKey = true;
      this.logger.log(`GroqProvider initialized with model: ${this.defaultModel}`);
    } else {
      this.logger.warn(
        'GroqProvider missing API key (GROQ_API_KEY not configured)',
      );
    }
  }

  private ensureClient(): Groq {
    if (!this.client || !this.hasKey) {
      throw new Error(
        'Groq AI Provider is not configured. Please supply a valid GROQ_API_KEY in server environment.',
      );
    }
    return this.client;
  }

  async generate(messages: AIMessage[], options?: AIOptions): Promise<AIResponse> {
    const client = this.ensureClient();

    const groqMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];

    if (options?.systemInstruction) {
      groqMessages.push({ role: 'system', content: options.systemInstruction });
    }

    for (const msg of messages) {
      groqMessages.push({
        role: msg.role === 'system' ? 'system' : msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      });
    }

    const completion = await client.chat.completions.create({
      model: this.defaultModel,
      messages: groqMessages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens,
    });

    const choice = completion.choices[0];
    const text = choice?.message?.content || '';

    return {
      content: text,
      provider: this.name,
      model: this.defaultModel,
      usage: completion.usage
        ? {
            promptTokens: completion.usage.prompt_tokens,
            completionTokens: completion.usage.completion_tokens,
            totalTokens: completion.usage.total_tokens,
          }
        : undefined,
    };
  }

  async *stream(messages: AIMessage[], options?: AIOptions): AsyncIterable<string> {
    const client = this.ensureClient();

    const groqMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];

    if (options?.systemInstruction) {
      groqMessages.push({ role: 'system', content: options.systemInstruction });
    }

    for (const msg of messages) {
      groqMessages.push({
        role: msg.role === 'system' ? 'system' : msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      });
    }

    const stream = await client.chat.completions.create({
      model: this.defaultModel,
      messages: groqMessages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        yield delta;
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
