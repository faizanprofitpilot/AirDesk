-- ============================================================================
-- AirDesk Complete Database Schema
-- Run this in your Supabase SQL Editor to set up the complete AirDesk database
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- FIRMS TABLE (HVAC Business Configuration)
-- ============================================================================
CREATE TABLE IF NOT EXISTS firms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Business Information
  firm_name TEXT NOT NULL, -- Primary business name field (used throughout codebase)
  business_name TEXT, -- Alias for firm_name (for backward compatibility)
  agent_name TEXT DEFAULT 'Jessica',
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  
  -- Notification Settings
  notify_emails TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  cc_emails TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Business Hours
  business_hours_open TEXT DEFAULT '09:00',
  business_hours_close TEXT DEFAULT '17:00',
  after_hours_handling TEXT DEFAULT 'collect_scheduling' CHECK (after_hours_handling IN ('message_only', 'collect_scheduling')),
  
  -- Scheduling Settings
  default_next_available_slot TEXT DEFAULT 'Tomorrow morning at 8:00 a.m.',
  
  -- Service Call Fee Settings
  service_call_fee NUMERIC(10, 2) DEFAULT 99,
  service_fee_enabled BOOLEAN DEFAULT TRUE,
  
  -- Ticket Settings
  send_incomplete_tickets BOOLEAN DEFAULT FALSE,
  
  -- Telephony (Twilio + Vapi)
  inbound_number_e164 TEXT,
  twilio_phone_number_sid TEXT,
  twilio_number TEXT,
  vapi_phone_number TEXT,
  vapi_phone_number_id TEXT,
  vapi_assistant_id TEXT,
  telephony_provider TEXT,
  
  -- AI Receptionist Settings
  ai_greeting_custom TEXT,
  ai_custom_prompt TEXT,
  ai_knowledge_base TEXT,
  
  -- Stripe Subscription
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired', 'unpaid', 'inactive')),
  subscription_plan TEXT CHECK (subscription_plan IN ('starter', 'professional', 'turbo')),
  subscription_current_period_end TIMESTAMP WITH TIME ZONE,
  subscription_cancel_at_period_end BOOLEAN DEFAULT FALSE,
  
  -- Legacy fields (kept for backward compatibility)
  forward_to_number TEXT,
  mode TEXT DEFAULT 'both' CHECK (mode IN ('after_hours', 'failover', 'both')),
  open_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5],
  open_time TEXT DEFAULT '09:00',
  close_time TEXT DEFAULT '17:00',
  failover_ring_seconds INTEGER DEFAULT 20,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- CALLS TABLE (Service Call Records)
