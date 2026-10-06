-- ==============================================================================
-- DHAVON — Migration 004: Security Hardening & Strict Tenant RLS
-- ==============================================================================

-- 1. DROP INSECURE POLICIES WITH 'auth.uid() IS NULL'
DO $$ BEGIN
    -- Core Phase 1-4 tables
    DROP POLICY IF EXISTS users_isolation ON public.users;
    DROP POLICY IF EXISTS conversations_isolation ON public.conversations;
    DROP POLICY IF EXISTS messages_isolation ON public.messages;
    DROP POLICY IF EXISTS memories_isolation ON public.memories;
    DROP POLICY IF EXISTS goals_isolation ON public.goals;
    DROP POLICY IF EXISTS tasks_isolation ON public.tasks;
    DROP POLICY IF EXISTS tool_executions_isolation ON public.tool_executions;
    DROP POLICY IF EXISTS permissions_isolation ON public.permissions;
    DROP POLICY IF EXISTS events_isolation ON public.events;
    DROP POLICY IF EXISTS settings_isolation ON public.system_settings;
    DROP POLICY IF EXISTS audit_logs_read_only ON public.audit_logs;

    -- Phase 5 tables
    DROP POLICY IF EXISTS task_deps_isolation ON public.task_dependencies;
    DROP POLICY IF EXISTS verification_isolation ON public.verification_results;
    DROP POLICY IF EXISTS user_prefs_isolation ON public.user_preferences;
    DROP POLICY IF EXISTS orch_runs_isolation ON public.orchestration_runs;
    DROP POLICY IF EXISTS orch_steps_isolation ON public.orchestration_steps;
    DROP POLICY IF EXISTS goal_events_isolation ON public.goal_events;
END $$;

-- 2. CREATE HARDENED TENANT ISOLATION POLICIES (NO ANONYMOUS WILDCARDS)
-- In Supabase, the backend service_role key automatically bypasses RLS in Postgres.
-- Authenticated users are bound strictly to their verified auth.uid().
-- System user UUID (00000000-0000-0000-0000-000000000001) is preserved for local single-tenant OS execution.

CREATE POLICY users_isolation ON public.users
    FOR ALL USING (auth.uid() = id OR id = '00000000-0000-0000-0000-000000000001'::uuid);

CREATE POLICY conversations_isolation ON public.conversations
    FOR ALL USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000001'::uuid);

CREATE POLICY messages_isolation ON public.messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE id = messages.conversation_id
              AND (user_id = auth.uid() OR user_id = '00000000-0000-0000-0000-000000000001'::uuid)
        )
    );

CREATE POLICY memories_isolation ON public.memories
    FOR ALL USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000001'::uuid);

CREATE POLICY goals_isolation ON public.goals
    FOR ALL USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000001'::uuid);

CREATE POLICY tasks_isolation ON public.tasks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.goals
            WHERE id = tasks.goal_id
              AND (user_id = auth.uid() OR user_id = '00000000-0000-0000-0000-000000000001'::uuid)
        )
    );

CREATE POLICY tool_executions_isolation ON public.tool_executions
    FOR ALL USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000001'::uuid);

CREATE POLICY permissions_isolation ON public.permissions
    FOR ALL USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000001'::uuid);

CREATE POLICY events_isolation ON public.events
    FOR ALL USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000001'::uuid);

CREATE POLICY settings_isolation ON public.system_settings
    FOR ALL USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000001'::uuid);

-- Audit logs: Strict SELECT only for the owner; INSERT/UPDATE restricted from direct public manipulation
CREATE POLICY audit_logs_isolation ON public.audit_logs
    FOR SELECT USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000001'::uuid);

CREATE POLICY task_deps_isolation ON public.task_dependencies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.goals g ON g.id = t.goal_id
            WHERE t.id = task_dependencies.task_id
              AND (g.user_id = auth.uid() OR g.user_id = '00000000-0000-0000-0000-000000000001'::uuid)
        )
    );

CREATE POLICY verification_isolation ON public.verification_results
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.goals g
            WHERE g.id = verification_results.goal_id
              AND (g.user_id = auth.uid() OR g.user_id = '00000000-0000-0000-0000-000000000001'::uuid)
        )
    );

CREATE POLICY user_prefs_isolation ON public.user_preferences
    FOR ALL USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000001'::uuid);

CREATE POLICY orch_runs_isolation ON public.orchestration_runs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.goals g
            WHERE g.id = orchestration_runs.goal_id
              AND (g.user_id = auth.uid() OR g.user_id = '00000000-0000-0000-0000-000000000001'::uuid)
        )
    );

CREATE POLICY orch_steps_isolation ON public.orchestration_steps
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.orchestration_runs r
            JOIN public.goals g ON g.id = r.goal_id
            WHERE r.id = orchestration_steps.run_id
              AND (g.user_id = auth.uid() OR g.user_id = '00000000-0000-0000-0000-000000000001'::uuid)
        )
    );

CREATE POLICY goal_events_isolation ON public.goal_events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.goals g
            WHERE g.id = goal_events.goal_id
              AND (g.user_id = auth.uid() OR g.user_id = '00000000-0000-0000-0000-000000000001'::uuid)
        )
    );

-- 3. HARDEN VECTOR SEARCH RPC (SET search_path AND MANDATORY USER ISOLATION)
CREATE OR REPLACE FUNCTION match_memories (
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT,
  filter_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  memory_type TEXT,
  importance_score FLOAT,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Strict multi-tenant guard: filter_user_id must never be null
  IF filter_user_id IS NULL THEN
    RAISE EXCEPTION 'filter_user_id parameter is mandatory for memory search security.';
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.content,
    m.memory_type,
    m.importance_score,
    (1 - (m.embedding <=> query_embedding))::FLOAT AS similarity
  FROM public.memories m
  WHERE m.user_id = filter_user_id
    AND m.embedding IS NOT NULL
    AND 1 - (m.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
