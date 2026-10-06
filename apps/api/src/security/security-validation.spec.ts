import { BadRequestException } from '@nestjs/common';
import { SsrfProtectionService } from '../common/security/ssrf-protection.service';

describe('Phase 7 Security: Input Validation & SSRF Defense', () => {
  let ssrfService: SsrfProtectionService;

  beforeEach(() => {
    ssrfService = new SsrfProtectionService();
  });

  it('should permit valid public internet URLs', () => {
    const valid = 'https://api.github.com/repos/dhanush200322/DHAVON';
    const parsed = ssrfService.validateUrl(valid);
    expect(parsed.hostname).toBe('api.github.com');
  });

  it('should strictly block localhost and loopback hostnames', () => {
    expect(() => ssrfService.validateUrl('http://localhost:8080/admin')).toThrow(
      BadRequestException,
    );
    expect(() => ssrfService.validateUrl('http://127.0.0.1:4000/internal')).toThrow(
      BadRequestException,
    );
    expect(() => ssrfService.validateUrl('http://0.0.0.0:80/')).toThrow(
      BadRequestException,
    );
  });

  it('should strictly block cloud metadata endpoints (169.254.169.254)', () => {
    expect(() =>
      ssrfService.validateUrl('http://169.254.169.254/latest/meta-data/'),
    ).toThrow(BadRequestException);
    expect(() =>
      ssrfService.validateUrl('http://metadata.google.internal/computeMetadata/v1/'),
    ).toThrow(BadRequestException);
  });

  it('should strictly block private RFC1918 network IP ranges', () => {
    // 10.0.0.0/8
    expect(() => ssrfService.validateUrl('http://10.0.1.5:8080/')).toThrow(
      BadRequestException,
    );
    // 172.16.0.0/12
    expect(() => ssrfService.validateUrl('http://172.20.0.1:3000/')).toThrow(
      BadRequestException,
    );
    // 192.168.0.0/16
    expect(() => ssrfService.validateUrl('http://192.168.1.1/admin')).toThrow(
      BadRequestException,
    );
  });

  it('should block non-HTTP protocols (e.g. file://, gopher://, ftp://, ssh://)', () => {
    expect(() => ssrfService.validateUrl('file:///etc/passwd')).toThrow(
      BadRequestException,
    );
    expect(() => ssrfService.validateUrl('ftp://ftp.example.com/data')).toThrow(
      BadRequestException,
    );
    expect(() => ssrfService.validateUrl('gopher://gopher.example.com/')).toThrow(
      BadRequestException,
    );
  });
});
