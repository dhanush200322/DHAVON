-- ==============================================================================
-- DHAVON — Migration 003: Phase 5 Memory, Goals, Tasks, Preferences & Orchestration
-- ==============================================================================

-- 1. MEMORIES ENHANCEMENTS
ALTER TABLE public.memories
    ADD COLUMN IF NOT EXISTS type TEXT,
    ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'conversation',
    ADD COLUMN IF NOT EXISTS confidence FLOAT DEFAULT 1.0,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Drop previous restrictive memory_type check constraint if present and replace with comprehensive check
DO $$ BEGIN
    ALTER TABLE public.memories DROP CONSTRAINT IF EXISTS memories_memory_type_check;
    ALTER TABLE public.memories ADD CONSTRAINT memories_memory_type_check 
        CHECK (LOWER(memory_type) IN ('working', 'episodic', 'semantic', 'preference', 'project', 'goal', 'fact'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Populate type from memory_type if empty
UPDATE public.memories SET type = UPPER(memory_type) WHERE type IS NULL;

-- 2. GOALS ENHANCEMENTS
ALTER TABLE public.goals
    ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS parent_goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $$ BEGIN
    ALTER TABLE public.goals DROP CONSTRAINT IF EXISTS goals_status_check;
    ALTER TABLE public.goals ADD CONSTRAINT goals_status_check 
        CHECK (LOWER(status) IN ('draft', 'active', 'paused', 'blocked', 'completed', 'cancelled', 'achieved', 'abandoned'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 3. TASKS ENHANCEMENTS
ALTER TABLE public.tasks
    ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS priority INT NOT NULL DEFAULT 3,
    ADD COLUMN IF NOT EXISTS dependencies JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS assigned_capability TEXT,
    ADD COLUMN IF NOT EXISTS risk_level TEXT NOT NULL DEFAULT 'LOW_RISK',
    ADD COLUMN IF NOT EXISTS progress FLOAT NOT NULL DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS result JSONB;

DO $$ BEGIN
    ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
    ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check 
        CHECK (LOWER(status) IN ('pending', 'ready', 'running', 'waiting', 'blocked', 'completed', 'failed', 'cancelled', 'in_progress'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 4. TASK_DEPENDENCIES TABLE
CREATE TABLE IF NOT EXISTS public.task_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    depends_on_task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(task_id, depends_on_task_id)
);
CREATE INDEX IF NOT EXISTS idx_task_deps_task ON public.task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_deps_parent ON public.task_dependencies(depends_on_task_id);

-- 5. VERIFICATION_RESULTS TABLE
CREATE TABLE IF NOT EXISTS public.verification_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
    strategy TEXT NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT false,
    evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_verification_task ON public.verification_results(task_id);
CREATE INDEX IF NOT EXISTS idx_verification_goal ON public.verification_results(goal_id);

-- 6. USER_PREFERENCES TABLE (Separate from generic memories)
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    preference_key TEXT NOT NULL,
    preference_value JSONB NOT NULL,
    confidence FLOAT NOT NULL DEFAULT 1.0,
    conflict_detected BOOLEAN NOT NULL DEFAULT false,
    previous_value JSONB,
    source TEXT DEFAULT 'explicit',
    last_updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, category, preference_key)
);
CREATE INDEX IF NOT EXISTS idx_user_prefs_lookup ON public.user_preferences(user_id, category, preference_key);

-- 7. ORCHESTRATION_RUNS TABLE
CREATE TABLE IF NOT EXISTS public.orchestration_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'RUNNING' CHECK (status IN ('RUNNING', 'PAUSED', 'COMPLETED', 'FAILED', 'BLOCKED')),
    current_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    execution_depth INT NOT NULL DEFAULT 0,
    retry_count INT NOT NULL DEFAULT 0,
    consecutive_failures INT NOT NULL DEFAULT 0,
    pause_reason TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_orch_runs_goal ON public.orchestration_runs(goal_id);
CREATE INDEX IF NOT EXISTS idx_orch_runs_status ON public.orchestration_runs(status);

-- 8. ORCHESTRATION_STEPS TABLE
CREATE TABLE IF NOT EXISTS public.orchestration_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES public.orchestration_runs(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    step_number INT NOT NULL DEFAULT 1,
    action_type TEXT NOT NULL,
    assigned_tool TEXT,
    input_arguments JSONB,
    output_result JSONB,
    verified BOOLEAN DEFAULT false,
    execution_duration_ms INT,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_orch_steps_run ON public.orchestration_steps(run_id);

-- 9. GOAL_EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.goal_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_goal_events_goal ON public.goal_events(goal_id);

-- 10. ENABLE RLS ON NEW TABLES
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orchestration_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orchestration_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'task_deps_isolation') THEN
        CREATE POLICY task_deps_isolation ON public.task_dependencies FOR ALL USING (
            auth.uid() IS NULL OR EXISTS (
                SELECT 1 FROM public.tasks t
                JOIN public.goals g ON g.id = t.goal_id
                WHERE t.id = task_dependencies.task_id AND (g.user_id = auth.uid() OR g.user_id = '00000000-0000-0000-0000-000000000001'::uuid)
            )
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'verification_isolation') THEN
        CREATE POLICY verification_isolation ON public.verification_results FOR ALL USING (
            auth.uid() IS NULL OR EXISTS (
                SELECT 1 FROM public.goals g WHERE g.id = verification_results.goal_id AND (g.user_id = auth.uid() OR g.user_id = '00000000-0000-0000-0000-000000000001'::uuid)
            )
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_prefs_isolation') THEN
        CREATE POLICY user_prefs_isolation ON public.user_preferences FOR ALL USING (
            auth.uid() = user_id OR auth.uid() IS NULL OR user_id = '00000000-0000-0000-0000-000000000001'::uuid
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'orch_runs_isolation') THEN
        CREATE POLICY orch_runs_isolation ON public.orchestration_runs FOR ALL USING (
            auth.uid() IS NULL OR EXISTS (
                SELECT 1 FROM public.goals g WHERE g.id = orchestration_runs.goal_id AND (g.user_id = auth.uid() OR g.user_id = '00000000-0000-0000-0000-000000000001'::uuid)
            )
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'orch_steps_isolation') THEN
        CREATE POLICY orch_steps_isolation ON public.orchestration_steps FOR ALL USING (
            auth.uid() IS NULL OR EXISTS (
                SELECT 1 FROM public.orchestration_runs r
                JOIN public.goals g ON g.id = r.goal_id
                WHERE r.id = orchestration_steps.run_id AND (g.user_id = auth.uid() OR g.user_id = '00000000-0000-0000-0000-000000000001'::uuid)
            )
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'goal_events_isolation') THEN
        CREATE POLICY goal_events_isolation ON public.goal_events FOR ALL USING (
            auth.uid() IS NULL OR EXISTS (
                SELECT 1 FROM public.goals g WHERE g.id = goal_events.goal_id AND (g.user_id = auth.uid() OR g.user_id = '00000000-0000-0000-0000-000000000001'::uuid)
            )
        );
    END IF;
END $$;
