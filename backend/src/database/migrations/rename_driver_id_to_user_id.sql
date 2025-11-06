-- Migration: Rename driver_id to user_id to clarify terminology
-- driver_id was confusing - it refers to tournament participants/users, not in-game drivers
-- In-game drivers are identified by JSON driver-id from participantData

-- Step 1: Rename driver_id to user_id in driver_session_results
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'driver_session_results' AND column_name = 'driver_id') THEN
        ALTER TABLE driver_session_results RENAME COLUMN driver_id TO user_id;
        
        -- Rename constraint if it exists
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'driver_session_results_driver_id_fkey') THEN
            ALTER TABLE driver_session_results RENAME CONSTRAINT driver_session_results_driver_id_fkey TO driver_session_results_user_id_fkey;
        END IF;
    END IF;
END $$;

-- Step 2: Rename driver_id to user_id in race_edit_history
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'race_edit_history' AND column_name = 'driver_id') THEN
        ALTER TABLE race_edit_history RENAME COLUMN driver_id TO user_id;
        
        -- Rename constraint if it exists
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'race_edit_history_driver_id_fkey') THEN
            ALTER TABLE race_edit_history RENAME CONSTRAINT race_edit_history_driver_id_fkey TO race_edit_history_user_id_fkey;
        END IF;
    END IF;
END $$;

-- Step 3: Update indexes
DROP INDEX IF EXISTS idx_driver_session_results_driver;
CREATE INDEX IF NOT EXISTS idx_driver_session_results_user ON driver_session_results(user_id);
CREATE INDEX IF NOT EXISTS idx_race_edit_history_user ON race_edit_history(user_id);

-- Step 4: Rename driver_id to user_id in session_results_original
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session_results_original' AND column_name = 'driver_id') THEN
        ALTER TABLE session_results_original RENAME COLUMN driver_id TO user_id;
        
        -- Rename constraint if it exists
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'session_results_original_driver_id_fkey') THEN
            ALTER TABLE session_results_original RENAME CONSTRAINT session_results_original_driver_id_fkey TO session_results_original_user_id_fkey;
        END IF;
    END IF;
END $$;

-- Step 5: Rename in UDP tables (if they exist)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'f123_udp_participants' AND column_name = 'driver_id') THEN
        ALTER TABLE f123_udp_participants RENAME COLUMN driver_id TO user_id;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'f123_udp_session_results' AND column_name = 'driver_id') THEN
        ALTER TABLE f123_udp_session_results RENAME COLUMN driver_id TO user_id;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'f123_udp_lap_history' AND column_name = 'driver_id') THEN
        ALTER TABLE f123_udp_lap_history RENAME COLUMN driver_id TO user_id;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'f123_udp_tyre_stints' AND column_name = 'driver_id') THEN
        ALTER TABLE f123_udp_tyre_stints RENAME COLUMN driver_id TO user_id;
    END IF;
END $$;

