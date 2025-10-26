-- F1 Season Manager Database Schema

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
  race_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  
  -- F1 23 session data
  session_type INTEGER, -- 0=unknown, 1=practice1, 2=practice2, 3=practice3, 4=short practice, 5=qualifying1, 6=qualifying2, 7=qualifying3, 8=short qualifying, 9=osq, 10=race, 11=race2, 12=time trial
  session_duration INTEGER, -- in seconds
  weather_air_temp INTEGER,
  weather_track_temp INTEGER,
  weather_rain_percentage INTEGER,
  
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

-- Insert default tracks
INSERT INTO tracks (name, country, length_km) VALUES
('Bahrain International Circuit', 'Bahrain', 5.412),
('Jeddah Corniche Circuit', 'Saudi Arabia', 6.174),
('Albert Park Circuit', 'Australia', 5.278),
('Baku City Circuit', 'Azerbaijan', 6.003),
('Miami International Autodrome', 'USA', 5.410),
('Circuit de Monaco', 'Monaco', 3.337),
('Circuit de Barcelona-Catalunya', 'Spain', 4.675),
('Circuit Gilles Villeneuve', 'Canada', 4.361),
('Red Bull Ring', 'Austria', 4.318),
('Silverstone Circuit', 'Great Britain', 5.891),
('Hungaroring', 'Hungary', 4.381),
('Spa-Francorchamps', 'Belgium', 7.004),
('Zandvoort', 'Netherlands', 4.259),
('Monza', 'Italy', 5.793),
('Marina Bay Street Circuit', 'Singapore', 5.063),
('Suzuka Circuit', 'Japan', 5.807),
('Lusail International Circuit', 'Qatar', 5.380),
('Circuit of the Americas', 'USA', 5.513),
('Autódromo Hermanos Rodríguez', 'Mexico', 4.304),
('Interlagos', 'Brazil', 4.309),
('Las Vegas Strip Circuit', 'USA', 6.201),
('Yas Marina Circuit', 'UAE', 5.281);

