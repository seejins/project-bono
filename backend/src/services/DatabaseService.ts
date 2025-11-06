import { Client } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import path from 'path';

// Ensure .env is loaded
dotenv.config({ path: path.join(__dirname, '../../.env') });
import { getSessionTypeAbbreviation } from '../utils/f123Constants';

// Type definitions
export interface Driver {
  id: string;
  name: string;
  team?: string;
  number?: number;
  seasonId?: string; // Nullable for cross-season drivers
  steam_id?: string; // Steam ID for F1 23 UDP mapping
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DriverData {
  name: string;
  team?: string;
  number?: number;
  seasonId?: string;
  steam_id?: string;
  isActive?: boolean;
}

export interface Season {
  id: string;
  name: string;
  year: number;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SeasonData {
  name: string;
  year: number;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export interface Track {
  id: string;
  name: string;
  country: string;
  city: string;
  length: number;
  laps: number;
  createdAt: string;
  updatedAt: string;
}

export interface TrackData {
  name: string;
  country: string;
  city?: string;
  circuitLength: number;
  laps: number;
}

export interface Race {
  id: string;
  seasonId: string;
  trackId: string;
  raceDate: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface RaceData {
  seasonId: string;
  trackId: string;
  trackName?: string; // Optional - will be looked up from track if not provided
  raceDate: string;
  status?: 'scheduled' | 'completed' | 'cancelled';
}

export interface DriverMapping {
  id: string;
  seasonId: string;
  f123DriverId: number;
  f123DriverName: string;
  f123DriverNumber?: number;
  f123TeamName?: string;
  yourDriverId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DriverMappingData {
  seasonId: string;
  f123DriverId: number;
  f123DriverName: string;
  f123DriverNumber?: number;
  f123TeamName?: string;
  yourDriverId?: string;
}

export interface SessionResult {
  driverId: string;
  driverName: string;
  teamName: string;
  carNumber: number;
  position: number;
  lapTime: number;
  sector1Time: number;
  sector2Time: number;
  sector3Time: number;
  fastestLap: boolean;
  createdAt: string;
}

export class DatabaseService {
  private db: Client;
  private initialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    console.log('🐘 Using PostgreSQL database');
    
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'f1_race_engineer_dev',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'test123',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    };
    
    console.log('🔍 Database connection config:', {
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.user,
      password: dbConfig.password ? '***' : '(empty)'
    });
    
    this.db = new Client(dbConfig);
    
    this.db.connect().catch((error) => {
      console.error('❌ PostgreSQL connection failed:', error);
      process.exit(1);
    });
    
    this.initializeTables();
  }

  // Helper methods for snake_case to camelCase transformation
  private transformSeasonToCamelCase(dbRow: any): any {
    return {
      id: dbRow.id,
      name: dbRow.name,
      year: dbRow.year,
      startDate: dbRow.start_date,
      endDate: dbRow.end_date,
      status: dbRow.status,
      createdAt: dbRow.created_at,
      updatedAt: dbRow.updated_at
    };
  }

  private transformDriverToCamelCase(dbRow: any): Driver {
    return {
      id: dbRow.id,
      name: dbRow.name,
      team: dbRow.team,
      number: dbRow.number,
      seasonId: dbRow.season_id,
      steam_id: dbRow.steam_id,
      isActive: dbRow.is_active,
      createdAt: dbRow.created_at,
      updatedAt: dbRow.updated_at
    };
  }

  private transformRaceToCamelCase(dbRow: any): any {
    return {
      id: dbRow.id,
      seasonId: dbRow.season_id,
      trackId: dbRow.track_id,
      trackName: dbRow.track_name,
      raceDate: dbRow.race_date,
      status: dbRow.status,
      sessionType: dbRow.session_type,
      sessionDuration: dbRow.session_duration,
      weatherAirTemp: dbRow.weather_air_temp,
      weatherTrackTemp: dbRow.weather_track_temp,
      weatherRainPercentage: dbRow.weather_rain_percentage,
      createdAt: dbRow.created_at,
      updatedAt: dbRow.updated_at
    };
  }

  private async initializeTables(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  private async performInitialization(): Promise<void> {
    try {
      console.log('🔧 Initializing PostgreSQL database tables...');
      
      // Create tables directly instead of reading from file
      const createTablesSQL = `
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
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Create indexes for JSON driver columns
        CREATE INDEX IF NOT EXISTS idx_driver_session_results_json_driver_id ON driver_session_results(json_driver_id);
        CREATE INDEX IF NOT EXISTS idx_driver_session_results_json_driver_name ON driver_session_results(json_driver_name);

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
      
      await this.db.query(createTablesSQL);
      
      // Run migrations
      await this.runMigrations();
      
      this.initialized = true;
      console.log('✅ PostgreSQL database initialization completed');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  private async runMigrations(): Promise<void> {
    console.log('🔄 Running database migrations...');
    
    try {
      // Create migrations tracking table if it doesn't exist
      await this.createMigrationsTable();
      
      // Migration 1: Add steam_id column to members table
      await this.runMigration('add_steam_id_to_members', async () => {
        await this.addColumnIfNotExists('members', 'steam_id', 'VARCHAR(20) UNIQUE');
      });
      
      // Migration: Add JSONB columns for additional data storage
      await this.runMigration('add_jsonb_columns_for_session_data', async () => {
        await this.addColumnIfNotExists('session_results', 'additional_data', 'JSONB');
        await this.addColumnIfNotExists('driver_session_results', 'additional_data', 'JSONB');
      });
      
      // Migration: Add post_race_penalties column
      await this.runMigration('add_post_race_penalties', async () => {
        await this.addColumnIfNotExists('driver_session_results', 'post_race_penalties', 'INTEGER DEFAULT 0');
      });
      
      // Migration: Allow NULL for driver_id in race_edit_history and change to ON DELETE SET NULL
      await this.runMigration('allow_null_driver_id_in_edit_history', async () => {
        // Check if driver_id column exists
        const columnInfo = await this.db.query(
          `SELECT column_name, is_nullable 
           FROM information_schema.columns 
           WHERE table_name = 'race_edit_history' AND column_name = 'driver_id'`
        );
        
        if (columnInfo.rows.length > 0) {
          // Drop the foreign key constraint first
          await this.db.query(`
            ALTER TABLE race_edit_history 
            DROP CONSTRAINT IF EXISTS race_edit_history_driver_id_fkey
          `);
          
          // Alter column to allow NULL if it doesn't already
          if (columnInfo.rows[0].is_nullable === 'NO') {
            await this.db.query(`
              ALTER TABLE race_edit_history 
              ALTER COLUMN driver_id DROP NOT NULL
            `);
          }
          
          // Re-add foreign key with ON DELETE SET NULL
          await this.db.query(`
            ALTER TABLE race_edit_history 
            ADD CONSTRAINT race_edit_history_driver_id_fkey 
            FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL
          `);
        }
      });
      
      // Migration 2: Fix seasons table schema to allow nullable start_date and end_date
      await this.runMigration('fix_seasons_nullable_dates', async () => {
        await this.db.query('ALTER TABLE seasons ALTER COLUMN start_date DROP NOT NULL');
        await this.db.query('ALTER TABLE seasons ALTER COLUMN end_date DROP NOT NULL');
      });
      
      // Migration 3: Add member_id to f123_driver_mappings table (deprecated - members table was removed)
      // This migration is kept for historical purposes but should not run if members table doesn't exist
      // await this.runMigration('add_member_id_to_f123_driver_mappings', async () => {
      //   await this.addColumnIfNotExists('f123_driver_mappings', 'member_id', 'UUID REFERENCES members(id) ON DELETE CASCADE');
      // });
      
      // Migration 4: Add your_driver_id to f123_driver_mappings table (replaces member_id)
      await this.runMigration('add_your_driver_id_to_f123_driver_mappings', async () => {
        await this.addColumnIfNotExists('f123_driver_mappings', 'your_driver_id', 'UUID REFERENCES drivers(id) ON DELETE CASCADE');
      });
      
      // Migration 5: Add JSON driver identification columns to driver_session_results
      await this.runMigration('add_json_driver_columns', async () => {
        await this.addColumnIfNotExists('driver_session_results', 'json_driver_id', 'INTEGER');
        await this.addColumnIfNotExists('driver_session_results', 'json_driver_name', 'VARCHAR(100)');
        await this.addColumnIfNotExists('driver_session_results', 'json_team_name', 'VARCHAR(100)');
        await this.addColumnIfNotExists('driver_session_results', 'json_car_number', 'INTEGER');
        
        // Create indexes for fast lookups
        await this.db.query(`
          CREATE INDEX IF NOT EXISTS idx_driver_session_results_json_driver_id 
          ON driver_session_results(json_driver_id)
        `);
        await this.db.query(`
          CREATE INDEX IF NOT EXISTS idx_driver_session_results_json_driver_name 
          ON driver_session_results(json_driver_name)
        `);
        
        // Backfill existing records from additional_data
        await this.db.query(`
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
            AND additional_data->'participantData' IS NOT NULL
        `);
      });
      
      // Migration 6: Add driver_session_result_id to race_edit_history
      await this.runMigration('add_driver_session_result_id_to_edit_history', async () => {
        await this.addColumnIfNotExists('race_edit_history', 'driver_session_result_id', 'UUID REFERENCES driver_session_results(id) ON DELETE CASCADE');
        
        // Create index for fast lookups
        await this.db.query(`
          CREATE INDEX IF NOT EXISTS idx_race_edit_history_driver_session_result_id 
          ON race_edit_history(driver_session_result_id)
        `);
        
        // Backfill existing records (optional - attempts to match existing records)
        await this.db.query(`
          UPDATE race_edit_history reh
          SET driver_session_result_id = (
            SELECT dsr.id
            FROM driver_session_results dsr
            WHERE dsr.session_result_id = reh.session_result_id
              AND (
                (reh.user_id IS NOT NULL AND dsr.user_id = reh.user_id) OR
                (reh.user_id IS NULL 
                 AND reh.old_value->>'driver_id' IS NOT NULL
                 AND (dsr.additional_data->'participantData'->>'driver-id')::text = reh.old_value->>'driver_id')
              )
            LIMIT 1
          )
          WHERE driver_session_result_id IS NULL
            AND reh.session_result_id IS NOT NULL
        `);
      });
      
      // Migration 5: Add session_types column to season_events table (skipped - table doesn't exist)
      // await this.runMigration('add_session_types_to_season_events', async () => {
      //   await this.addColumnIfNotExists('season_events', 'session_types', 'TEXT');
      // });
      
      console.log('✅ Database migrations completed');
    } catch (error) {
      console.error('❌ Migration error:', error);
      throw error;
    }
  }

  private async createMigrationsTable(): Promise<void> {
    await this.db.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) UNIQUE NOT NULL,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
  }

  private async runMigration(migrationName: string, migrationFunction: () => Promise<void>): Promise<void> {
    try {
      // Check if migration has already been run
      const hasRun = await this.hasMigrationRun(migrationName);
      if (hasRun) {
        console.log(`⏭️ Migration ${migrationName} already executed, skipping`);
        return;
      }

      console.log(`🔄 Running migration: ${migrationName}`);
      await migrationFunction();
      await this.markMigrationAsRun(migrationName);
      console.log(`✅ Migration ${migrationName} completed`);
    } catch (error) {
      console.error(`❌ Migration ${migrationName} failed:`, error);
      throw error;
    }
  }

  private async hasMigrationRun(migrationName: string): Promise<boolean> {
    const result = await this.db.query('SELECT 1 FROM migrations WHERE name = $1', [migrationName]);
      return result.rows.length > 0;
  }

  private async markMigrationAsRun(migrationName: string): Promise<void> {
    try {
      await this.db.query('INSERT INTO migrations (name) VALUES ($1)', [migrationName]);
    } catch (error: any) {
            // If it's a unique constraint error, the migration was already run
      if (error.code === '23505') {
              console.log(`✅ Migration ${migrationName} was already recorded`);
        return;
      }
      throw error;
    }
  }

  private async addColumnIfNotExists(tableName: string, columnName: string, columnDefinition: string): Promise<void> {
    try {
        // Check if column exists
        const checkQuery = `
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = $1 AND column_name = $2
        `;
      const result = await this.db.query(checkQuery, [tableName, columnName]);
        
        if (result.rows.length === 0) {
          console.log(`📝 Adding column ${columnName} to ${tableName} table`);
        await this.db.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
      }
    } catch (error) {
      console.error(`Error adding column ${columnName} to ${tableName}:`, error);
      throw error;
    }
  }

  async ensureInitialized(): Promise<void> {
    // If already initialized, return immediately
    if (this.initialized) {
              return;
            }
            
    // If initialization is already in progress, wait for it to complete
    if (this.initializationPromise) {
      console.log('🔧 Database initialization already in progress, waiting...');
      await this.initializationPromise;
      return;
    }
    
    // Start initialization and store the promise
    console.log('🔧 ensureInitialized called, initialized:', this.initialized);
    console.log('📋 Initializing database tables...');
    
    this.initializationPromise = this.performInitialization();
    
    try {
      await this.initializationPromise;
      this.initialized = true;
      console.log('✅ Database initialization completed successfully');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      this.initializationPromise = null; // Reset so it can be retried
      throw error;
    }
  }

  private async executeQuery(query: string, params: any[] = []): Promise<any[]> {
    await this.ensureInitialized();
    const result = await this.db.query(query, params);
      return result.rows;
  }

  private async executeUpdate(query: string, params: any[] = []): Promise<void> {
    await this.ensureInitialized();
    await this.db.query(query, params);
  }

  /**
   * Public method to execute SQL queries
   * Use this instead of accessing private db property
   */
  public async query(sql: string, params: any[] = []): Promise<any> {
    await this.ensureInitialized();
    return await this.db.query(sql, params);
  }

  // Season CRUD operations
  async createSeason(data: SeasonData): Promise<string> {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    await this.db.query(
      `INSERT INTO seasons (id, name, year, start_date, end_date, status, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id, 
        data.name, 
        data.year, 
        data.startDate || null, 
        data.endDate || null, 
        data.isActive ? 'active' : 'draft',
        now, 
        now
      ]
    );
    
    return id;
  }

  async getAllSeasons(): Promise<Season[]> {
    const result = await this.db.query(
        `SELECT id, name, year, start_date, end_date, status, created_at, updated_at
         FROM seasons ORDER BY year DESC, name`
      );
    return result.rows.map(row => ({
      ...this.transformSeasonToCamelCase(row),
      isActive: row.status === 'active'
    }));
  }

  async getSeasonById(id: string): Promise<Season | null> {
    const result = await this.db.query(
        `SELECT id, name, year, start_date, end_date, status, created_at, updated_at
         FROM seasons WHERE id = $1`,
        [id]
      );
    
    if (result.rows[0]) {
      return {
        ...this.transformSeasonToCamelCase(result.rows[0]),
        isActive: result.rows[0].status === 'active'
      };
    }
    return null;
  }

  async updateSeason(id: string, data: Partial<SeasonData>): Promise<void> {
    const now = new Date().toISOString();
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.year !== undefined) {
      updates.push(`year = $${paramCount++}`);
      values.push(data.year);
    }
    if (data.startDate !== undefined) {
      updates.push(`start_date = $${paramCount++}`);
      values.push(data.startDate);
    }
    if (data.endDate !== undefined) {
      updates.push(`end_date = $${paramCount++}`);
      values.push(data.endDate);
    }
    if (data.isActive !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(data.isActive ? 'active' : 'draft');
    }
    
    updates.push(`updated_at = $${paramCount++}`);
    values.push(now);
    values.push(id);

    await this.db.query(
      `UPDATE seasons SET ${updates.join(', ')} WHERE id = $${paramCount}`,
        values
      );
  }

  async deleteSeason(id: string): Promise<void> {
    await this.db.query('DELETE FROM seasons WHERE id = $1', [id]);
  }

  // Track CRUD operations
  async createTrack(data: TrackData): Promise<string> {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    await this.db.query(
      `INSERT INTO tracks (id, name, country, length_km, created_at) 
         VALUES ($1, $2, $3, $4, $5)`,
      [id, data.name, data.country, data.circuitLength, now]
    );
    
    return id;
  }

  async getAllTracks(): Promise<Track[]> {
    const result = await this.db.query(
      `SELECT id, name, country, length_km as length, created_at as "createdAt"
       FROM tracks ORDER BY name`
    );
    return result.rows.map(row => ({
      ...row,
      city: '', // Default empty city
      laps: 0,  // Default laps
      updatedAt: row.createdAt
    }));
  }

  async getTrackById(id: string): Promise<Track | null> {
    const result = await this.db.query(
      `SELECT id, name, country, length_km as length, created_at as "createdAt"
       FROM tracks WHERE id = $1`,
        [id]
      );
    
    if (result.rows[0]) {
      return {
        ...result.rows[0],
        city: '',
        laps: 0,
        updatedAt: result.rows[0].createdAt
      };
    }
    return null;
  }

  // Race CRUD operations
  async createRace(data: RaceData): Promise<string> {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    // Get track name from track record if trackName not provided
    let trackName = data.trackName;
    if (!trackName && data.trackId) {
      const track = await this.getTrackById(data.trackId);
      trackName = track?.name || 'Unknown Track';
    }
    
    await this.db.query(
      `INSERT INTO races (id, season_id, track_id, track_name, race_date, status, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, data.seasonId, data.trackId, trackName || 'Unknown Track', data.raceDate, data.status || 'scheduled', now, now]
    );
    
    return id;
  }

  async getRacesBySeason(seasonId: string): Promise<Race[]> {
    const result = await this.db.query(
      `SELECT 
        r.id,
        r.season_id as "seasonId",
        r.track_id as "trackId",
        r.track_name as "trackName",
        r.race_date as "raceDate",
        r.status,
        r.session_types as "sessionTypes",
        r.created_at as "createdAt",
        r.updated_at as "updatedAt",
        t.name as track_name,
        t.country as track_country,
        t.length_km as track_length
       FROM races r
       LEFT JOIN tracks t ON r.track_id = t.id
       WHERE r.season_id = $1 
       ORDER BY r.race_date`,
        [seasonId]
      );
      
      // Get sessions for each race to determine types
      const racesWithSessions = await Promise.all(
        result.rows.map(async (race) => {
          // Get completed sessions for this race
          const sessions = await this.getCompletedSessions(race.id);
          
          // Determine session types from completed sessions
          const sessionTypes: string[] = [];
          sessions.forEach(session => {
            const sessionType = session.sessionType;
            if (sessionType >= 1 && sessionType <= 4) {
              if (!sessionTypes.includes('practice')) sessionTypes.push('practice');
            } else if (sessionType >= 5 && sessionType <= 9) {
              if (!sessionTypes.includes('qualifying')) sessionTypes.push('qualifying');
            } else if (sessionType === 10) {
              if (!sessionTypes.includes('race')) sessionTypes.push('race');
            }
          });
          
          // Use trackName from race (event name/track-id) for schedule cards, not the mapped track name
          // The track_name from join (tracks.name) is the full mapped name, which we don't want for cards
          // Only use race.trackName (from r.track_name column), don't fall back to mapped track name
          const trackName = race.trackName || 'Unknown Track';
          const country = race.track_country || 'Unknown';
          
          // Get track info if available (for showing full track name)
          const track = race.track_name ? {
            id: race.trackId,
            name: race.track_name, // Full track name from tracks table (e.g., "Red Bull Ring")
            length: race.track_length || 0,
            country: race.track_country || 'Unknown'
          } : undefined;
          
          return {
            ...race,
            trackName, // Event name (track-id from JSON, e.g., "Austria")
            country,
            track, // Track info with full track name
            // Use raceDate as date, or convert to ISO string
            date: race.raceDate ? (typeof race.raceDate === 'string' ? race.raceDate : race.raceDate.toISOString()) : new Date().toISOString(),
            // Default time if not available
            time: '14:00:00',
            // Determine type based on sessions - prefer race if available, otherwise qualifying, then practice
            type: sessionTypes.includes('race') ? 'race' : 
                  sessionTypes.includes('qualifying') ? 'qualifying' : 
                  sessionTypes.includes('practice') ? 'practice' : 
                  'race' // Default to race
          };
        })
      );
      
      return racesWithSessions;
  }

  async getRaceById(raceId: string): Promise<any | null> {
    const result = await this.db.query(
      `SELECT 
        r.id,
        r.season_id as "seasonId",
        r.track_id as "trackId",
        r.track_name as "trackName",
        r.race_date as "raceDate",
        r.status,
        r.session_type as "sessionType",
        r.session_types as "sessionTypes",
        r.session_duration as "sessionDuration",
        r.weather_air_temp as "weatherAirTemp",
        r.weather_track_temp as "weatherTrackTemp",
        r.weather_rain_percentage as "weatherRainPercentage",
        r.created_at as "createdAt",
        r.updated_at as "updatedAt",
        t.name as track_name,
        t.country as track_country,
        t.length_km as track_length
       FROM races r
       LEFT JOIN tracks t ON r.track_id = t.id
       WHERE r.id = $1`,
      [raceId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const race = result.rows[0];
    
    // Get total laps from session results (check additional_data for total-laps)
    const sessionResult = await this.db.query(
      `SELECT additional_data 
       FROM session_results 
       WHERE race_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [raceId]
    );
    
    let totalLaps = null;
    if (sessionResult.rows.length > 0 && sessionResult.rows[0].additional_data) {
      const additionalData = typeof sessionResult.rows[0].additional_data === 'string' 
        ? JSON.parse(sessionResult.rows[0].additional_data)
        : sessionResult.rows[0].additional_data;
      
      if (additionalData.sessionInfo?.['total-laps']) {
        totalLaps = additionalData.sessionInfo['total-laps'];
      } else if (additionalData.sessionInfo?.totalLaps) {
        totalLaps = additionalData.sessionInfo.totalLaps;
      }
    }
    
    // Also check if we can get it from driver results (max num_laps)
    if (!totalLaps) {
      const maxLapsResult = await this.db.query(
        `SELECT MAX(num_laps) as max_laps 
         FROM driver_session_results 
         WHERE session_result_id IN (
           SELECT id FROM session_results WHERE race_id = $1
         )`,
        [raceId]
      );
      if (maxLapsResult.rows[0]?.max_laps) {
        totalLaps = maxLapsResult.rows[0].max_laps;
      }
    }
    
    // Format the response to match expected structure
    return {
      id: race.id,
      seasonId: race.seasonId,
      trackId: race.trackId,
      trackName: race.trackName,
      raceDate: race.raceDate,
      status: race.status,
      sessionType: race.sessionType,
      sessionTypes: race.sessionTypes,
      sessionDuration: race.sessionDuration,
      weatherAirTemp: race.weatherAirTemp,
      weatherTrackTemp: race.weatherTrackTemp,
      weatherRainPercentage: race.weatherRainPercentage,
      createdAt: race.createdAt,
      updatedAt: race.updatedAt,
      laps: totalLaps,
      track: race.track_name ? {
        id: race.trackId,
        name: race.track_name,
        country: race.track_country,
        length: race.track_length || 0
      } : null
    };
  }

  // Driver Mapping operations
  async createDriverMapping(data: DriverMappingData): Promise<string> {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    await this.db.query(
      `INSERT INTO f123_driver_mappings (id, season_id, f123_driver_id, f123_driver_name, f123_driver_number, f123_team_name, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id, 
        data.seasonId, 
        data.f123DriverId, 
        data.f123DriverName, 
        data.f123DriverNumber || null, 
        data.f123TeamName || null, 
        now, 
        now
      ]
    );
    
    return id;
  }

  async getDriverMappingsBySeason(seasonId: string): Promise<DriverMapping[]> {
    const result = await this.db.query(
      `SELECT id, season_id as "seasonId", f123_driver_id as "f123DriverId", f123_driver_name as "f123DriverName", 
              f123_driver_number as "f123DriverNumber", f123_team_name as "f123TeamName", your_driver_id as "yourDriverId", 
              created_at as "createdAt", updated_at as "updatedAt"
       FROM f123_driver_mappings WHERE season_id = $1 ORDER BY f123_driver_name`,
        [seasonId]
      );
      return result.rows;
  }

  async updateDriverMapping(id: string, data: Partial<DriverMappingData>): Promise<void> {
    const now = new Date().toISOString();
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.f123DriverId !== undefined) {
      updates.push(`f123_driver_id = $${paramCount++}`);
      values.push(data.f123DriverId);
    }
    if (data.f123DriverName !== undefined) {
      updates.push(`f123_driver_name = $${paramCount++}`);
      values.push(data.f123DriverName);
    }
    if (data.f123DriverNumber !== undefined) {
      updates.push(`f123_driver_number = $${paramCount++}`);
      values.push(data.f123DriverNumber);
    }
    if (data.f123TeamName !== undefined) {
      updates.push(`f123_team_name = $${paramCount++}`);
      values.push(data.f123TeamName);
    }

    updates.push(`updated_at = $${paramCount++}`);
    values.push(now);
    values.push(id);

    await this.db.query(
      `UPDATE f123_driver_mappings SET ${updates.join(', ')} WHERE id = $${paramCount}`,
        values
      );
  }

  async deleteDriverMapping(id: string): Promise<void> {
    await this.db.query('DELETE FROM f123_driver_mappings WHERE id = $1', [id]);
  }

  // Session Results operations
  async importSessionResults(raceId: string, results: SessionResult[]): Promise<void> {
    const now = new Date().toISOString();
    
    // Delete existing results for this race
    await this.db.query('DELETE FROM f123_session_results WHERE race_id = $1', [raceId]);
    
    // Insert new results
    for (const result of results) {
      await this.db.query(
        `INSERT INTO f123_session_results (id, race_id, driver_id, driver_name, team_name, car_number, position, lap_time, sector1_time, sector2_time, sector3_time, best_lap_time, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          uuidv4(),
          raceId,
          result.driverId,
          result.driverName,
          result.teamName,
          result.carNumber,
          result.position,
          result.lapTime,
          result.sector1Time,
          result.sector2Time,
          result.sector3Time,
          (result as any).bestLapTime || null,
          now
        ]
      );
    }
  }

  async getSessionResultsByRace(raceId: string): Promise<SessionResult[]> {
    const result = await this.db.query(
      `SELECT driver_id as "driverId", driver_name as "driverName", team_name as "teamName", car_number as "carNumber", 
              position, lap_time as "lapTime", sector1_time as "sector1Time", sector2_time as "sector2Time", 
              sector3_time as "sector3Time", best_lap_time as "bestLapTime", created_at as "createdAt"
       FROM f123_session_results WHERE race_id = $1 ORDER BY position`,
      [raceId]
      );
      return result.rows;
  }

  // Store F1 23 session results with driver names and teams (for JSON import fallback)
  async storeF123SessionResults(raceId: string, sessionType: number, driverResults: any[]): Promise<void> {
    const now = new Date().toISOString();
    
    // Delete existing results for this race (f123_session_results doesn't have session_type, so match by race_id and position)
    // We'll match by position since we're replacing all results for this race
    await this.db.query(
      'DELETE FROM f123_session_results WHERE race_id = $1',
      [raceId]
    );
    
    // Insert new results with original JSON data
    for (const result of driverResults) {
      const driverName = result.driverName || result.mapped_driver_name || result.name || 'Unknown';
      const teamName = result.teamName || result.team || 'Unknown Team';
      const carNumber = result.carNumber || result.car_number || result.mapped_driver_number || 0;
      // Use driver name as ID if no driver_id is available (f123_session_results.driver_id is NOT NULL)
      const driverId = result.driver_id || driverName || 'UNKNOWN';
      
      await this.db.query(
        `INSERT INTO f123_session_results (
          id, race_id, driver_id, driver_name, team_name, car_number, position, 
          lap_time, sector1_time, sector2_time, sector3_time, best_lap_time,
          data_source, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          uuidv4(),
          raceId,
          driverId,
          driverName,
          teamName,
          carNumber,
          result.position,
          result.best_lap_time_ms || null,
          result.sector1_time_ms || null,
          result.sector2_time_ms || null,
          result.sector3_time_ms || null,
          result.best_lap_time_ms || null,
          'FILE_UPLOAD',
          now
        ]
      );
    }
  }

  // Statistics methods
  async getMemberCareerStats(memberId: string): Promise<any> {
    const query = `
      SELECT 
        COUNT(*) as totalRaces,
        SUM(CASE WHEN fsr.position = 1 THEN 1 ELSE 0 END) as wins,
        SUM(CASE WHEN fsr.position <= 3 THEN 1 ELSE 0 END) as podiums,
        SUM(CASE WHEN fsr.fastest_lap = true THEN 1 ELSE 0 END) as fastestLaps,
        SUM(CASE WHEN fsr.pole_position = true THEN 1 ELSE 0 END) as poles,
        AVG(fsr.position) as averagePosition,
        MIN(fsr.position) as bestFinish
      FROM f123_session_results fsr
      JOIN f123_driver_mappings fdm ON fsr.driver_id = fdm.f123_driver_id::text
      WHERE fdm.your_driver_id = $1 AND fsr.session_type = 10
    `;
    
    const result = await this.executeQuery(query, [memberId]);
    return result[0] || this.getDefaultStats();
  }



  private getDefaultStats() {
    return {
      totalRaces: 0,
      wins: 0,
      podiums: 0,
      fastestLaps: 0,
      poles: 0,
      averagePosition: 0,
      bestFinish: 0
    };
  }

  // Additional methods needed by other services
  async getActiveSeason(): Promise<Season | null> {
    const result = await this.db.query(
      `SELECT id, name, year, start_date as "startDate", end_date as "endDate", 
              status, created_at as "createdAt", updated_at as "updatedAt"
       FROM seasons WHERE status = 'active' ORDER BY created_at DESC LIMIT 1`
    );
    
    if (result.rows[0]) {
      return {
        ...result.rows[0],
        isActive: result.rows[0].status === 'active'
      };
    }
    return null;
  }

  async getDriverBySteamId(steamId: string): Promise<Driver | null> {
    const result = await this.db.query(
      `SELECT id, name, team, number, season_id as "seasonId", steam_id, is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt" 
       FROM drivers WHERE steam_id = $1`,
      [steamId]
    );
    return result.rows[0] ? this.transformDriverToCamelCase(result.rows[0]) : null;
  }

  async findOrCreateTrack(trackName: string, lengthKm?: number): Promise<string> {
    // First try to find existing track
    const existing = await this.db.query(
      'SELECT id FROM tracks WHERE name = $1',
      [trackName]
    );
    
    if (existing.rows[0]) {
      // Update track length if provided and current length is 0 or missing
      if (lengthKm && lengthKm > 0) {
        const currentLength = await this.db.query(
          'SELECT length_km FROM tracks WHERE id = $1',
          [existing.rows[0].id]
        );
        if (!currentLength.rows[0]?.length_km || currentLength.rows[0].length_km === 0) {
          await this.db.query(
            'UPDATE tracks SET length_km = $1 WHERE id = $2',
            [lengthKm, existing.rows[0].id]
          );
          console.log(`✅ Updated track length for ${trackName} to ${lengthKm}km`);
        }
      }
      return existing.rows[0].id;
    }
    
    // Create new track
    const id = uuidv4();
    const now = new Date().toISOString();
    
    await this.db.query(
      `INSERT INTO tracks (id, name, country, length_km, created_at) 
         VALUES ($1, $2, $3, $4, $5)`,
      [id, trackName, 'Unknown', lengthKm || 0, now]
    );
    
    return id;
  }

  async getDriverMappings(seasonId: string): Promise<DriverMapping[]> {
    return this.getDriverMappingsBySeason(seasonId);
  }

  async importRaceResults(raceId: string, results: SessionResult[]): Promise<void> {
    return this.importSessionResults(raceId, results);
  }

  async deactivateAllOtherSeasons(currentSeasonId: string): Promise<void> {
    await this.db.query(
      `UPDATE seasons SET status = 'completed', updated_at = $1 WHERE id != $2`,
      [new Date().toISOString(), currentSeasonId]
    );
  }

  async getDriversBySeason(seasonId: string): Promise<Driver[]> {
    const result = await this.db.query(
      'SELECT * FROM drivers WHERE season_id = $1 ORDER BY name ASC',
        [seasonId]
      );
    
    return result.rows.map(row => this.transformDriverToCamelCase(row));
  }
  
  async getAllDrivers(): Promise<Driver[]> {
    const result = await this.db.query(
      'SELECT * FROM drivers ORDER BY name ASC'
    );
    
    return result.rows.map(row => this.transformDriverToCamelCase(row));
  }

  async createDriver(data: DriverData): Promise<string> {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    await this.db.query(
      `INSERT INTO drivers (id, name, team, number, season_id, steam_id, is_active, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, data.name, data.team || null, data.number || null, data.seasonId || null, data.steam_id || null, data.isActive ?? true, now, now]
    );
    
    return id;
  }

  async updateDriver(id: string, data: Partial<DriverData>): Promise<void> {
    const now = new Date().toISOString();
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.team !== undefined) {
      updates.push(`team = $${paramCount++}`);
      values.push(data.team);
    }
    if (data.number !== undefined) {
      updates.push(`number = $${paramCount++}`);
      values.push(data.number);
    }
    if (data.steam_id !== undefined) {
      updates.push(`steam_id = $${paramCount++}`);
      values.push(data.steam_id || null);
    }
    if (data.isActive !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(data.isActive);
    }

    updates.push(`updated_at = $${paramCount++}`);
      values.push(now);
    values.push(id);

    await this.db.query(
      `UPDATE drivers SET ${updates.join(', ')} WHERE id = $${paramCount}`,
      values
    );
  }

  async getDriverById(id: string): Promise<Driver | null> {
    const result = await this.db.query(
      `SELECT id, name, team, number, season_id as "seasonId", steam_id, is_active as "isActive", 
              created_at as "createdAt", updated_at as "updatedAt"
       FROM drivers WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.transformDriverToCamelCase(result.rows[0]);
  }

  async deleteDriver(id: string): Promise<void> {
    await this.db.query('DELETE FROM drivers WHERE id = $1', [id]);
  }

  // UDP-specific methods (proper implementations)
  async addUDPParticipant(data: any): Promise<void> {
    const now = new Date().toISOString();
    
    await this.db.query(
      `INSERT INTO f123_udp_participants (
        id, season_id, user_id, vehicle_index, ai_controlled, f123_driver_id, 
        network_id, team_id, my_team, race_number, nationality, name, 
        your_telemetry, show_online_names, platform, session_uid, 
        session_time, frame_identifier, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
      [
        uuidv4(), data.seasonId, data.driverId || null, data.vehicleIndex, data.aiControlled,
        data.f123DriverId || data.driverId, data.networkId, data.teamId, data.myTeam, data.raceNumber,
        data.nationality, data.name, data.yourTelemetry, data.showOnlineNames,
        data.platform, data.sessionUid, data.sessionTime, data.frameIdentifier, now
      ]
    );
  }

  async addUDPSessionResult(data: any): Promise<void> {
    const now = new Date().toISOString();
    
    await this.db.query(
      `INSERT INTO f123_udp_session_results (
        id, season_id, event_id, user_id, position, num_laps, grid_position, 
        points, num_pit_stops, result_status, best_lap_time_ms, total_race_time_seconds,
        penalties_time, num_penalties, num_tyre_stints, session_uid, session_time,
        frame_identifier, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
      [
        uuidv4(), data.seasonId, data.eventId, data.driverId || null, data.position,
        data.numLaps, data.gridPosition, data.points, data.numPitStops,
        data.resultStatus, data.bestLapTimeMs, data.totalRaceTimeSeconds,
        data.penaltiesTime, data.numPenalties, data.numTyreStints,
        data.sessionUid, data.sessionTime, data.frameIdentifier, now
      ]
    );
  }

  async addUDPTyreStint(data: any): Promise<void> {
    const now = new Date().toISOString();
    
    await this.db.query(
      `INSERT INTO f123_udp_tyre_stints (
        id, user_id, stint_number, end_lap, tyre_actual_compound, 
        tyre_visual_compound, session_uid, session_time, frame_identifier, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        uuidv4(), data.driverId || null, data.stintNumber, data.endLap,
        data.tyreActualCompound, data.tyreVisualCompound, data.sessionUid,
        data.sessionTime, data.frameIdentifier, now
      ]
    );
  }

  async addUDPLapHistory(data: any): Promise<void> {
    const now = new Date().toISOString();
    
    await this.db.query(
      `INSERT INTO f123_udp_lap_history (
        id, user_id, lap_number, lap_time_ms, sector1_time_ms, sector1_time_minutes,
        sector2_time_ms, sector2_time_minutes, sector3_time_ms, sector3_time_minutes,
        lap_valid_bit_flags, session_uid, session_time, frame_identifier, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        uuidv4(), data.driverId || null, data.lapNumber, data.lapTimeMs,
        data.sector1TimeMs, data.sector1TimeMinutes, data.sector2TimeMs,
        data.sector2TimeMinutes, data.sector3TimeMs, data.sector3TimeMinutes,
        data.lapValidBitFlags, data.sessionUid, data.sessionTime,
        data.frameIdentifier, now
      ]
    );
  }

  /**
   * Batch insert lap history data (much more efficient than individual inserts)
   */
  async batchAddUDPLapHistory(lapHistoryArray: any[]): Promise<void> {
    if (lapHistoryArray.length === 0) {
      return;
    }

    const now = new Date().toISOString();
    const values: any[] = [];
    const placeholders: string[] = [];
    let paramIndex = 1;

    for (const data of lapHistoryArray) {
      placeholders.push(
        `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, ` +
        `$${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, ` +
        `$${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`
      );
      values.push(
        uuidv4(), data.driverId || null, data.lapNumber, data.lapTimeMs,
        data.sector1TimeMs, data.sector1TimeMinutes, data.sector2TimeMs,
        data.sector2TimeMinutes, data.sector3TimeMs, data.sector3TimeMinutes,
        data.lapValidBitFlags, data.sessionUid, data.sessionTime,
        data.frameIdentifier, now
      );
    }

    await this.db.query(
      `INSERT INTO f123_udp_lap_history (
        id, user_id, lap_number, lap_time_ms, sector1_time_ms, sector1_time_minutes,
        sector2_time_ms, sector2_time_minutes, sector3_time_ms, sector3_time_minutes,
        lap_valid_bit_flags, session_uid, session_time, frame_identifier, created_at
      ) VALUES ${placeholders.join(', ')}`,
      values
    );
  }

  async getUDPSessionResults(): Promise<any[]> {
    const result = await this.db.query(`
      SELECT usr.*, d.name as driver_name, s.name as season_name
      FROM f123_udp_session_results usr
      LEFT JOIN drivers d ON usr.user_id = d.id
      LEFT JOIN seasons s ON usr.season_id = s.id
      ORDER BY usr.created_at DESC
      LIMIT 100
    `);
    return result.rows;
  }

  async getUDPLapHistory(driverId?: string): Promise<any[]> {
    if (driverId) {
      const result = await this.db.query(`
        SELECT ulh.*, d.name as driver_name
        FROM f123_udp_lap_history ulh
        LEFT JOIN drivers d ON ulh.user_id = d.id
        WHERE ulh.user_id = $1
        ORDER BY ulh.created_at DESC
        LIMIT 100
      `, [driverId]);
      return result.rows;
    }
    const result = await this.db.query(`
      SELECT ulh.*, d.name as driver_name
      FROM f123_udp_lap_history ulh
      LEFT JOIN drivers d ON ulh.user_id = d.id
      ORDER BY ulh.created_at DESC
      LIMIT 100
    `);
    return result.rows;
  }

  // Additional UDP helper methods
  async getCurrentEventForSeason(seasonId: string): Promise<string | null> {
    const result = await this.db.query(`
      SELECT id FROM races 
      WHERE season_id = $1 AND status = 'scheduled' 
      ORDER BY race_date ASC 
      LIMIT 1
    `, [seasonId]);
    
    return result.rows[0]?.id || null;
  }

  async getUDPParticipantsBySession(sessionUid: bigint): Promise<any[]> {
    const result = await this.db.query(`
      SELECT up.*, d.name as driver_name, s.name as season_name
      FROM f123_udp_participants up
      LEFT JOIN drivers d ON up.user_id = d.id
      LEFT JOIN seasons s ON up.season_id = s.id
      WHERE up.session_uid = $1
      ORDER BY up.vehicle_index
    `, [sessionUid.toString()]);
    
    return result.rows;
  }

  async getUDPSessionResultsBySession(sessionUid: bigint): Promise<any[]> {
    const result = await this.db.query(`
      SELECT usr.*, d.name as driver_name, s.name as season_name, r.track_name
      FROM f123_udp_session_results usr
      LEFT JOIN drivers d ON usr.user_id = d.id
      LEFT JOIN seasons s ON usr.season_id = s.id
      LEFT JOIN races r ON usr.event_id = r.id
      WHERE usr.session_uid = $1
      ORDER BY usr.position
    `, [sessionUid.toString()]);
    
    return result.rows;
  }

  async getUDPLapHistoryByDriver(driverId: string, sessionUid?: bigint): Promise<any[]> {
    let query = `
      SELECT ulh.*, d.name as driver_name
      FROM f123_udp_lap_history ulh
      LEFT JOIN drivers d ON ulh.user_id = d.id
      WHERE ulh.user_id = $1
    `;
    const params = [driverId];
    
    if (sessionUid) {
      query += ` AND ulh.session_uid = $2`;
      params.push(sessionUid.toString());
    }
    
    query += ` ORDER BY ulh.lap_number ASC`;
    
    const result = await this.db.query(query, params);
    return result.rows;
  }

  async getUDPTyreStintsByDriver(driverId: string, sessionUid?: bigint): Promise<any[]> {
    let query = `
      SELECT uts.*, d.name as driver_name
      FROM f123_udp_tyre_stints uts
      LEFT JOIN drivers d ON uts.user_id = d.id
      WHERE uts.user_id = $1
    `;
    const params = [driverId];
    
    if (sessionUid) {
      query += ` AND uts.session_uid = $2`;
      params.push(sessionUid.toString());
    }
    
    query += ` ORDER BY uts.stint_number ASC`;
    
    const result = await this.db.query(query, params);
    return result.rows;
  }

  // Season management methods (proper implementations)
  async addDriverToSeason(seasonId: string, driverId: string): Promise<void> {
    console.log(`Adding driver ${driverId} to season ${seasonId}`);
    
    // Get driver details
    const driver = await this.getDriverById(driverId);
    if (!driver) {
      throw new Error(`Driver with ID ${driverId} not found`);
    }
    
    // Check if driver already exists in this season
    const existingDriver = await this.db.query(
      'SELECT id FROM drivers WHERE season_id = $1 AND (id = $2 OR name = $3)',
      [seasonId, driverId, driver.name]
    );
    
    if (existingDriver.rows.length > 0) {
      throw new Error(`Driver ${driver.name} is already in this season`);
    }
    
    // Create or update driver entry for this season
    // If driver has no season_id, create a season-specific entry
    // Otherwise, update the existing driver to include this season
    if (!driver.seasonId) {
      // Create a new driver entry for this season
      await this.db.query(
        'INSERT INTO drivers (id, name, team, number, season_id, steam_id, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [driverId, driver.name, driver.team || 'TBD', driver.number || 0, seasonId, driver.steam_id || null, driver.isActive]
      );
    } else {
      // Update existing driver to include this season (or create duplicate for season-specific data)
      await this.db.query(
        'UPDATE drivers SET season_id = $1 WHERE id = $2',
        [seasonId, driverId]
      );
    }
    
    console.log(`✅ Driver ${driver.name} added to season ${seasonId}`);
  }

  async removeDriverFromSeason(seasonId: string, driverId: string): Promise<void> {
    console.log(`Removing driver ${driverId} from season ${seasonId}`);
    
    // Check if driver exists in this season
    const driver = await this.db.query(
      'SELECT id, name FROM drivers WHERE id = $1 AND season_id = $2',
      [driverId, seasonId]
    );
    
    if (driver.rows.length === 0) {
      throw new Error(`Driver with ID ${driverId} not found in season ${seasonId}`);
    }
    
    // Remove driver from season
    await this.db.query(
      'DELETE FROM drivers WHERE id = $1 AND season_id = $2',
      [driverId, seasonId]
    );
    
    console.log(`✅ Driver ${driver.rows[0].name} removed from season ${seasonId}`);
  }

  async getTracksBySeason(seasonId: string): Promise<Track[]> {
    // Simplified implementation
    return [];
  }

  async createTrackAndAddToSeason(data: TrackData, seasonId: string): Promise<string> {
    const trackId = await this.createTrack(data);
    console.log(`Track ${trackId} added to season ${seasonId}`);
    return trackId;
  }

  async removeTrackFromSeason(seasonId: string, trackId: string): Promise<void> {
    console.log(`Removing track ${trackId} from season ${seasonId}`);
  }

  async addRaceToSeason(data: RaceData): Promise<string> {
    return this.createRace(data);
  }

  async removeRaceFromSeason(raceId: string): Promise<void> {
    await this.db.query('DELETE FROM races WHERE id = $1', [raceId]);
  }

  async getEventsBySeason(seasonId: string): Promise<any[]> {
    const result = await this.db.query(
      `SELECT r.*, t.name as track_name_full, t.country, t.length_km 
       FROM races r 
       LEFT JOIN tracks t ON r.track_id = t.id 
       WHERE r.season_id = $1 
       ORDER BY r.race_date ASC`,
        [seasonId]
      );
    
    // Get sessions for each event to determine types
    const eventsWithSessions = await Promise.all(
      result.rows.map(async (row) => {
        // Get completed sessions for this event
        const sessions = await this.getCompletedSessions(row.id);
        
        // Determine session types from completed sessions
        const sessionTypes: string[] = [];
        sessions.forEach(session => {
          const sessionType = session.sessionType;
          if (sessionType >= 1 && sessionType <= 4) {
            if (!sessionTypes.includes('practice')) sessionTypes.push('practice');
          } else if (sessionType >= 5 && sessionType <= 9) {
            if (!sessionTypes.includes('qualifying')) sessionTypes.push('qualifying');
          } else if (sessionType === 10) {
            if (!sessionTypes.includes('race')) sessionTypes.push('race');
          }
        });
        
        // Use session_types from database if available, otherwise use derived types
        const finalSessionTypes = row.session_types || (sessionTypes.length > 0 ? sessionTypes.join(', ') : null);
        
        return {
          id: row.id,
          season_id: row.season_id,
          track_id: row.track_id,
          track_name: row.track_name, // Event name (track-id from JSON, e.g., "Austria")
          track: {
            id: row.track_id,
            name: row.track_name_full || 'Unknown Track', // Full track name from tracks table (e.g., "Red Bull Ring")
            country: row.country || '',
            length: row.length_km || 0
          },
          race_date: row.race_date,
          status: row.status,
          session_type: row.session_type,
          session_types: finalSessionTypes, // Use derived session types if database value is null
          session_duration: row.session_duration,
          weather_air_temp: row.weather_air_temp,
          weather_track_temp: row.weather_track_temp,
          weather_rain_percentage: row.weather_rain_percentage,
          created_at: row.created_at,
          updated_at: row.updated_at,
          session_config: row.session_config // Include session config
        };
      })
    );
    
    return eventsWithSessions;
  }

  async addEventToSeason(seasonId: string, eventData: any): Promise<string> {
    console.log(`Adding event to season ${seasonId}:`, eventData);
    
    // Validate required fields
    if (!eventData.track_name) { // Date is no longer required
      throw new Error('Track name is required for events');
    }
    
    // If track_id is provided, use it; otherwise find or create track by the provided track_name
    // Note: track_name in eventData is the event name (e.g., "Austria"), not the full track name
    // If track_id is provided, use that; otherwise we need to find the track by the full track name
    let trackId: string;
    if (eventData.track_id) {
      trackId = eventData.track_id;
    } else if (eventData.full_track_name) {
      // If full track name is provided, use that to find/create track
      trackId = await this.findOrCreateTrack(eventData.full_track_name, eventData.track_length);
    } else {
      // Fallback: try to find by event name (might not work if track was created with full name)
      trackId = await this.findOrCreateTrack(eventData.track_name);
    }
    
    // Create race/event
    const eventId = uuidv4();
    await this.db.query(
      'INSERT INTO races (id, season_id, track_id, track_name, race_date, status, session_type, session_duration, weather_air_temp, weather_track_temp, weather_rain_percentage) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
      [
        eventId,
        seasonId,
        trackId,
        eventData.track_name, // Event name (e.g., "Austria") stored in races.track_name
        eventData.date ? new Date(eventData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0], // Use current date if not provided (DATE format)
        eventData.status || 'scheduled',
        eventData.session_type || 10, // Default to race
        eventData.session_duration || 0,
        eventData.weather_air_temp || 0,
        eventData.weather_track_temp || 0,
        eventData.weather_rain_percentage || 0
      ]
    );
    
    console.log(`✅ Event ${eventData.track_name} added to season ${seasonId} with ID ${eventId}`);
    return eventId;
  }

  async updateEventInSeason(eventId: string, eventData: any): Promise<void> {
    console.log(`Updating event ${eventId}:`, eventData);
    
    // Check if event exists
    const event = await this.db.query(
      'SELECT id FROM races WHERE id = $1',
      [eventId]
    );
    
    if (event.rows.length === 0) {
      throw new Error(`Event with ID ${eventId} not found`);
    }
    
    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (eventData.track_name !== undefined) {
      updates.push(`track_name = $${paramCount++}`);
      values.push(eventData.track_name);
    }
    if (eventData.date !== undefined && eventData.date !== '') { // Only update if date is provided and not empty
      updates.push(`race_date = $${paramCount++}`);
      values.push(new Date(eventData.date).toISOString());
    } else if (eventData.date === '') { // If date is explicitly set to empty, set to NULL
      updates.push(`race_date = $${paramCount++}`);
      values.push(null);
    }
    if (eventData.status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(eventData.status);
    }
    if (eventData.session_type !== undefined) {
      updates.push(`session_type = $${paramCount++}`);
      values.push(eventData.session_type);
    }
    if (eventData.session_types !== undefined) { // Update session_types
      updates.push(`session_types = $${paramCount++}`);
      values.push(eventData.session_types);
    }
    if (eventData.session_duration !== undefined) {
      updates.push(`session_duration = $${paramCount++}`);
      values.push(eventData.session_duration);
    }
    if (eventData.session_config !== undefined) { // Update session_config
      updates.push(`session_config = $${paramCount++}`);
      values.push(eventData.session_config);
    }
    if (eventData.weather_air_temp !== undefined) {
      updates.push(`weather_air_temp = $${paramCount++}`);
      values.push(eventData.weather_air_temp);
    }
    if (eventData.weather_track_temp !== undefined) {
      updates.push(`weather_track_temp = $${paramCount++}`);
      values.push(eventData.weather_track_temp);
    }
    if (eventData.weather_rain_percentage !== undefined) {
      updates.push(`weather_rain_percentage = $${paramCount++}`);
      values.push(eventData.weather_rain_percentage);
    }
    
    if (updates.length === 0) {
      console.log(`No updates provided for event ${eventId}`);
      return;
    }
    
    // Add updated_at timestamp
    updates.push(`updated_at = $${paramCount++}`);
    values.push(new Date().toISOString());
    
    // Add eventId for WHERE clause
    values.push(eventId);
    
    await this.db.query(
      `UPDATE races SET ${updates.join(', ')} WHERE id = $${paramCount}`,
      values
    );
    
    console.log(`✅ Event ${eventId} updated successfully`);
  }

  async removeEventFromSeason(eventId: string): Promise<void> {
    console.log(`Removing event ${eventId}`);
    
    // Check if event exists
    const event = await this.db.query(
      'SELECT id, track_name FROM races WHERE id = $1',
      [eventId]
    );
    
    if (event.rows.length === 0) {
      throw new Error(`Event with ID ${eventId} not found`);
    }
    
    // Remove event
    await this.db.query(
      'DELETE FROM races WHERE id = $1',
      [eventId]
    );
    
    console.log(`✅ Event ${eventId} (${event.rows[0].track_name}) removed successfully`);
  }

  // New methods for post-session processing and race results editing
  
  // Find active event by track name (flexible matching)
  async findActiveEventByTrack(trackName: string): Promise<string | null> {
    // Find existing event by exact track_name match (event name, e.g., "Austria")
    // Only return if it exists and is scheduled (not completed or cancelled)
    const result = await this.db.query(
      `SELECT id FROM races 
       WHERE track_name = $1 
       AND status = 'scheduled' 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [trackName]
    );
    
    return result.rows[0]?.id || null;
  }

  // Get session by session UID (for duplicate detection)
  async getSessionByUID(sessionUID: bigint): Promise<{ id: string; sessionName: string; trackName: string; raceDate: string; raceId: string } | null> {
    const result = await this.db.query(
      `SELECT sr.id, sr.session_name, r.track_name, r.race_date, sr.race_id
       FROM session_results sr 
       JOIN races r ON sr.race_id = r.id 
       WHERE sr.session_uid = $1 
       LIMIT 1`,
      [sessionUID.toString()]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      sessionName: row.session_name,
      trackName: row.track_name,
      raceDate: row.race_date,
      raceId: row.race_id
    };
  }

  // Create new session result entry (dynamic tab creation)
  // If session already exists, returns existing ID and updates completed_at
  async createSessionResult(raceId: string, sessionType: number, sessionName: string, sessionUID: bigint | null, additionalData?: any): Promise<string> {
    const now = new Date().toISOString();

    // Use ON CONFLICT to handle existing sessions - update completed_at and return existing ID
    const result = await this.db.query(
      `INSERT INTO session_results (id, race_id, session_type, session_name, session_uid, completed_at, created_at, additional_data) 
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (race_id, session_type) 
       DO UPDATE SET 
         completed_at = EXCLUDED.completed_at,
         session_name = EXCLUDED.session_name,
         session_uid = COALESCE(EXCLUDED.session_uid, session_results.session_uid),
         additional_data = COALESCE(EXCLUDED.additional_data, session_results.additional_data)
       RETURNING id`,
      [raceId, sessionType, sessionName, sessionUID, now, now, additionalData ? JSON.stringify(additionalData) : null]
    );

    return result.rows[0].id;
  }

  // Delete all driver session results for a session (for re-importing)
  async deleteDriverSessionResults(sessionResultId: string): Promise<void> {
    await this.db.query(
      `DELETE FROM driver_session_results WHERE session_result_id = $1`,
      [sessionResultId]
    );
  }

  // Store driver results for a session
  async storeDriverSessionResults(sessionResultId: string, driverResults: any[]): Promise<void> {
    const now = new Date().toISOString();

    for (const result of driverResults) {
      await this.db.query(
        `INSERT INTO driver_session_results (
          id, session_result_id, user_id, json_driver_id, json_driver_name, json_team_name, json_car_number,
          position, grid_position, points,
          num_laps, best_lap_time_ms, sector1_time_ms, sector2_time_ms, sector3_time_ms,
          total_race_time_ms, penalties, post_race_penalties, warnings, num_unserved_drive_through_pens,
          num_unserved_stop_go_pens, result_status, dnf_reason, fastest_lap, pole_position, additional_data, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)`,
        [
          uuidv4(), sessionResultId, result.user_id, 
          result.json_driver_id || null,
          result.json_driver_name || null,
          result.json_team_name || null,
          result.json_car_number || null,
          result.position,
          result.grid_position, result.points, result.num_laps, result.best_lap_time_ms,
          result.sector1_time_ms, result.sector2_time_ms, result.sector3_time_ms,
          result.total_race_time_ms, result.penalties, result.post_race_penalties || 0, result.warnings,
          result.num_unserved_drive_through_pens, result.num_unserved_stop_go_pens,
          result.result_status, result.dnf_reason, result.fastest_lap, result.pole_position,
          result.additional_data ? JSON.stringify(result.additional_data) : null, now
        ]
      );
    }
  }

  // Get all completed sessions for an event
  async getCompletedSessions(raceId: string): Promise<any[]> {
    const result = await this.db.query(
      `SELECT id, session_type, session_name, completed_at, created_at
       FROM session_results 
       WHERE race_id = $1 
       ORDER BY session_type ASC`,
      [raceId]
    );
    
    console.log(`🔍 getCompletedSessions: Found ${result.rows.length} sessions for race_id ${raceId}`);
    
    return result.rows.map(row => ({
      id: row.id,
      sessionType: row.session_type,
      sessionName: row.session_name,
      completedAt: row.completed_at,
      createdAt: row.created_at
    }));
  }

  // Get driver results for a specific session
  async getDriverSessionResults(sessionResultId: string): Promise<any[]> {
    // First get the race_id and session_type from session_results
    const sessionInfo = await this.db.query(
      `SELECT sr.race_id, sr.session_type 
       FROM session_results sr 
       WHERE sr.id = $1`,
      [sessionResultId]
    );
    
    if (sessionInfo.rows.length === 0) {
      console.log(`⚠️ getDriverSessionResults: No session found with id ${sessionResultId}`);
      return [];
    }
    
    const raceId = sessionInfo.rows[0].race_id;
    const sessionType = sessionInfo.rows[0].session_type;
    
    // Check if driver_session_results exist for this session
    const countResult = await this.db.query(
      `SELECT COUNT(*) as count FROM driver_session_results WHERE session_result_id = $1`,
      [sessionResultId]
    );
    const driverCount = parseInt(countResult.rows[0].count);
    console.log(`🔍 getDriverSessionResults: Found ${driverCount} driver_session_results for session ${sessionResultId}`);
    
    // Get driver session results with fallback to f123_session_results for names and sector times
    // Note: We use LEFT JOINs so we still get results even if driver_id is NULL
    // Also extract driver names from additional_data JSONB if available
    // Note: dsr.* includes all columns from driver_session_results, so we get position, points, times, etc.
    // OPTIMIZED: Use LEFT JOIN LATERAL instead of correlated subqueries to avoid N+1 query problem
    const result = await this.db.query(
      `SELECT 
        dsr.id,
        dsr.session_result_id,
        dsr.user_id,
        dsr.json_driver_id,
        dsr.json_driver_name,
        dsr.json_team_name,
        dsr.json_car_number,
        dsr.position,
        dsr.grid_position,
        dsr.points,
        dsr.num_laps,
        dsr.best_lap_time_ms,
        dsr.sector1_time_ms,
        dsr.sector2_time_ms,
        dsr.sector3_time_ms,
        dsr.total_race_time_ms,
        dsr.penalties,
        dsr.post_race_penalties,
        dsr.warnings,
        dsr.num_unserved_drive_through_pens,
        dsr.num_unserved_stop_go_pens,
        dsr.result_status,
        dsr.dnf_reason,
        dsr.fastest_lap,
        dsr.pole_position,
        dsr.additional_data,
        dsr.created_at,
        d.name as driver_name, 
        d.team as driver_team,
        d.number as driver_number,
        fdm.f123_team_name as mapping_team_name,
        fdm.f123_driver_name as mapping_driver_name,
        fdm.f123_driver_number as mapping_driver_number,
        penalty_info.penalty_reason,
        penalty_info.all_penalty_reasons
       FROM driver_session_results dsr
       LEFT JOIN drivers d ON dsr.user_id = d.id
       LEFT JOIN f123_driver_mappings fdm ON (
         d.name = fdm.f123_driver_name
       )
       LEFT JOIN f123_session_results fsr ON (
         fsr.race_id = $2 
         AND fsr.position = dsr.position
       )
       LEFT JOIN LATERAL (
         SELECT 
           (SELECT reh.reason 
            FROM race_edit_history reh 
            WHERE reh.driver_session_result_id = dsr.id
              AND reh.edit_type IN ('penalty', 'post_race_penalty', 'post_race_penalty_removal')
              AND reh.is_reverted = false
            ORDER BY reh.created_at DESC 
            LIMIT 1) as penalty_reason,
           (SELECT string_agg(reh.reason, ' | ' ORDER BY reh.created_at DESC)
            FROM race_edit_history reh 
            WHERE reh.driver_session_result_id = dsr.id
              AND reh.edit_type IN ('penalty', 'post_race_penalty', 'post_race_penalty_removal')
              AND reh.is_reverted = false) as all_penalty_reasons
       ) penalty_info ON true
       WHERE dsr.session_result_id = $1
       ORDER BY dsr.position ASC NULLS LAST`,
      [sessionResultId, raceId]
    );
    
    console.log(`✅ getDriverSessionResults: Returning ${result.rows.length} driver results for session ${sessionResultId}`);
    
    // Transform results - parse JSONB additional_data if it's a string, and convert snake_case to camelCase
    const transformedRows = result.rows.map(row => {
      // Parse additional_data if it's a string (JSONB from PostgreSQL)
      // PostgreSQL's pg library usually returns JSONB as an object, but sometimes as a string
      let additionalData = row.additional_data;
      
      // Handle different return types from PostgreSQL
      // PostgreSQL's pg library returns JSONB as objects, no need to deep clone unless modifying
      if (additionalData === null || additionalData === undefined) {
        additionalData = null;
      } else if (typeof additionalData === 'string') {
        try {
          additionalData = JSON.parse(additionalData);
        } catch (e) {
          console.warn('Failed to parse additional_data:', e);
          additionalData = null;
        }
      }
      // If it's already an object, use it directly (PostgreSQL JSONB is already a plain object)
      // No need to deep clone unless we're modifying it
      
      // Create a new object with all row properties, ensuring additional_data is properly set
      const transformed: any = {};
      
      // Copy all properties from row
      for (const key in row) {
        if (key !== 'additional_data') {
          transformed[key] = row[key];
        }
      }
      
      // Set additional_data as a plain object
      transformed.additional_data = additionalData;
      transformed.additionalData = additionalData;  // Also add camelCase alias
      
      // Debug: Log if additional_data is missing
      if (!additionalData && row.additional_data) {
        console.warn(`⚠️ Failed to parse additional_data for driver ${row.id}:`, {
          original_type: typeof row.additional_data,
          original_value: row.additional_data
        });
      }
      
      return transformed;
    });
    
    if (transformedRows.length > 0) {
      const sample = transformedRows[0];
      console.log(`📊 Sample result (key fields):`, {
        position: sample.position,
        grid_position: sample.grid_position,
        points: sample.points,
        best_lap_time_ms: sample.best_lap_time_ms,
        total_race_time_ms: sample.total_race_time_ms,
        has_additional_data: !!sample.additional_data,
        additional_data_type: typeof sample.additional_data,
        participantData_driver_id: sample.additional_data?.participantData?.['driver-id'],
        participantData_keys: sample.additional_data?.participantData ? Object.keys(sample.additional_data.participantData) : null,
        full_additional_data_sample: JSON.stringify(sample.additional_data).substring(0, 500)
      });
    }
    
    return transformedRows;
  }

  // Store original session results snapshot
  // Delete all original session results for a session (for re-importing)
  async deleteOriginalSessionResults(sessionResultId: string): Promise<void> {
    await this.db.query(
      `DELETE FROM session_results_original WHERE session_result_id = $1`,
      [sessionResultId]
    );
  }

  async storeOriginalSessionResults(sessionResultId: string, driverResults: any[]): Promise<void> {
    const now = new Date().toISOString();

    for (const result of driverResults) {
      await this.db.query(
        `INSERT INTO session_results_original (
          id, session_result_id, user_id, original_position, original_points,
          original_penalties, original_warnings, original_result_status,
          original_dnf_reason, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          uuidv4(), sessionResultId, result.user_id, result.position,
          result.points, result.penalties, result.warnings,
          result.result_status, result.dnf_reason, now
        ]
      );
    }
  }

  // Get season ID from event
  async getSeasonIdFromEvent(eventId: string): Promise<string> {
    const result = await this.db.query(
      'SELECT season_id FROM races WHERE id = $1',
      [eventId]
    );
    
    if (!result.rows[0]) {
      throw new Error(`Event with ID ${eventId} not found`);
    }
    
    return result.rows[0].season_id;
  }

  // Map session type number to readable name (uses shared constant)
  getSessionTypeName(sessionType: number): string {
    return getSessionTypeAbbreviation(sessionType);
  }

  // Race results editing methods
  
  // Add post-race penalty with history tracking (preserves original in-race penalties)
  // Uses driverSessionResultId (UUID) for direct lookup - no JSONB queries needed
  async addPenalty(driverSessionResultId: string, penaltySeconds: number, reason: string, editedBy: string): Promise<void> {
    const now = new Date().toISOString();

    // Get current values - direct UUID lookup (fast, indexed)
    const current = await this.db.query(
      `SELECT id, session_result_id, penalties, post_race_penalties, total_race_time_ms, position, user_id
       FROM driver_session_results 
       WHERE id = $1`,
      [driverSessionResultId]
    );
    
    if (!current.rows[0]) {
      throw new Error(`Driver session result not found: ${driverSessionResultId}`);
    }
    
    const sessionResultId = current.rows[0].session_result_id;
    const inRacePenalties = current.rows[0].penalties || 0; // Original in-race penalties (preserved)
    const oldPostRacePenalties = current.rows[0].post_race_penalties || 0; // Current post-race penalties
    const oldTotalTime = current.rows[0].total_race_time_ms || 0;
    const oldPosition = current.rows[0].position;
    const logUserId = current.rows[0].user_id || null;  // Tournament participant/user (NULL until mapped)
    
    // Add to post-race penalties (don't modify original in-race penalties)
    const newPostRacePenalties = oldPostRacePenalties + penaltySeconds;
    
    // Convert penalty seconds to milliseconds and add to total time
    // Note: total_race_time_ms from JSON already includes in-race penalties, so we just add post-race penalty
    const penaltyMs = penaltySeconds * 1000;
    const newTotalTime = oldTotalTime + penaltyMs;
    
    // Update the result with new post-race penalty and adjusted total time (preserve original penalties)
    await this.db.query(
      `UPDATE driver_session_results 
       SET post_race_penalties = $1, total_race_time_ms = $2 
       WHERE id = $3`,
      [newPostRacePenalties, newTotalTime, driverSessionResultId]
    );
    
    // Recalculate positions for all drivers in this session based on adjusted total times
    await this.recalculatePositions(sessionResultId);
    
    // Get the new position after recalculation
    const updated = await this.db.query(
      'SELECT position FROM driver_session_results WHERE id = $1',
      [driverSessionResultId]
    );
    const newPosition = updated.rows[0]?.position || oldPosition;
    
    // Log the edit - store driver_session_result_id directly (no JSONB matching needed)
    await this.db.query(
      `INSERT INTO race_edit_history (id, session_result_id, driver_session_result_id, user_id, edit_type, old_value, new_value, reason, edited_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        uuidv4(), sessionResultId, driverSessionResultId, logUserId, 'post_race_penalty',
        { 
          post_race_penalties: oldPostRacePenalties, 
          total_race_time_ms: oldTotalTime, 
          position: oldPosition 
        }, 
        { 
          post_race_penalties: newPostRacePenalties, 
          total_race_time_ms: newTotalTime, 
          position: newPosition 
        },
        reason, editedBy, now
      ]
    );
  }

  // Remove post-race penalty (subtract penalty time and recalculate positions, preserves original in-race penalties)
  // Uses driverSessionResultId (UUID) for direct lookup - no JSONB queries needed
  async removePenalty(driverSessionResultId: string, penaltySeconds: number, reason: string, editedBy: string): Promise<void> {
    const now = new Date().toISOString();

    // Get current values - direct UUID lookup (fast, indexed)
    const current = await this.db.query(
      `SELECT id, session_result_id, penalties, post_race_penalties, total_race_time_ms, position, user_id
       FROM driver_session_results 
       WHERE id = $1`,
      [driverSessionResultId]
    );
    
    if (!current.rows[0]) {
      throw new Error(`Driver session result not found: ${driverSessionResultId}`);
    }
    
    const sessionResultId = current.rows[0].session_result_id;
    const inRacePenalties = current.rows[0].penalties || 0; // Original in-race penalties (preserved)
    const oldPostRacePenalties = current.rows[0].post_race_penalties || 0; // Current post-race penalties
    const oldTotalTime = current.rows[0].total_race_time_ms || 0;
    const oldPosition = current.rows[0].position;
    const logUserId = current.rows[0].user_id || null;  // Tournament participant/user (NULL until mapped)
    
    // Ensure we don't go below 0
    const newPostRacePenalties = Math.max(0, oldPostRacePenalties - penaltySeconds);
    const penaltyMs = penaltySeconds * 1000;
    const newTotalTime = Math.max(0, oldTotalTime - penaltyMs);
    
    // Update the result with reduced post-race penalty and adjusted total time (preserve original penalties)
    await this.db.query(
      `UPDATE driver_session_results 
       SET post_race_penalties = $1, total_race_time_ms = $2 
       WHERE id = $3`,
      [newPostRacePenalties, newTotalTime, driverSessionResultId]
    );
    
    // Recalculate positions for all drivers in this session based on adjusted total times
    await this.recalculatePositions(sessionResultId);
    
    // Get the new position after recalculation
    const updated = await this.db.query(
      'SELECT position FROM driver_session_results WHERE id = $1',
      [driverSessionResultId]
    );
    const newPosition = updated.rows[0]?.position || oldPosition;
    
    // Log the edit - store driver_session_result_id directly (no JSONB matching needed)
    await this.db.query(
      `INSERT INTO race_edit_history (id, session_result_id, driver_session_result_id, user_id, edit_type, old_value, new_value, reason, edited_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        uuidv4(), sessionResultId, driverSessionResultId, logUserId, 'post_race_penalty_removal',
        { 
          post_race_penalties: oldPostRacePenalties, 
          total_race_time_ms: oldTotalTime, 
          position: oldPosition 
        }, 
        { 
          post_race_penalties: newPostRacePenalties, 
          total_race_time_ms: newTotalTime, 
          position: newPosition 
        },
        reason, editedBy, now
      ]
    );
  }

  // Recalculate positions for all drivers in a session based on total_race_time_ms
  async recalculatePositions(sessionResultId: string): Promise<void> {
    // Get all drivers for this session with their total race times
    const drivers = await this.db.query(
      `SELECT id, position, total_race_time_ms, result_status
       FROM driver_session_results
       WHERE session_result_id = $1
       ORDER BY 
         CASE WHEN result_status = 2 THEN 0 ELSE 1 END, -- Finished drivers first
         total_race_time_ms ASC NULLS LAST, -- Then by time (ascending = fastest first)
         position ASC -- Tie-breaker: original position
       `,
      [sessionResultId]
    );
    
    // Update positions based on sorted order
    for (let i = 0; i < drivers.rows.length; i++) {
      const driver = drivers.rows[i];
      const newPosition = i + 1;
      
      // Only update if position changed
      if (driver.position !== newPosition) {
        await this.db.query(
          `UPDATE driver_session_results 
           SET position = $1 
           WHERE id = $2`,
          [newPosition, driver.id]
        );
      }
    }
  }

  // Change driver position
  async changePosition(sessionResultId: string, driverId: string, newPosition: number, reason: string, editedBy: string): Promise<void> {
    const now = new Date().toISOString();
    
    // Get current values
    const current = await this.db.query(
      'SELECT position FROM driver_session_results WHERE session_result_id = $1 AND driver_id = $2',
      [sessionResultId, driverId]
    );
    
    if (!current.rows[0]) {
      throw new Error('Driver session result not found');
    }
    
    const oldPosition = current.rows[0].position;
    
    // Update the result
    await this.db.query(
      'UPDATE driver_session_results SET position = $1, updated_at = $2 WHERE session_result_id = $3 AND driver_id = $4',
      [newPosition, now, sessionResultId, driverId]
    );
    
    // Log the edit
    await this.db.query(
      `INSERT INTO race_edit_history (id, session_result_id, driver_id, edit_type, old_value, new_value, reason, edited_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        uuidv4(), sessionResultId, driverId, 'position_change',
        { position: oldPosition }, { position: newPosition },
        reason, editedBy, now
      ]
    );
  }

  // Reset specific driver to original state
  async resetDriverToOriginal(sessionResultId: string, driverId: string): Promise<void> {
    const now = new Date().toISOString();

    // Get original values
    const original = await this.db.query(
      'SELECT * FROM session_results_original WHERE session_result_id = $1 AND driver_id = $2',
      [sessionResultId, driverId]
    );
    
    if (!original.rows[0]) {
      throw new Error('Original session result not found');
    }
    
    const orig = original.rows[0];
    
    // Reset to original values
    await this.db.query(
      `UPDATE driver_session_results SET 
       position = $1, points = $2, penalties = $3, warnings = $4, 
       result_status = $5, dnf_reason = $6, updated_at = $7
       WHERE session_result_id = $8 AND driver_id = $9`,
      [
        orig.original_position, orig.original_points, orig.original_penalties,
        orig.original_warnings, orig.original_result_status, orig.original_dnf_reason,
        now, sessionResultId, driverId
      ]
    );
    
    // Mark as restored
    await this.db.query(
      'UPDATE session_results_original SET is_restored = true WHERE session_result_id = $1 AND driver_id = $2',
      [sessionResultId, driverId]
    );
    
    // Log the reset
    await this.db.query(
      `INSERT INTO race_edit_history (id, session_result_id, driver_id, edit_type, old_value, new_value, reason, edited_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        uuidv4(), sessionResultId, driverId, 'reset_to_original',
        {}, {}, 'Reset to original UDP data', 'system', now
      ]
    );
  }

  // Get edit history for a session
  async getEditHistory(sessionResultId: string): Promise<any[]> {
    const result = await this.db.query(
      `SELECT reh.*, d.name as driver_name, dsr.json_driver_name, dsr.json_team_name
       FROM race_edit_history reh
       LEFT JOIN drivers d ON reh.user_id = d.id
       LEFT JOIN driver_session_results dsr ON reh.driver_session_result_id = dsr.id
       WHERE reh.session_result_id = $1
       ORDER BY reh.created_at DESC`,
      [sessionResultId]
    );
    
    return result.rows;
  }
  
  // Get edit history for a specific driver result (by driver_session_result_id)
  async getEditHistoryForDriver(driverSessionResultId: string): Promise<any[]> {
    const result = await this.db.query(
      `SELECT reh.*, d.name as driver_name, dsr.json_driver_name, dsr.json_team_name
       FROM race_edit_history reh
       LEFT JOIN drivers d ON reh.user_id = d.id
       LEFT JOIN driver_session_results dsr ON reh.driver_session_result_id = dsr.id
       WHERE reh.driver_session_result_id = $1
       ORDER BY reh.created_at DESC`,
      [driverSessionResultId]
    );
    
    return result.rows;
  }

  // Revert specific edit
  async revertEdit(editId: string): Promise<void> {
    const now = new Date().toISOString();

    // Get the edit
    const edit = await this.db.query(
      'SELECT * FROM race_edit_history WHERE id = $1 AND is_reverted = false',
      [editId]
    );
    
    if (!edit.rows[0]) {
      throw new Error('Edit not found or already reverted');
    }
    
    const editData = edit.rows[0];
    
    // Revert the change based on edit type
    if (editData.edit_type === 'penalty' || editData.edit_type === 'post_race_penalty' || editData.edit_type === 'post_race_penalty_removal') {
      // Revert post-race penalties
      if (editData.edit_type === 'post_race_penalty' || editData.edit_type === 'post_race_penalty_removal') {
        // Find the driver_session_results record by session_result_id and driver_id
        // If driver_id is NULL, we need to find by session and position or use a different approach
        const driverResult = await this.db.query(
          `SELECT id FROM driver_session_results 
           WHERE session_result_id = $1 
           AND (driver_id = $2 OR (driver_id IS NULL AND $2 IS NULL))`,
          [editData.session_result_id, editData.driver_id]
        );
        
        if (driverResult.rows[0]) {
          const driverId = driverResult.rows[0].id;
          await this.db.query(
            `UPDATE driver_session_results 
             SET post_race_penalties = $1, total_race_time_ms = $2 
             WHERE id = $3`,
            [
              editData.old_value.post_race_penalties || 0,
              editData.old_value.total_race_time_ms || 0,
              driverId
            ]
          );
          // Recalculate positions after reverting penalty
          await this.recalculatePositions(editData.session_result_id);
        }
      } else {
        // Legacy penalty revert (for old edit_type = 'penalty')
        await this.db.query(
          'UPDATE driver_session_results SET penalties = $1 WHERE session_result_id = $2 AND (driver_id = $3 OR (driver_id IS NULL AND $3 IS NULL))',
          [editData.old_value.penalties, editData.session_result_id, editData.driver_id]
        );
      }
    } else if (editData.edit_type === 'position_change') {
      // Find driver by session_result_id and driver_id (handle NULL)
      const driverResult = await this.db.query(
        `SELECT id FROM driver_session_results 
         WHERE session_result_id = $1 
         AND (driver_id = $2 OR (driver_id IS NULL AND $2 IS NULL))`,
        [editData.session_result_id, editData.driver_id]
      );
      
      if (driverResult.rows[0]) {
        await this.db.query(
          'UPDATE driver_session_results SET position = $1 WHERE id = $2',
          [editData.old_value.position, driverResult.rows[0].id]
        );
      }
    }
    
    // Mark edit as reverted
    await this.db.query(
      'UPDATE race_edit_history SET is_reverted = true WHERE id = $1',
      [editId]
    );
  }

  // Get league-wide historic insights
  async getHistoricInsights(): Promise<any> {
    try {
      // Get actual data from existing tables
      const seasonsResult = await this.db.query(`
        SELECT COUNT(*) as total_seasons
        FROM seasons
        WHERE status IN ('completed', 'active')
      `);
      
      const racesResult = await this.db.query(`
        SELECT COUNT(*) as total_races
        FROM races
        WHERE status = 'completed'
      `);
      
      const driversResult = await this.db.query(`
        SELECT COUNT(DISTINCT d.id) as total_drivers
        FROM drivers d
        JOIN seasons s ON d.season_id = s.id
        WHERE s.status IN ('completed', 'active')
      `);
      
      const winsResult = await this.db.query(`
        SELECT COUNT(*) as total_wins
        FROM driver_session_results dsr
        JOIN session_results sr ON dsr.session_result_id = sr.id
        WHERE dsr.position = 1 AND sr.session_type = 10
      `);
      
      const podiumsResult = await this.db.query(`
        SELECT COUNT(*) as total_podiums
        FROM driver_session_results dsr
        JOIN session_results sr ON dsr.session_result_id = sr.id
        WHERE dsr.position IN (1, 2, 3) AND sr.session_type = 10
      `);
      
      return {
        totalRaces: parseInt(racesResult.rows[0]?.total_races) || 0,
        totalSeasons: parseInt(seasonsResult.rows[0]?.total_seasons) || 0,
        totalDrivers: parseInt(driversResult.rows[0]?.total_drivers) || 0,
        totalPodiums: parseInt(podiumsResult.rows[0]?.total_podiums) || 0,
        totalWins: parseInt(winsResult.rows[0]?.total_wins) || 0,
        totalChampionships: 0 // TODO: Calculate when we have championship logic
      };
    } catch (error) {
      console.error('Error getting historic insights:', error);
      // Return mock data as fallback
      return {
        totalRaces: 0,
        totalSeasons: 1,
        totalDrivers: 12,
        totalPodiums: 0,
        totalWins: 0,
        totalChampionships: 0
      };
    }
  }

  // Get completed and active seasons with summaries
  async getSeasonsForHistory(): Promise<any[]> {
    const result = await this.db.query(`
      SELECT 
        s.id,
        s.name,
        s.year,
        s.status,
        COUNT(DISTINCT r.id) as total_races,
        COUNT(DISTINCT d.id) as total_drivers
      FROM seasons s
      LEFT JOIN races r ON r.season_id = s.id
      LEFT JOIN drivers d ON d.season_id = s.id
      WHERE s.status IN ('completed', 'active')
      GROUP BY s.id, s.name, s.year, s.status
      ORDER BY s.year DESC
    `);
    
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      year: row.year,
      status: row.status,
      totalRaces: parseInt(row.total_races) || 0,
      totalDrivers: parseInt(row.total_drivers) || 0,
      champion: 'TBD' // TODO: Calculate when race results are available
    }));
  }

  // Get member career profile with comprehensive data
  // Driver career profile (replaces member career profile)
  async getDriverCareerProfile(driverId: string): Promise<any> {
    try {
      const driver = await this.getDriverById(driverId);
      if (!driver) return null;

      // Calculate career stats from race results
      const careerStats = {
        wins: 0,
        podiums: 0,
        points: 0,
        seasons: 0,
        polePositions: 0,
        fastestLaps: 0,
        averageFinish: 0,
        finishRate: 0,
        championships: 0,
        bestFinish: 0
      };

      // Get seasons participated in
      const seasonsResult = await this.db.query(`
        SELECT DISTINCT s.id, s.name, s.year
        FROM seasons s
        JOIN driver_session_results dsr ON dsr.driver_id = $1
        JOIN session_results sr ON sr.id = dsr.session_result_id
        JOIN races r ON r.id = sr.race_id
        WHERE r.season_id = s.id
        ORDER BY s.year DESC
      `, [driverId]);
      
      return {
        driver,
        careerStats,
        seasons: seasonsResult.rows.map(row => ({
          id: row.id,
          year: row.year,
          name: row.name
        }))
      };
    } catch (error) {
      console.error('Error getting driver career profile:', error);
      return null;
    }
  }

  // Get driver statistics for specific season
  async getDriverSeasonStats(driverId: string, seasonId: string): Promise<any> {
    try {
      // Calculate stats from race results
      const statsResult = await this.db.query(`
        SELECT 
          COUNT(*) FILTER (WHERE dsr.position = 1) as wins,
          COUNT(*) FILTER (WHERE dsr.position <= 3) as podiums,
          SUM(dsr.points) as points,
          COUNT(*) FILTER (WHERE dsr.pole_position = true) as pole_positions,
          COUNT(*) FILTER (WHERE dsr.fastest_lap = true) as fastest_laps,
          AVG(dsr.position) as avg_finish,
          COUNT(*) as total_races
        FROM driver_session_results dsr
        JOIN session_results sr ON sr.id = dsr.session_result_id
        JOIN races r ON r.id = sr.race_id
        WHERE dsr.driver_id = $1 AND r.season_id = $2 AND sr.session_type = 10
      `, [driverId, seasonId]);
      
      const stats = statsResult.rows[0] || {};
      return {
        wins: parseInt(stats.wins) || 0,
        podiums: parseInt(stats.podiums) || 0,
        points: parseFloat(stats.points) || 0,
        polePositions: parseInt(stats.pole_positions) || 0,
        fastestLaps: parseInt(stats.fastest_laps) || 0,
        averageFinish: parseFloat(stats.avg_finish) || 0,
        totalRaces: parseInt(stats.total_races) || 0
      };
    } catch (error) {
      console.error('Error getting driver season stats:', error);
      return {
        wins: 0,
        podiums: 0,
        points: 0,
        polePositions: 0,
        fastestLaps: 0,
        averageFinish: 0,
        totalRaces: 0
      };
    }
  }

  // Get driver race history with optional season filtering
  async getDriverRaceHistory(driverId: string, seasonId?: string): Promise<any[]> {
    try {
      let query = `
        SELECT 
          r.id as race_id,
          r.track_name,
          r.race_date,
          sr.id as session_result_id,
          sr.session_type,
          sr.session_name,
          dsr.position,
          dsr.grid_position,
          dsr.points,
          dsr.num_laps,
          dsr.best_lap_time_ms,
          dsr.total_race_time_ms,
          dsr.penalties,
          dsr.warnings,
          dsr.fastest_lap,
          dsr.pole_position,
          dsr.result_status,
          dsr.dnf_reason,
          r.status as race_status
        FROM driver_session_results dsr
        JOIN session_results sr ON sr.id = dsr.session_result_id
        JOIN races r ON r.id = sr.race_id
        WHERE dsr.driver_id = $1
          AND sr.session_type = 10
      `;
      
      const params: any[] = [driverId];
      
      if (seasonId) {
        query += ` AND r.season_id = $2`;
        params.push(seasonId);
      }
      
      query += ` ORDER BY r.race_date DESC, r.created_at DESC`;
      
      const result = await this.db.query(query, params);
      
      return result.rows.map(row => ({
        raceId: row.race_id,
        trackName: row.track_name,
        raceDate: row.race_date,
        sessionResultId: row.session_result_id,
        sessionType: row.session_type,
        sessionName: row.session_name,
        position: row.position,
        gridPosition: row.grid_position,
        points: row.points,
        numLaps: row.num_laps,
        bestLapTimeMs: row.best_lap_time_ms,
        totalRaceTimeMs: row.total_race_time_ms,
        penalties: row.penalties,
        warnings: row.warnings,
        fastestLap: row.fastest_lap,
        polePosition: row.pole_position,
        resultStatus: row.result_status,
        dnfReason: row.dnf_reason,
        raceStatus: row.race_status
      }));
    } catch (error) {
      console.error('Error getting driver race history:', error);
      return [];
    }
  }

  // Get most recent completed race results for a season
  async getPreviousRaceResults(seasonId: string): Promise<any> {
    try {
      // Get the most recent completed race for this season
      const raceResult = await this.db.query(`
        SELECT r.id, r.track_name, r.race_date, r.status
        FROM races r
        JOIN session_results sr ON sr.race_id = r.id
        WHERE r.season_id = $1
          AND r.status = 'completed'
          AND sr.session_type = 10
        ORDER BY r.race_date DESC, r.created_at DESC
        LIMIT 1
      `, [seasonId]);
      
      if (raceResult.rows.length === 0) {
        return null;
      }
      
      const race = raceResult.rows[0];
      
      // Get all results for this race
      const resultsQuery = await this.db.query(`
        SELECT 
          dsr.position,
          dsr.grid_position,
          dsr.points,
          dsr.num_laps,
          dsr.best_lap_time_ms,
          dsr.fastest_lap,
          dsr.pole_position,
          dsr.result_status,
          dsr.dnf_reason
        FROM driver_session_results dsr
        JOIN session_results sr ON sr.id = dsr.session_result_id
        WHERE sr.race_id = $1
          AND sr.session_type = 10
        ORDER BY dsr.position ASC
      `, [race.id]);
      
      return {
        raceId: race.id,
        trackName: race.track_name,
        raceDate: race.race_date,
        status: race.status,
        results: resultsQuery.rows.map(row => ({
          position: row.position,
          gridPosition: row.grid_position,
          points: row.points,
          numLaps: row.num_laps,
          bestLapTimeMs: row.best_lap_time_ms,
          fastestLap: row.fastest_lap,
          polePosition: row.pole_position,
          resultStatus: row.result_status,
          dnfReason: row.dnf_reason,
          memberName: row.member_name,
          memberId: row.member_id
        }))
      };
    } catch (error) {
      console.error('Error getting previous race results:', error);
      return null;
    }
  }

  // Close database connection
  async close(): Promise<void> {
    await this.db.end();
  }
}