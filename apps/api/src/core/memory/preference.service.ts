import { Injectable, Logger } from '@nestjs/common';
import { UserPreference, PreferenceCategory } from '@dhavon/types';
import { SupabaseService } from '../../database/supabase.service';
import { v4 as uuidv4 } from 'uuid';

const SYSTEM_USER_UUID = '00000000-0000-0000-0000-000000000001';

import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class SetPreferenceDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  userId?: string;

  @IsString()
  @IsNotEmpty()
  category!: PreferenceCategory;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  preferenceKey!: string;

  @IsNotEmpty()
  preferenceValue!: unknown;

  @IsOptional()
  confidence?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  source?: string;
}

@Injectable()
export class PreferenceService {
  private readonly logger = new Logger(PreferenceService.name);
  private localPreferences: UserPreference[] = [];

  constructor(private readonly supabase: SupabaseService) {}

  private normalizeUserId(userId?: string): string {
    if (!userId || userId === 'system-user') return SYSTEM_USER_UUID;
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(userId) ? userId : SYSTEM_USER_UUID;
  }

  async setPreference(dto: SetPreferenceDto): Promise<UserPreference> {
    const userId = this.normalizeUserId(dto.userId);
    const now = new Date().toISOString();

    // Check for existing preference
    const existing = await this.getPreference(userId, dto.category, dto.preferenceKey);

    let conflictDetected = false;
    let previousValue: unknown = undefined;

    if (existing) {
      const existingValStr = JSON.stringify(existing.preferenceValue);
      const newValStr = JSON.stringify(dto.preferenceValue);
      if (existingValStr !== newValStr) {
        conflictDetected = true;
        previousValue = existing.preferenceValue;
        this.logger.warn(
          `Preference change detected for [${dto.category}:${dto.preferenceKey}]: "${existingValStr}" -> "${newValStr}". Updating intentionally.`,
        );
      }
    }

    const pref: UserPreference = {
      id: existing ? existing.id : uuidv4(),
      userId,
      category: dto.category,
      preferenceKey: dto.preferenceKey,
      preferenceValue: dto.preferenceValue,
      confidence: dto.confidence ?? 1.0,
      conflictDetected,
      previousValue,
      source: dto.source || 'explicit',
      lastUpdatedAt: now,
      createdAt: existing ? existing.createdAt : now,
    };

    // Update local cache
    const idx = this.localPreferences.findIndex(
      (p) =>
        p.userId === userId &&
        p.category === dto.category &&
        p.preferenceKey === dto.preferenceKey,
    );
    if (idx >= 0) {
      this.localPreferences[idx] = pref;
    } else {
      this.localPreferences.push(pref);
    }

    // Persist to Supabase
    const client = this.supabase.getClient();
    if (client) {
      try {
        await client.from('user_preferences').upsert(
          {
            id: pref.id,
            user_id: pref.userId,
            category: pref.category,
            preference_key: pref.preferenceKey,
            preference_value: pref.preferenceValue,
            confidence: pref.confidence,
            conflict_detected: pref.conflictDetected,
            previous_value: pref.previousValue,
            source: pref.source,
            last_updated_at: pref.lastUpdatedAt,
            created_at: pref.createdAt,
          },
          { onConflict: 'user_id,category,preference_key' },
        );
      } catch (err: unknown) {
        this.logger.debug(`Supabase user_preferences upsert fallback: ${err}`);
      }
    }

    return pref;
  }

  async getPreferences(
    userId = SYSTEM_USER_UUID,
    category?: PreferenceCategory,
  ): Promise<UserPreference[]> {
    const normUser = this.normalizeUserId(userId);
    const client = this.supabase.getClient();

    if (client) {
      try {
        let query = client
          .from('user_preferences')
          .select('*')
          .eq('user_id', normUser);

        if (category) {
          query = query.eq('category', category);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return data.map((row) => ({
            id: row.id,
            userId: row.user_id,
            category: row.category,
            preferenceKey: row.preference_key,
            preferenceValue: row.preference_value,
            confidence: row.confidence,
            conflictDetected: row.conflict_detected,
            previousValue: row.previous_value,
            source: row.source,
            lastUpdatedAt: row.last_updated_at,
            createdAt: row.created_at,
          }));
        }
      } catch (err: unknown) {
        this.logger.debug(`Supabase user_preferences retrieval fallback: ${err}`);
      }
    }

    return this.localPreferences.filter(
      (p) => p.userId === normUser && (!category || p.category === category),
    );
  }

  async getPreference(
    userId = SYSTEM_USER_UUID,
    category: PreferenceCategory,
    key: string,
  ): Promise<UserPreference | null> {
    const list = await this.getPreferences(userId, category);
    return list.find((p) => p.preferenceKey === key) || null;
  }
}
