import { Module, Global } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './guards/auth.guard';
import { SsrfProtectionService } from './security/ssrf-protection.service';

@Global()
@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    SsrfProtectionService,
  ],
  exports: [SsrfProtectionService],
})
export class CommonModule {}
