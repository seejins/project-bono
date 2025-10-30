import { Client } from 'pg';
import { v4 as uuidv4 } from 'uuid';

// Type definitions
export interface Member {
  id: string;
  name: string;
  steam_id?: string; // Steam ID for F1 23 UDP mapping
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MemberData {
  name: string;
  steam_id?: string; // Steam ID for F1 23 UDP mapping
  isActive?: boolean;
}

export interface Driver {
  id: string;
  name: string;
  team: string;
  number: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DriverData {
  name: string;
  team: string;
  number: number;
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
  memberId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DriverMappingData {
  seasonId: string;
  f123DriverId: number;
  f123DriverName: string;
  f123DriverNumber?: number;
  f123TeamName?: string;
  memberId?: string;
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
    this.db = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'f1_race_engineer_dev',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'test123',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    this.db.connect().catch((error) => {
      console.error('❌ PostgreSQL connection failed:', error);
      process.exit(1);
    });
    
    this.initializeTables();
  }

  // Helper methods for snake_case to camelCase transformation
  private transformMemberToCamelCase(dbRow: any): Member {
    return {
      id: dbRow.id,
      name: dbRow.name,
      steam_id: dbRow.steam_id,
      isActive: dbRow.is_active,
      createdAt: dbRow.created_at,
      updatedAt: dbRow.updated_at
    };
  }

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
        -- Members table (for league participants)
        CREATE TABLE IF NOT EXISTS members (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) NOT NULL,
          steam_id VARCHAR(20) UNIQUE,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

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

        -- Drivers table
        CREATE TABLE IF NOT EXISTS drivers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) NOT NULL,
          team VARCHAR(100),
          number INTEGER,
          season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

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
          member_id UUID REFERENCES members(id) ON DELETE SET NULL,
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
          UNIQUE(race_id, session_type)
        );

