import { Module } from '@nestjs/common';
import { DhavonGateway } from './dhavon.gateway';
import { VoiceModule } from '../voice/voice.module';
import { CoreModule } from '../core/core.module';
import { McpModule } from '../mcp/mcp.module';

@Module({
  imports: [VoiceModule, CoreModule, McpModule],
  providers: [DhavonGateway],
  exports: [DhavonGateway],
})
export class GatewayModule {}
