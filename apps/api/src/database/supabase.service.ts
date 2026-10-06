import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface DatabaseHealth {
  ok: boolean;
  connected: boolean;
  latencyMs?: number;
  error?: string;
}

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private client: SupabaseClient | null = null;
  private isConfigured = false;

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const serviceRoleKey =
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') ||
      this.configService.get<string>('SUPABASE_ANON_KEY');

    if (supabaseUrl && serviceRoleKey && supabaseUrl.trim().length > 0) {
      try {
        // In Node 20, Supabase requires WebSocket transport
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const wsTransport = require('ws');

        this.client = createClient(supabaseUrl, serviceRoleKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
          realtime: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            transport: wsTransport as any,
          },
        });
        this.isConfigured = true;
        this.logger.log('Supabase client initialized successfully.');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed to initialize Supabase client: ${message}`);
      }
    } else {
      this.logger.warn(
        'Supabase configuration incomplete. SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not supplied.',
      );
    }
  }

  getClient(): SupabaseClient | null {
    return this.client;
  }

  get configured(): boolean {
    return this.isConfigured;
  }

  async healthCheck(): Promise<DatabaseHealth> {
    if (!this.client || !this.isConfigured) {
      return {
        ok: false,
        connected: false,
        error: 'Supabase client not configured in environment',
      };
    }

    const start = Date.now();
    try {
      // Test lightweight connectivity
      const { error } = await this.client
        .from('system_settings')
        .select('key')
        .limit(1);

      const latencyMs = Date.now() - start;

      if (error && error.code !== 'PGRST116') {
        return {
          ok: true,
          connected: true,
          latencyMs,
          error: `Reached Supabase: ${error.message} (code: ${error.code})`,
        };
      }

      return {
        ok: true,
        connected: true,
        latencyMs,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        connected: false,
        latencyMs: Date.now() - start,
        error: message,
      };
    }
  }
}
