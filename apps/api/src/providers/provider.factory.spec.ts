import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AIProviderFactory } from './provider.factory';
import { GeminiProvider } from './gemini.provider';
import { GroqProvider } from './groq.provider';

describe('AIProviderFactory', () => {
  let factory: AIProviderFactory;
  let mockConfigService: Partial<ConfigService>;
  let mockGeminiProvider: Partial<GeminiProvider>;
  let mockGroqProvider: Partial<GroqProvider>;

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'AI_PROVIDER') return 'gemini';
        return undefined;
      }),
    };

    mockGeminiProvider = {
      name: 'gemini',
      defaultModel: 'gemini-1.5-pro',
      healthCheck: jest.fn().mockResolvedValue({ ok: true, provider: 'gemini', model: 'gemini-1.5-pro' }),
    };

    mockGroqProvider = {
      name: 'groq',
      defaultModel: 'llama-3.3-70b-versatile',
      healthCheck: jest.fn().mockResolvedValue({ ok: true, provider: 'groq', model: 'llama-3.3-70b-versatile' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIProviderFactory,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: GeminiProvider, useValue: mockGeminiProvider },
        { provide: GroqProvider, useValue: mockGroqProvider },
      ],
    }).compile();

    factory = module.get<AIProviderFactory>(AIProviderFactory);
  });

  it('should return Gemini as default active provider', () => {
    const provider = factory.getActiveProvider();
    expect(provider.name).toBe('gemini');
  });

  it('should return Groq when configured', () => {
    (mockConfigService.get as jest.Mock).mockReturnValue('groq');
    const provider = factory.getActiveProvider();
    expect(provider.name).toBe('groq');
  });

  it('should fall back to Gemini for unknown provider', () => {
    (mockConfigService.get as jest.Mock).mockReturnValue('unknown-provider');
    const provider = factory.getActiveProvider();
    expect(provider.name).toBe('gemini');
  });
});
