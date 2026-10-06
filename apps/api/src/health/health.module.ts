import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { DatabaseModule } from '../database/database.module';
import { ProvidersModule } from '../providers/providers.module';

@Module({
  imports: [DatabaseModule, ProvidersModule],
  controllers: [HealthController],
})
export class HealthModule {}
