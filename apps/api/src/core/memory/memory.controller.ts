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
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller()
export class MemoryController {
  constructor(
    private readonly memoryService: MemoryService,
    private readonly preferenceService: PreferenceService,
  ) {}

  @Get('memory')
  async getMemories(
    @CurrentUser() authUserId: string,
    @Query('userId') userId?: string,
    @Query('type') type?: MemoryType,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ) {
    const effectiveUserId = userId || authUserId;
    const lim = limit ? parseInt(limit, 10) : 20;
    if (search) {
      return this.memoryService.searchRelevant(effectiveUserId, search, lim, type);
    }
    return this.memoryService.getRecentMemories(effectiveUserId, type, lim);
  }

  @Post('memory')
  @HttpCode(HttpStatus.CREATED)
  async createMemory(
    @CurrentUser() authUserId: string,
    @Body() dto: CreateMemoryDto,
  ) {
    if (!dto.userId) {
      dto.userId = authUserId;
    }
    return this.memoryService.storeMemory(dto);
  }

  @Delete('memory/:id')
  async deleteMemory(@Param('id') id: string) {
    const success = await this.memoryService.deleteMemory(id);
    return { success, id };
  }

  @Get('preferences')
  async getPreferences(
    @CurrentUser() authUserId: string,
    @Query('userId') userId?: string,
    @Query('category') category?: PreferenceCategory,
  ) {
    const effectiveUserId = userId || authUserId;
    return this.preferenceService.getPreferences(effectiveUserId, category);
  }

  @Post('preferences')
  @HttpCode(HttpStatus.OK)
  async setPreference(
    @CurrentUser() authUserId: string,
    @Body() dto: SetPreferenceDto,
  ) {
    if (!dto.userId) {
      dto.userId = authUserId;
    }
    return this.preferenceService.setPreference(dto);
  }
}
