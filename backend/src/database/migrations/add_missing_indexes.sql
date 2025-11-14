-- Migration: Add missing database indexes for common query patterns
-- These indexes optimize frequently used query patterns identified in the codebase

-- Index on driver_session_results.session_result_id (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_driver_session_results_session_result_id 
ON driver_session_results(session_result_id);

-- Index on session_results.race_id (common query pattern)
CREATE INDEX IF NOT EXISTS idx_session_results_race_id 
ON session_results(race_id);

-- Composite index on session_results(race_id, session_type) for WHERE race_id = $1 AND session_type = X patterns
CREATE INDEX IF NOT EXISTS idx_session_results_race_id_session_type 
ON session_results(race_id, session_type);

-- Composite index on driver_session_results(race_id, json_driver_id) for WHERE race_id = $1 AND json_driver_id = $2
-- First, we need to check if lap_times has a race_id column - if not, we'll use the one from session_results JOIN
-- Since driver_session_results doesn't have race_id directly, we'll create an index on session_result_id + json_driver_id
-- and rely on the session_results.race_id index
CREATE INDEX IF NOT EXISTS idx_driver_session_results_session_result_id_json_driver_id 
ON driver_session_results(session_result_id, json_driver_id);

-- Index on lap_times.driver_session_result_id (already exists potentially, but ensure it does)
CREATE INDEX IF NOT EXISTS idx_lap_times_driver_session_result_id 
ON lap_times(driver_session_result_id);

-- Index on lap_times.race_id (common query pattern)
CREATE INDEX IF NOT EXISTS idx_lap_times_race_id 
ON lap_times(race_id);

-- Index on lap_times.driver_id (for user_id queries)
CREATE INDEX IF NOT EXISTS idx_lap_times_driver_id 
ON lap_times(driver_id);

