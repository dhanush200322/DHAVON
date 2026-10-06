import { Module, Global } from '@nestjs/common';
import { MemoryService } from './memory.service';
import { MemoryEmbeddingService } from './memory-embedding.service';
import { PreferenceService } from './preference.service';
import { MemoryRetrievalService } from './memory-retrieval.service';
import { MemoryController } from './memory.controller';

@Global()
@Module({
  controllers: [MemoryController],
  providers: [
    MemoryService,
    MemoryEmbeddingService,
    PreferenceService,
    MemoryRetrievalService,
  ],
  exports: [
    MemoryService,
    MemoryEmbeddingService,
    PreferenceService,
    MemoryRetrievalService,
  ],
})
export class MemoryModule {}
