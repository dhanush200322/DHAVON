import { Module, Global } from '@nestjs/common';
import { McpRegistryService } from './mcp-registry.service';
import { McpEventsService } from './mcp-events.service';
import { McpDiscoveryService } from './mcp-discovery.service';
import { McpPermissionService } from './mcp-permission.service';
import { McpExecutionService } from './mcp-execution.service';
import { McpToolSelectorService } from './mcp-tool-selector.service';
import { McpGatewayService } from './mcp-gateway.service';
import { McpController } from './mcp.controller';

@Global()
@Module({
  controllers: [McpController],
  providers: [
    McpRegistryService,
    McpEventsService,
    McpDiscoveryService,
    McpPermissionService,
    McpExecutionService,
    McpToolSelectorService,
    McpGatewayService,
  ],
  exports: [
    McpRegistryService,
    McpEventsService,
    McpDiscoveryService,
    McpPermissionService,
    McpExecutionService,
    McpToolSelectorService,
    McpGatewayService,
  ],
})
export class McpModule {}
