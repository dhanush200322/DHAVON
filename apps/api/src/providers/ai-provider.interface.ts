export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIOptions {
  temperature?: number;
  maxTokens?: number;
  systemInstruction?: string;
}

export interface AIResponse {
  content: string;
  provider: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AIProviderHealth {
  ok: boolean;
  provider: string;
  model: string;
  error?: string;
}

export interface AIProvider {
  readonly name: string;
  readonly defaultModel: string;
  generate(messages: AIMessage[], options?: AIOptions): Promise<AIResponse>;
  stream(messages: AIMessage[], options?: AIOptions): AsyncIterable<string>;
  healthCheck(): Promise<AIProviderHealth>;
}
