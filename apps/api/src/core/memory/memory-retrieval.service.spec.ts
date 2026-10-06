import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { MemoryRetrievalService } from './memory-retrieval.service';
import { MemoryService } from './memory.service';
import { PreferenceService } from './preference.service';
import { MemoryEmbeddingService } from './memory-embedding.service';
import { SupabaseService } from '../../database/supabase.service';
import { OrchestrationEventsService } from '../events/orchestration-events.service';

describe('MemoryRetrievalService', () => {
  let service: MemoryRetrievalService;
  let memoryService: MemoryService;
  let preferenceService: PreferenceService;

  beforeEach(async () => {
    const mockSupabaseService = {
      getClient: jest.fn().mockReturnValue(null),
      configured: false,
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [
        MemoryRetrievalService,
        MemoryService,
        PreferenceService,
        MemoryEmbeddingService,
        OrchestrationEventsService,
        { provide: SupabaseService, useValue: mockSupabaseService },
      ],
    }).compile();

    service = module.get<MemoryRetrievalService>(MemoryRetrievalService);
    memoryService = module.get<MemoryService>(MemoryService);
    preferenceService = module.get<PreferenceService>(PreferenceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should assemble bounded context with preferences and recalled memories', async () => {
    await memoryService.storeMemory({
      type: 'project',
      content: 'DHAVON Phase 5 includes autonomous supervised orchestration',
      importance: 0.9,
    });

    await preferenceService.setPreference({
      category: 'technologies',
      preferenceKey: 'primary_framework',
      preferenceValue: 'Next.js',
    });

    const result = await service.retrieveBoundedContext(
      '00000000-0000-0000-0000-000000000001',
      'What are we building in Phase 5?',
    );

    expect(result).toBeDefined();
    expect(result.preferencesCount).toBeGreaterThanOrEqual(1);
    expect(result.formattedContext).toContain('USER PREFERENCES');
    expect(result.formattedContext).toContain('primary_framework: Next.js');
  });
});