        -- Driver Session Results (results for each driver in each session)
        CREATE TABLE IF NOT EXISTS driver_session_results (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          session_result_id UUID REFERENCES session_results(id) ON DELETE CASCADE,
          driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
          member_id UUID REFERENCES members(id) ON DELETE CASCADE,
          position INTEGER NOT NULL,
          grid_position INTEGER,
          points INTEGER DEFAULT 0,
          num_laps INTEGER,
          best_lap_time_ms INTEGER,
          sector1_time_ms INTEGER,
          sector2_time_ms INTEGER,
          sector3_time_ms INTEGER,
          total_race_time_ms INTEGER,
          penalties INTEGER DEFAULT 0,
          warnings INTEGER DEFAULT 0,
          num_unserved_drive_through_pens INTEGER DEFAULT 0,
          num_unserved_stop_go_pens INTEGER DEFAULT 0,
          result_status INTEGER,
          dnf_reason VARCHAR(100),
          fastest_lap BOOLEAN DEFAULT FALSE,
          pole_position BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Race Edit History Table (for audit trail and reset capability)
        CREATE TABLE IF NOT EXISTS race_edit_history (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          session_result_id UUID REFERENCES session_results(id) ON DELETE CASCADE,
          driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
          edit_type VARCHAR(50) NOT NULL,
          old_value JSONB,
          new_value JSONB,
          reason TEXT,
          edited_by VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          is_reverted BOOLEAN DEFAULT FALSE
        );

        -- Original Session Results Snapshot (preserves UDP data)
        CREATE TABLE IF NOT EXISTS session_results_original (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          session_result_id UUID REFERENCES session_results(id) ON DELETE CASCADE,
          driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
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
          member_id UUID REFERENCES members(id) ON DELETE SET NULL,
          vehicle_index INTEGER NOT NULL,
          ai_controlled BOOLEAN DEFAULT FALSE,
          driver_id INTEGER NOT NULL,
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
          member_id UUID REFERENCES members(id) ON DELETE SET NULL,
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
          member_id UUID REFERENCES members(id) ON DELETE SET NULL,
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
          member_id UUID REFERENCES members(id) ON DELETE SET NULL,
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
      
      // Migration 2: Fix seasons table schema to allow nullable start_date and end_date
      await this.runMigration('fix_seasons_nullable_dates', async () => {
        await this.db.query('ALTER TABLE seasons ALTER COLUMN start_date DROP NOT NULL');
        await this.db.query('ALTER TABLE seasons ALTER COLUMN end_date DROP NOT NULL');
      });
      
      // Migration 3: Add member_id to f123_driver_mappings table
      await this.runMigration('add_member_id_to_f123_driver_mappings', async () => {
        await this.addColumnIfNotExists('f123_driver_mappings', 'member_id', 'UUID REFERENCES members(id) ON DELETE CASCADE');
      });
      
      // Migration 3: Add session_types column to season_events table (skipped - table doesn't exist)
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

  // Member CRUD operations
  async createMember(data: MemberData): Promise<string> {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    await this.db.query(
        `INSERT INTO members (id, name, steam_id, is_active, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, data.name, data.steam_id || null, data.isActive ?? true, now, now]
      );
    
    return id;
  }

  async getAllMembers(): Promise<Member[]> {
    const result = await this.db.query(
        `SELECT id, name, steam_id, is_active, created_at, updated_at 
         FROM members ORDER BY name`
      );
      return result.rows.map(row => this.transformMemberToCamelCase(row));
  }

  async getMemberById(id: string): Promise<Member | null> {
    const result = await this.db.query(
        `SELECT id, name, steam_id, is_active, created_at, updated_at 
         FROM members WHERE id = $1`,
        [id]
      );
      return result.rows[0] ? this.transformMemberToCamelCase(result.rows[0]) : null;
  }

  async updateMember(id: string, data: Partial<MemberData>): Promise<void> {
    const now = new Date().toISOString();
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.steam_id !== undefined) {
      updates.push(`steam_id = $${paramCount++}`);
      values.push(data.steam_id);
    }
    if (data.isActive !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(data.isActive);
    }
    
    updates.push(`updated_at = $${paramCount++}`);
    values.push(now);
    values.push(id);

    await this.db.query(
      `UPDATE members SET ${updates.join(', ')} WHERE id = $${paramCount}`,
        values
      );
  }

  async deleteMember(id: string): Promise<void> {
    await this.db.query('DELETE FROM members WHERE id = $1', [id]);
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
    
    await this.db.query(
      `INSERT INTO races (id, season_id, track_id, race_date, status, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, data.seasonId, data.trackId, data.raceDate, data.status || 'scheduled', now, now]
    );
    
    return id;
  }

  async getRacesBySeason(seasonId: string): Promise<Race[]> {
    const result = await this.db.query(
      `SELECT id, season_id as "seasonId", track_id as "trackId", race_date as "raceDate", 
              status, created_at as "createdAt", updated_at as "updatedAt"
       FROM races WHERE season_id = $1 ORDER BY race_date`,
        [seasonId]
      );
      return result.rows;
  }

  // Driver Mapping operations
  async createDriverMapping(data: DriverMappingData): Promise<string> {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    await this.db.query(
      `INSERT INTO f123_driver_mappings (id, season_id, f123_driver_id, f123_driver_name, f123_driver_number, f123_team_name, member_id, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        id, 
        data.seasonId, 
        data.f123DriverId, 
        data.f123DriverName, 
        data.f123DriverNumber || null, 
        data.f123TeamName || null, 
        data.memberId || null, 
        now, 
        now
      ]
    );
    
    return id;
  }

  async getDriverMappingsBySeason(seasonId: string): Promise<DriverMapping[]> {
    const result = await this.db.query(
      `SELECT id, season_id as "seasonId", f123_driver_id as "f123DriverId", f123_driver_name as "f123DriverName", 
              f123_driver_number as "f123DriverNumber", f123_team_name as "f123TeamName", member_id as "memberId", 
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
    if (data.memberId !== undefined) {
      updates.push(`member_id = $${paramCount++}`);
      values.push(data.memberId);
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
        `INSERT INTO f123_session_results (id, race_id, driver_id, driver_name, team_name, car_number, position, lap_time, sector1_time, sector2_time, sector3_time, fastest_lap, created_at) 
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
          result.fastestLap,
          now
        ]
      );
    }
  }

  async getSessionResultsByRace(raceId: string): Promise<SessionResult[]> {
    const result = await this.db.query(
      `SELECT driver_id as "driverId", driver_name as "driverName", team_name as "teamName", car_number as "carNumber", 
              position, lap_time as "lapTime", sector1_time as "sector1Time", sector2_time as "sector2Time", 
              sector3_time as "sector3Time", fastest_lap as "fastestLap", created_at as "createdAt"
       FROM f123_session_results WHERE race_id = $1 ORDER BY position`,
      [raceId]
      );
      return result.rows;
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
      WHERE fdm.member_id = $1 AND fsr.session_type = 10
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

  async getMemberBySteamId(steamId: string): Promise<Member | null> {
    const result = await this.db.query(
      `SELECT id, name, steam_id as "steam_id", is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt" 
       FROM members WHERE steam_id = $1`,
      [steamId]
    );
    return result.rows[0] ? this.transformMemberToCamelCase(result.rows[0]) : null;
  }

  async findOrCreateTrack(trackName: string): Promise<string> {
    // First try to find existing track
    const existing = await this.db.query(
      'SELECT id FROM tracks WHERE name = $1',
      [trackName]
    );
    
    if (existing.rows[0]) {
      return existing.rows[0].id;
    }
    
    // Create new track
    const id = uuidv4();
    const now = new Date().toISOString();
    
    await this.db.query(
      `INSERT INTO tracks (id, name, country, length_km, created_at) 
         VALUES ($1, $2, $3, $4, $5)`,
      [id, trackName, 'Unknown', 0, now]
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
    
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      team: row.team,
      number: row.number,
      seasonId: row.season_id,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  async createDriver(data: DriverData): Promise<string> {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    await this.db.query(
      `INSERT INTO drivers (id, name, team, number, is_active, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, data.name, data.team, data.number, data.isActive ?? true, now, now]
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

  async deleteDriver(id: string): Promise<void> {
    await this.db.query('DELETE FROM drivers WHERE id = $1', [id]);
  }

  // UDP-specific methods (proper implementations)
  async addUDPParticipant(data: any): Promise<void> {
    const now = new Date().toISOString();
    
    await this.db.query(
      `INSERT INTO f123_udp_participants (
        id, season_id, member_id, vehicle_index, ai_controlled, driver_id, 
        network_id, team_id, my_team, race_number, nationality, name, 
        your_telemetry, show_online_names, platform, session_uid, 
        session_time, frame_identifier, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
      [
        uuidv4(), data.seasonId, data.memberId, data.vehicleIndex, data.aiControlled,
        data.driverId, data.networkId, data.teamId, data.myTeam, data.raceNumber,
        data.nationality, data.name, data.yourTelemetry, data.showOnlineNames,
        data.platform, data.sessionUid, data.sessionTime, data.frameIdentifier, now
      ]
    );
  }

  async addUDPSessionResult(data: any): Promise<void> {
    const now = new Date().toISOString();
    
    await this.db.query(
      `INSERT INTO f123_udp_session_results (
        id, season_id, event_id, member_id, position, num_laps, grid_position, 
        points, num_pit_stops, result_status, best_lap_time_ms, total_race_time_seconds,
        penalties_time, num_penalties, num_tyre_stints, session_uid, session_time,
        frame_identifier, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
      [
        uuidv4(), data.seasonId, data.eventId, data.memberId, data.position,
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
        id, member_id, stint_number, end_lap, tyre_actual_compound, 
        tyre_visual_compound, session_uid, session_time, frame_identifier, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        uuidv4(), data.memberId, data.stintNumber, data.endLap,
        data.tyreActualCompound, data.tyreVisualCompound, data.sessionUid,
        data.sessionTime, data.frameIdentifier, now
      ]
    );
  }

  async addUDPLapHistory(data: any): Promise<void> {
    const now = new Date().toISOString();
    
    await this.db.query(
      `INSERT INTO f123_udp_lap_history (
        id, member_id, lap_number, lap_time_ms, sector1_time_ms, sector1_time_minutes,
        sector2_time_ms, sector2_time_minutes, sector3_time_ms, sector3_time_minutes,
        lap_valid_bit_flags, session_uid, session_time, frame_identifier, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        uuidv4(), data.memberId, data.lapNumber, data.lapTimeMs,
        data.sector1TimeMs, data.sector1TimeMinutes, data.sector2TimeMs,
        data.sector2TimeMinutes, data.sector3TimeMs, data.sector3TimeMinutes,
        data.lapValidBitFlags, data.sessionUid, data.sessionTime,
        data.frameIdentifier, now
      ]
    );
  }

  async getUDPSessionResults(): Promise<any[]> {
    const result = await this.db.query(`
      SELECT usr.*, m.name as member_name, s.name as season_name
      FROM f123_udp_session_results usr
      LEFT JOIN members m ON usr.member_id = m.id
      LEFT JOIN seasons s ON usr.season_id = s.id
      ORDER BY usr.created_at DESC
      LIMIT 100
    `);
    return result.rows;
  }

  async getUDPLapHistory(): Promise<any[]> {
    const result = await this.db.query(`
      SELECT ulh.*, m.name as member_name
      FROM f123_udp_lap_history ulh
      LEFT JOIN members m ON ulh.member_id = m.id
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
      SELECT up.*, m.name as member_name, s.name as season_name
      FROM f123_udp_participants up
      LEFT JOIN members m ON up.member_id = m.id
      LEFT JOIN seasons s ON up.season_id = s.id
      WHERE up.session_uid = $1
      ORDER BY up.vehicle_index
    `, [sessionUid.toString()]);
    
    return result.rows;
  }

  async getUDPSessionResultsBySession(sessionUid: bigint): Promise<any[]> {
    const result = await this.db.query(`
      SELECT usr.*, m.name as member_name, s.name as season_name, r.track_name
      FROM f123_udp_session_results usr
      LEFT JOIN members m ON usr.member_id = m.id
      LEFT JOIN seasons s ON usr.season_id = s.id
      LEFT JOIN races r ON usr.event_id = r.id
      WHERE usr.session_uid = $1
      ORDER BY usr.position
    `, [sessionUid.toString()]);
    
    return result.rows;
  }

  async getUDPLapHistoryByMember(memberId: string, sessionUid?: bigint): Promise<any[]> {
    let query = `
      SELECT ulh.*, m.name as member_name
      FROM f123_udp_lap_history ulh
      LEFT JOIN members m ON ulh.member_id = m.id
      WHERE ulh.member_id = $1
    `;
    const params = [memberId];
    
    if (sessionUid) {
      query += ` AND ulh.session_uid = $2`;
      params.push(sessionUid.toString());
    }
    
    query += ` ORDER BY ulh.lap_number ASC`;
    
    const result = await this.db.query(query, params);
    return result.rows;
  }

  async getUDPTyreStintsByMember(memberId: string, sessionUid?: bigint): Promise<any[]> {
    let query = `
      SELECT uts.*, m.name as member_name
      FROM f123_udp_tyre_stints uts
      LEFT JOIN members m ON uts.member_id = m.id
      WHERE uts.member_id = $1
    `;
    const params = [memberId];
    
    if (sessionUid) {
      query += ` AND uts.session_uid = $2`;
      params.push(sessionUid.toString());
    }
    
    query += ` ORDER BY uts.stint_number ASC`;
    
    const result = await this.db.query(query, params);
    return result.rows;
  }

  // Season management methods (proper implementations)
  async addDriverToSeason(seasonId: string, memberId: string): Promise<void> {
    console.log(`Adding driver ${memberId} to season ${seasonId}`);
    
    // Get member details
    const member = await this.getMemberById(memberId);
    if (!member) {
      throw new Error(`Member with ID ${memberId} not found`);
    }
    
    // Check if driver already exists in this season
    const existingDriver = await this.db.query(
      'SELECT id FROM drivers WHERE season_id = $1 AND name = $2',
      [seasonId, member.name]
    );
    
    if (existingDriver.rows.length > 0) {
      throw new Error(`Driver ${member.name} is already in this season`);
    }
    
    // Create driver entry for this season
    await this.db.query(
      'INSERT INTO drivers (name, team, number, season_id, is_active) VALUES ($1, $2, $3, $4, $5)',
      [member.name, 'TBD', 0, seasonId, true]
    );
    
    console.log(`✅ Driver ${member.name} added to season ${seasonId}`);
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
    
    return result.rows.map(row => ({
      id: row.id,
      season_id: row.season_id,
      track_id: row.track_id,
      track_name: row.track_name,
      track: {
        id: row.track_id,
        name: row.track_name_full || row.track_name,
        country: row.country || '',
        length: row.length_km || 0
      },
      race_date: row.race_date,
      status: row.status,
      session_type: row.session_type,
      session_types: row.session_types,
      session_duration: row.session_duration,
      weather_air_temp: row.weather_air_temp,
      weather_track_temp: row.weather_track_temp,
      weather_rain_percentage: row.weather_rain_percentage,
      created_at: row.created_at,
      updated_at: row.updated_at,
      session_config: row.session_config // Include session config
    }));
  }

  async addEventToSeason(seasonId: string, eventData: any): Promise<string> {
    console.log(`Adding event to season ${seasonId}:`, eventData);
    
    // Validate required fields
    if (!eventData.track_name) { // Date is no longer required
      throw new Error('Track name is required for events');
    }
    
    // Find or create track
    const trackId = await this.findOrCreateTrack(eventData.track_name);
    
    // Create race/event
    const eventId = uuidv4();
    await this.db.query(
      'INSERT INTO races (id, season_id, track_id, track_name, race_date, status, session_type, session_types, session_duration, weather_air_temp, weather_track_temp, weather_rain_percentage, session_config) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)',
      [
        eventId,
        seasonId,
        trackId,
        eventData.track_name,
        eventData.date ? new Date(eventData.date).toISOString() : null, // Store null if date is empty
        eventData.status || 'scheduled',
        eventData.session_type || 10, // Default to race
        eventData.session_types || null, // Store comma-separated session types
        eventData.session_duration || 0,
        eventData.weather_air_temp || 0,
        eventData.weather_track_temp || 0,
        eventData.weather_rain_percentage || 0,
        eventData.session_config || {} // Store session configuration as JSONB
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
    const result = await this.db.query(
      `SELECT id FROM races 
       WHERE track_name ILIKE $1 
       AND status = 'scheduled' 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [`%${trackName}%`]
    );
    
    return result.rows[0]?.id || null;
  }

  // Create new session result entry (dynamic tab creation)
  async createSessionResult(raceId: string, sessionType: number, sessionName: string, sessionUID: bigint): Promise<string> {
    const id = uuidv4();
    const now = new Date().toISOString();

    await this.db.query(
      `INSERT INTO session_results (id, race_id, session_type, session_name, session_uid, completed_at, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, raceId, sessionType, sessionName, sessionUID, now, now]
    );

    return id;
  }

  // Store driver results for a session
  async storeDriverSessionResults(sessionResultId: string, driverResults: any[]): Promise<void> {
    const now = new Date().toISOString();

    for (const result of driverResults) {
      await this.db.query(
        `INSERT INTO driver_session_results (
          id, session_result_id, driver_id, member_id, position, grid_position, points,
          num_laps, best_lap_time_ms, sector1_time_ms, sector2_time_ms, sector3_time_ms,
          total_race_time_ms, penalties, warnings, num_unserved_drive_through_pens,
          num_unserved_stop_go_pens, result_status, dnf_reason, fastest_lap, pole_position, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`,
        [
          uuidv4(), sessionResultId, result.driver_id, result.member_id, result.position,
          result.grid_position, result.points, result.num_laps, result.best_lap_time_ms,
          result.sector1_time_ms, result.sector2_time_ms, result.sector3_time_ms,
          result.total_race_time_ms, result.penalties, result.warnings,
          result.num_unserved_drive_through_pens, result.num_unserved_stop_go_pens,
          result.result_status, result.dnf_reason, result.fastest_lap, result.pole_position, now
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
    const result = await this.db.query(
      `SELECT dsr.*, d.name as driver_name, m.name as member_name
       FROM driver_session_results dsr
       LEFT JOIN drivers d ON dsr.driver_id = d.id
       LEFT JOIN members m ON dsr.member_id = m.id
       WHERE dsr.session_result_id = $1
       ORDER BY dsr.position ASC`,
      [sessionResultId]
    );
    
    return result.rows;
  }

  // Store original session results snapshot
  async storeOriginalSessionResults(sessionResultId: string, driverResults: any[]): Promise<void> {
    const now = new Date().toISOString();

    for (const result of driverResults) {
      await this.db.query(
        `INSERT INTO session_results_original (
          id, session_result_id, driver_id, original_position, original_points,
          original_penalties, original_warnings, original_result_status,
          original_dnf_reason, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          uuidv4(), sessionResultId, result.driver_id, result.position,
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

  // Map session type number to readable name
  getSessionTypeName(sessionType: number): string {
    const sessionTypeNames: { [key: number]: string } = {
      0: 'Unknown',
      1: 'P1',
      2: 'P2', 
      3: 'P3',
      4: 'Short P',
      5: 'Q1',
      6: 'Q2',
      7: 'Q3',
      8: 'Short Q',
      9: 'OSQ',
      10: 'Race',
      11: 'R2',
      12: 'R3',
      13: 'Time Trial'
    };
    
    return sessionTypeNames[sessionType] || 'Unknown';
  }

  // Race results editing methods
  
  // Add penalty with history tracking
  async addPenalty(sessionResultId: string, driverId: string, penaltyPoints: number, reason: string, editedBy: string): Promise<void> {
    const now = new Date().toISOString();

    // Get current values
    const current = await this.db.query(
      'SELECT penalties FROM driver_session_results WHERE session_result_id = $1 AND driver_id = $2',
      [sessionResultId, driverId]
    );
    
    if (!current.rows[0]) {
      throw new Error('Driver session result not found');
    }
    
    const oldPenalties = current.rows[0].penalties;
    const newPenalties = oldPenalties + penaltyPoints;
    
    // Update the result
    await this.db.query(
      'UPDATE driver_session_results SET penalties = $1, updated_at = $2 WHERE session_result_id = $3 AND driver_id = $4',
      [newPenalties, now, sessionResultId, driverId]
    );
    
    // Log the edit
    await this.db.query(
      `INSERT INTO race_edit_history (id, session_result_id, driver_id, edit_type, old_value, new_value, reason, edited_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        uuidv4(), sessionResultId, driverId, 'penalty',
        { penalties: oldPenalties }, { penalties: newPenalties },
        reason, editedBy, now
      ]
    );
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
      `SELECT reh.*, d.name as driver_name, m.name as member_name
       FROM race_edit_history reh
       LEFT JOIN drivers d ON reh.driver_id = d.id
       LEFT JOIN members m ON d.season_id = (SELECT season_id FROM races WHERE id = (SELECT race_id FROM session_results WHERE id = $1))
       WHERE reh.session_result_id = $1
       ORDER BY reh.created_at DESC`,
      [sessionResultId]
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
    if (editData.edit_type === 'penalty') {
      await this.db.query(
        'UPDATE driver_session_results SET penalties = $1 WHERE session_result_id = $2 AND driver_id = $3',
        [editData.old_value.penalties, editData.session_result_id, editData.driver_id]
      );
    } else if (editData.edit_type === 'position_change') {
      await this.db.query(
        'UPDATE driver_session_results SET position = $1 WHERE session_result_id = $2 AND driver_id = $3',
        [editData.old_value.position, editData.session_result_id, editData.driver_id]
      );
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
        FROM race_results
        WHERE position = 1
      `);
      
      const podiumsResult = await this.db.query(`
        SELECT COUNT(*) as total_podiums
        FROM race_results
        WHERE position IN (1, 2, 3)
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
  async getMemberCareerProfile(memberId: string): Promise<any> {
    try {
      // Get member details
      const member = await this.getMemberById(memberId);
      if (!member) return null;

      // For now, return mock career stats since we don't have member_id in f123_driver_mappings yet
      // TODO: Add migration to add member_id to f123_driver_mappings table
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

      // Get seasons participated in - for now return all active/completed seasons
      // TODO: Filter by actual member participation when member_id is added to f123_driver_mappings
      const seasonsResult = await this.db.query(`
        SELECT DISTINCT s.id, s.name, s.year
        FROM seasons s
        WHERE s.status IN ('completed', 'active')
        ORDER BY s.year DESC
      `);
      
      return {
        member,
        careerStats,
        seasons: seasonsResult.rows.map(row => ({
          id: row.id,
          year: row.year,
          name: row.name
        }))
      };
    } catch (error) {
      console.error('Error getting member career profile:', error);
      // Return fallback data
      const member = await this.getMemberById(memberId);
      if (!member) return null;

      return {
        member,
        careerStats: {
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
        },
        seasons: []
      };
    }
  }

  // Get member statistics for specific season
  async getMemberSeasonStats(memberId: string, seasonId: string): Promise<any> {
    try {
      // For now, return mock stats since we don't have member_id in f123_driver_mappings yet
      // TODO: Update when member_id is added to f123_driver_mappings table
      return {
        wins: 0,
        podiums: 0,
        points: 0,
        seasons: 0, // This represents races in season context
        polePositions: 0,
        fastestLaps: 0,
        averageFinish: 0,
        finishRate: 0,
        championships: 0,
        bestFinish: 0
      };
    } catch (error) {
      console.error('Error getting member season stats:', error);
      return {
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
    }
  }

  // Get member race history with optional season filtering
  async getMemberRaceHistory(memberId: string, seasonId?: string): Promise<any[]> {
    // For now, return empty array since race_results table doesn't exist yet
    // TODO: Update when race results are implemented
    return [];
  }

  // Get most recent completed race results for a season
  async getPreviousRaceResults(seasonId: string): Promise<any> {
    // For now, return null since race_results table doesn't exist yet
    // TODO: Update when race results are implemented
    return null;
  }

  // Close database connection
  async close(): Promise<void> {
    await this.db.end();
  }
}