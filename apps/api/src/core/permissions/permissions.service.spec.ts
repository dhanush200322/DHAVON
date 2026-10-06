import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsService } from './permissions.service';
import { AuditService } from '../audit/audit.service';

describe('PermissionsService', () => {
  let service: PermissionsService;

  const mockAuditService = {
    record: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);
  });

  it('should correctly classify risk levels', () => {
    expect(service.classifyRisk('shell_exec', 'execute')).toBe('SENSITIVE');
    expect(service.classifyRisk('file_delete', 'execute')).toBe('SENSITIVE');
    expect(service.classifyRisk('file_write', 'execute')).toBe('CONFIRMATION_REQUIRED');
    expect(service.classifyRisk('search', 'execute')).toBe('READ');
    expect(service.classifyRisk('misc_tool', 'execute')).toBe('LOW_RISK');
  });

  it('should block sensitive tools autonomously and require confirmation', async () => {
    const result = await service.checkPermission('user1', 'shell_exec', { cmd: 'rm -rf /' });
    expect(result.allowed).toBe(false);
    expect(result.requiresUserConfirmation).toBe(true);
    expect(mockAuditService.record).toHaveBeenCalled();
  });

  it('should allow confirmation required tools once granted', async () => {
    const initial = await service.checkPermission('user1', 'file_write', { path: '/tmp' });
    expect(initial.allowed).toBe(false);
    expect(initial.requiresUserConfirmation).toBe(true);

    service.grantPermission('user1', 'file_write');

    const granted = await service.checkPermission('user1', 'file_write', { path: '/tmp' });
    expect(granted.allowed).toBe(true);
  });
});
