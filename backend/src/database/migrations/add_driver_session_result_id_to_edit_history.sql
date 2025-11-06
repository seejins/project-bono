-- Migration: Add driver_session_result_id to race_edit_history
-- This allows direct UUID-based matching instead of complex JSONB queries

-- Add column for direct driver_session_results reference
ALTER TABLE race_edit_history 
ADD COLUMN IF NOT EXISTS driver_session_result_id UUID REFERENCES driver_session_results(id) ON DELETE CASCADE;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_race_edit_history_driver_session_result_id 
ON race_edit_history(driver_session_result_id);

-- Backfill existing records (optional - for existing data)
-- This attempts to match existing edit history records to driver_session_results
-- by matching session_result_id + driver-id from JSONB
UPDATE race_edit_history reh
SET driver_session_result_id = (
  SELECT dsr.id
  FROM driver_session_results dsr
  WHERE dsr.session_result_id = reh.session_result_id
    AND (
      -- Match by user_id if available
      (reh.user_id IS NOT NULL AND dsr.user_id = reh.user_id) OR
      -- Match by driver-id from JSONB when user_id is NULL
      (reh.user_id IS NULL 
       AND reh.old_value->>'driver_id' IS NOT NULL
       AND (dsr.additional_data->'participantData'->>'driver-id')::text = reh.old_value->>'driver_id')
    )
  LIMIT 1
)
WHERE driver_session_result_id IS NULL
  AND reh.session_result_id IS NOT NULL;

