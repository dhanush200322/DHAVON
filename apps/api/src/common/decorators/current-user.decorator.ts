import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SYSTEM_USER_UUID } from '../guards/auth.guard';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.id || SYSTEM_USER_UUID;
  },
);
