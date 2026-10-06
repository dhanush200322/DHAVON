import { Injectable, Logger } from '@nestjs/common';
import { MemoryService } from './memory.service';
import { PreferenceService } from './preference.service';
import { MemorySearchResult, UserPreference } from '@dhavon/types';

export interface RetrievalResult {
  formattedContext: string;
  retrievedCount: number;
  preferencesCount: number;
  memories: MemorySearchResult[];
  preferences: UserPreference[];
}

@Injectable()
export class MemoryRetrievalService {
  private readonly logger = new Logger(MemoryRetrievalService.name);

  // Maximum characters allocated to retrieved memory in system prompt
  private readonly memoryBudgetChars = 2500;

  constructor(
    private readonly memoryService: MemoryService,
    private readonly preferenceService: PreferenceService,
  ) {}

  /**
   * Retrieve, rank, and budget memories and preferences for a prompt.
   */
  async retrieveBoundedContext(
    userId: string,
    query: string,
  ): Promise<RetrievalResult> {
    // 1. Retrieve top semantic memory matches
    const memoryMatches = await this.memoryService.searchRelevant(
      userId,
      query,
      6,
    );

    // 2. Retrieve user preferences
    const preferences = await this.preferenceService.getPreferences(userId);

    // 3. Assemble bounded memory context
    const memoryLines: string[] = [];
    let currentLength = 0;

    for (const mem of memoryMatches) {
      const line = `• [${String(mem.type).toUpperCase()}] ${mem.content} (importance: ${mem.importance.toFixed(2)})`;
      if (currentLength + line.length > this.memoryBudgetChars) {
        break;
      }
      memoryLines.push(line);
      currentLength += line.length;
    }

    // 4. Assemble preferences context
    const prefLines: string[] = [];
    for (const pref of preferences.slice(0, 8)) {
      const valStr =
        typeof pref.preferenceValue === 'string'
          ? pref.preferenceValue
          : JSON.stringify(pref.preferenceValue);
      prefLines.push(`• ${pref.category}.${pref.preferenceKey}: ${valStr}`);
    }

    const sections: string[] = [];
    if (prefLines.length > 0) {
      sections.push(`USER PREFERENCES:\n${prefLines.join('\n')}`);
    }
    if (memoryLines.length > 0) {
      sections.push(`RELEVANT RECALLED MEMORIES:\n${memoryLines.join('\n')}`);
    }

    return {
      formattedContext: sections.join('\n\n'),
      retrievedCount: memoryLines.length,
      preferencesCount: prefLines.length,
      memories: memoryMatches,
      preferences,
    };
  }
}
