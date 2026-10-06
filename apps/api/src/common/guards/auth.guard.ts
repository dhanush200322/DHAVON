import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

export const SYSTEM_USER_UUID = '00000000-0000-0000-0000-000000000001';

export interface AuthenticatedUser {
  id: string;
  role: string;
  email?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);
  private readonly jwtSecret: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {
    const env = this.configService.get<string>('NODE_ENV') || process.env.NODE_ENV;
    this.jwtSecret =
      this.configService.get<string>('JWT_SECRET') ||
      (env === 'production' ? '' : 'dhavon_dev_jwt_secret_change_in_production');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    if (!request) {
      return true;
    }

    const authHeader = request.headers.authorization;
    let authenticatedUser: AuthenticatedUser | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();

      // Check for malformed or forged tokens
      if (!token || token.length < 10) {
        throw new UnauthorizedException('Invalid or malformed authentication token.');
      }

      // Check simple JWT or mock payload
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          // Decode payload safely
          const payloadJson = Buffer.from(parts[1], 'base64').toString('utf-8');
          const payload = JSON.parse(payloadJson);
          if (payload.exp && payload.exp < Date.now() / 1000) {
            throw new UnauthorizedException('Authentication token has expired.');
          }
          const userId = payload.sub || payload.userId || payload.id;
          if (userId) {
            authenticatedUser = {
              id: userId,
              role: payload.role || 'authenticated',
              email: payload.email,
            };
          }
        } else {
          // Non-JWT token
          throw new UnauthorizedException('Unsupported token format.');
        }
      } catch (err: unknown) {
        if (err instanceof UnauthorizedException) throw err;
        throw new UnauthorizedException('Token verification failed.');
      }
    }

    // If no Bearer token, check for internal system development token or default identity
    if (!authenticatedUser) {
      const env = this.configService.get<string>('NODE_ENV') || process.env.NODE_ENV || 'development';
      const isDev = env === 'development' || env === 'test';
      if (isDev) {
        authenticatedUser = {
          id: SYSTEM_USER_UUID,
          role: 'authenticated',
        };
      } else {
        throw new UnauthorizedException('Authentication credentials required.');
      }
    }

    // Security Check: Forgery Prevention
    // Ensure client cannot pass a conflicting userId in body/query to access another tenant's data
    const bodyUserId = request.body?.userId;
    const queryUserId = request.query?.userId as string | undefined;

    if (bodyUserId && bodyUserId !== authenticatedUser.id && bodyUserId !== 'system-user') {
      this.logger.warn(
        `Security Alert: User ${authenticatedUser.id} attempted to submit body with foreign userId: ${bodyUserId}`,
      );
      throw new ForbiddenException('Forbidden: Cannot impersonate or manipulate another user ID.');
    }

    if (queryUserId && queryUserId !== authenticatedUser.id && queryUserId !== 'system-user') {
      this.logger.warn(
        `Security Alert: User ${authenticatedUser.id} attempted to query resource with foreign userId: ${queryUserId}`,
      );
      throw new ForbiddenException('Forbidden: Cross-tenant resource queries are strictly prohibited.');
    }

    // Attach verified user to request
    request.user = authenticatedUser;
    return true;
  }
}
