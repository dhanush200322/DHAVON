import { Memory, MemorySearchResult, MemoryType } from '@dhavon/types';

export interface StoreMemoryInput {
  userId: string;
  memoryType: MemoryType;
  content: string;
  importanceScore?: number;
  metadata?: Record<string, unknown>;
}

export interface MemoryContextSynthesis {
  workingMemory: string[];
  episodicMemories: Memory[];
  semanticMemories: MemorySearchResult[];
  synthesizedPromptContext: string;
}

export interface IMemoryEngine {
  storeMemory(input: StoreMemoryInput): Promise<Memory>;
  retrieveContext(userId: string, query: string, limit?: number): Promise<MemoryContextSynthesis>;
  searchSemantic(userId: string, query: string, threshold?: number, count?: number): Promise<MemorySearchResult[]>;
  clearWorkingMemory(userId: string, conversationId: string): Promise<void>;
}
