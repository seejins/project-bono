-- Migration: Remove members table and consolidate to drivers
-- This migration:
-- 1. Adds steam_id to drivers table
-- 2. Makes drivers cross-season (season_id nullable)
-- 3. Migrates member data to drivers
-- 4. Renames member_id to driver_id in UDP tables
-- 5. Updates foreign key constraints
-- 6. Drops members table

BEGIN;

-- Step 1: Add steam_id and is_active to drivers if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'steam_id') THEN
        ALTER TABLE drivers ADD COLUMN steam_id VARCHAR(20);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_drivers_steam_id ON drivers(steam_id) WHERE steam_id IS NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'is_active') THEN
        ALTER TABLE drivers ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- Step 2: Make season_id nullable in drivers (allows cross-season drivers)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'season_id' AND is_nullable = 'NO') THEN
        ALTER TABLE drivers ALTER COLUMN season_id DROP NOT NULL;
    END IF;
END $$;

-- Step 3: Migrate member data to drivers
-- Create cross-season drivers for members that don't have corresponding drivers
INSERT INTO drivers (id, name, steam_id, is_active, season_id, created_at, updated_at)
SELECT 
    m.id,
    m.name,
    m.steam_id,
    COALESCE(m.is_active, TRUE),
    NULL, -- Cross-season drivers don't need season_id
    m.created_at,
    m.updated_at
FROM members m
WHERE NOT EXISTS (
    SELECT 1 FROM drivers d 
    WHERE d.id = m.id 
    OR (m.steam_id IS NOT NULL AND d.steam_id = m.steam_id)
);

-- Step 4: Update driver_session_results - use member_id as driver_id if driver_id is NULL
UPDATE driver_session_results dsr
SET driver_id = dsr.member_id
WHERE dsr.member_id IS NOT NULL 
AND (dsr.driver_id IS NULL OR NOT EXISTS (SELECT 1 FROM drivers d WHERE d.id = dsr.driver_id))
AND EXISTS (SELECT 1 FROM drivers d WHERE d.id = dsr.member_id);

-- Step 5: Rename member_id to driver_id in UDP tables
-- First, handle the existing driver_id INTEGER column (F1 23 game driver ID) by renaming it to f123_driver_id
-- f123_udp_participants: rename member_id to driver_id
DO $$ 
BEGIN
    -- First, rename existing driver_id INTEGER to f123_driver_id if it exists and f123_driver_id doesn't exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'f123_udp_participants' AND column_name = 'driver_id' AND data_type = 'integer') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'f123_udp_participants' AND column_name = 'f123_driver_id') THEN
            ALTER TABLE f123_udp_participants RENAME COLUMN driver_id TO f123_driver_id;
        END IF;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'f123_udp_participants' AND column_name = 'member_id') THEN
        -- Add driver_id UUID column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'f123_udp_participants' AND column_name = 'driver_id' AND data_type = 'uuid') THEN
            ALTER TABLE f123_udp_participants ADD COLUMN driver_id UUID;
        END IF;
        
        -- Migrate data: member_id -> driver_id (members become drivers)
        UPDATE f123_udp_participants fup
        SET driver_id = fup.member_id::uuid
        WHERE fup.member_id IS NOT NULL 
        AND EXISTS (SELECT 1 FROM drivers d WHERE d.id = fup.member_id);
        
        -- Drop old column and constraint
        ALTER TABLE f123_udp_participants DROP CONSTRAINT IF EXISTS f123_udp_participants_member_id_fkey;
        ALTER TABLE f123_udp_participants DROP COLUMN IF EXISTS member_id;
        
        -- Add new foreign key constraint
        ALTER TABLE f123_udp_participants 
        ADD CONSTRAINT f123_udp_participants_driver_id_fkey 
        FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL;
    END IF;
END $$;

