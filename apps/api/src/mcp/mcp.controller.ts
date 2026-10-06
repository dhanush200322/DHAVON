import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { McpGatewayService } from './mcp-gateway.service';
import { McpExecutionService } from './mcp-execution.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

import { IsString, IsNotEmpty, IsOptional, IsObject, MaxLength } from 'class-validator';

export class ExecuteToolDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  serverId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  toolName!: string;

  @IsOptional()
  @IsObject()
  arguments?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  userId?: string;
}

export class ConfirmExecutionDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  userId?: string;
}

@Controller('mcp')
export class McpController {
  constructor(
    private readonly gateway: McpGatewayService,
    private readonly executionService: McpExecutionService,
  ) {}

  @Get('servers')
  getServers() {
    const servers = this.gateway.getServers();
    return servers.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      status: s.status,
      transport: s.transport,
      capabilities: s.capabilities,
      toolCount: this.gateway.getTools(s.id).length,
      lastHealthCheck: s.lastHealthCheck,
    }));
  }

  @Get('servers/:id')
  getServerById(@Param('id') id: string) {
    const server = this.gateway.getServer(id);
    if (!server) {
      throw new NotFoundException(`MCP Server "${id}" not found.`);
    }
    return {
      ...server,
      tools: this.gateway.getTools(id),
    };
  }

  @Get('tools')
  getTools(@Query('serverId') serverId?: string) {
    return this.gateway.getTools(serverId);
  }

  @Get('tools/:id')
  getToolById(@Param('id') id: string) {
    const tool = this.gateway.getTool(id);
    if (!tool) {
      throw new NotFoundException(`MCP Tool "${id}" not found.`);
    }
    return tool;
  }

  @Get('executions/:id')
  getExecutionById(@Param('id') id: string) {
    const record = this.executionService.getExecutionRecord(id);
    if (!record) {
      throw new NotFoundException(`Execution record "${id}" not found.`);
    }
    return record;
  }

  @Post('executions')
  async executeTool(
    @CurrentUser() authUserId: string,
    @Body() body: ExecuteToolDto,
  ) {
    return this.gateway.executeTool({
      serverId: body.serverId,
      toolName: body.toolName,
      arguments: body.arguments || {},
      userId: body.userId || authUserId,
    });
  }

  @Post('executions/:id/confirm')
  async confirmExecution(
    @CurrentUser() authUserId: string,
    @Param('id') id: string,
    @Body() body: ConfirmExecutionDto,
  ) {
    return this.gateway.approveExecution(id, body.userId || authUserId);
  }
}
