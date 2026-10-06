import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as net from 'net';

@Injectable()
export class SsrfProtectionService {
  private readonly logger = new Logger(SsrfProtectionService.name);

  // Private RFC1918 and loopback/link-local patterns
  private readonly blockedHostnames = new Set([
    'localhost',
    'localhost.localdomain',
    'ip6-localhost',
    'ip6-loopback',
    'metadata.google.internal',
    '169.254.169.254',
    'instance-data',
  ]);

  /**
   * Validate that a target URL is strictly safe from SSRF attacks.
   */
  validateUrl(rawUrl: string): URL {
    if (!rawUrl || typeof rawUrl !== 'string') {
      throw new BadRequestException('Target URL is required.');
    }

    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      throw new BadRequestException(`Malformed URL format: ${rawUrl}`);
    }

    // 1. Protocol validation: strictly http or https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new BadRequestException(
        `Disallowed protocol "${parsed.protocol}". Only HTTP and HTTPS are permitted.`,
      );
    }

    const hostname = parsed.hostname.toLowerCase().trim();

    // 2. Check blocked hostnames
    if (this.blockedHostnames.has(hostname) || hostname.endsWith('.local')) {
      this.logger.warn(`SSRF Block: Request to forbidden hostname "${hostname}" rejected.`);
      throw new BadRequestException(`Access to hostname "${hostname}" is forbidden by SSRF security policy.`);
    }

    // 3. IP address evaluation
    if (net.isIP(hostname)) {
      if (this.isPrivateOrRestrictedIp(hostname)) {
        this.logger.warn(`SSRF Block: Request to restricted IP "${hostname}" rejected.`);
        throw new BadRequestException(`Access to restricted IP range "${hostname}" is forbidden.`);
      }
    }

    return parsed;
  }

  /**
   * Checks if an IP address belongs to loopback, private RFC1918, link-local, or cloud metadata ranges.
   */
  isPrivateOrRestrictedIp(ip: string): boolean {
    // IPv4 Checks
    if (net.isIPv4(ip)) {
      const parts = ip.split('.').map((p) => parseInt(p, 10));
      if (parts.length !== 4) return true;

      // 0.0.0.0/8 (Current network)
      if (parts[0] === 0) return true;

      // 127.0.0.0/8 (Loopback)
      if (parts[0] === 127) return true;

      // 10.0.0.0/8 (Private RFC1918)
      if (parts[0] === 10) return true;

      // 172.16.0.0/12 (Private RFC1918)
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;

      // 192.168.0.0/16 (Private RFC1918)
      if (parts[0] === 192 && parts[1] === 168) return true;

      // 169.254.0.0/16 (Link-local / AWS / GCP / Azure metadata)
      if (parts[0] === 169 && parts[1] === 254) return true;

      // Broadcast
      if (parts[0] === 255 && parts[1] === 255 && parts[2] === 255 && parts[3] === 255) return true;

      return false;
    }

    // IPv6 Checks
    if (net.isIPv6(ip)) {
      const lower = ip.toLowerCase();
      // Loopback ::1
      if (lower === '::1' || lower === '0:0:0:0:0:0:0:1') return true;
      // Unspecified ::
      if (lower === '::' || lower === '0:0:0:0:0:0:0:0') return true;
      // Unique local fc00::/7
      if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
      // Link-local fe80::/10
      if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true;

      return false;
    }

    return true;
  }
}
