-- Migration: Add JSON driver identification columns to driver_session_results
-- This stores essential driver data from JSON as proper columns instead of buried in JSONB

-- Add columns for JSON driver data
ALTER TABLE driver_session_results 
ADD COLUMN IF NOT EXISTS json_driver_id INTEGER,
ADD COLUMN IF NOT EXISTS json_driver_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS json_team_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS json_car_number INTEGER;

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_driver_session_results_json_driver_id 
ON driver_session_results(json_driver_id);

CREATE INDEX IF NOT EXISTS idx_driver_session_results_json_driver_name 
ON driver_session_results(json_driver_name);

-- Backfill existing records from additional_data (optional - for existing data)
-- This extracts data from JSONB for records that don't have these columns populated
UPDATE driver_session_results
SET 
  json_driver_id = (additional_data->'participantData'->>'driver-id')::INTEGER,
  json_driver_name = COALESCE(
    additional_data->>'driverName',
    additional_data->>'driver-name',
    additional_data->'participantData'->>'name'
  ),
  json_team_name = COALESCE(
    additional_data->>'team',
    additional_data->'participantData'->>'team-id'
  ),
  json_car_number = COALESCE(
    (additional_data->>'carNumber')::INTEGER,
    (additional_data->>'race-number')::INTEGER,
    (additional_data->'participantData'->>'race-number')::INTEGER
  )
WHERE json_driver_id IS NULL 
  AND additional_data IS NOT NULL
  AND additional_data->'participantData' IS NOT NULL;

