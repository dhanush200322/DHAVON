import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { MemoryService } from './memory.service';
import { MemoryEmbeddingService } from './memory-embedding.service';
import { SupabaseService } from '../../database/supabase.service';
import { OrchestrationEventsService } from '../events/orchestration-events.service';

describe('MemoryService', () => {
  let service: MemoryService;

  beforeEach(async () => {
    const mockSupabaseService = {
      getClient: jest.fn().mockReturnValue(null),
      configured: false,
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [
        MemoryService,
        MemoryEmbeddingService,
        OrchestrationEventsService,
        { provide: SupabaseService, useValue: mockSupabaseService },
      ],
    }).compile();

    service = module.get<MemoryService>(MemoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Classification & Persistence Decision', () => {
    it('should classify project statement as IMPORTANT and deserving persistence', () => {
      const result = service.classifyInformation('My current main project is DHAVON');
      expect(result.deservesPersistence).toBe(true);
      expect(result.suggestedType).toBe('project');
      expect(result.classification).toBe('IMPORTANT');
      expect(result.importance).toBeGreaterThanOrEqual(0.8);
    });

    it('should classify preferences as LONG_TERM and deserving persistence', () => {
      const result = service.classifyInformation('I prefer Next.js and NestJS');
      expect(result.deservesPersistence).toBe(true);
      expect(result.suggestedType).toBe('preference');
      expect(result.classification).toBe('LONG_TERM');
    });

    it('should classify ephemeral greetings as TEMPORARY and not deserving persistence', () => {
      const result = service.classifyInformation('hello there');
      expect(result.deservesPersistence).toBe(false);
      expect(result.classification).toBe('TEMPORARY');
    });
  });

  describe('Secret Scrubbing in Memory', () => {
    it('should scrub API keys before storing memory', async () => {
      const dirtyContent = 'Use API key AIzaSyD98765432101234567890123456789012 to connect';
      const memory = await service.storeMemory({
        content: dirtyContent,
        type: 'semantic',
      });

      expect(memory.content).not.toContain('AIzaSyD98765432101234567890123456789012');
      expect(memory.content).toContain('[REDACTED_SECRET]');
    });

    it('should scrub bearer tokens and passwords', async () => {
      const dirtyContent = 'Authorization: Bearer secret_jwt_token_1234567890';
      const memory = await service.storeMemory({
        content: dirtyContent,
        type: 'fact',
      });

      expect(memory.content).not.toContain('secret_jwt_token_1234567890');
      expect(memory.content).toContain('[REDACTED_SECRET]');
    });
  });

  describe('Memory Storage & Semantic Retrieval', () => {
    it('should store and retrieve memories by relevance and decay', async () => {
      await service.storeMemory({
        type: 'project',
        content: 'DHAVON is an autonomous personal intelligence operating system',
        importance: 0.9,
      });

      await service.storeMemory({
        type: 'preference',
        content: 'I prefer TypeScript and Tailwind CSS for frontend work',
        importance: 0.8,
      });

      const results = await service.searchRelevant(
        '00000000-0000-0000-0000-000000000001',
        'Tell me about DHAVON operating system',
        2,
      );

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].content).toContain('DHAVON');
      expect(results[0].similarity).toBeGreaterThan(0);
    });

    it('should detect memory contradictions and mark metadata', async () => {
      const initial = await service.storeMemory({
        type: 'preference',
        content: 'My primary programming language is Python',
        importance: 0.8,
      });
      expect(initial.id).toBeDefined();

      const updated = await service.storeMemory({
        type: 'preference',
        content: 'My primary programming language is TypeScript',
        importance: 0.9,
      });

      expect(updated.metadata).toBeDefined();
    });
  });
});
