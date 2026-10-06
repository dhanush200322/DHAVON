import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MemoryService, CreateMemoryDto } from './memory.service';
import { PreferenceService, SetPreferenceDto } from './preference.service';
import { MemoryType, PreferenceCategory } from '@dhavon/types';

@Controller()
export class MemoryController {
  constructor(
    private readonly memoryService: MemoryService,
    private readonly preferenceService: PreferenceService,
  ) {}

  @Get('memory')
  async getMemories(
    @Query('userId') userId?: string,
    @Query('type') type?: MemoryType,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ) {
    const lim = limit ? parseInt(limit, 10) : 20;
    if (search) {
      return this.memoryService.searchRelevant(userId, search, lim, type);
    }
    return this.memoryService.getRecentMemories(userId, type, lim);
  }

  @Post('memory')
  @HttpCode(HttpStatus.CREATED)
  async createMemory(@Body() dto: CreateMemoryDto) {
    return this.memoryService.storeMemory(dto);
  }

  @Delete('memory/:id')
  async deleteMemory(@Param('id') id: string) {
    const success = await this.memoryService.deleteMemory(id);
    return { success, id };
  }

  @Get('preferences')
  async getPreferences(
    @Query('userId') userId?: string,
    @Query('category') category?: PreferenceCategory,
  ) {
    return this.preferenceService.getPreferences(userId, category);
  }

  @Post('preferences')
  @HttpCode(HttpStatus.OK)
  async setPreference(@Body() dto: SetPreferenceDto) {
    return this.preferenceService.setPreference(dto);
  }
}
