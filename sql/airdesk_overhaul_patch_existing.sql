-- ============================================================================
-- AirDesk Overhaul Patch (In-Place)
-- Purpose: Upgrade an existing legacy Supabase schema to AirDesk
-- without dropping tables. Safe to run multiple times (idempotent).
--
-- Run in Supabase SQL Editor (as project owner).
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- FIRMS TABLE PATCH
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.firms') IS NULL THEN
    RAISE EXCEPTION 'public.firms does not exist. Create tables first or run airdesk_complete_schema.sql in a fresh project.';
  END IF;
END $$;

-- Ensure core columns exist
ALTER TABLE public.firms
  ADD COLUMN IF NOT EXISTS firm_name TEXT,
  ADD COLUMN IF NOT EXISTS business_name TEXT,
  ADD COLUMN IF NOT EXISTS agent_name TEXT DEFAULT 'Jessica',
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York',
  ADD COLUMN IF NOT EXISTS notify_emails TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS cc_emails TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS business_hours_open TEXT DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS business_hours_close TEXT DEFAULT '17:00',
  ADD COLUMN IF NOT EXISTS after_hours_handling TEXT DEFAULT 'collect_scheduling',
  ADD COLUMN IF NOT EXISTS default_next_available_slot TEXT DEFAULT 'Tomorrow morning at 8:00 a.m.',
  ADD COLUMN IF NOT EXISTS service_call_fee NUMERIC(10, 2) DEFAULT 99,
  ADD COLUMN IF NOT EXISTS service_fee_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS send_incomplete_tickets BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS inbound_number_e164 TEXT,
  ADD COLUMN IF NOT EXISTS twilio_phone_number_sid TEXT,
  ADD COLUMN IF NOT EXISTS twilio_number TEXT,
  ADD COLUMN IF NOT EXISTS vapi_phone_number TEXT,
  ADD COLUMN IF NOT EXISTS vapi_phone_number_id TEXT,
  ADD COLUMN IF NOT EXISTS vapi_assistant_id TEXT,
  ADD COLUMN IF NOT EXISTS telephony_provider TEXT,
  ADD COLUMN IF NOT EXISTS ai_greeting_custom TEXT,
  ADD COLUMN IF NOT EXISTS ai_custom_prompt TEXT,
  ADD COLUMN IF NOT EXISTS ai_knowledge_base TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS subscription_plan TEXT,
  ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill name fields (support any combination of old/new)
UPDATE public.firms
SET firm_name = COALESCE(firm_name, business_name, (CASE WHEN EXISTS(
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='firms' AND column_name='firm_name'
    ) THEN firm_name ELSE NULL END), 'Unnamed Business')
WHERE firm_name IS NULL;

-- If legacy schema had firm_name as the only name, also backfill business_name for convenience
UPDATE public.firms
SET business_name = COALESCE(business_name, firm_name)
WHERE business_name IS NULL AND firm_name IS NOT NULL;

-- If business_name exists and is NOT NULL, make it nullable (AirDesk uses firm_name as primary)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='firms' AND column_name='business_name'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='firms' AND column_name='business_name' AND is_nullable='NO'
    ) THEN
      ALTER TABLE public.firms ALTER COLUMN business_name DROP NOT NULL;
    END IF;
  END IF;
END $$;

-- Ensure firm_name is NOT NULL
ALTER TABLE public.firms
  ALTER COLUMN firm_name SET NOT NULL;

-- Legacy compatibility: forward_to_number used to be NOT NULL.
-- Our current app doesn't use it; make it nullable so inserts don't 400.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='firms' AND column_name='forward_to_number'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='firms' AND column_name='forward_to_number' AND is_nullable='NO'
    ) THEN
      ALTER TABLE public.firms ALTER COLUMN forward_to_number DROP NOT NULL;
    END IF;
  END IF;
END $$;

-- Backfill business hours from legacy open_time/close_time if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='firms' AND column_name='open_time'
  ) THEN
    EXECUTE 'UPDATE public.firms SET business_hours_open = COALESCE(business_hours_open, open_time) WHERE business_hours_open IS NULL';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='firms' AND column_name='close_time'
  ) THEN
    EXECUTE 'UPDATE public.firms SET business_hours_close = COALESCE(business_hours_close, close_time) WHERE business_hours_close IS NULL';
  END IF;
END $$;

