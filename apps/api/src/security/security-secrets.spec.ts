import { scrubSecrets, containsSecrets } from '../core/memory/secret-scrubber.util';

describe('Phase 7 Security: Secret Scrubbing & Leakage Prevention', () => {
  it('should detect and scrub Google AI Studio keys (AQ. format)', () => {
    const raw = 'My key is AQ.MockTestingGoogleKeyFormat1234567890abcdefGH and remember it';
    expect(containsSecrets(raw)).toBe(true);
    const scrubbed = scrubSecrets(raw);
    expect(scrubbed).not.toContain('AQ.MockTesting');
    expect(scrubbed).toContain('[REDACTED_SECRET]');
  });

  it('should detect and scrub Groq API keys (gsk_ format)', () => {
    const raw = 'Using provider groq with key gsk_mockGroqKeyForScrubberTesting1234567890abcdef';
    expect(containsSecrets(raw)).toBe(true);
    const scrubbed = scrubSecrets(raw);
    expect(scrubbed).not.toContain('gsk_mockGroqKey');
    expect(scrubbed).toContain('[REDACTED_SECRET]');
  });

  it('should detect and scrub OpenAI and GitHub keys', () => {
    const raw = 'github: ghp_111122223333444455556666777788889999 and openai: sk-proj-1234567890abcdef1234567890abcdef';
    expect(containsSecrets(raw)).toBe(true);
    const scrubbed = scrubSecrets(raw);
    expect(scrubbed).not.toContain('ghp_1111');
    expect(scrubbed).not.toContain('sk-proj-');
    expect(scrubbed).toContain('[REDACTED_SECRET]');
  });

  it('should detect and scrub Supabase publishable and service keys', () => {
    const raw = 'supabase key is sb_publishable_mockKeyForTestingScrubber123456';
    expect(containsSecrets(raw)).toBe(true);
    const scrubbed = scrubSecrets(raw);
    expect(scrubbed).not.toContain('sb_publishable_mockKey');
    expect(scrubbed).toContain('[REDACTED_SECRET]');
  });

  it('should detect and scrub database connection strings with passwords', () => {
    const raw = 'Connect to postgresql://postgres:SuperSecretP@ssw0rd!@db.example.com:5432/dhavon';
    expect(containsSecrets(raw)).toBe(true);
    const scrubbed = scrubSecrets(raw);
    expect(scrubbed).not.toContain('SuperSecretP@ssw0rd!');
    expect(scrubbed).toContain('[REDACTED_SECRET]');
  });

  it('should detect and scrub private keys', () => {
    const raw = `Here is my key:\n-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0Y1...\n-----END RSA PRIVATE KEY-----`;
    expect(containsSecrets(raw)).toBe(true);
    const scrubbed = scrubSecrets(raw);
    expect(scrubbed).not.toContain('MIIEowIBAAKCAQEA0Y1');
    expect(scrubbed).toContain('[REDACTED_SECRET]');
  });

  it('should not alter clean text without credentials', () => {
    const clean = 'This is a normal goal: build a dashboard with Tailwind CSS and Next.js';
    expect(containsSecrets(clean)).toBe(false);
    expect(scrubSecrets(clean)).toBe(clean);
  });
});
