import { Module, Global } from '@nestjs/common';
import { ProvidersModule } from '../providers/providers.module';
import { DatabaseModule } from '../database/database.module';
import { ConversationModule } from '../conversation/conversation.module';
import { AuditModule } from './audit/audit.module';
import { PermissionsModule } from './permissions/permissions.module';
import { MemoryModule } from './memory/memory.module';
import { GoalsModule } from './goals/goals.module';
import { TasksModule } from './tasks/tasks.module';
import { EventsModule } from './events/events.module';
import { OrchestratorModule } from './orchestrator/orchestrator.module';
import { StateService } from './state/state.service';
import { ContextBuilderService } from './context/context-builder.service';
import { DhavonCoreService } from './dhavon-core.service';

@Global()
@Module({
  imports: [
    ProvidersModule,
    DatabaseModule,
    ConversationModule,
    AuditModule,
    PermissionsModule,
    MemoryModule,
    GoalsModule,
    TasksModule,
    EventsModule,
    OrchestratorModule,
  ],
  providers: [
    StateService,
    ContextBuilderService,
    DhavonCoreService,
  ],
  exports: [
    StateService,
    ContextBuilderService,
    DhavonCoreService,
    ProvidersModule,
    DatabaseModule,
    ConversationModule,
    AuditModule,
    PermissionsModule,
    MemoryModule,
    GoalsModule,
    TasksModule,
    EventsModule,
    OrchestratorModule,
  ],
})
export class CoreModule {}
