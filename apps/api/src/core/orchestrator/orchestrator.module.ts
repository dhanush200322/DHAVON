import { Module, Global } from '@nestjs/common';
import { DependencyService } from './dependency.service';
import { VerificationService } from './verification.service';
import { PlannerService } from './planner.service';
import { OrchestrationService } from './orchestration.service';
import { OrchestrationController } from './orchestration.controller';

@Global()
@Module({
  controllers: [OrchestrationController],
  providers: [
    DependencyService,
    VerificationService,
    PlannerService,
    OrchestrationService,
  ],
  exports: [
    DependencyService,
    VerificationService,
    PlannerService,
    OrchestrationService,
  ],
})
export class OrchestratorModule {}