-- Drop any existing check constraints that reference after_hours_handling (names vary)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'firms'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%after_hours_handling%'
  LOOP
    EXECUTE format('ALTER TABLE public.firms DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

-- Re-add after_hours_handling check (AirDesk values)
ALTER TABLE public.firms
  ADD CONSTRAINT firms_after_hours_handling_check
  CHECK (after_hours_handling IS NULL OR after_hours_handling IN ('message_only', 'collect_scheduling'));

-- Subscription checks (safe; drop old constraints that reference these columns)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'firms'
      AND c.contype = 'c'
      AND (
        pg_get_constraintdef(c.oid) ILIKE '%subscription_status%'
        OR pg_get_constraintdef(c.oid) ILIKE '%subscription_plan%'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.firms DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.firms
  ADD CONSTRAINT firms_subscription_status_check
  CHECK (subscription_status IS NULL OR subscription_status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired', 'unpaid', 'inactive'));

ALTER TABLE public.firms
  ADD CONSTRAINT firms_subscription_plan_check
  CHECK (subscription_plan IS NULL OR subscription_plan IN ('starter', 'professional', 'turbo'));

-- Helpful indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_firms_owner_user_id ON public.firms(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_firms_firm_name ON public.firms(firm_name);
CREATE INDEX IF NOT EXISTS idx_firms_vapi_phone_number_id ON public.firms(vapi_phone_number_id);
CREATE INDEX IF NOT EXISTS idx_firms_vapi_assistant_id ON public.firms(vapi_assistant_id);
CREATE INDEX IF NOT EXISTS idx_firms_inbound_number_e164 ON public.firms(inbound_number_e164);
CREATE INDEX IF NOT EXISTS idx_firms_stripe_customer_id ON public.firms(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_firms_stripe_subscription_id ON public.firms(stripe_subscription_id);

-- ============================================================================
-- CALLS TABLE PATCH
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.calls') IS NULL THEN
    -- Create calls table if it doesn't exist at all
    EXECUTE $sql$
      CREATE TABLE public.calls (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
        twilio_call_sid TEXT,
        vapi_conversation_id TEXT,
        from_number TEXT NOT NULL,
        to_number TEXT NOT NULL,
        started_at TIMESTAMPTZ DEFAULT NOW(),
        ended_at TIMESTAMPTZ,
        call_duration_minutes NUMERIC(10, 2),
        route_reason TEXT,
        status TEXT NOT NULL DEFAULT 'in_progress',
        urgency TEXT NOT NULL DEFAULT 'normal',
        recording_url TEXT,
        transcript_text TEXT,
        intake_json JSONB,
        summary_json JSONB,
        call_category TEXT,
        error_message TEXT
      );
    $sql$;
  END IF;
END $$;

ALTER TABLE public.calls
  ADD COLUMN IF NOT EXISTS vapi_conversation_id TEXT,
  ADD COLUMN IF NOT EXISTS call_duration_minutes NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS call_category TEXT,
  ADD COLUMN IF NOT EXISTS route_reason TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'in_progress',
  ADD COLUMN IF NOT EXISTS urgency TEXT DEFAULT 'normal';

-- Drop old check constraints that reference route_reason/status/urgency (names vary)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'calls'
      AND c.contype = 'c'
      AND (
        pg_get_constraintdef(c.oid) ILIKE '%route_reason%'
        OR pg_get_constraintdef(c.oid) ILIKE '%status%'
        OR pg_get_constraintdef(c.oid) ILIKE '%urgency%'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.calls DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.calls
  ADD CONSTRAINT calls_route_reason_check
  CHECK (route_reason IS NULL OR route_reason IN ('after_hours', 'no_answer', 'manual_test', 'vapi_inbound'));

ALTER TABLE public.calls
  ADD CONSTRAINT calls_status_check
  CHECK (status IS NULL OR status IN ('in_progress', 'transcribing', 'summarizing', 'sending_email', 'emailed', 'error'));

ALTER TABLE public.calls
  ADD CONSTRAINT calls_urgency_check
  CHECK (urgency IS NULL OR urgency IN ('normal', 'high', 'emergency_redirected', 'ASAP', 'can wait'));

CREATE INDEX IF NOT EXISTS idx_calls_firm_id ON public.calls(firm_id);
CREATE INDEX IF NOT EXISTS idx_calls_started_at ON public.calls(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_status ON public.calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_urgency ON public.calls(urgency);
CREATE INDEX IF NOT EXISTS idx_calls_call_category ON public.calls(call_category);
CREATE INDEX IF NOT EXISTS idx_calls_firm_id_started_at ON public.calls(firm_id, started_at DESC);

-- ============================================================================
-- USAGE FUNCTIONS + TRIGGER (idempotent)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_call_duration_minutes(
  call_started_at TIMESTAMPTZ,
  call_ended_at TIMESTAMPTZ
) RETURNS NUMERIC(10, 2) AS $$
BEGIN
  IF call_ended_at IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN ROUND(EXTRACT(EPOCH FROM (call_ended_at - call_started_at)) / 60.0, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.get_firm_usage_minutes(
  p_firm_id UUID,
  p_period_start TIMESTAMPTZ,
  p_period_end TIMESTAMPTZ
) RETURNS NUMERIC(10, 2) AS $$
DECLARE
  total_minutes NUMERIC(10, 2);
BEGIN
  SELECT COALESCE(SUM(call_duration_minutes), 0)
  INTO total_minutes
  FROM public.calls
  WHERE firm_id = p_firm_id
    AND started_at >= p_period_start
    AND started_at < p_period_end
    AND call_duration_minutes IS NOT NULL;
  RETURN COALESCE(total_minutes, 0);
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.get_current_period_usage_minutes(p_firm_id UUID)
RETURNS NUMERIC(10, 2) AS $$
DECLARE
  period_start TIMESTAMPTZ;
  period_end TIMESTAMPTZ;
  firm_subscription_period_end TIMESTAMPTZ;
BEGIN
  SELECT subscription_current_period_end
  INTO firm_subscription_period_end
  FROM public.firms
  WHERE id = p_firm_id;

  IF firm_subscription_period_end IS NULL THEN
    period_start := date_trunc('month', NOW());
    period_end := date_trunc('month', NOW()) + INTERVAL '1 month';
  ELSE
    period_start := firm_subscription_period_end - INTERVAL '30 days';
    period_end := firm_subscription_period_end;
  END IF;

  RETURN public.get_firm_usage_minutes(p_firm_id, period_start, period_end);
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.update_call_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ended_at IS NOT NULL AND (OLD.ended_at IS NULL OR OLD.ended_at != NEW.ended_at) THEN
    NEW.call_duration_minutes := public.calculate_call_duration_minutes(NEW.started_at, NEW.ended_at);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_call_duration ON public.calls;
CREATE TRIGGER trigger_update_call_duration
  BEFORE UPDATE ON public.calls
  FOR EACH ROW
  WHEN (NEW.ended_at IS NOT NULL)
  EXECUTE FUNCTION public.update_call_duration();

-- ============================================================================
-- RLS POLICIES (recreate cleanly)
-- ============================================================================

ALTER TABLE public.firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (names vary across installs; try common names)
DROP POLICY IF EXISTS "Users can view their own firms" ON public.firms;
DROP POLICY IF EXISTS "Users can insert their own firms" ON public.firms;
DROP POLICY IF EXISTS "Users can update their own firms" ON public.firms;
DROP POLICY IF EXISTS "Users can delete their own firms" ON public.firms;
DROP POLICY IF EXISTS "Users can view calls for their firms" ON public.calls;
DROP POLICY IF EXISTS "Users can insert calls for their firms" ON public.calls;
DROP POLICY IF EXISTS "Users can update calls for their firms" ON public.calls;
DROP POLICY IF EXISTS "Users can delete calls for their firms" ON public.calls;

-- Firms policies
CREATE POLICY "Users can view their own firms"
  ON public.firms FOR SELECT
  USING (auth.uid() = owner_user_id);

CREATE POLICY "Users can insert their own firms"
  ON public.firms FOR INSERT
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Users can update their own firms"
  ON public.firms FOR UPDATE
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Users can delete their own firms"
  ON public.firms FOR DELETE
  USING (auth.uid() = owner_user_id);

-- Calls policies
CREATE POLICY "Users can view calls for their firms"
  ON public.calls FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.firms
      WHERE public.firms.id = public.calls.firm_id
      AND public.firms.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert calls for their firms"
  ON public.calls FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.firms
      WHERE public.firms.id = public.calls.firm_id
      AND public.firms.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update calls for their firms"
  ON public.calls FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.firms
      WHERE public.firms.id = public.calls.firm_id
      AND public.firms.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.firms
      WHERE public.firms.id = public.calls.firm_id
      AND public.firms.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete calls for their firms"
  ON public.calls FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.firms
      WHERE public.firms.id = public.calls.firm_id
      AND public.firms.owner_user_id = auth.uid()
    )
  );

-- ============================================================================
-- QUICK DIAGNOSTIC (optional)
-- After running, this will show the key columns we expect to exist:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema='public' AND table_name='firms'
-- ORDER BY ordinal_position;
-- ============================================================================

