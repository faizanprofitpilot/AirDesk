-- Add ticket_status column to calls table for Dispatch Board
-- This tracks the dispatch workflow status (separate from call processing status)

-- Add ticket_status column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calls' AND column_name = 'ticket_status'
  ) THEN
    ALTER TABLE calls ADD COLUMN ticket_status TEXT DEFAULT 'READY' 
      CHECK (ticket_status IN ('READY', 'DISPATCHED', 'COMPLETED'));
    
    -- Create index for faster queries
    CREATE INDEX IF NOT EXISTS idx_calls_ticket_status ON calls(ticket_status);
    
    -- Set default: emails that were sent should be DISPATCHED, others READY
    UPDATE calls 
    SET ticket_status = CASE 
      WHEN status = 'emailed' THEN 'DISPATCHED'
      ELSE 'READY'
    END
    WHERE ticket_status IS NULL;
    
    RAISE NOTICE 'Column ticket_status added to calls table with default values.';
  ELSE
    RAISE NOTICE 'Column ticket_status already exists in calls table.';
  END IF;
END $$;