-- f123_udp_session_results: rename member_id to driver_id
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'f123_udp_session_results' AND column_name = 'member_id') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'f123_udp_session_results' AND column_name = 'driver_id') THEN
            ALTER TABLE f123_udp_session_results ADD COLUMN driver_id UUID;
        END IF;
        
        UPDATE f123_udp_session_results fus
        SET driver_id = fus.member_id
        WHERE fus.member_id IS NOT NULL 
        AND EXISTS (SELECT 1 FROM drivers d WHERE d.id = fus.member_id);
        
        ALTER TABLE f123_udp_session_results DROP CONSTRAINT IF EXISTS f123_udp_session_results_member_id_fkey;
        ALTER TABLE f123_udp_session_results DROP COLUMN IF EXISTS member_id;
        
        ALTER TABLE f123_udp_session_results 
        ADD CONSTRAINT f123_udp_session_results_driver_id_fkey 
        FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL;
    END IF;
END $$;

-- f123_udp_lap_history: rename member_id to driver_id
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'f123_udp_lap_history' AND column_name = 'member_id') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'f123_udp_lap_history' AND column_name = 'driver_id') THEN
            ALTER TABLE f123_udp_lap_history ADD COLUMN driver_id UUID;
        END IF;
        
        UPDATE f123_udp_lap_history ful
        SET driver_id = ful.member_id
        WHERE ful.member_id IS NOT NULL 
        AND EXISTS (SELECT 1 FROM drivers d WHERE d.id = ful.member_id);
        
        ALTER TABLE f123_udp_lap_history DROP CONSTRAINT IF EXISTS f123_udp_lap_history_member_id_fkey;
        ALTER TABLE f123_udp_lap_history DROP COLUMN IF EXISTS member_id;
        
        ALTER TABLE f123_udp_lap_history 
        ADD CONSTRAINT f123_udp_lap_history_driver_id_fkey 
        FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL;
    END IF;
END $$;

-- f123_udp_tyre_stints: rename member_id to driver_id
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'f123_udp_tyre_stints' AND column_name = 'member_id') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'f123_udp_tyre_stints' AND column_name = 'driver_id') THEN
            ALTER TABLE f123_udp_tyre_stints ADD COLUMN driver_id UUID;
        END IF;
        
        UPDATE f123_udp_tyre_stints fut
        SET driver_id = fut.member_id
        WHERE fut.member_id IS NOT NULL 
        AND EXISTS (SELECT 1 FROM drivers d WHERE d.id = fut.member_id);
        
        ALTER TABLE f123_udp_tyre_stints DROP CONSTRAINT IF EXISTS f123_udp_tyre_stints_member_id_fkey;
        ALTER TABLE f123_udp_tyre_stints DROP COLUMN IF EXISTS member_id;
        
        ALTER TABLE f123_udp_tyre_stints 
        ADD CONSTRAINT f123_udp_tyre_stints_driver_id_fkey 
        FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Step 6: Update f123_driver_mappings - remove member_id (we already have your_driver_id)
ALTER TABLE f123_driver_mappings DROP CONSTRAINT IF EXISTS f123_driver_mappings_member_id_fkey;
ALTER TABLE f123_driver_mappings DROP COLUMN IF EXISTS member_id;

-- Step 7: Drop member_id from driver_session_results
ALTER TABLE driver_session_results DROP CONSTRAINT IF EXISTS driver_session_results_member_id_fkey;
ALTER TABLE driver_session_results DROP COLUMN IF EXISTS member_id;

-- Step 8: Drop old indexes and create new ones
DROP INDEX IF EXISTS idx_f123_udp_session_results_member;
DROP INDEX IF EXISTS idx_f123_udp_lap_history_member;
DROP INDEX IF EXISTS idx_f123_udp_tyre_stints_member;
DROP INDEX IF EXISTS idx_f123_udp_participants_member;

CREATE INDEX IF NOT EXISTS idx_f123_udp_session_results_driver ON f123_udp_session_results(driver_id);
CREATE INDEX IF NOT EXISTS idx_f123_udp_lap_history_driver ON f123_udp_lap_history(driver_id);
CREATE INDEX IF NOT EXISTS idx_f123_udp_tyre_stints_driver ON f123_udp_tyre_stints(driver_id);
CREATE INDEX IF NOT EXISTS idx_f123_udp_participants_driver ON f123_udp_participants(driver_id);

-- Step 9: Drop members table
DROP TABLE IF EXISTS members CASCADE;

COMMIT;

