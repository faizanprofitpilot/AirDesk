-- ============================================================================
-- Migration: Add Missing Columns to Existing Firms Table
-- Run this if you're getting "column does not exist" errors
-- ============================================================================

-- Ensure firm_name exists (codebase primary business name)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'firms' AND column_name = 'firm_name'
  ) THEN
    ALTER TABLE firms ADD COLUMN firm_name TEXT;
    COMMENT ON COLUMN firms.firm_name IS 'Name of the HVAC business (primary field)';

    -- Backfill from business_name if present
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'firms' AND column_name = 'business_name'
    ) THEN
      EXECUTE 'UPDATE firms SET firm_name = business_name WHERE firm_name IS NULL';
    END IF;

    -- Backfill from legacy firm_name? (not applicable if column just added)
    -- Ensure not null with safe default
    UPDATE firms SET firm_name = 'Unnamed Business' WHERE firm_name IS NULL;
    ALTER TABLE firms ALTER COLUMN firm_name SET NOT NULL;
  END IF;
END $$;

-- Add ai_custom_prompt if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'firms' AND column_name = 'ai_custom_prompt'
  ) THEN
    ALTER TABLE firms ADD COLUMN ai_custom_prompt TEXT;
    COMMENT ON COLUMN firms.ai_custom_prompt IS 'Custom system prompt for AI receptionist to customize behavior and communication style';
  END IF;
END $$;

-- Add ai_knowledge_base if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'firms' AND column_name = 'ai_knowledge_base'
  ) THEN
    ALTER TABLE firms ADD COLUMN ai_knowledge_base TEXT;
    COMMENT ON COLUMN firms.ai_knowledge_base IS 'Additional context about the HVAC business to help AI receptionist';
  END IF;
END $$;

-- Add business_name if it doesn't exist (alias for firm_name)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'firms' AND column_name = 'business_name'
  ) THEN
    ALTER TABLE firms ADD COLUMN business_name TEXT;
    COMMENT ON COLUMN firms.business_name IS 'Alias for firm_name (for backward compatibility)';
  ELSE
    -- If it exists but is NOT NULL, make it nullable (AirDesk primary is firm_name)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'firms' AND column_name = 'business_name' AND is_nullable = 'NO'
    ) THEN
      ALTER TABLE firms ALTER COLUMN business_name DROP NOT NULL;
    END IF;
  END IF;
END $$;

-- Legacy compatibility: forward_to_number was NOT NULL in old schema.
-- Our current app doesn't use it, but inserts will fail if it remains required.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'firms' AND column_name = 'forward_to_number'
  ) THEN
    -- Drop NOT NULL if present
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'firms'
        AND column_name = 'forward_to_number'
        AND is_nullable = 'NO'
    ) THEN
      ALTER TABLE firms ALTER COLUMN forward_to_number DROP NOT NULL;
    END IF;
  ELSE
    -- If column doesn't exist at all, add it as nullable (legacy)
    ALTER TABLE firms ADD COLUMN forward_to_number TEXT;
  END IF;
END $$;

-- Add business_hours_open if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'firms' AND column_name = 'business_hours_open'
  ) THEN
    ALTER TABLE firms ADD COLUMN business_hours_open TEXT DEFAULT '09:00';
    COMMENT ON COLUMN firms.business_hours_open IS 'Business opening time (HH:MM format)';

    -- Backfill from legacy open_time if present
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'firms' AND column_name = 'open_time'
    ) THEN
      EXECUTE 'UPDATE firms SET business_hours_open = open_time WHERE business_hours_open IS NULL';
    END IF;
  END IF;
END $$;

-- Add business_hours_close if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'firms' AND column_name = 'business_hours_close'
  ) THEN
    ALTER TABLE firms ADD COLUMN business_hours_close TEXT DEFAULT '17:00';
    COMMENT ON COLUMN firms.business_hours_close IS 'Business closing time (HH:MM format)';

    -- Backfill from legacy close_time if present
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'firms' AND column_name = 'close_time'
    ) THEN
      EXECUTE 'UPDATE firms SET business_hours_close = close_time WHERE business_hours_close IS NULL';
    END IF;
  END IF;
END $$;

-- Update after_hours_handling constraint if it exists with old values
DO $$ 
BEGIN
  -- Drop the old constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'firms_after_hours_handling_check'
  ) THEN
    ALTER TABLE firms DROP CONSTRAINT firms_after_hours_handling_check;
  END IF;
  
  -- Add the new constraint
  ALTER TABLE firms ADD CONSTRAINT firms_after_hours_handling_check 
    CHECK (after_hours_handling IS NULL OR after_hours_handling IN ('message_only', 'collect_scheduling'));
END $$;

-- Ensure firm_name is NOT NULL if it's currently nullable
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'firms' 
    AND column_name = 'firm_name' 
    AND is_nullable = 'YES'
  ) THEN
    -- First, set any NULL values to a default
    UPDATE firms SET firm_name = 'Unnamed Business' WHERE firm_name IS NULL;
    -- Then make it NOT NULL
    ALTER TABLE firms ALTER COLUMN firm_name SET NOT NULL;
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_firms_firm_name ON firms(firm_name);
CREATE INDEX IF NOT EXISTS idx_firms_business_name ON firms(business_name);

-- ============================================================================
-- Migration Complete
-- ============================================================================
