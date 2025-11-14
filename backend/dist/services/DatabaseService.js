"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const uuid_1 = require("uuid");
const f123Constants_1 = require("../utils/f123Constants");
const initializer_1 = require("./database/initializer");
const repositoryBase_1 = require("./database/repositoryBase");
const seasonMethods_1 = require("./database/seasonMethods");
const driverMethods_1 = require("./database/driverMethods");
const trackMethods_1 = require("./database/trackMethods");
const raceMethods_1 = require("./database/raceMethods");
const sessionMethods_1 = require("./database/sessionMethods");
const udpMethods_1 = require("./database/udpMethods");
const repositories_1 = require("./database/repositories");
class DatabaseService extends repositoryBase_1.RepositoryBase {
    constructor(poolInstance) {
        super(poolInstance);
        this.poolInstance = poolInstance;
        this.initialized = false;
        this.initializationPromise = null;
        this.seasons = new repositories_1.SeasonRepository(this);
        this.drivers = new repositories_1.DriverRepository(this);
        this.tracks = new repositories_1.TrackRepository(this);
        this.races = new repositories_1.RaceRepository(this);
        this.sessionsRepo = new repositories_1.SessionRepository(this);
        this.udpRepo = new repositories_1.UDPRepository(this);
        this.repositories = {
            seasons: this.seasons,
            drivers: this.drivers,
            tracks: this.tracks,
            races: this.races,
            sessions: this.sessionsRepo,
            udp: this.udpRepo,
        };
        this.initializer = new initializer_1.DatabaseInitializer(this.pool);
        this.initializeTables();
    }
    // Helper methods for snake_case to camelCase transformation
    transformSeasonToCamelCase(dbRow) {
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
    transformDriverToCamelCase(dbRow) {
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
    transformRaceToCamelCase(dbRow) {
        return {
            id: dbRow.id,
            seasonId: dbRow.season_id,
            trackId: dbRow.track_id,
            trackName: dbRow.track_name,
            raceDate: dbRow.race_date,
            status: dbRow.status,
            sessionType: dbRow.session_type,
            sessionTypes: dbRow.session_types,
            sessionDuration: dbRow.session_duration,
            primarySessionResultId: dbRow.primary_session_result_id,
            orderIndex: dbRow.order_index,
            weatherAirTemp: dbRow.weather_air_temp,
            weatherTrackTemp: dbRow.weather_track_temp,
            weatherRainPercentage: dbRow.weather_rain_percentage,
            createdAt: dbRow.created_at,
            updatedAt: dbRow.updated_at
        };
    }
    async initializeTables() {
        if (!this.initializationPromise) {
            console.log('📋 Initializing database tables...');
            this.initializationPromise = this.initializer
                .initialize()
                .then(() => {
                this.initialized = true;
            })
                .catch((error) => {
                this.initializationPromise = null;
                throw error;
            });
        }
        await this.initializationPromise;
    }
    async ensureInitialized() {
        if (this.initialized) {
            return;
        }
        console.log('🔧 ensureInitialized called, initialized:', this.initialized);
        try {
            await this.initializeTables();
            console.log('✅ Database initialization completed successfully');
        }
        catch (error) {
            console.error('❌ Database initialization failed:', error);
            throw error;
        }
    }
    async executeQuery(query, params = []) {
        await this.ensureInitialized();
        return super.executeQuery(query, params);
    }
    async executeUpdate(query, params = []) {
        await this.ensureInitialized();
        await super.executeUpdate(query, params);
    }
    /**
     * Public method to execute SQL queries
     * Use this instead of accessing private db property
     */
    async query(sql, params = []) {
        await this.ensureInitialized();
        return await this.db.query(sql, params);
    }
    async withTransaction(fn) {
        const client = await this.pool.connect();
        const context = new repositoryBase_1.TransactionContext(this.pool, client);
        try {
            await client.query('BEGIN');
            const result = await fn(context);
            await client.query('COMMIT');
            return result;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            context.release();
        }
    }
    // Driver Mapping operations
    async createDriverMapping(data) {
        const id = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        await this.db.query(`INSERT INTO f123_driver_mappings (id, season_id, f123_driver_id, f123_driver_name, f123_driver_number, f123_team_name, your_driver_id, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [
            id,
            data.seasonId,
            data.f123DriverId,
            data.f123DriverName,
            data.f123DriverNumber || null,
            data.f123TeamName || null,
            data.yourDriverId || null,
            now,
            now
        ]);
        return id;
    }
    async getDriverMappingsBySeason(seasonId) {
        const result = await this.db.query(`SELECT id, season_id as "seasonId", f123_driver_id as "f123DriverId", f123_driver_name as "f123DriverName", 
              f123_driver_number as "f123DriverNumber", f123_team_name as "f123TeamName", your_driver_id as "yourDriverId", 
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
        if (data.yourDriverId !== undefined) {
            updates.push(`your_driver_id = $${paramCount++}`);
            values.push(data.yourDriverId || null);
        }
        updates.push(`updated_at = $${paramCount++}`);
        values.push(now);
        values.push(id);
        await this.db.query(`UPDATE f123_driver_mappings SET ${updates.join(', ')} WHERE id = $${paramCount}`, values);
    }
    async deleteDriverMapping(id) {
        await this.db.query('DELETE FROM f123_driver_mappings WHERE id = $1', [id]);
    }
    async getDriverMappings(seasonId) {
        return this.getDriverMappingsBySeason(seasonId);
    }
    // Store driver results for a session
    // Returns a map of driver result index to driver_session_result_id for linking lap times
    getSessionTypeName(sessionType) {
        return (0, f123Constants_1.getSessionTypeAbbreviation)(sessionType);
    }
    async close() {
        await this.pool.end();
    }
}
exports.DatabaseService = DatabaseService;
Object.assign(DatabaseService.prototype, seasonMethods_1.seasonMethods, driverMethods_1.driverMethods, trackMethods_1.trackMethods, raceMethods_1.raceMethods, sessionMethods_1.sessionMethods, udpMethods_1.udpMethods);
//# sourceMappingURL=DatabaseService.js.map