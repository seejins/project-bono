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
  race_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
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

-- Indexes for better performance
CREATE INDEX idx_drivers_season ON drivers(season_id);
CREATE INDEX idx_races_season ON races(season_id);
CREATE INDEX idx_race_results_race ON race_results(race_id);
CREATE INDEX idx_race_results_driver ON race_results(driver_id);
CREATE INDEX idx_lap_times_race ON lap_times(race_id);
CREATE INDEX idx_lap_times_driver ON lap_times(driver_id);
CREATE INDEX idx_achievements_driver ON achievements(driver_id);
CREATE INDEX idx_f123_mappings_season ON f123_driver_mappings(season_id);

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

