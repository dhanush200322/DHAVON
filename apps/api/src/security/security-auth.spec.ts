import { ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { AuthGuard, SYSTEM_USER_UUID } from '../common/guards/auth.guard';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';

describe('Phase 7 Security: Authentication & Tenant Authorization', () => {
  let guard: AuthGuard;
  let configService: ConfigService;
  let reflector: Reflector;

  beforeEach(() => {
    configService = new ConfigService({
      NODE_ENV: 'development',
      JWT_SECRET: 'test_jwt_secret_key_for_dhavon_2026',
    });
    reflector = new Reflector();
    guard = new AuthGuard(configService, reflector);
  });

  const createMockContext = (req: Record<string, unknown>, isPublic = false): ExecutionContext => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(isPublic);
    return {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => ({}),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  it('should allow public endpoints marked with @Public() without any credentials', async () => {
    const req = { headers: {} };
    const ctx = createMockContext(req, true);
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('should accept valid JWT bearer token and assign verified user identity', async () => {
    const payload = {
      sub: 'user-1111-2222-3333-4444',
      role: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const token = `header.${Buffer.from(JSON.stringify(payload)).toString('base64')}.signature`;
    const req = {
      headers: { authorization: `Bearer ${token}` },
    };
    const ctx = createMockContext(req);
    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect((req as any).user.id).toBe('user-1111-2222-3333-4444');
  });

  it('should strictly reject expired JWT bearer tokens', async () => {
    const payload = {
      sub: 'user-1111-2222-3333-4444',
      exp: Math.floor(Date.now() / 1000) - 3600, // expired 1 hour ago
    };
    const token = `header.${Buffer.from(JSON.stringify(payload)).toString('base64')}.signature`;
    const req = {
      headers: { authorization: `Bearer ${token}` },
    };
    const ctx = createMockContext(req);

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should strictly reject malformed or short bearer tokens', async () => {
    const req = {
      headers: { authorization: 'Bearer bad' },
    };
    const ctx = createMockContext(req);

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should reject requests attempting cross-tenant impersonation via body.userId', async () => {
    const payload = {
      sub: 'user-legitimate-id',
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const token = `header.${Buffer.from(JSON.stringify(payload)).toString('base64')}.signature`;
    const req = {
      headers: { authorization: `Bearer ${token}` },
      body: { userId: 'victim-foreign-id' }, // Attacker trying to submit on behalf of victim
    };
    const ctx = createMockContext(req);

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should reject requests attempting cross-tenant querying via query.userId', async () => {
    const payload = {
      sub: 'user-legitimate-id',
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const token = `header.${Buffer.from(JSON.stringify(payload)).toString('base64')}.signature`;
    const req = {
      headers: { authorization: `Bearer ${token}` },
      query: { userId: 'victim-foreign-id' }, // Attacker trying to query victim's memories
    };
    const ctx = createMockContext(req);

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should safely fallback to local system user in development mode when unauthenticated', async () => {
    const req = { headers: {} };
    const ctx = createMockContext(req);
    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect((req as any).user.id).toBe(SYSTEM_USER_UUID);
  });

  it('should reject unauthenticated requests in production mode', async () => {
    const prodConfig = new ConfigService();
    jest.spyOn(prodConfig, 'get').mockImplementation((key: string) => {
      if (key === 'NODE_ENV') return 'production';
      return null;
    });
    const prodGuard = new AuthGuard(prodConfig, reflector);
    const req = { headers: {} };
    const ctx = createMockContext(req);

    await expect(prodGuard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });
});
