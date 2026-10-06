import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Conversation, Message, MessageRole, ActiveMode, TokenUsage } from '@dhavon/types';
import { SupabaseService } from '../database/supabase.service';
import { AIMessage } from '../providers/ai-provider.interface';
import { v4 as uuidv4 } from 'uuid';

import { IsString, IsNotEmpty, IsOptional, MaxLength, IsObject } from 'class-validator';

export class CreateConversationDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  userId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  title?: string;

  @IsOptional()
  @IsString()
  activeMode?: ActiveMode;

  @IsOptional()
  @IsObject()
  sessionContext?: Record<string, unknown>;
}

export class AddMessageDto {
  @IsString()
  @IsNotEmpty()
  role!: MessageRole;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32768)
  content!: string;

  @IsOptional()
  tokenUsage?: TokenUsage;

  @IsOptional()
  toolCalls?: Array<{ id: string; name: string; arguments: Record<string, unknown> }>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);
  private localConversations = new Map<string, Conversation>();
  private localMessages = new Map<string, Message[]>();

  constructor(private readonly supabase: SupabaseService) {}

  async createConversation(dto: CreateConversationDto): Promise<Conversation> {
    const now = new Date().toISOString();
    const conversation: Conversation = {
      id: uuidv4(),
      userId: dto.userId || 'system-user',
      title: dto.title || 'Observatory Session',
      activeMode: dto.activeMode || 'ask',
      sessionContext: dto.sessionContext || {},
      lastInteractedAt: now,
      createdAt: now,
    };

    this.localConversations.set(conversation.id, conversation);
    this.localMessages.set(conversation.id, []);
    this.logger.log(`Created conversation ${conversation.id} (${conversation.title})`);

    const client = this.supabase.getClient();
    if (client) {
      try {
        await client.from('conversations').insert({
          id: conversation.id,
          user_id: conversation.userId,
          title: conversation.title,
          active_mode: conversation.activeMode,
          session_context: conversation.sessionContext,
          last_interacted_at: conversation.lastInteractedAt,
          created_at: conversation.createdAt,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.debug(`Supabase conversation insert deferred: ${msg}`);
      }
    }

    return conversation;
  }

  async getConversation(id: string): Promise<Conversation> {
    const local = this.localConversations.get(id);
    if (local) return local;

    const client = this.supabase.getClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('conversations')
          .select('*')
          .eq('id', id)
          .single();

        if (!error && data) {
          const conv: Conversation = {
            id: data.id,
            userId: data.user_id,
            title: data.title,
            activeMode: data.active_mode as ActiveMode,
            sessionContext: data.session_context || {},
            lastInteractedAt: data.last_interacted_at,
            createdAt: data.created_at,
          };
          this.localConversations.set(conv.id, conv);
          return conv;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.debug(`Supabase get conversation fallback: ${msg}`);
      }
    }

    throw new NotFoundException(`Conversation ${id} not found`);
  }

  async addMessage(conversationId: string, dto: AddMessageDto): Promise<Message> {
    // Ensure conversation exists or create on the fly
    if (!this.localConversations.has(conversationId)) {
      try {
        await this.getConversation(conversationId);
      } catch {
        await this.createConversation({
          userId: 'system-user',
          title: 'Direct Session',
        });
      }
    }

    const now = new Date().toISOString();
    const message: Message = {
      id: uuidv4(),
      conversationId,
      role: dto.role,
      content: dto.content,
      tokenUsage: dto.tokenUsage,
      toolCalls: dto.toolCalls,
      createdAt: now,
    };

    const messages = this.localMessages.get(conversationId) || [];
    messages.push(message);
    this.localMessages.set(conversationId, messages);

    const conv = this.localConversations.get(conversationId);
    if (conv) {
      conv.lastInteractedAt = now;
    }

    const client = this.supabase.getClient();
    if (client) {
      try {
        await client.from('messages').insert({
          id: message.id,
          conversation_id: message.conversationId,
          role: message.role,
          content: message.content,
          tool_calls: message.toolCalls,
          token_usage: message.tokenUsage,
          created_at: message.createdAt,
        });

        await client
          .from('conversations')
          .update({ last_interacted_at: now })
          .eq('id', conversationId);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.debug(`Supabase message insert deferred: ${msg}`);
      }
    }

    return message;
  }

  async getRecentMessages(conversationId: string, limit = 20): Promise<Message[]> {
    const client = this.supabase.getClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (!error && data && data.length > 0) {
          return data
            .map((row) => ({
              id: row.id,
              conversationId: row.conversation_id,
              role: row.role as MessageRole,
              content: row.content,
              toolCalls: row.tool_calls,
              tokenUsage: row.token_usage,
              createdAt: row.created_at,
            }))
            .reverse();
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.debug(`Supabase recent messages fallback: ${msg}`);
      }
    }

    const local = this.localMessages.get(conversationId) || [];
    return local.slice(-limit);
  }

  async prepareAIContext(conversationId: string, limit = 10): Promise<AIMessage[]> {
    const messages = await this.getRecentMessages(conversationId, limit);
    return messages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
      content: m.content,
    }));
  }
}
