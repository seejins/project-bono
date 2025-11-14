-- F1 Season Manager Database Schema

-- Members table (for league participants)
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  steam_id VARCHAR(20) UNIQUE, -- Steam ID for F1 23 UDP mapping
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seasons table
CREATE TABLE seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  year INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'draft')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tracks table
CREATE TABLE tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  country VARCHAR(100) NOT NULL,
  length_km DECIMAL(5,3) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Drivers table
CREATE TABLE drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  team VARCHAR(100),
  number INTEGER,
  season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Races table
CREATE TABLE races (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
  track_id UUID REFERENCES tracks(id),
  track_name VARCHAR(100) NOT NULL,
  race_date DATE,
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  
  -- F1 23 session data
  session_type INTEGER, -- 0=unknown, 1=practice1, 2=practice2, 3=practice3, 4=short practice, 5=qualifying1, 6=qualifying2, 7=qualifying3, 8=short qualifying, 9=osq, 10=race, 11=race2, 12=time trial
  session_types TEXT,
  session_duration INTEGER, -- in seconds
  weather_air_temp INTEGER,
  weather_track_temp INTEGER,
  weather_rain_percentage INTEGER,
  session_config JSONB,
  primary_session_result_id UUID REFERENCES session_results(id) ON DELETE SET NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Race results table
CREATE TABLE race_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id UUID REFERENCES races(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  points INTEGER DEFAULT 0,
  fastest_lap BOOLEAN DEFAULT FALSE,
  pole_position BOOLEAN DEFAULT FALSE,
  dnf BOOLEAN DEFAULT FALSE,
  dnf_reason VARCHAR(200),
  race_time_ms INTEGER, -- Race time in milliseconds
  gap_to_leader_ms INTEGER, -- Gap to leader in milliseconds
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(race_id, driver_id)
);

-- Lap times table
CREATE TABLE lap_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id UUID REFERENCES races(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
  lap_number INTEGER NOT NULL,
  lap_time_ms INTEGER NOT NULL, -- Lap time in milliseconds
  sector1_ms INTEGER, -- Sector 1 time in milliseconds
  sector2_ms INTEGER, -- Sector 2 time in milliseconds
  sector3_ms INTEGER, -- Sector 3 time in milliseconds
  tire_compound VARCHAR(20), -- soft, medium, hard, intermediate, wet
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Micro-sector times table
CREATE TABLE micro_sector_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id UUID REFERENCES races(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
  lap_number INTEGER NOT NULL,
  sector INTEGER NOT NULL CHECK (sector IN (1, 2, 3)),
  micro_sector INTEGER NOT NULL,
  time_ms INTEGER NOT NULL, -- Time in milliseconds
  distance_start REAL, -- Start distance in meters
  distance_end REAL, -- End distance in meters
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Achievements table
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
  achievement_type VARCHAR(50) NOT NULL,
  date_earned DATE NOT NULL,
  race_id UUID REFERENCES races(id),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- F1 23 driver mappings table
CREATE TABLE f123_driver_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
  your_driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
  f123_driver_name VARCHAR(100) NOT NULL,
  f123_driver_number INTEGER,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(season_id, f123_driver_name, f123_driver_number, start_date)
);

-- F1 23 session results table
CREATE TABLE f123_session_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id UUID REFERENCES races(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
  session_type INTEGER NOT NULL, -- 0=unknown, 1=practice1, etc.
  position INTEGER,
  
  -- Timing data (in milliseconds)
  lap_time INTEGER,
  sector1_time INTEGER,
  sector2_time INTEGER,
  sector3_time INTEGER,
  best_lap_time INTEGER,
  gap_to_pole INTEGER, -- calculated gap in milliseconds
  
  -- Penalties and warnings
  penalties INTEGER DEFAULT 0,
  warnings INTEGER DEFAULT 0,
  num_unserved_drive_through_pens INTEGER DEFAULT 0,
  num_unserved_stop_go_pens INTEGER DEFAULT 0,
  
  -- DNF information
  dnf_reason VARCHAR(100),
  
  -- Data source
  data_source VARCHAR(20) DEFAULT 'UDP' CHECK (data_source IN ('UDP', 'MANUAL', 'FILE_UPLOAD')),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- F1 23 telemetry data table (for real-time data)
CREATE TABLE f123_telemetry_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id UUID REFERENCES races(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
  session_type INTEGER,
  lap_number INTEGER,
  
  -- Car telemetry
  speed INTEGER,
  throttle REAL,
  brake REAL,
  steering REAL,
  gear INTEGER,
  engine_rpm INTEGER,
  
  -- Tire data
  tire_wear_front_left REAL,
  tire_wear_front_right REAL,
  tire_wear_rear_left REAL,
  tire_wear_rear_right REAL,
  tire_temp_front_left REAL,
  tire_temp_front_right REAL,
  tire_temp_rear_left REAL,
  tire_temp_rear_right REAL,
  
  -- Fuel and energy
  fuel_level REAL,
  fuel_capacity REAL,
  energy_store REAL,
  
  -- Weather
  air_temperature INTEGER,
  track_temperature INTEGER,
  rain_percentage INTEGER,
  
  -- Race status
  drs_enabled BOOLEAN,
  ers_deploy_mode INTEGER,
  fuel_mix INTEGER,
  
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Session file uploads table
CREATE TABLE session_file_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id UUID REFERENCES races(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  file_type VARCHAR(20) NOT NULL, -- 'JSON', 'CSV', 'TXT'
  file_size INTEGER NOT NULL,
  upload_status VARCHAR(20) DEFAULT 'PENDING' CHECK (upload_status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  error_message TEXT,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX idx_drivers_season ON drivers(season_id);
CREATE INDEX idx_races_season ON races(season_id);
CREATE INDEX idx_race_results_race ON race_results(race_id);
CREATE INDEX idx_race_results_driver ON race_results(driver_id);
CREATE INDEX idx_lap_times_race ON lap_times(race_id);
CREATE INDEX idx_lap_times_driver ON lap_times(driver_id);
CREATE INDEX idx_achievements_driver ON achievements(driver_id);
CREATE INDEX idx_f123_mappings_season ON f123_driver_mappings(season_id);

-- F1 23 specific indexes
CREATE INDEX idx_f123_session_results_race ON f123_session_results(race_id);
CREATE INDEX idx_f123_session_results_driver ON f123_session_results(driver_id);
CREATE INDEX idx_f123_session_results_session_type ON f123_session_results(session_type);
CREATE INDEX idx_f123_telemetry_data_race ON f123_telemetry_data(race_id);
CREATE INDEX idx_f123_telemetry_data_driver ON f123_telemetry_data(driver_id);
CREATE INDEX idx_f123_telemetry_data_timestamp ON f123_telemetry_data(timestamp);
CREATE INDEX idx_session_file_uploads_race ON session_file_uploads(race_id);
CREATE INDEX idx_session_file_uploads_status ON session_file_uploads(upload_status);

-- F1 23 UDP specific indexes
CREATE INDEX idx_f123_udp_session_results_season ON f123_udp_session_results(season_id);
CREATE INDEX idx_f123_udp_session_results_event ON f123_udp_session_results(event_id);
CREATE INDEX idx_f123_udp_session_results_member ON f123_udp_session_results(member_id);
CREATE INDEX idx_f123_udp_session_results_session_uid ON f123_udp_session_results(session_uid);
CREATE INDEX idx_f123_udp_lap_history_session_result ON f123_udp_lap_history(session_result_id);
CREATE INDEX idx_f123_udp_lap_history_member ON f123_udp_lap_history(member_id);
CREATE INDEX idx_f123_udp_lap_history_session_uid ON f123_udp_lap_history(session_uid);
CREATE INDEX idx_f123_udp_tyre_stints_session_result ON f123_udp_tyre_stints(session_result_id);
CREATE INDEX idx_f123_udp_tyre_stints_member ON f123_udp_tyre_stints(member_id);
CREATE INDEX idx_f123_udp_tyre_stints_session_uid ON f123_udp_tyre_stints(session_uid);
CREATE INDEX idx_f123_udp_participants_season ON f123_udp_participants(season_id);
CREATE INDEX idx_f123_udp_participants_member ON f123_udp_participants(member_id);
CREATE INDEX idx_f123_udp_participants_session_uid ON f123_udp_participants(session_uid);
CREATE INDEX idx_f123_udp_participants_vehicle_index ON f123_udp_participants(vehicle_index);

-- Driver penalties table (post-race penalties applied administratively)
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

-- Insert default tracks
INSERT INTO tracks (name, country, length_km, event_name, short_event_name) VALUES
('Bahrain International Circuit', 'Bahrain', 5.412, 'Bahrain Grand Prix', 'Bahrain GP'),
('Jeddah Corniche Circuit', 'Saudi Arabia', 6.174, 'Saudi Arabian Grand Prix', 'Saudi Arabian GP'),
('Albert Park Circuit', 'Australia', 5.278, 'Australian Grand Prix', 'Australian GP'),
('Baku City Circuit', 'Azerbaijan', 6.003, 'Azerbaijan Grand Prix', 'Azerbaijan GP'),
('Miami International Autodrome', 'USA', 5.410, 'Miami Grand Prix', 'Miami GP'),
('Circuit de Monaco', 'Monaco', 3.337, 'Monaco Grand Prix', 'Monaco GP'),
('Circuit de Barcelona-Catalunya', 'Spain', 4.675, 'Spanish Grand Prix', 'Spanish GP'),
('Circuit Gilles Villeneuve', 'Canada', 4.361, 'Canadian Grand Prix', 'Canadian GP'),
('Red Bull Ring', 'Austria', 4.318, 'Austrian Grand Prix', 'Austrian GP'),
('Silverstone Circuit', 'Great Britain', 5.891, 'British Grand Prix', 'British GP'),
('Hungaroring', 'Hungary', 4.381, 'Hungarian Grand Prix', 'Hungarian GP'),
('Spa-Francorchamps', 'Belgium', 7.004, 'Belgian Grand Prix', 'Belgian GP'),
('Zandvoort', 'Netherlands', 4.259, 'Dutch Grand Prix', 'Dutch GP'),
('Monza', 'Italy', 5.793, 'Italian Grand Prix', 'Italian GP'),
('Marina Bay Street Circuit', 'Singapore', 5.063, 'Singapore Grand Prix', 'Singapore GP'),
('Suzuka Circuit', 'Japan', 5.807, 'Japanese Grand Prix', 'Japanese GP'),
('Lusail International Circuit', 'Qatar', 5.380, 'Qatar Grand Prix', 'Qatar GP'),
('Circuit of the Americas', 'USA', 5.513, 'United States Grand Prix', 'United States GP'),
('Autódromo Hermanos Rodríguez', 'Mexico', 4.304, 'Mexico City Grand Prix', 'Mexico City GP'),
('Interlagos', 'Brazil', 4.309, 'São Paulo Grand Prix', 'São Paulo GP'),
('Las Vegas Strip Circuit', 'USA', 6.201, 'Las Vegas Grand Prix', 'Las Vegas GP'),
('Yas Marina Circuit', 'UAE', 5.281, 'Abu Dhabi Grand Prix', 'Abu Dhabi GP');

-- Season events table
CREATE TABLE season_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
  track_id UUID REFERENCES tracks(id),
  track_name VARCHAR(100) NOT NULL,
  race_date DATE,
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  session_type INTEGER DEFAULT 10, -- 0=unknown, 1=practice1, 2=practice2, 3=practice3, 4=short_practice, 5=qualifying1, 6=qualifying2, 7=qualifying3, 8=short_qualifying, 9=one_shot_qualifying, 10=race, 11=race2, 12=time_trial
  session_types TEXT, -- Comma-separated session types (e.g., "Practice, Qualifying, Race")
  session_duration INTEGER DEFAULT 0, -- Duration in minutes
  weather_air_temp INTEGER DEFAULT 0, -- Air temperature in Celsius
  weather_track_temp INTEGER DEFAULT 0, -- Track temperature in Celsius
  weather_rain_percentage INTEGER DEFAULT 0, -- Rain percentage (0-100)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- F1 23 UDP Session Results table (Final Classification Packet data)
CREATE TABLE f123_udp_session_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
  event_id UUID REFERENCES season_events(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  
  -- Final Classification data
  position INTEGER NOT NULL,
  num_laps INTEGER NOT NULL,
  grid_position INTEGER NOT NULL,
  points INTEGER DEFAULT 0,
  num_pit_stops INTEGER DEFAULT 0,
  result_status INTEGER NOT NULL, -- 0=invalid, 1=inactive, 2=active, 3=finished, 4=didnotfinish, 5=disqualified, 6=not classified, 7=retired
  best_lap_time_ms INTEGER,
  total_race_time_seconds DECIMAL(10,3),
  penalties_time INTEGER DEFAULT 0,
  num_penalties INTEGER DEFAULT 0,
  num_tyre_stints INTEGER DEFAULT 0,
  
  -- UDP session identifiers
  session_uid BIGINT NOT NULL,
  session_time REAL NOT NULL,
  frame_identifier INTEGER NOT NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(session_uid, member_id)
);

-- F1 23 UDP Lap History table (Session History Packet data)
CREATE TABLE f123_udp_lap_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_result_id UUID REFERENCES f123_udp_session_results(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  
  -- Lap History data
  lap_number INTEGER NOT NULL,
  lap_time_ms INTEGER NOT NULL,
  sector1_time_ms INTEGER,
  sector1_time_minutes INTEGER DEFAULT 0,
  sector2_time_ms INTEGER,
  sector2_time_minutes INTEGER DEFAULT 0,
  sector3_time_ms INTEGER,
  sector3_time_minutes INTEGER DEFAULT 0,
  lap_valid_bit_flags INTEGER DEFAULT 0, -- 0x01=lap valid, 0x02=sector1 valid, 0x04=sector2 valid, 0x08=sector3 valid
  
  -- UDP session identifiers
  session_uid BIGINT NOT NULL,
  session_time REAL NOT NULL,
  frame_identifier INTEGER NOT NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(session_uid, member_id, lap_number)
);

-- F1 23 UDP Tyre Stint History table
CREATE TABLE f123_udp_tyre_stints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_result_id UUID REFERENCES f123_udp_session_results(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  
  -- Tyre Stint data
  stint_number INTEGER NOT NULL,
  end_lap INTEGER, -- 255 if current tyre
  tyre_actual_compound INTEGER NOT NULL, -- Actual tyre compound used
  tyre_visual_compound INTEGER NOT NULL, -- Visual tyre compound used
  
  -- UDP session identifiers
  session_uid BIGINT NOT NULL,
  session_time REAL NOT NULL,
  frame_identifier INTEGER NOT NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(session_uid, member_id, stint_number)
);

-- F1 23 UDP Participants mapping table
CREATE TABLE f123_udp_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  
  -- Participant data from UDP
  vehicle_index INTEGER NOT NULL,
  ai_controlled BOOLEAN DEFAULT FALSE,
  driver_id INTEGER, -- F1 23 driver ID (255 if network human)
  network_id INTEGER,
  team_id INTEGER,
  my_team BOOLEAN DEFAULT FALSE,
  race_number INTEGER,
  nationality INTEGER,
  name VARCHAR(48) NOT NULL, -- Steam name or driver name
  your_telemetry INTEGER DEFAULT 0, -- 0=restricted, 1=public
  show_online_names INTEGER DEFAULT 0, -- 0=off, 1=on
  platform INTEGER, -- 1=Steam, 3=PlayStation, 4=Xbox, 6=Origin, 255=unknown
  
  -- UDP session identifiers
  session_uid BIGINT NOT NULL,
  session_time REAL NOT NULL,
  frame_identifier INTEGER NOT NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(session_uid, vehicle_index)
);

