-- Migration: Add comprehensive lap analytics columns to lap_times table
-- This migration adds all fields needed for driver race analytics page

-- Add columns from lap-history-data
ALTER TABLE lap_times
  ADD COLUMN IF NOT EXISTS sector1_time_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS sector2_time_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS sector3_time_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS lap_valid_bit_flags INTEGER;

-- Add columns from per-lap-info
ALTER TABLE lap_times
  ADD COLUMN IF NOT EXISTS track_position INTEGER,
  ADD COLUMN IF NOT EXISTS tire_age_laps INTEGER,
  ADD COLUMN IF NOT EXISTS top_speed_kmph INTEGER,
  ADD COLUMN IF NOT EXISTS max_safety_car_status VARCHAR(50),
  ADD COLUMN IF NOT EXISTS vehicle_fia_flags VARCHAR(50),
  ADD COLUMN IF NOT EXISTS pit_stop BOOLEAN DEFAULT FALSE;

-- Add ERS and fuel data from per-lap-info car-status-data
ALTER TABLE lap_times
  ADD COLUMN IF NOT EXISTS ers_store_energy DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS ers_deployed_this_lap DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS ers_deploy_mode VARCHAR(50),
  ADD COLUMN IF NOT EXISTS fuel_in_tank DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS fuel_remaining_laps DECIMAL(10,2);

-- Add gap data (from lap-data or calculated)
ALTER TABLE lap_times
  ADD COLUMN IF NOT EXISTS gap_to_leader_ms INTEGER,
  ADD COLUMN IF NOT EXISTS gap_to_position_ahead_ms INTEGER;

-- Add JSONB columns for complex nested data
ALTER TABLE lap_times
  ADD COLUMN IF NOT EXISTS car_damage_data JSONB,
  ADD COLUMN IF NOT EXISTS tyre_sets_data JSONB;

-- Create indexes for frequently queried fields
CREATE INDEX IF NOT EXISTS idx_lap_times_track_position 
  ON lap_times(track_position);

CREATE INDEX IF NOT EXISTS idx_lap_times_tire_compound 
  ON lap_times(tire_compound);

CREATE INDEX IF NOT EXISTS idx_lap_times_pit_stop 
  ON lap_times(pit_stop);

CREATE INDEX IF NOT EXISTS idx_lap_times_lap_number 
  ON lap_times(lap_number);

