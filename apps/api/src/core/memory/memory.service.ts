import { Injectable, Logger } from '@nestjs/common';
import {
  Memory,
  MemoryType,
  MemoryClassification,
  MemorySearchResult,
} from '@dhavon/types';
import { SupabaseService } from '../../database/supabase.service';
import { MemoryEmbeddingService } from './memory-embedding.service';
import { OrchestrationEventsService } from '../events/orchestration-events.service';
import { scrubSecrets } from './secret-scrubber.util';
import { v4 as uuidv4 } from 'uuid';

export const SYSTEM_USER_UUID = '00000000-0000-0000-0000-000000000001';

import { IsString, IsNotEmpty, IsOptional, MaxLength, IsObject } from 'class-validator';

export class CreateMemoryDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  userId?: string;

  @IsOptional()
  type?: MemoryType;

  @IsOptional()
  memoryType?: MemoryType; // backwards compatibility

  @IsString()
  @IsNotEmpty()
  @MaxLength(8192)
  content!: string;

  @IsOptional()
  importance?: number;

  @IsOptional()
  importanceScore?: number; // backwards compatibility

  @IsOptional()
  @IsString()
  @MaxLength(64)
  source?: string;

  @IsOptional()
  confidence?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  expiresAt?: string;
}

@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);
  private localMemories: Memory[] = [];

  constructor(
    private readonly supabase: SupabaseService,
    private readonly embeddingService: MemoryEmbeddingService,
    private readonly eventsService: OrchestrationEventsService,
  ) {}

  public normalizeUserId(userId?: string): string {
    if (!userId || userId === 'system-user') return SYSTEM_USER_UUID;
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(userId) ? userId : SYSTEM_USER_UUID;
  }

  /**
   * Classify conversational information to determine whether it deserves persistence.
   */
  classifyInformation(content: string): {
    classification: MemoryClassification;
    deservesPersistence: boolean;
    suggestedType: MemoryType;
    importance: number;
  } {
    const lower = content.toLowerCase();

    // 1. Ephemeral / Temporary queries
    if (
      lower.startsWith('what time') ||
      lower.startsWith('hello') ||
      lower.startsWith('hi ') ||
      lower === 'hi' ||
      lower === 'hey' ||
      lower.startsWith('ping') ||
      lower.startsWith('test')
    ) {
      return {
        classification: 'TEMPORARY',
        deservesPersistence: false,
        suggestedType: 'working',
        importance: 0.1,
      };
    }

    // 2. Project memories
    if (
      lower.includes('project is') ||
      lower.includes('building') ||
      lower.includes('developing') ||
      lower.includes('working on') ||
      lower.includes('repository') ||
      lower.includes('dhavon')
    ) {
      return {
        classification: 'IMPORTANT',
        deservesPersistence: true,
        suggestedType: 'project',
        importance: 0.85,
      };
    }

    // 3. Preferences
    if (
      lower.includes('preferred') ||
      lower.includes('prefer') ||
      lower.includes('i like') ||
      lower.includes('always use') ||
      lower.includes('my stack')
    ) {
      return {
        classification: 'LONG_TERM',
        deservesPersistence: true,
        suggestedType: 'preference',
        importance: 0.9,
      };
    }

    // 4. Goals
    if (
      lower.includes('goal is') ||
      lower.includes('want to build') ||
      lower.includes('objective') ||
      lower.includes('aim to')
    ) {
      return {
        classification: 'LONG_TERM',
        deservesPersistence: true,
        suggestedType: 'goal',
        importance: 0.95,
      };
    }

    // 5. Explicit Facts / Remember requests
    if (
      lower.includes('remember that') ||
      lower.includes('remember:') ||
      lower.includes('fact:') ||
      lower.includes('note that')
    ) {
      return {
        classification: 'USEFUL',
        deservesPersistence: true,
        suggestedType: 'fact',
        importance: 0.75,
      };
    }

    return {
      classification: 'USEFUL',
      deservesPersistence: true,
      suggestedType: 'semantic',
      importance: 0.5,
    };
  }

  /**
   * Persist a new memory with automatic secret scrubbing and embedding.
   */
  async storeMemory(dto: CreateMemoryDto): Promise<Memory> {
    const userId = this.normalizeUserId(dto.userId);
    const sanitizedContent = scrubSecrets(dto.content);

    const classificationInfo = this.classifyInformation(sanitizedContent);
    const resolvedType = (dto.type ||
      dto.memoryType ||
      classificationInfo.suggestedType) as MemoryType;
    const resolvedImportance =
      dto.importance ??
      dto.importanceScore ??
      classificationInfo.importance;

    const now = new Date().toISOString();

    // Generate vector embedding
    const embedding = await this.embeddingService.generateEmbedding(sanitizedContent);

    // Contradiction detection: check for conflicting memories
    const contradictionMetadata = await this.detectContradiction(
      userId,
      resolvedType,
      sanitizedContent,
    );

    const memory: Memory = {
      id: uuidv4(),
      userId,
      type: resolvedType,
      memoryType: resolvedType,
      content: sanitizedContent,
      importance: resolvedImportance,
      importanceScore: resolvedImportance,
      source: dto.source || 'conversation',
      confidence: dto.confidence ?? 1.0,
      metadata: {
        ...(dto.metadata || {}),
        ...contradictionMetadata,
        classification: classificationInfo.classification,
      },
      embedding,
      expiresAt: dto.expiresAt,
      lastAccessedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    this.localMemories.push(memory);
    this.logger.log(
      `Stored ${memory.type} memory (${memory.id}): "${memory.content.slice(0, 45)}..." [importance: ${memory.importance}]`,
    );

    // Supabase persistence
    const client = this.supabase.getClient();
    if (client) {
      try {
        await client.from('memories').insert({
          id: memory.id,
          user_id: memory.userId,
          type: String(memory.type).toUpperCase(),
          memory_type: String(memory.type).toLowerCase(),
          content: memory.content,
          importance_score: memory.importance,
          source: memory.source,
          confidence: memory.confidence,
          metadata: memory.metadata,
          embedding: memory.embedding,
          expires_at: memory.expiresAt,
          last_accessed_at: memory.lastAccessedAt,
          created_at: memory.createdAt,
          updated_at: memory.updatedAt,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.debug(`Supabase memory insert deferred: ${msg}`);
      }
    }

    // Emit event
    this.eventsService.emitMemoryCreated({
      id: memory.id,
      type: memory.type,
      content: memory.content,
      importance: memory.importance,
      userId: memory.userId,
    });

    return memory;
  }

  /**
   * Check for potential contradictions with existing memories of same type.
   */
  private async detectContradiction(
    userId: string,
    type: MemoryType,
    content: string,
  ): Promise<Record<string, unknown>> {
    if (!['preference', 'PREFERENCE', 'fact', 'FACT', 'project', 'PROJECT'].includes(type)) {
      return {};
    }

    const existing = await this.getRecentMemories(userId, type, 15);
    const contentLower = content.toLowerCase();

    for (const mem of existing) {
      const existingLower = mem.content.toLowerCase();
      // Subject overlap check
      const words = contentLower.split(/\s+/).filter((w) => w.length > 4);
      const matchWordCount = words.filter((w) => existingLower.includes(w)).length;

      if (words.length > 0 && matchWordCount / words.length > 0.4 && mem.content !== content) {
        this.logger.warn(
          `Detected potential memory contradiction with prior memory [${mem.id}]: "${mem.content.slice(0, 30)}..." -> "${content.slice(0, 30)}..."`,
        );
        return {
          contradictionDetected: true,
          supersededMemoryId: mem.id,
          previousContent: mem.content,
        };
      }
    }

    return {};
  }

  /**
   * Retrieve recent memories with Supabase query & local fallback.
   */
  async getRecentMemories(
    userId = SYSTEM_USER_UUID,
    type?: MemoryType,
    limit = 20,
  ): Promise<Memory[]> {
    const normUser = this.normalizeUserId(userId);
    const client = this.supabase.getClient();

    if (client) {
      try {
        let query = client
          .from('memories')
          .select('*')
          .eq('user_id', normUser)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (type) {
          query = query.or(
            `type.eq.${type.toUpperCase()},memory_type.eq.${type.toLowerCase()}`,
          );
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return data.map((row) => ({
            id: row.id,
            userId: row.user_id,
            type: (row.type || row.memory_type) as MemoryType,
            memoryType: (row.memory_type || row.type) as MemoryType,
            content: row.content,
            importance: row.importance_score ?? 0.5,
            importanceScore: row.importance_score ?? 0.5,
            source: row.source || 'conversation',
            confidence: row.confidence ?? 1.0,
            metadata: row.metadata || {},
            embedding: row.embedding,
            expiresAt: row.expires_at,
            lastAccessedAt: row.last_accessed_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          }));
        }
      } catch (err: unknown) {
        this.logger.debug(`Supabase memories fetch fallback: ${err}`);
      }
    }

    return this.localMemories
      .filter(
        (m) =>
          m.userId === normUser &&
          (!type ||
            m.type.toLowerCase() === type.toLowerCase() ||
            m.memoryType?.toLowerCase() === type.toLowerCase()),
      )
      .slice(-limit)
      .reverse();
  }

  /**
   * Semantic search using vector cosine similarity, importance weighting, and recency decay.
   */
  async searchRelevant(
    userId = SYSTEM_USER_UUID,
    query: string,
    limit = 5,
    typeFilter?: MemoryType,
  ): Promise<MemorySearchResult[]> {
    const normUser = this.normalizeUserId(userId);
    const queryEmbedding = await this.embeddingService.generateEmbedding(query);
    const client = this.supabase.getClient();

    // 1. Try Supabase pgvector RPC
    if (client) {
      try {
        const { data, error } = await client.rpc('match_memories', {
          query_embedding: queryEmbedding,
          match_threshold: 0.1,
          match_count: limit * 2,
          filter_user_id: normUser,
        });

        if (!error && data && data.length > 0) {
          const now = Date.now();
          return data
            .map((item: { id: string; content: string; memory_type: string; importance_score: number; similarity: number }) => {
              const importance = item.importance_score ?? 0.5;
              const combinedScore = item.similarity * 0.6 + importance * 0.4;
              return {
                id: item.id,
                content: item.content,
                type: item.memory_type as MemoryType,
                memoryType: item.memory_type as MemoryType,
                importance,
                importanceScore: importance,
                similarity: combinedScore,
              };
            })
            .sort((a: MemorySearchResult, b: MemorySearchResult) => b.similarity - a.similarity)
            .slice(0, limit);
        }
      } catch (err: unknown) {
        this.logger.debug(`pgvector match_memories RPC fallback: ${err}`);
      }
    }

    // 2. Local semantic vector calculation + decay
    const candidates = await this.getRecentMemories(normUser, typeFilter, 50);
    const now = Date.now();

    const scored = candidates.map((m) => {
      let cosine = 0;
      if (m.embedding && m.embedding.length > 0) {
        cosine = this.embeddingService.calculateCosineSimilarity(
          queryEmbedding,
          m.embedding,
        );
      } else {
        // Fallback keyword matching
        const words = query.toLowerCase().split(/\s+/).filter(Boolean);
        const lower = m.content.toLowerCase();
        let matches = 0;
        for (const w of words) {
          if (lower.includes(w)) matches++;
        }
        cosine = words.length > 0 ? matches / words.length : 0;
      }

      // Recency decay (half-life of ~7 days)
      const hoursElapsed =
        Math.max(0, now - new Date(m.createdAt).getTime()) / (1000 * 60 * 60);
      const recencyFactor = Math.exp(-hoursElapsed / 168);

      // High-importance memories resist decay
      const importanceWeight = m.importance;
      const combinedScore =
        cosine * 0.45 +
        importanceWeight * 0.35 +
        recencyFactor * 0.1 +
        (m.confidence || 1.0) * 0.1;

      return {
        id: m.id,
        content: m.content,
        type: m.type,
        memoryType: m.type,
        importance: m.importance,
        importanceScore: m.importance,
        similarity: combinedScore,
        confidence: m.confidence,
        lastAccessedAt: m.lastAccessedAt,
      };
    });

    return scored
      .filter((s) => s.similarity > 0.15)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  async deleteMemory(id: string, userId = SYSTEM_USER_UUID): Promise<boolean> {
    const normUser = this.normalizeUserId(userId);
    const existing = this.localMemories.find((m) => m.id === id);
    if (existing && existing.userId !== normUser && normUser !== SYSTEM_USER_UUID) {
      this.logger.warn(
        `Security Alert: User ${normUser} attempted to delete memory ${id} belonging to ${existing.userId}`,
      );
      return false;
    }

    this.localMemories = this.localMemories.filter((m) => m.id !== id);

    const client = this.supabase.getClient();
    if (client) {
      try {
        await client.from('memories').delete().eq('id', id).eq('user_id', normUser);
      } catch (err: unknown) {
        this.logger.debug(`Supabase memory deletion fallback: ${err}`);
      }
    }
    return true;
  }
}
