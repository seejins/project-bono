"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const pg_1 = require("pg");
const uuid_1 = require("uuid");
class DatabaseService {
    constructor() {
        this.initialized = false;
        this.initializationPromise = null;
        const databaseUrl = process.env.DATABASE_URL || 'postgresql://localhost:5432/f1_race_engineer_dev';
        console.log('🐘 Using PostgreSQL database');
        this.db = new pg_1.Client({
            connectionString: databaseUrl,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
        this.db.connect().catch((error) => {
            console.error('❌ PostgreSQL connection failed:', error);
            process.exit(1);
        });
        this.initializeTables();
    }
    async initializeTables() {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }
        this.initializationPromise = this.performInitialization();
        return this.initializationPromise;
    }
    async performInitialization() {
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
        }
        catch (error) {
            console.error('❌ Database initialization failed:', error);
            throw error;
        }
    }
    async runMigrations() {
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
        }
        catch (error) {
            console.error('❌ Migration error:', error);
            throw error;
        }
    }
    async createMigrationsTable() {
        await this.db.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) UNIQUE NOT NULL,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }
    async runMigration(migrationName, migrationFunction) {
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
        }
        catch (error) {
            console.error(`❌ Migration ${migrationName} failed:`, error);
            throw error;
        }
    }
    async hasMigrationRun(migrationName) {
        const result = await this.db.query('SELECT 1 FROM migrations WHERE name = $1', [migrationName]);
        return result.rows.length > 0;
    }
    async markMigrationAsRun(migrationName) {
        try {
            await this.db.query('INSERT INTO migrations (name) VALUES ($1)', [migrationName]);
        }
        catch (error) {
            // If it's a unique constraint error, the migration was already run
            if (error.code === '23505') {
                console.log(`✅ Migration ${migrationName} was already recorded`);
                return;
            }
            throw error;
        }
    }
    async addColumnIfNotExists(tableName, columnName, columnDefinition) {
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
        }
        catch (error) {
            console.error(`Error adding column ${columnName} to ${tableName}:`, error);
            throw error;
        }
    }
    async ensureInitialized() {
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
        }
        catch (error) {
            console.error('❌ Database initialization failed:', error);
            this.initializationPromise = null; // Reset so it can be retried
            throw error;
        }
    }
    async executeQuery(query, params = []) {
        await this.ensureInitialized();
        const result = await this.db.query(query, params);
        return result.rows;
    }
    async executeUpdate(query, params = []) {
        await this.ensureInitialized();
        await this.db.query(query, params);
    }
    // Member CRUD operations
    async createMember(data) {
        const id = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        await this.db.query(`INSERT INTO members (id, name, steam_id, is_active, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6)`, [id, data.name, data.steam_id || null, data.isActive ?? true, now, now]);
        return id;
    }
    async getAllMembers() {
        const result = await this.db.query(`SELECT id, name, steam_id as "steam_id", is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt" 
         FROM members ORDER BY name`);
        return result.rows;
    }
    async getMemberById(id) {
        const result = await this.db.query(`SELECT id, name, steam_id as "steam_id", is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt" 
         FROM members WHERE id = $1`, [id]);
        return result.rows[0] || null;
    }
    async updateMember(id, data) {
        const now = new Date().toISOString();
        const updates = [];
        const values = [];
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
        await this.db.query(`UPDATE members SET ${updates.join(', ')} WHERE id = $${paramCount}`, values);
    }
    async deleteMember(id) {
        await this.db.query('DELETE FROM members WHERE id = $1', [id]);
    }
    // Season CRUD operations
    async createSeason(data) {
        const id = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        await this.db.query(`INSERT INTO seasons (id, name, year, start_date, end_date, status, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
            id,
            data.name,
            data.year,
            data.startDate || null,
            data.endDate || null,
            data.isActive ? 'active' : 'draft',
            now,
            now
        ]);
        return id;
    }
    async getAllSeasons() {
        const result = await this.db.query(`SELECT id, name, year, start_date as "startDate", end_date as "endDate", 
              status, created_at as "createdAt", updated_at as "updatedAt"
         FROM seasons ORDER BY year DESC, name`);
        return result.rows.map(row => ({
            ...row,
            isActive: row.status === 'active'
        }));
    }
    async getSeasonById(id) {
        const result = await this.db.query(`SELECT id, name, year, start_date as "startDate", end_date as "endDate", 
              status, created_at as "createdAt", updated_at as "updatedAt"
         FROM seasons WHERE id = $1`, [id]);
        if (result.rows[0]) {
            return {
                ...result.rows[0],
                isActive: result.rows[0].status === 'active'
            };
        }
        return null;
    }
    async updateSeason(id, data) {
        const now = new Date().toISOString();
        const updates = [];
        const values = [];
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
        await this.db.query(`UPDATE seasons SET ${updates.join(', ')} WHERE id = $${paramCount}`, values);
    }
    async deleteSeason(id) {
        await this.db.query('DELETE FROM seasons WHERE id = $1', [id]);
    }
    // Track CRUD operations
    async createTrack(data) {
        const id = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        await this.db.query(`INSERT INTO tracks (id, name, country, length_km, created_at) 
         VALUES ($1, $2, $3, $4, $5)`, [id, data.name, data.country, data.circuitLength, now]);
        return id;
    }
    async getAllTracks() {
        const result = await this.db.query(`SELECT id, name, country, length_km as length, created_at as "createdAt"
       FROM tracks ORDER BY name`);
        return result.rows.map(row => ({
            ...row,
            city: '', // Default empty city
            laps: 0, // Default laps
            updatedAt: row.createdAt
        }));
    }
    async getTrackById(id) {
        const result = await this.db.query(`SELECT id, name, country, length_km as length, created_at as "createdAt"
       FROM tracks WHERE id = $1`, [id]);
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
    async createRace(data) {
        const id = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        await this.db.query(`INSERT INTO races (id, season_id, track_id, race_date, status, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`, [id, data.seasonId, data.trackId, data.raceDate, data.status || 'scheduled', now, now]);
        return id;
    }
    async getRacesBySeason(seasonId) {
        const result = await this.db.query(`SELECT id, season_id as "seasonId", track_id as "trackId", race_date as "raceDate", 
              status, created_at as "createdAt", updated_at as "updatedAt"
       FROM races WHERE season_id = $1 ORDER BY race_date`, [seasonId]);
        return result.rows;
    }
    // Driver Mapping operations
    async createDriverMapping(data) {
        const id = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        await this.db.query(`INSERT INTO f123_driver_mappings (id, season_id, f123_driver_id, f123_driver_name, f123_driver_number, f123_team_name, member_id, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [
            id,
            data.seasonId,
            data.f123DriverId,
            data.f123DriverName,
            data.f123DriverNumber || null,
            data.f123TeamName || null,
            data.memberId || null,
            now,
            now
        ]);
        return id;
    }
    async getDriverMappingsBySeason(seasonId) {
        const result = await this.db.query(`SELECT id, season_id as "seasonId", f123_driver_id as "f123DriverId", f123_driver_name as "f123DriverName", 
              f123_driver_number as "f123DriverNumber", f123_team_name as "f123TeamName", member_id as "memberId", 
              created_at as "createdAt", updated_at as "updatedAt"
       FROM f123_driver_mappings WHERE season_id = $1 ORDER BY f123_driver_name`, [seasonId]);
        return result.rows;
    }
    async updateDriverMapping(id, data) {
        const now = new Date().toISOString();
        const updates = [];
        const values = [];
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
        await this.db.query(`UPDATE f123_driver_mappings SET ${updates.join(', ')} WHERE id = $${paramCount}`, values);
    }
    async deleteDriverMapping(id) {
        await this.db.query('DELETE FROM f123_driver_mappings WHERE id = $1', [id]);
    }
    // Session Results operations
    async importSessionResults(raceId, results) {
        const now = new Date().toISOString();
        // Delete existing results for this race
        await this.db.query('DELETE FROM f123_session_results WHERE race_id = $1', [raceId]);
        // Insert new results
        for (const result of results) {
            await this.db.query(`INSERT INTO f123_session_results (id, race_id, driver_id, driver_name, team_name, car_number, position, lap_time, sector1_time, sector2_time, sector3_time, fastest_lap, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`, [
                (0, uuid_1.v4)(),
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
            ]);
        }
    }
    async getSessionResultsByRace(raceId) {
        const result = await this.db.query(`SELECT driver_id as "driverId", driver_name as "driverName", team_name as "teamName", car_number as "carNumber", 
              position, lap_time as "lapTime", sector1_time as "sector1Time", sector2_time as "sector2Time", 
              sector3_time as "sector3Time", fastest_lap as "fastestLap", created_at as "createdAt"
       FROM f123_session_results WHERE race_id = $1 ORDER BY position`, [raceId]);
        return result.rows;
    }
    // Statistics methods
    async getMemberCareerStats(memberId) {
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
    async getMemberSeasonStats(memberId, seasonId) {
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
    async getMemberRaceHistory(memberId, limit = 10) {
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
    getDefaultStats() {
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
    async getActiveSeason() {
        const result = await this.db.query(`SELECT id, name, year, start_date as "startDate", end_date as "endDate", 
              status, created_at as "createdAt", updated_at as "updatedAt"
       FROM seasons WHERE status = 'active' ORDER BY created_at DESC LIMIT 1`);
        if (result.rows[0]) {
            return {
                ...result.rows[0],
                isActive: result.rows[0].status === 'active'
            };
        }
        return null;
    }
    async getMemberBySteamId(steamId) {
        const result = await this.db.query(`SELECT id, name, steam_id as "steam_id", is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt" 
       FROM members WHERE steam_id = $1`, [steamId]);
        return result.rows[0] || null;
    }
    async findOrCreateTrack(trackName) {
        // First try to find existing track
        const existing = await this.db.query('SELECT id FROM tracks WHERE name = $1', [trackName]);
        if (existing.rows[0]) {
            return existing.rows[0].id;
        }
        // Create new track
        const id = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        await this.db.query(`INSERT INTO tracks (id, name, country, length_km, created_at) 
       VALUES ($1, $2, $3, $4, $5)`, [id, trackName, 'Unknown', 0, now]);
        return id;
    }
    async getDriverMappings(seasonId) {
        return this.getDriverMappingsBySeason(seasonId);
    }
    async importRaceResults(raceId, results) {
        return this.importSessionResults(raceId, results);
    }
    async deactivateAllOtherSeasons(currentSeasonId) {
        await this.db.query(`UPDATE seasons SET status = 'completed', updated_at = $1 WHERE id != $2`, [new Date().toISOString(), currentSeasonId]);
    }
    async getDriversBySeason(seasonId) {
        const result = await this.db.query('SELECT * FROM drivers WHERE season_id = $1 ORDER BY name ASC', [seasonId]);
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
    async createDriver(data) {
        const id = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        await this.db.query(`INSERT INTO drivers (id, name, team, number, is_active, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`, [id, data.name, data.team, data.number, data.isActive ?? true, now, now]);
        return id;
    }
    async updateDriver(id, data) {
        const now = new Date().toISOString();
        const updates = [];
        const values = [];
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
        await this.db.query(`UPDATE drivers SET ${updates.join(', ')} WHERE id = $${paramCount}`, values);
    }
    async deleteDriver(id) {
        await this.db.query('DELETE FROM drivers WHERE id = $1', [id]);
    }
    // UDP-specific methods (simplified implementations)
    async addUDPParticipant(data) {
        // Simplified implementation - would need proper UDP participant table
        console.log('UDP Participant added:', data);
    }
    async addUDPSessionResult(data) {
        // Simplified implementation - would need proper UDP session result table
        console.log('UDP Session Result added:', data);
    }
    async addUDPTyreStint(data) {
        // Simplified implementation - would need proper UDP tyre stint table
        console.log('UDP Tyre Stint added:', data);
    }
    async addUDPLapHistory(data) {
        // Simplified implementation - would need proper UDP lap history table
        console.log('UDP Lap History added:', data);
    }
    async getUDPSessionResults() {
        // Simplified implementation
        return [];
    }
    async getUDPLapHistory() {
        // Simplified implementation
        return [];
    }
    // Season management methods (proper implementations)
    async addDriverToSeason(seasonId, memberId) {
        console.log(`Adding driver ${memberId} to season ${seasonId}`);
        // Get member details
        const member = await this.getMemberById(memberId);
        if (!member) {
            throw new Error(`Member with ID ${memberId} not found`);
        }
        // Check if driver already exists in this season
        const existingDriver = await this.db.query('SELECT id FROM drivers WHERE season_id = $1 AND name = $2', [seasonId, member.name]);
        if (existingDriver.rows.length > 0) {
            throw new Error(`Driver ${member.name} is already in this season`);
        }
        // Create driver entry for this season
        await this.db.query('INSERT INTO drivers (name, team, number, season_id, is_active) VALUES ($1, $2, $3, $4, $5)', [member.name, 'TBD', 0, seasonId, true]);
        console.log(`✅ Driver ${member.name} added to season ${seasonId}`);
    }
    async removeDriverFromSeason(seasonId, driverId) {
        console.log(`Removing driver ${driverId} from season ${seasonId}`);
        // Check if driver exists in this season
        const driver = await this.db.query('SELECT id, name FROM drivers WHERE id = $1 AND season_id = $2', [driverId, seasonId]);
        if (driver.rows.length === 0) {
            throw new Error(`Driver with ID ${driverId} not found in season ${seasonId}`);
        }
        // Remove driver from season
        await this.db.query('DELETE FROM drivers WHERE id = $1 AND season_id = $2', [driverId, seasonId]);
        console.log(`✅ Driver ${driver.rows[0].name} removed from season ${seasonId}`);
    }
    async getTracksBySeason(seasonId) {
        // Simplified implementation
        return [];
    }
    async createTrackAndAddToSeason(data, seasonId) {
        const trackId = await this.createTrack(data);
        console.log(`Track ${trackId} added to season ${seasonId}`);
        return trackId;
    }
    async removeTrackFromSeason(seasonId, trackId) {
        console.log(`Removing track ${trackId} from season ${seasonId}`);
    }
    async addRaceToSeason(data) {
        return this.createRace(data);
    }
    async removeRaceFromSeason(raceId) {
        await this.db.query('DELETE FROM races WHERE id = $1', [raceId]);
    }
    async getEventsBySeason(seasonId) {
        const result = await this.db.query('SELECT * FROM races WHERE season_id = $1 ORDER BY race_date ASC', [seasonId]);
        return result.rows.map(row => ({
            id: row.id,
            seasonId: row.season_id,
            trackId: row.track_id,
            trackName: row.track_name,
            raceDate: row.race_date,
            status: row.status,
            sessionType: row.session_type,
            sessionDuration: row.session_duration,
            weatherAirTemp: row.weather_air_temp,
            weatherTrackTemp: row.weather_track_temp,
            weatherRainPercentage: row.weather_rain_percentage,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }));
    }
    async addEventToSeason(seasonId, eventData) {
        console.log(`Adding event to season ${seasonId}:`, eventData);
        // Validate required fields
        if (!eventData.track_name || !eventData.date) {
            throw new Error('Track name and date are required for events');
        }
        // Find or create track
        const track = await this.findOrCreateTrack(eventData.track_name);
        // Create race/event
        const eventId = (0, uuid_1.v4)();
        await this.db.query('INSERT INTO races (id, season_id, track_id, track_name, race_date, status, session_type, session_duration, weather_air_temp, weather_track_temp, weather_rain_percentage) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)', [
            eventId,
            seasonId,
            track.id,
            eventData.track_name,
            new Date(eventData.date).toISOString(),
            eventData.status || 'scheduled',
            eventData.session_type || 10, // Default to race
            eventData.session_duration || 0,
            eventData.weather_air_temp || 0,
            eventData.weather_track_temp || 0,
            eventData.weather_rain_percentage || 0
        ]);
        console.log(`✅ Event ${eventData.track_name} added to season ${seasonId} with ID ${eventId}`);
        return eventId;
    }
    async updateEventInSeason(eventId, eventData) {
        console.log(`Updating event ${eventId}:`, eventData);
        // Check if event exists
        const event = await this.db.query('SELECT id FROM races WHERE id = $1', [eventId]);
        if (event.rows.length === 0) {
            throw new Error(`Event with ID ${eventId} not found`);
        }
        // Build update query dynamically
        const updates = [];
        const values = [];
        let paramCount = 1;
        if (eventData.track_name !== undefined) {
            updates.push(`track_name = $${paramCount++}`);
            values.push(eventData.track_name);
        }
        if (eventData.date !== undefined) {
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
        await this.db.query(`UPDATE races SET ${updates.join(', ')} WHERE id = $${paramCount}`, values);
        console.log(`✅ Event ${eventId} updated successfully`);
    }
    async removeEventFromSeason(eventId) {
        console.log(`Removing event ${eventId}`);
        // Check if event exists
        const event = await this.db.query('SELECT id, track_name FROM races WHERE id = $1', [eventId]);
        if (event.rows.length === 0) {
            throw new Error(`Event with ID ${eventId} not found`);
        }
        // Remove event
        await this.db.query('DELETE FROM races WHERE id = $1', [eventId]);
        console.log(`✅ Event ${eventId} (${event.rows[0].track_name}) removed successfully`);
    }
    // Close database connection
    async close() {
        await this.db.end();
    }
}
exports.DatabaseService = DatabaseService;
//# sourceMappingURL=DatabaseService.js.map