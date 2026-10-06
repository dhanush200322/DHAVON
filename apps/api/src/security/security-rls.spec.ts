import * as fs from 'fs';
import * as path from 'path';

describe('Phase 7 Security: Supabase RLS & Database Function Hardening', () => {
  const migrationPath = path.resolve(
    __dirname,
    '../../../../supabase/migrations/004_security_hardening.sql',
  );

  let migrationSql: string;

  beforeAll(() => {
    migrationSql = fs.readFileSync(migrationPath, 'utf-8');
  });

  it('should explicitly drop insecure policies containing anonymous wildcards', () => {
    expect(migrationSql).toContain('DROP POLICY IF EXISTS users_isolation');
    expect(migrationSql).toContain('DROP POLICY IF EXISTS memories_isolation');
    expect(migrationSql).toContain('DROP POLICY IF EXISTS conversations_isolation');
    expect(migrationSql).toContain('DROP POLICY IF EXISTS goals_isolation');
  });

  it('should not contain insecure "auth.uid() IS NULL" in replacement policies', () => {
    // Migration 004 must NEVER use auth.uid() IS NULL for row grants
    const lines = migrationSql.split('\n');
    const policyLines = lines.filter((l) => l.includes('CREATE POLICY') || l.includes('USING ('));

    for (const line of policyLines) {
      expect(line).not.toContain('auth.uid() IS NULL');
    }
  });

  it('should harden match_memories with explicit search_path', () => {
    expect(migrationSql).toContain('SET search_path = public, pg_temp');
  });

  it('should mandate filter_user_id and throw exception if null in match_memories', () => {
    expect(migrationSql).toContain('IF filter_user_id IS NULL THEN');
    expect(migrationSql).toContain('RAISE EXCEPTION');
  });

  it('should restrict audit_logs to SELECT only for the owner', () => {
    expect(migrationSql).toContain('CREATE POLICY audit_logs_isolation ON public.audit_logs');
    expect(migrationSql).toContain('FOR SELECT USING');
  });
});
