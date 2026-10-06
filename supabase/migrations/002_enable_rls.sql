-- ==============================================================================
-- DHAVON — Migration 002: Row Level Security & Vector Search RPC
-- ==============================================================================

-- Enable RLS on all 11 tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Standard tenant isolation policies tied to auth.uid() or server system user
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_isolation') THEN
        CREATE POLICY users_isolation ON public.users FOR ALL USING (auth.uid() = id OR auth.uid() IS NULL OR id = '00000000-0000-0000-0000-000000000001'::uuid);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'conversations_isolation') THEN
        CREATE POLICY conversations_isolation ON public.conversations FOR ALL USING (auth.uid() = user_id OR auth.uid() IS NULL OR user_id = '00000000-0000-0000-0000-000000000001'::uuid);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'messages_isolation') THEN
        CREATE POLICY messages_isolation ON public.messages FOR ALL USING (
            auth.uid() IS NULL OR EXISTS (SELECT 1 FROM public.conversations WHERE id = messages.conversation_id AND (user_id = auth.uid() OR user_id = '00000000-0000-0000-0000-000000000001'::uuid))
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'memories_isolation') THEN
        CREATE POLICY memories_isolation ON public.memories FOR ALL USING (auth.uid() = user_id OR auth.uid() IS NULL OR user_id = '00000000-0000-0000-0000-000000000001'::uuid);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'goals_isolation') THEN
        CREATE POLICY goals_isolation ON public.goals FOR ALL USING (auth.uid() = user_id OR auth.uid() IS NULL OR user_id = '00000000-0000-0000-0000-000000000001'::uuid);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tasks_isolation') THEN
        CREATE POLICY tasks_isolation ON public.tasks FOR ALL USING (
            auth.uid() IS NULL OR EXISTS (SELECT 1 FROM public.goals WHERE id = tasks.goal_id AND (user_id = auth.uid() OR user_id = '00000000-0000-0000-0000-000000000001'::uuid))
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tool_executions_isolation') THEN
        CREATE POLICY tool_executions_isolation ON public.tool_executions FOR ALL USING (auth.uid() = user_id OR auth.uid() IS NULL OR user_id = '00000000-0000-0000-0000-000000000001'::uuid);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'permissions_isolation') THEN
        CREATE POLICY permissions_isolation ON public.permissions FOR ALL USING (auth.uid() = user_id OR auth.uid() IS NULL OR user_id = '00000000-0000-0000-0000-000000000001'::uuid);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'events_isolation') THEN
        CREATE POLICY events_isolation ON public.events FOR ALL USING (auth.uid() = user_id OR auth.uid() IS NULL OR user_id = '00000000-0000-0000-0000-000000000001'::uuid);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'settings_isolation') THEN
        CREATE POLICY settings_isolation ON public.system_settings FOR ALL USING (auth.uid() = user_id OR auth.uid() IS NULL OR user_id = '00000000-0000-0000-0000-000000000001'::uuid);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'audit_logs_read_only') THEN
        CREATE POLICY audit_logs_read_only ON public.audit_logs FOR SELECT USING (auth.uid() = user_id OR auth.uid() IS NULL OR user_id = '00000000-0000-0000-0000-000000000001'::uuid);
    END IF;
END $$;

-- Semantic Memory Vector Search Function
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
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.content,
    m.memory_type,
    m.importance_score,
    (1 - (m.embedding <=> query_embedding))::FLOAT AS similarity
  FROM public.memories m
  WHERE (filter_user_id IS NULL OR m.user_id = filter_user_id)
    AND m.embedding IS NOT NULL
    AND 1 - (m.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
