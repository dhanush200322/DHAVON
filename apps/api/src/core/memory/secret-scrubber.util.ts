/**
 * DHAVON Security Plane — Secret Scrubber Utility
 * Strictly prevents credentials, API keys, tokens, and secrets from entering memory or audit trails.
 */

const SECRET_PATTERNS: RegExp[] = [
  // Generic API Keys & Tokens
  /['"]?(?:api[_-]?key|apikey|secret|token|password|auth[_-]?token)['"]?\s*[:=]\s*['"]?[a-zA-Z0-9_\-\.]{8,}['"]?/gi,
  // Google Gemini / AI Studio keys (both AIza... and AQ.... formats)
  /AIza[0-9A-Za-z-_]{35}/g,
  /AQ\.[a-zA-Z0-9_\-\.]{30,}/g,
  // Groq API keys (gsk_...)
  /gsk_[a-zA-Z0-9_\-]{20,}/g,
  // OpenAI / standard sk- keys
  /sk-[a-zA-Z0-9_-]{32,}/g,
  // GitHub tokens (PAT, fine-grained, oauth)
  /gh[pousr]_[A-Za-z0-9_]{36,}/g,
  // Resend API keys
  /re_[a-zA-Z0-9_]{30,}/g,
  // JWT tokens (3 parts separated by dots)
  /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g,
  // Authorization headers
  /Bearer\s+[a-zA-Z0-9\-\._~+/]+=*/gi,
  // Supabase publishable & service keys
  /sbp_[a-zA-Z0-9]{20,}/g,
  /sb_publishable_[a-zA-Z0-9_-]{20,}/g,
  // Basic Auth
  /Basic\s+[a-zA-Z0-9+/=]{16,}/gi,
  // Database connection strings containing credentials
  /(?:postgres(?:ql)?|mongodb|mysql|redis):\/\/[a-zA-Z0-9_-]+:[^@\s]+@[^\s]+/gi,
  // Private Keys
  /-----BEGIN (?:[A-Z0-9_-]+ )?PRIVATE KEY-----[\s\S]*?-----END (?:[A-Z0-9_-]+ )?PRIVATE KEY-----/gi,
];

export function scrubSecrets(input: string): string {
  if (!input) return '';
  let sanitized = input;
  for (const pattern of SECRET_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED_SECRET]');
  }
  return sanitized;
}

export function containsSecrets(input: string): boolean {
  if (!input) return false;
  return SECRET_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(input);
  });
}
