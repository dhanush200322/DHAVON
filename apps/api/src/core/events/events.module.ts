import { Module, Global } from '@nestjs/common';
import { OrchestrationEventsService } from './orchestration-events.service';

@Global()
@Module({
  providers: [OrchestrationEventsService],
  exports: [OrchestrationEventsService],
})
export class EventsModule {}
