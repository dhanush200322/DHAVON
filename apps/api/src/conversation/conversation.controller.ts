import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ConversationService, CreateConversationDto, AddMessageDto } from './conversation.service';

@Controller('conversations')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Post()
  async createConversation(@Body() body: CreateConversationDto) {
    return this.conversationService.createConversation(body);
  }

  @Get(':id')
  async getConversation(@Param('id') id: string) {
    return this.conversationService.getConversation(id);
  }

  @Post(':id/messages')
  async addMessage(@Param('id') id: string, @Body() body: AddMessageDto) {
    return this.conversationService.addMessage(id, body);
  }

  @Get(':id/messages')
  async getRecentMessages(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    const numLimit = limit ? parseInt(limit, 10) : 20;
    return this.conversationService.getRecentMessages(id, numLimit);
  }
}
