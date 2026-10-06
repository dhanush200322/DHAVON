export type MemoryType =
  | 'working'
  | 'episodic'
  | 'semantic'
  | 'preference'
  | 'project'
  | 'goal'
  | 'fact'
  | 'WORKING'
  | 'EPISODIC'
  | 'SEMANTIC'
  | 'PREFERENCE'
  | 'PROJECT'
  | 'GOAL'
  | 'FACT';

export type MemoryClassification = 'TEMPORARY' | 'USEFUL' | 'IMPORTANT' | 'LONG_TERM';

export interface Memory {
  id: string;
  userId: string;
  type: MemoryType;
  memoryType?: MemoryType; // backwards compatibility
  content: string;
  importance: number; // 0.0 to 1.0
  importanceScore?: number; // backwards compatibility
  source: string;
  confidence: number; // 0.0 to 1.0
  metadata: Record<string, unknown>;
  embedding?: number[];
  expiresAt?: string;
  lastAccessedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MemorySearchResult {
  id: string;
  content: string;
  type: MemoryType;
  memoryType?: MemoryType;
  importance: number;
  importanceScore?: number;
  similarity: number;
  confidence?: number;
  lastAccessedAt?: string;
}
