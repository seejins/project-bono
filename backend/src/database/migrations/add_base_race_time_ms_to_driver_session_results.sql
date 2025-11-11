ALTER TABLE driver_session_results
    ADD COLUMN IF NOT EXISTS base_race_time_ms INTEGER,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

UPDATE driver_session_results
SET base_race_time_ms = total_race_time_ms
WHERE base_race_time_ms IS NULL;

