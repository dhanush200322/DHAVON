import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { DatabaseModule } from './database/database.module';
import { ProvidersModule } from './providers/providers.module';
import { CoreModule } from './core/core.module';
import { ConversationModule } from './conversation/conversation.module';
import { GatewayModule } from './gateway/gateway.module';
import { McpModule } from './mcp/mcp.module';
import { VoiceModule } from './voice/voice.module';

import { CommonModule } from './common/common.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    CommonModule,
    DatabaseModule,
    ProvidersModule,
    McpModule,
    CoreModule,
    VoiceModule,
    ConversationModule,
    GatewayModule,
    HealthModule,
  ],
})
export class AppModule {}
