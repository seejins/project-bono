export const CREATE_TABLES_SQL = `
  -- Seasons table
  CREATE TABLE IF NOT EXISTS seasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL,
    start_date DATE,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'draft')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- Tracks table
  CREATE TABLE IF NOT EXISTS tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    length_km DECIMAL(5,3) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- Drivers table (cross-season, can have NULL season_id)
  CREATE TABLE IF NOT EXISTS drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    team VARCHAR(100),
    number INTEGER,
    season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
    steam_id VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  
  -- Create unique index on steam_id (nullable)
  CREATE UNIQUE INDEX IF NOT EXISTS idx_drivers_steam_id ON drivers(steam_id) WHERE steam_id IS NOT NULL;

  -- Races table
  CREATE TABLE IF NOT EXISTS races (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
    track_id UUID REFERENCES tracks(id),
    track_name VARCHAR(100) NOT NULL,
    race_date DATE, -- Changed to allow NULL
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
    session_type INTEGER,
    session_types TEXT,
    session_duration INTEGER,
    weather_air_temp INTEGER,
    weather_track_temp INTEGER,
    weather_rain_percentage INTEGER,
    session_config JSONB, -- New column for dynamic session rendering
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- F1 23 Driver Mappings table
  CREATE TABLE IF NOT EXISTS f123_driver_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
    f123_driver_id INTEGER NOT NULL,
    f123_driver_name VARCHAR(100) NOT NULL,
    f123_driver_number INTEGER,
    f123_team_name VARCHAR(100),
    f123_steam_id VARCHAR(100), -- Primary mapping field
    f123_network_id INTEGER,    -- Network identifier
    f123_platform INTEGER,      -- Platform (1=Steam, 3=PS, 4=Xbox, 6=Origin)
    your_driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(season_id, f123_steam_id) -- Ensure one mapping per steam_id per season
  );

  -- F1 23 Session Results table
  CREATE TABLE IF NOT EXISTS f123_session_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    race_id UUID REFERENCES races(id) ON DELETE CASCADE,
    driver_id VARCHAR(50) NOT NULL,
    driver_name VARCHAR(100) NOT NULL,
    team_name VARCHAR(100) NOT NULL,
    car_number INTEGER NOT NULL,
    position INTEGER NOT NULL,
    lap_time INTEGER,
    sector1_time INTEGER,
    sector2_time INTEGER,
    sector3_time INTEGER,
    best_lap_time INTEGER,
    gap_to_pole INTEGER,
    penalties INTEGER DEFAULT 0,
    warnings INTEGER DEFAULT 0,
    num_unserved_drive_through_pens INTEGER DEFAULT 0,
    num_unserved_stop_go_pens INTEGER DEFAULT 0,
    dnf_reason VARCHAR(100),
    data_source VARCHAR(20) DEFAULT 'UDP',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- F1 23 Telemetry Data table
  CREATE TABLE IF NOT EXISTS f123_telemetry_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    race_id UUID REFERENCES races(id) ON DELETE CASCADE,
    driver_id VARCHAR(50) NOT NULL,
    session_time REAL NOT NULL,
    lap_number INTEGER,
    position INTEGER,
    lap_time INTEGER,
    sector1_time INTEGER,
    sector2_time INTEGER,
    sector3_time INTEGER,
    speed REAL,
    throttle REAL,
    brake REAL,
    steering REAL,
    gear INTEGER,
    engine_rpm INTEGER,
    drs INTEGER,
    rev_lights_percent INTEGER,
    brakes_temperature INTEGER[],
    tyres_surface_temperature INTEGER[],
    tyres_inner_temperature INTEGER[],
    engine_temperature REAL,
    tyres_pressure REAL[],
    surface_type INTEGER[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- Session Results (one entry per completed session - DYNAMIC CREATION)
  CREATE TABLE IF NOT EXISTS session_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    race_id UUID REFERENCES races(id) ON DELETE CASCADE,
    session_type INTEGER NOT NULL,
    session_name VARCHAR(50) NOT NULL,
    session_uid BIGINT,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    additional_data JSONB, -- Store position-history, tyre-stint-history, speed-trap-records, overtakes, records, etc.
    UNIQUE(race_id, session_type)
  );

  -- Driver Session Results (results for each driver in each session)
  CREATE TABLE IF NOT EXISTS driver_session_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_result_id UUID REFERENCES session_results(id) ON DELETE CASCADE,
    user_id UUID REFERENCES drivers(id) ON DELETE CASCADE, -- Tournament participant/user (NULL until mapped)
    json_driver_id INTEGER, -- In-game driver ID from JSON (e.g., 9 for VERSTAPPEN)
    json_driver_name VARCHAR(100), -- Driver name from JSON
    json_team_name VARCHAR(100), -- Team name from JSON
    json_car_number INTEGER, -- Car number from JSON
    position INTEGER NOT NULL,
    grid_position INTEGER,
    points INTEGER DEFAULT 0,
    num_laps INTEGER,
    best_lap_time_ms INTEGER,
    sector1_time_ms INTEGER,
    sector2_time_ms INTEGER,
    sector3_time_ms INTEGER,
    total_race_time_ms INTEGER,
    base_race_time_ms INTEGER,
    penalties INTEGER DEFAULT 0, -- In-race penalty time in seconds (from JSON/UDP)
    post_race_penalties INTEGER DEFAULT 0, -- Post-race penalty time in seconds (admin edits)
    warnings INTEGER DEFAULT 0,
    num_unserved_drive_through_pens INTEGER DEFAULT 0,
    num_unserved_stop_go_pens INTEGER DEFAULT 0,
    result_status INTEGER,
    dnf_reason VARCHAR(100),
    fastest_lap BOOLEAN DEFAULT FALSE,
    pole_position BOOLEAN DEFAULT FALSE,
    additional_data JSONB, -- Store car-damage, track-position, current-lap, top-speed-kmph, is-player, telemetry-settings, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  
  -- Create indexes for JSON driver columns
  CREATE INDEX IF NOT EXISTS idx_driver_session_results_json_driver_id ON driver_session_results(json_driver_id);
  CREATE INDEX IF NOT EXISTS idx_driver_session_results_json_driver_name ON driver_session_results(json_driver_name);

  -- Driver penalties table (post-race penalties applied by admins)
  CREATE TABLE IF NOT EXISTS driver_penalties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_session_result_id UUID NOT NULL REFERENCES driver_session_results(id) ON DELETE CASCADE,
    seconds INTEGER NOT NULL CHECK (seconds > 0),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_driver_penalties_driver_session_result_id
    ON driver_penalties(driver_session_result_id);

  -- Race Edit History Table (for audit trail and reset capability)
  CREATE TABLE IF NOT EXISTS race_edit_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_result_id UUID REFERENCES session_results(id) ON DELETE CASCADE,
    driver_session_result_id UUID REFERENCES driver_session_results(id) ON DELETE CASCADE, -- Direct reference to driver result
    user_id UUID REFERENCES drivers(id) ON DELETE SET NULL, -- Tournament participant/user (NULL until mapped)
    edit_type VARCHAR(50) NOT NULL,
    old_value JSONB,
    new_value JSONB,
    reason TEXT,
    edited_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_reverted BOOLEAN DEFAULT FALSE
  );
  
  -- Create index for driver_session_result_id
  CREATE INDEX IF NOT EXISTS idx_race_edit_history_driver_session_result_id ON race_edit_history(driver_session_result_id);

  -- Original Session Results Snapshot (preserves UDP data)
  CREATE TABLE IF NOT EXISTS session_results_original (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_result_id UUID REFERENCES session_results(id) ON DELETE CASCADE,
    user_id UUID REFERENCES drivers(id) ON DELETE CASCADE, -- Tournament participant/user (NULL until mapped)
    original_position INTEGER NOT NULL,
    original_points INTEGER DEFAULT 0,
    original_penalties INTEGER DEFAULT 0,
    original_warnings INTEGER DEFAULT 0,
    original_result_status INTEGER,
    original_dnf_reason VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_restored BOOLEAN DEFAULT FALSE,
    UNIQUE(session_result_id, driver_id)
  );

  -- Orphaned Sessions Table (for sessions that don't match any event)
  CREATE TABLE IF NOT EXISTS orphaned_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    track_name VARCHAR(100) NOT NULL,
    session_type INTEGER NOT NULL,
    session_data JSONB NOT NULL,
    session_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'ignored')),
    processed_event_id UUID REFERENCES races(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- Session Errors Table (for debugging failed session processing)
  CREATE TABLE IF NOT EXISTS session_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    error_message TEXT NOT NULL,
    session_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- Race Backups Table (for backup/restore functionality)
  CREATE TABLE IF NOT EXISTS race_backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_result_id UUID REFERENCES session_results(id) ON DELETE CASCADE,
    backup_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- F1 23 UDP Participants Table (stores participant data from UDP)
  CREATE TABLE IF NOT EXISTS f123_udp_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
    user_id UUID REFERENCES drivers(id) ON DELETE SET NULL, -- Tournament participant/user
    vehicle_index INTEGER NOT NULL,
    ai_controlled BOOLEAN DEFAULT FALSE,
    f123_driver_id INTEGER NOT NULL, -- F1 23 game driver ID (255 if network human)
    network_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    my_team BOOLEAN DEFAULT FALSE,
    race_number INTEGER NOT NULL,
    nationality INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    your_telemetry INTEGER NOT NULL,
    show_online_names INTEGER NOT NULL,
    platform INTEGER NOT NULL,
    session_uid BIGINT NOT NULL,
    session_time REAL NOT NULL,
    frame_identifier INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- F1 23 UDP Session Results Table (stores final classification data from UDP)
  CREATE TABLE IF NOT EXISTS f123_udp_session_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
    event_id UUID REFERENCES races(id) ON DELETE CASCADE,
    user_id UUID REFERENCES drivers(id) ON DELETE SET NULL, -- Tournament participant/user
    position INTEGER NOT NULL,
    num_laps INTEGER NOT NULL,
    grid_position INTEGER NOT NULL,
    points INTEGER NOT NULL,
    num_pit_stops INTEGER NOT NULL,
    result_status INTEGER NOT NULL,
    best_lap_time_ms INTEGER NOT NULL,
    total_race_time_seconds REAL NOT NULL,
    penalties_time REAL NOT NULL,
    num_penalties INTEGER NOT NULL,
    num_tyre_stints INTEGER NOT NULL,
    session_uid BIGINT NOT NULL,
    session_time REAL NOT NULL,
    frame_identifier INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- F1 23 UDP Tyre Stints Table (stores tyre stint data from UDP)
  CREATE TABLE IF NOT EXISTS f123_udp_tyre_stints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES drivers(id) ON DELETE SET NULL, -- Tournament participant/user
    stint_number INTEGER NOT NULL,
    end_lap INTEGER NOT NULL,
    tyre_actual_compound INTEGER NOT NULL,
    tyre_visual_compound INTEGER NOT NULL,
    session_uid BIGINT NOT NULL,
    session_time REAL NOT NULL,
    frame_identifier INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- F1 23 UDP Lap History Table (stores lap-by-lap data from UDP)
  CREATE TABLE IF NOT EXISTS f123_udp_lap_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES drivers(id) ON DELETE SET NULL, -- Tournament participant/user
    lap_number INTEGER NOT NULL,
    lap_time_ms INTEGER NOT NULL,
    sector1_time_ms INTEGER NOT NULL,
    sector1_time_minutes INTEGER NOT NULL,
    sector2_time_ms INTEGER NOT NULL,
    sector2_time_minutes INTEGER NOT NULL,
    sector3_time_ms INTEGER NOT NULL,
    sector3_time_minutes INTEGER NOT NULL,
    lap_valid_bit_flags INTEGER NOT NULL,
    session_uid BIGINT NOT NULL,
    session_time REAL NOT NULL,
    frame_identifier INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

