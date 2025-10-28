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
    const databaseUrl = process.env.DATABASE_URL || 'postgresql://localhost:5432/f1_race_engineer_dev';
    
    console.log('🐘 Using PostgreSQL database');
      this.db = new Client({
        connectionString: databaseUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });
    
      this.db.connect().catch((error) => {
        console.error('❌ PostgreSQL connection failed:', error);
        process.exit(1);
      });
    
    this.initializeTables();
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
          race_date DATE NOT NULL,
          status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
          session_type INTEGER,
          session_types TEXT,
          session_duration INTEGER,
          weather_air_temp INTEGER,
          weather_track_temp INTEGER,
          weather_rain_percentage INTEGER,
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
          member_id UUID REFERENCES members(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
      
      // Migration 2: Add session_types column to season_events table (skipped - table doesn't exist)
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
        `SELECT id, name, steam_id as "steam_id", is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt" 
         FROM members ORDER BY name`
      );
      return result.rows;
  }

  async getMemberById(id: string): Promise<Member | null> {
    const result = await this.db.query(
        `SELECT id, name, steam_id as "steam_id", is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt" 
         FROM members WHERE id = $1`,
        [id]
      );
      return result.rows[0] || null;
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
        `SELECT id, name, year, start_date as "startDate", end_date as "endDate", 
              status, created_at as "createdAt", updated_at as "updatedAt"
         FROM seasons ORDER BY year DESC, name`
      );
    return result.rows.map(row => ({
      ...row,
      isActive: row.status === 'active'
    }));
  }

  async getSeasonById(id: string): Promise<Season | null> {
    const result = await this.db.query(
        `SELECT id, name, year, start_date as "startDate", end_date as "endDate", 
              status, created_at as "createdAt", updated_at as "updatedAt"
         FROM seasons WHERE id = $1`,
        [id]
      );
    
    if (result.rows[0]) {
      return {
        ...result.rows[0],
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

  async getMemberSeasonStats(memberId: string, seasonId: string): Promise<any> {
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
      JOIN races r ON fsr.race_id = r.id
      WHERE fdm.member_id = $1 AND fdm.season_id = $2 AND fsr.session_type = 10
    `;
    
    const result = await this.executeQuery(query, [memberId, seasonId]);
    return result[0] || this.getDefaultStats();
  }

  async getMemberRaceHistory(memberId: string, limit: number = 10): Promise<any[]> {
    const query = `
      SELECT 
        r.race_date as "raceDate",
        r.track_name as "trackName",
        fsr.position,
        fsr.lap_time as "lapTime",
        fsr.fastest_lap as "fastestLap",
        fsr.pole_position as "polePosition"
      FROM f123_session_results fsr
      JOIN f123_driver_mappings fdm ON fsr.driver_id = fdm.f123_driver_id::text
      JOIN races r ON fsr.race_id = r.id
      WHERE fdm.member_id = $1 AND fsr.session_type = 10
      ORDER BY r.race_date DESC
      LIMIT $2
    `;
    
    return await this.executeQuery(query, [memberId, limit]);
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
    return result.rows[0] || null;
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

  // UDP-specific methods (simplified implementations)
  async addUDPParticipant(data: any): Promise<void> {
    // Simplified implementation - would need proper UDP participant table
    console.log('UDP Participant added:', data);
  }

  async addUDPSessionResult(data: any): Promise<void> {
    // Simplified implementation - would need proper UDP session result table
    console.log('UDP Session Result added:', data);
  }

  async addUDPTyreStint(data: any): Promise<void> {
    // Simplified implementation - would need proper UDP tyre stint table
    console.log('UDP Tyre Stint added:', data);
  }

  async addUDPLapHistory(data: any): Promise<void> {
    // Simplified implementation - would need proper UDP lap history table
    console.log('UDP Lap History added:', data);
  }

  async getUDPSessionResults(): Promise<any[]> {
    // Simplified implementation
    return [];
  }

  async getUDPLapHistory(): Promise<any[]> {
    // Simplified implementation
    return [];
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
      seasonId: row.season_id,
      trackId: row.track_id,
      track_name: row.track_name,
      track: {
        id: row.track_id,
        name: row.track_name_full || row.track_name,
        country: row.country || '',
        length: row.length_km || 0
      },
      raceDate: row.race_date,
      status: row.status,
      sessionType: row.session_type,
      session_types: row.session_types,
      sessionDuration: row.session_duration,
      weatherAirTemp: row.weather_air_temp,
      weatherTrackTemp: row.weather_track_temp,
      weatherRainPercentage: row.weather_rain_percentage,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  async addEventToSeason(seasonId: string, eventData: any): Promise<string> {
    console.log(`Adding event to season ${seasonId}:`, eventData);
    
    // Validate required fields
    if (!eventData.track_name || !eventData.date) {
      throw new Error('Track name and date are required for events');
    }
    
    // Find or create track
    const track = await this.findOrCreateTrack(eventData.track_name);
    
    // Create race/event
    const eventId = uuidv4();
    await this.db.query(
      'INSERT INTO races (id, season_id, track_id, track_name, race_date, status, session_type, session_types, session_duration, weather_air_temp, weather_track_temp, weather_rain_percentage) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
      [
        eventId,
        seasonId,
        track.id,
        eventData.track_name,
        new Date(eventData.date).toISOString(),
        eventData.status || 'scheduled',
        eventData.session_type || 10, // Default to race
        eventData.session_types || null, // Store comma-separated session types
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
    if (eventData.date !== undefined && eventData.date !== '') {
      updates.push(`race_date = $${paramCount++}`);
      values.push(new Date(eventData.date).toISOString());
    }
    if (eventData.status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(eventData.status);
    }
    if (eventData.session_type !== undefined) {
      updates.push(`session_type = $${paramCount++}`);
      values.push(eventData.session_type);
    }
    if (eventData.session_duration !== undefined) {
      updates.push(`session_duration = $${paramCount++}`);
      values.push(eventData.session_duration);
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

  // Close database connection
  async close(): Promise<void> {
    await this.db.end();
  }
}