-- ============================================================================
CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  
  -- Call Identification
  twilio_call_sid TEXT,
  vapi_conversation_id TEXT,
  
  -- Call Details
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  call_duration_minutes NUMERIC(10, 2),
  
  -- Call Routing
  route_reason TEXT CHECK (route_reason IN ('after_hours', 'no_answer', 'manual_test', 'vapi_inbound')),
  
  -- Call Status
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'transcribing', 'summarizing', 'sending_email', 'emailed', 'error')),
  urgency TEXT NOT NULL DEFAULT 'normal' CHECK (urgency IN ('normal', 'high', 'emergency_redirected', 'ASAP', 'can wait')),
  
  -- Call Data
  recording_url TEXT,
  transcript_text TEXT,
  intake_json JSONB,
  summary_json JSONB,
  call_category TEXT,
  error_message TEXT
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Firms indexes
CREATE INDEX IF NOT EXISTS idx_firms_owner_user_id ON firms(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_firms_firm_name ON firms(firm_name);
CREATE INDEX IF NOT EXISTS idx_firms_business_name ON firms(business_name);
CREATE INDEX IF NOT EXISTS idx_firms_stripe_customer_id ON firms(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_firms_stripe_subscription_id ON firms(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_firms_subscription_status ON firms(subscription_status);
CREATE INDEX IF NOT EXISTS idx_firms_twilio_phone_number_sid ON firms(twilio_phone_number_sid);
CREATE INDEX IF NOT EXISTS idx_firms_vapi_phone_number_id ON firms(vapi_phone_number_id);
CREATE INDEX IF NOT EXISTS idx_firms_inbound_number_e164 ON firms(inbound_number_e164);
CREATE INDEX IF NOT EXISTS idx_firms_vapi_phone_number ON firms(vapi_phone_number);
CREATE INDEX IF NOT EXISTS idx_firms_vapi_assistant_id ON firms(vapi_assistant_id);
CREATE INDEX IF NOT EXISTS idx_firms_twilio_number ON firms(twilio_number);

-- Calls indexes
CREATE INDEX IF NOT EXISTS idx_calls_firm_id ON calls(firm_id);
CREATE INDEX IF NOT EXISTS idx_calls_twilio_call_sid ON calls(twilio_call_sid);
CREATE INDEX IF NOT EXISTS idx_calls_vapi_conversation_id ON calls(vapi_conversation_id);
CREATE INDEX IF NOT EXISTS idx_calls_started_at ON calls(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_urgency ON calls(urgency);
CREATE INDEX IF NOT EXISTS idx_calls_call_category ON calls(call_category);
CREATE INDEX IF NOT EXISTS idx_calls_firm_id_started_at ON calls(firm_id, started_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for clean reinstall)
DROP POLICY IF EXISTS "Users can view their own firms" ON firms;
DROP POLICY IF EXISTS "Users can insert their own firms" ON firms;
DROP POLICY IF EXISTS "Users can update their own firms" ON firms;
DROP POLICY IF EXISTS "Users can delete their own firms" ON firms;
DROP POLICY IF EXISTS "Users can view calls for their firms" ON calls;
DROP POLICY IF EXISTS "Users can insert calls for their firms" ON calls;
DROP POLICY IF EXISTS "Users can update calls for their firms" ON calls;
DROP POLICY IF EXISTS "Users can delete calls for their firms" ON calls;

-- Firms policies: users can only access their own business
CREATE POLICY "Users can view their own firms"
  ON firms FOR SELECT
  USING (auth.uid() = owner_user_id);

CREATE POLICY "Users can insert their own firms"
  ON firms FOR INSERT
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Users can update their own firms"
  ON firms FOR UPDATE
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Users can delete their own firms"
  ON firms FOR DELETE
  USING (auth.uid() = owner_user_id);

-- Calls policies: users can only access calls for their business
CREATE POLICY "Users can view calls for their firms"
  ON calls FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM firms
      WHERE firms.id = calls.firm_id
      AND firms.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert calls for their firms"
  ON calls FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM firms
      WHERE firms.id = calls.firm_id
      AND firms.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update calls for their firms"
  ON calls FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM firms
      WHERE firms.id = calls.firm_id
      AND firms.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM firms
      WHERE firms.id = calls.firm_id
      AND firms.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete calls for their firms"
  ON calls FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM firms
      WHERE firms.id = calls.firm_id
      AND firms.owner_user_id = auth.uid()
    )
  );

-- ============================================================================
-- USAGE TRACKING FUNCTIONS
-- ============================================================================

-- Function to calculate call duration in minutes
CREATE OR REPLACE FUNCTION calculate_call_duration_minutes(
  call_started_at TIMESTAMP WITH TIME ZONE,
  call_ended_at TIMESTAMP WITH TIME ZONE
) RETURNS NUMERIC(10, 2) AS $$
BEGIN
  IF call_ended_at IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Calculate duration in minutes (rounded to 2 decimal places)
  RETURN ROUND(EXTRACT(EPOCH FROM (call_ended_at - call_started_at)) / 60.0, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get usage for a business in a billing period
CREATE OR REPLACE FUNCTION get_firm_usage_minutes(
  p_firm_id UUID,
  p_period_start TIMESTAMP WITH TIME ZONE,
  p_period_end TIMESTAMP WITH TIME ZONE
) RETURNS NUMERIC(10, 2) AS $$
DECLARE
  total_minutes NUMERIC(10, 2);
BEGIN
  SELECT COALESCE(SUM(call_duration_minutes), 0)
  INTO total_minutes
  FROM calls
  WHERE firm_id = p_firm_id
    AND started_at >= p_period_start
    AND started_at < p_period_end
    AND call_duration_minutes IS NOT NULL;
  
  RETURN COALESCE(total_minutes, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get current billing period usage
CREATE OR REPLACE FUNCTION get_current_period_usage_minutes(p_firm_id UUID)
RETURNS NUMERIC(10, 2) AS $$
DECLARE
  period_start TIMESTAMP WITH TIME ZONE;
  period_end TIMESTAMP WITH TIME ZONE;
  firm_subscription_period_end TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get subscription period end from firms table
  SELECT subscription_current_period_end
  INTO firm_subscription_period_end
  FROM firms
  WHERE id = p_firm_id;
  
  -- If no subscription period, use current month
  IF firm_subscription_period_end IS NULL THEN
    period_start := date_trunc('month', NOW());
    period_end := date_trunc('month', NOW()) + INTERVAL '1 month';
  ELSE
    -- Calculate period start (30 days before period end)
    period_start := firm_subscription_period_end - INTERVAL '30 days';
    period_end := firm_subscription_period_end;
  END IF;
  
  RETURN get_firm_usage_minutes(p_firm_id, period_start, period_end);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to automatically calculate duration when call ends
CREATE OR REPLACE FUNCTION update_call_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ended_at IS NOT NULL AND (OLD.ended_at IS NULL OR OLD.ended_at != NEW.ended_at) THEN
    NEW.call_duration_minutes := calculate_call_duration_minutes(NEW.started_at, NEW.ended_at);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_update_call_duration ON calls;
CREATE TRIGGER trigger_update_call_duration
  BEFORE UPDATE ON calls
  FOR EACH ROW
  WHEN (NEW.ended_at IS NOT NULL)
  EXECUTE FUNCTION update_call_duration();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE firms IS 'HVAC business configuration and settings';
COMMENT ON COLUMN firms.firm_name IS 'Name of the HVAC business (primary field)';
COMMENT ON COLUMN firms.business_name IS 'Alias for firm_name (for backward compatibility)';
COMMENT ON COLUMN firms.agent_name IS 'Name of the AI receptionist agent';
COMMENT ON COLUMN firms.notify_emails IS 'Primary notification email addresses for service tickets';
COMMENT ON COLUMN firms.cc_emails IS 'CC email addresses for service tickets';
COMMENT ON COLUMN firms.business_hours_open IS 'Business opening time (HH:MM format)';
COMMENT ON COLUMN firms.business_hours_close IS 'Business closing time (HH:MM format)';
COMMENT ON COLUMN firms.after_hours_handling IS 'How to handle after-hours calls: message_only or collect_scheduling';
COMMENT ON COLUMN firms.default_next_available_slot IS 'Default text for next available appointment slot';
COMMENT ON COLUMN firms.service_call_fee IS 'Service call fee amount';
COMMENT ON COLUMN firms.service_fee_enabled IS 'Whether to mention service call fee to customers';
COMMENT ON COLUMN firms.send_incomplete_tickets IS 'Whether to send email tickets for incomplete calls';
COMMENT ON COLUMN firms.inbound_number_e164 IS 'E.164 formatted phone number (e.g., +15551234567)';
COMMENT ON COLUMN firms.vapi_assistant_id IS 'Vapi assistant ID for AI receptionist';
COMMENT ON COLUMN firms.ai_greeting_custom IS 'Custom greeting for AI receptionist. Use {{business_name}} and {{agent_name}} placeholders.';
COMMENT ON COLUMN firms.ai_custom_prompt IS 'Custom system prompt for AI receptionist to customize behavior and communication style';
COMMENT ON COLUMN firms.ai_knowledge_base IS 'Additional context about the HVAC business to help AI receptionist';

COMMENT ON TABLE calls IS 'Service call records from HVAC customers';
COMMENT ON COLUMN calls.intake_json IS 'Structured intake data (callerName, callerPhone, addressLine1, city, state, issueCategory, urgency, etc.)';
COMMENT ON COLUMN calls.summary_json IS 'Generated ticket summary with ticketId, status, priority, etc.';
COMMENT ON COLUMN calls.call_category IS 'Type of call category (e.g., "HVAC Service Request", "Emergency Call", etc.)';
COMMENT ON COLUMN calls.call_duration_minutes IS 'Call duration in minutes, automatically calculated';

COMMENT ON FUNCTION calculate_call_duration_minutes IS 'Calculates call duration in minutes from start and end timestamps';
COMMENT ON FUNCTION get_firm_usage_minutes IS 'Gets total minutes used by a business in a specific time period';
COMMENT ON FUNCTION get_current_period_usage_minutes IS 'Gets current billing period usage in minutes for a business';

-- ============================================================================
-- INITIAL DATA MIGRATION (Optional - for existing data)
-- ============================================================================

-- If you have existing data with business_name, migrate it to firm_name
-- UPDATE firms SET firm_name = business_name WHERE firm_name IS NULL AND business_name IS NOT NULL;

-- ============================================================================
-- SCHEMA COMPLETE
-- ============================================================================
