"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const sqlite3_1 = __importDefault(require("sqlite3"));
const pg_1 = require("pg");
const uuid_1 = require("uuid");
class DatabaseService {
    constructor() {
        this.initialized = false;
        this.isPostgreSQL = false;
        const databaseUrl = process.env.DATABASE_URL;
        if (databaseUrl) {
            // Production: Use PostgreSQL (Supabase)
            console.log('🐘 Using PostgreSQL database (production)');
            this.db = new pg_1.Client({
                connectionString: databaseUrl,
                ssl: { rejectUnauthorized: false }
            });
            this.isPostgreSQL = true;
            this.db.connect().catch((error) => {
                console.error('❌ PostgreSQL connection failed:', error);
                process.exit(1);
            });
        }
        else {
            // Development: Use SQLite
            console.log('🗄️ Using SQLite database (development)');
            this.db = new sqlite3_1.default.Database(':memory:');
            this.isPostgreSQL = false;
        }
        this.initializeTables();
    }
    async initializeTables() {
        if (this.isPostgreSQL) {
            return this.initializePostgreSQLTables();
        }
        else {
            return this.initializeSQLiteTables();
        }
    }
    async initializePostgreSQLTables() {
        const client = this.db;
        try {
            const tables = [
                // Members table
                `CREATE TABLE IF NOT EXISTS members (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
                // Drivers table
                `CREATE TABLE IF NOT EXISTS drivers (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          team TEXT,
          number INTEGER,
          seasonId TEXT,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
                // Seasons table
                `CREATE TABLE IF NOT EXISTS seasons (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          year INTEGER NOT NULL,
          startDate DATE,
          endDate DATE,
          status TEXT DEFAULT 'upcoming',
          pointsSystem TEXT DEFAULT 'f1_standard',
          fastestLapPoint BOOLEAN DEFAULT true,
          isActive BOOLEAN DEFAULT false,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
                // Tracks table
                `CREATE TABLE IF NOT EXISTS tracks (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          country TEXT,
          location TEXT,
          length REAL,
          laps INTEGER,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
                // Races table
                `CREATE TABLE IF NOT EXISTS races (
          id TEXT PRIMARY KEY,
          seasonId TEXT,
          trackId TEXT,
          raceDate TIMESTAMP,
          sessionTypes TEXT DEFAULT 'race',
          status TEXT DEFAULT 'scheduled',
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (seasonId) REFERENCES seasons(id),
          FOREIGN KEY (trackId) REFERENCES tracks(id)
        )`,
                // Junction tables
                `CREATE TABLE IF NOT EXISTS season_participants (
          id TEXT PRIMARY KEY,
          season_id TEXT NOT NULL,
          member_id TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (season_id) REFERENCES seasons(id),
          FOREIGN KEY (member_id) REFERENCES members(id)
        )`,
                `CREATE TABLE IF NOT EXISTS season_tracks (
          id TEXT PRIMARY KEY,
          season_id TEXT NOT NULL,
          track_id TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (season_id) REFERENCES seasons(id),
          FOREIGN KEY (track_id) REFERENCES tracks(id)
        )`,
                `CREATE TABLE IF NOT EXISTS season_races (
          id TEXT PRIMARY KEY,
          season_id TEXT NOT NULL,
          race_id TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (season_id) REFERENCES seasons(id),
          FOREIGN KEY (race_id) REFERENCES races(id)
        )`,
                // F1 23 specific tables
                `CREATE TABLE IF NOT EXISTS f123_driver_mappings (
          id TEXT PRIMARY KEY,
          season_id TEXT NOT NULL,
          f123_driver_id INTEGER NOT NULL,
          f123_driver_name TEXT NOT NULL,
          f123_driver_number INTEGER,
          f123_team_name TEXT,
          member_id TEXT,
          is_human BOOLEAN DEFAULT true,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (season_id) REFERENCES seasons(id),
          FOREIGN KEY (member_id) REFERENCES members(id)
        )`,
                `CREATE TABLE IF NOT EXISTS f123_session_results (
          id TEXT PRIMARY KEY,
          raceId TEXT,
          driverId TEXT,
          position INTEGER,
          lapTime REAL,
          sector1Time REAL,
          sector2Time REAL,
          sector3Time REAL,
          fastestLap BOOLEAN DEFAULT false,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (raceId) REFERENCES races(id),
          FOREIGN KEY (driverId) REFERENCES drivers(id)
        )`,
                `CREATE TABLE IF NOT EXISTS f123_telemetry_data (
          id TEXT PRIMARY KEY,
          sessionId TEXT,
          driverId TEXT,
          lapNumber INTEGER,
          sector1Time REAL,
          sector2Time REAL,
          sector3Time REAL,
          lapTime REAL,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (driverId) REFERENCES drivers(id)
        )`,
                `CREATE TABLE IF NOT EXISTS session_file_uploads (
          id TEXT PRIMARY KEY,
          filename TEXT NOT NULL,
          originalName TEXT,
          fileSize INTEGER,
          uploadDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          processed BOOLEAN DEFAULT false
        )`
            ];
            for (let i = 0; i < tables.length; i++) {
                await client.query(tables[i]);
                console.log(`📊 PostgreSQL Table ${i + 1}/${tables.length} created`);
            }
            // Create indexes
            const indexes = [
                'CREATE INDEX IF NOT EXISTS idx_drivers_season ON drivers(seasonId)',
                'CREATE INDEX IF NOT EXISTS idx_races_season ON races(seasonId)',
                'CREATE INDEX IF NOT EXISTS idx_races_track ON races(trackId)',
                'CREATE INDEX IF NOT EXISTS idx_session_results_race ON f123_session_results(raceId)',
                'CREATE INDEX IF NOT EXISTS idx_session_results_driver ON f123_session_results(driverId)',
                'CREATE INDEX IF NOT EXISTS idx_driver_mappings_season ON f123_driver_mappings(season_id)'
            ];
            for (const index of indexes) {
                await client.query(index);
            }
            this.initialized = true;
            console.log('🎉 All PostgreSQL tables created successfully');
        }
        catch (error) {
            console.error('❌ PostgreSQL table creation failed:', error);
            throw error;
        }
    }
    async initializeSQLiteTables() {
        const db = this.db;
        return new Promise((resolve, reject) => {
            const tables = [
                // Members table
                `CREATE TABLE IF NOT EXISTS members (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          isActive BOOLEAN DEFAULT 1,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        )`,
                // Drivers table
                `CREATE TABLE IF NOT EXISTS drivers (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          team TEXT,
          number INTEGER,
          seasonId TEXT,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        )`,
                // Seasons table
                `CREATE TABLE IF NOT EXISTS seasons (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          year INTEGER NOT NULL,
          startDate TEXT,
          endDate TEXT,
          status TEXT DEFAULT 'upcoming',
          pointsSystem TEXT DEFAULT 'f1_standard',
          fastestLapPoint INTEGER DEFAULT 1,
          isActive INTEGER DEFAULT 0,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        )`,
                // Tracks table
                `CREATE TABLE IF NOT EXISTS tracks (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          country TEXT,
          location TEXT,
          length REAL,
          laps INTEGER,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        )`,
                // Races table
                `CREATE TABLE IF NOT EXISTS races (
          id TEXT PRIMARY KEY,
          seasonId TEXT,
          trackId TEXT,
          raceDate TEXT,
          sessionTypes TEXT DEFAULT 'race',
          status TEXT DEFAULT 'scheduled',
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (seasonId) REFERENCES seasons(id),
          FOREIGN KEY (trackId) REFERENCES tracks(id)
        )`,
                // Junction tables
                `CREATE TABLE IF NOT EXISTS season_participants (
          id TEXT PRIMARY KEY,
          season_id TEXT NOT NULL,
          member_id TEXT NOT NULL,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (season_id) REFERENCES seasons(id),
          FOREIGN KEY (member_id) REFERENCES members(id)
        )`,
                `CREATE TABLE IF NOT EXISTS season_tracks (
          id TEXT PRIMARY KEY,
          season_id TEXT NOT NULL,
          track_id TEXT NOT NULL,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (season_id) REFERENCES seasons(id),
          FOREIGN KEY (track_id) REFERENCES tracks(id)
        )`,
                `CREATE TABLE IF NOT EXISTS season_races (
          id TEXT PRIMARY KEY,
          season_id TEXT NOT NULL,
          race_id TEXT NOT NULL,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (season_id) REFERENCES seasons(id),
          FOREIGN KEY (race_id) REFERENCES races(id)
        )`,
                // F1 23 specific tables
                `CREATE TABLE IF NOT EXISTS f123_driver_mappings (
          id TEXT PRIMARY KEY,
          seasonId TEXT NOT NULL,
          f123DriverId INTEGER NOT NULL,
          f123DriverName TEXT NOT NULL,
          f123DriverNumber INTEGER,
          f123TeamName TEXT,
          memberId TEXT,
          isHuman INTEGER DEFAULT 1,
          isActive INTEGER DEFAULT 1,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (seasonId) REFERENCES seasons(id),
          FOREIGN KEY (memberId) REFERENCES members(id)
        )`,
                `CREATE TABLE IF NOT EXISTS f123_session_results (
          id TEXT PRIMARY KEY,
          raceId TEXT,
          driverId TEXT,
          position INTEGER,
          lapTime REAL,
          sector1Time REAL,
          sector2Time REAL,
          sector3Time REAL,
          fastestLap INTEGER DEFAULT 0,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (raceId) REFERENCES races(id),
          FOREIGN KEY (driverId) REFERENCES drivers(id)
        )`,
                `CREATE TABLE IF NOT EXISTS f123_telemetry_data (
          id TEXT PRIMARY KEY,
          sessionId TEXT,
          driverId TEXT,
          lapNumber INTEGER,
          sector1Time REAL,
          sector2Time REAL,
          sector3Time REAL,
          lapTime REAL,
          timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (driverId) REFERENCES drivers(id)
        )`,
                `CREATE TABLE IF NOT EXISTS session_file_uploads (
          id TEXT PRIMARY KEY,
          filename TEXT NOT NULL,
          originalName TEXT,
          fileSize INTEGER,
          uploadDate TEXT DEFAULT CURRENT_TIMESTAMP,
          processed INTEGER DEFAULT 0
        )`
            ];
            let completed = 0;
            const total = tables.length;
            const createTable = (index) => {
                if (index >= tables.length) {
                    this.initialized = true;
                    console.log('🎉 All SQLite tables created successfully');
                    resolve();
                    return;
                }
                db.run(tables[index], (err) => {
                    if (err) {
                        console.error(`❌ SQLite table ${index + 1} creation failed:`, err);
                        reject(err);
                        return;
                    }
                    completed++;
                    console.log(`📊 SQLite Table ${completed}/${total} created`);
                    createTable(index + 1);
                });
            };
            createTable(0);
        });
    }
    async ensureInitialized() {
        if (this.initialized) {
            return;
        }
        console.log('🔧 ensureInitialized called, initialized:', this.initialized);
        console.log('📋 Initializing database tables...');
        await this.initializeTables();
    }
    generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    async executeQuery(query, params = []) {
        await this.ensureInitialized();
        if (this.isPostgreSQL) {
            const client = this.db;
            const result = await client.query(query, params);
            return result.rows;
        }
        else {
            const db = this.db;
            return new Promise((resolve, reject) => {
                db.all(query, params, (err, rows) => {
                    if (err)
                        reject(err);
                    else
                        resolve(rows || []);
                });
            });
        }
    }
    async executeUpdate(query, params = []) {
        await this.ensureInitialized();
        if (this.isPostgreSQL) {
            const client = this.db;
            await client.query(query, params);
        }
        else {
            const db = this.db;
            return new Promise((resolve, reject) => {
                db.run(query, params, (err) => {
                    if (err)
                        reject(err);
                    else
                        resolve();
                });
            });
        }
    }
    // Member CRUD operations
    async createMember(data) {
        const id = this.generateId();
        const now = new Date().toISOString();
        if (this.isPostgreSQL) {
            const client = this.db;
            await client.query(`INSERT INTO members (id, name, is_active, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5)`, [id, data.name, data.isActive ?? true, now, now]);
        }
        else {
            const db = this.db;
            await new Promise((resolve, reject) => {
                db.run(`INSERT INTO members (id, name, isActive, createdAt, updatedAt) 
           VALUES (?, ?, ?, ?, ?)`, [id, data.name, data.isActive ?? true, now, now], (err) => err ? reject(err) : resolve());
            });
        }
        return id;
    }
    async getAllMembers() {
        if (this.isPostgreSQL) {
            const client = this.db;
            const result = await client.query(`SELECT id, name, is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt" 
         FROM members ORDER BY name`);
            return result.rows;
        }
        else {
            const db = this.db;
            return new Promise((resolve, reject) => {
                db.all(`SELECT id, name, isActive, createdAt, updatedAt FROM members ORDER BY name`, (err, rows) => err ? reject(err) : resolve(rows));
            });
        }
    }
    async getMemberById(id) {
        if (this.isPostgreSQL) {
            const client = this.db;
            const result = await client.query(`SELECT id, name, is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt" 
         FROM members WHERE id = $1`, [id]);
            return result.rows[0] || null;
        }
        else {
            const db = this.db;
            return new Promise((resolve, reject) => {
                db.get(`SELECT id, name, isActive, createdAt, updatedAt FROM members WHERE id = ?`, [id], (err, row) => err ? reject(err) : resolve(row || null));
            });
        }
    }
    async updateMember(id, data) {
        const now = new Date().toISOString();
        const updates = [];
        const values = [];
        let paramIndex = 1;
        if (data.name !== undefined) {
            updates.push(`name = $${paramIndex++}`);
            values.push(data.name);
        }
        if (data.isActive !== undefined) {
            updates.push(`is_active = $${paramIndex++}`);
            values.push(data.isActive);
        }
        updates.push(`updated_at = $${paramIndex++}`);
        values.push(now);
        values.push(id);
        if (this.isPostgreSQL) {
            const client = this.db;
            await client.query(`UPDATE members SET ${updates.join(', ')} WHERE id = $${paramIndex}`, values);
        }
        else {
            const db = this.db;
            const sqliteUpdates = updates.map(update => update.replace(/\$\d+/g, '?').replace('is_active', 'isActive').replace('updated_at', 'updatedAt'));
            await new Promise((resolve, reject) => {
                db.run(`UPDATE members SET ${sqliteUpdates.join(', ')} WHERE id = ?`, values, (err) => err ? reject(err) : resolve());
            });
        }
    }
    async deleteMember(id) {
        if (this.isPostgreSQL) {
            const client = this.db;
            await client.query('DELETE FROM members WHERE id = $1', [id]);
        }
        else {
            const db = this.db;
            await new Promise((resolve, reject) => {
                db.run('DELETE FROM members WHERE id = ?', [id], (err) => err ? reject(err) : resolve());
            });
        }
    }
    // Driver CRUD operations
    async createDriver(data) {
        const id = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        if (this.isPostgreSQL) {
            const client = this.db;
            await client.query('INSERT INTO drivers (id, name, team, isActive, createdAt, updatedAt) VALUES ($1, $2, $3, $4, $5, $6)', [id, data.name, data.team, data.isActive ?? true, now, now]);
        }
        else {
            const db = this.db;
            await new Promise((resolve, reject) => {
                db.run('INSERT INTO drivers (id, name, team, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)', [id, data.name, data.team, data.isActive ?? true, now, now], (err) => err ? reject(err) : resolve());
            });
        }
        return id;
    }
    async updateDriver(id, data) {
        const now = new Date().toISOString();
        const updates = [];
        const values = [];
        let paramIndex = 1;
        if (data.name !== undefined) {
            updates.push(`name = $${paramIndex++}`);
            values.push(data.name);
        }
        if (data.team !== undefined) {
            updates.push(`team = $${paramIndex++}`);
            values.push(data.team);
        }
        if (data.isActive !== undefined) {
            updates.push(`isActive = $${paramIndex++}`);
            values.push(data.isActive);
        }
        updates.push(`updatedAt = $${paramIndex++}`);
        values.push(now);
        values.push(id);
        if (updates.length === 1)
            return; // Only updatedAt
        if (this.isPostgreSQL) {
            const client = this.db;
            await client.query(`UPDATE drivers SET ${updates.join(', ')} WHERE id = $${paramIndex}`, values);
        }
        else {
            const db = this.db;
            const sqliteUpdates = updates.map((update, index) => update.replace(/\$\d+/g, `$${index + 1}`));
            await new Promise((resolve, reject) => {
                db.run(`UPDATE drivers SET ${sqliteUpdates.join(', ')} WHERE id = ?`, values, (err) => err ? reject(err) : resolve());
            });
        }
    }
    async deleteDriver(id) {
        if (this.isPostgreSQL) {
            const client = this.db;
            await client.query('DELETE FROM drivers WHERE id = $1', [id]);
        }
        else {
            const db = this.db;
            await new Promise((resolve, reject) => {
                db.run('DELETE FROM drivers WHERE id = ?', [id], (err) => err ? reject(err) : resolve());
            });
        }
    }
    // Season CRUD operations
    async getAllSeasons() {
        if (this.isPostgreSQL) {
            const client = this.db;
            const result = await client.query(`SELECT id, name, year, start_date as "startDate", end_date as "endDate", 
                is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
         FROM seasons ORDER BY year DESC, name`);
            return result.rows;
        }
        else {
            const db = this.db;
            return new Promise((resolve, reject) => {
                db.all(`SELECT id, name, year, startDate, endDate, isActive, createdAt, updatedAt 
           FROM seasons ORDER BY year DESC, name`, (err, rows) => err ? reject(err) : resolve(rows));
            });
        }
    }
    async getSeasonById(id) {
        if (this.isPostgreSQL) {
            const client = this.db;
            const result = await client.query(`SELECT id, name, year, start_date as "startDate", end_date as "endDate", 
                is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
         FROM seasons WHERE id = $1`, [id]);
            return result.rows[0] || null;
        }
        else {
            const db = this.db;
            return new Promise((resolve, reject) => {
                db.get(`SELECT id, name, year, startDate, endDate, isActive, createdAt, updatedAt 
           FROM seasons WHERE id = ?`, [id], (err, row) => err ? reject(err) : resolve(row || null));
            });
        }
    }
    async createSeason(data) {
        const id = this.generateId();
        const now = new Date().toISOString();
        if (this.isPostgreSQL) {
            const client = this.db;
            await client.query(`INSERT INTO seasons (id, name, year, start_date, end_date, is_active, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [id, data.name, data.year, data.startDate, data.endDate, data.isActive ?? true, now, now]);
        }
        else {
            const db = this.db;
            await new Promise((resolve, reject) => {
                db.run(`INSERT INTO seasons (id, name, year, startDate, endDate, isActive, createdAt, updatedAt) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [id, data.name, data.year, data.startDate, data.endDate, data.isActive ?? true, now, now], (err) => err ? reject(err) : resolve());
            });
        }
        return id;
    }
    async updateSeason(id, data) {
        const now = new Date().toISOString();
        const updates = [];
        const values = [];
        let paramIndex = 1;
        if (data.name !== undefined) {
            updates.push(`name = $${paramIndex++}`);
            values.push(data.name);
        }
        if (data.year !== undefined) {
            updates.push(`year = $${paramIndex++}`);
            values.push(data.year);
        }
        if (data.startDate !== undefined) {
            updates.push(`start_date = $${paramIndex++}`);
            values.push(data.startDate);
        }
        if (data.endDate !== undefined) {
            updates.push(`end_date = $${paramIndex++}`);
            values.push(data.endDate);
        }
        if (data.isActive !== undefined) {
            updates.push(`is_active = $${paramIndex++}`);
            values.push(data.isActive);
        }
        updates.push(`updated_at = $${paramIndex++}`);
        values.push(now);
        values.push(id);
        if (this.isPostgreSQL) {
            const client = this.db;
            await client.query(`UPDATE seasons SET ${updates.join(', ')} WHERE id = $${paramIndex}`, values);
        }
        else {
            const db = this.db;
            const sqliteUpdates = updates.map(update => update.replace(/\$\d+/g, '?').replace('start_date', 'startDate').replace('end_date', 'endDate').replace('is_active', 'isActive').replace('updated_at', 'updatedAt'));
            await new Promise((resolve, reject) => {
                db.run(`UPDATE seasons SET ${sqliteUpdates.join(', ')} WHERE id = ?`, values, (err) => err ? reject(err) : resolve());
            });
        }
    }
    async deleteSeason(id) {
        if (this.isPostgreSQL) {
            const client = this.db;
            await client.query('DELETE FROM seasons WHERE id = $1', [id]);
        }
        else {
            const db = this.db;
            await new Promise((resolve, reject) => {
                db.run('DELETE FROM seasons WHERE id = ?', [id], (err) => err ? reject(err) : resolve());
            });
        }
    }
    // Season participant management
    async getDriversBySeason(seasonId) {
        if (this.isPostgreSQL) {
            const client = this.db;
            const result = await client.query(`SELECT m.id, m.name, m.is_active as "isActive", 
                m.created_at as "createdAt", m.updated_at as "updatedAt"
         FROM members m
         JOIN season_participants sp ON m.id = sp.member_id
         WHERE sp.season_id = $1
         ORDER BY m.name`, [seasonId]);
            return result.rows;
        }
        else {
            const db = this.db;
            return new Promise((resolve, reject) => {
                db.all(`SELECT m.id, m.name, m.isActive, m.createdAt, m.updatedAt
           FROM members m
           JOIN season_participants sp ON m.id = sp.member_id
           WHERE sp.season_id = ?
           ORDER BY m.name`, [seasonId], (err, rows) => err ? reject(err) : resolve(rows));
            });
        }
    }
    async addDriverToSeason(seasonId, memberId) {
        const id = this.generateId();
        const now = new Date().toISOString();
        if (this.isPostgreSQL) {
            const client = this.db;
            await client.query(`INSERT INTO season_participants (id, season_id, member_id, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5)`, [id, seasonId, memberId, now, now]);
        }
        else {
            const db = this.db;
            await new Promise((resolve, reject) => {
                db.run(`INSERT INTO season_participants (id, season_id, member_id, createdAt, updatedAt) 
           VALUES (?, ?, ?, ?, ?)`, [id, seasonId, memberId, now, now], (err) => err ? reject(err) : resolve());
            });
        }
    }
    async removeDriverFromSeason(seasonId, memberId) {
        if (this.isPostgreSQL) {
            const client = this.db;
            await client.query('DELETE FROM season_participants WHERE season_id = $1 AND member_id = $2', [seasonId, memberId]);
        }
        else {
            const db = this.db;
            await new Promise((resolve, reject) => {
                db.run('DELETE FROM season_participants WHERE season_id = ? AND member_id = ?', [seasonId, memberId], (err) => err ? reject(err) : resolve());
            });
        }
    }
    // Track management
    async getTracksBySeason(seasonId) {
        if (this.isPostgreSQL) {
            const client = this.db;
            const result = await client.query(`SELECT t.id, t.name, t.country, t.city, t.length, t.laps, t.created_at as "createdAt", t.updated_at as "updatedAt"
         FROM tracks t
         JOIN season_tracks st ON t.id = st.track_id
         WHERE st.season_id = $1
         ORDER BY t.name`, [seasonId]);
            return result.rows;
        }
        else {
            const db = this.db;
            return new Promise((resolve, reject) => {
                db.all(`SELECT t.id, t.name, t.country, t.city, t.length, t.laps, t.createdAt, t.updatedAt
           FROM tracks t
           JOIN season_tracks st ON t.id = st.track_id
           WHERE st.season_id = ?
           ORDER BY t.name`, [seasonId], (err, rows) => err ? reject(err) : resolve(rows));
            });
        }
    }
    async addTrackToSeason(seasonId, trackId) {
        const id = this.generateId();
        const now = new Date().toISOString();
        if (this.isPostgreSQL) {
            const client = this.db;
            await client.query(`INSERT INTO season_tracks (id, season_id, track_id, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5)`, [id, seasonId, trackId, now, now]);
        }
        else {
            const db = this.db;
            await new Promise((resolve, reject) => {
                db.run(`INSERT INTO season_tracks (id, season_id, track_id, createdAt, updatedAt) 
           VALUES (?, ?, ?, ?, ?)`, [id, seasonId, trackId, now, now], (err) => err ? reject(err) : resolve());
            });
        }
    }
    async removeTrackFromSeason(seasonId, trackId) {
        if (this.isPostgreSQL) {
            const client = this.db;
            await client.query('DELETE FROM season_tracks WHERE season_id = $1 AND track_id = $2', [seasonId, trackId]);
        }
        else {
            const db = this.db;
            await new Promise((resolve, reject) => {
                db.run('DELETE FROM season_tracks WHERE season_id = ? AND track_id = ?', [seasonId, trackId], (err) => err ? reject(err) : resolve());
            });
        }
    }
    // Race management
    async getRacesBySeason(seasonId) {
        if (this.isPostgreSQL) {
            const client = this.db;
            const result = await client.query(`SELECT r.id, r.season_id as "seasonId", r.track_id as "trackId", r.race_date as "raceDate", 
                r.status, r.created_at as "createdAt", r.updated_at as "updatedAt"
         FROM races r
         WHERE r.season_id = $1
         ORDER BY r.race_date`, [seasonId]);
            return result.rows;
        }
        else {
            const db = this.db;
            return new Promise((resolve, reject) => {
                db.all(`SELECT r.id, r.seasonId, r.trackId, r.raceDate, r.status, r.createdAt, r.updatedAt
           FROM races r
           WHERE r.season_id = ?
           ORDER BY r.raceDate`, [seasonId], (err, rows) => err ? reject(err) : resolve(rows));
            });
        }
    }
    async addRaceToSeason(seasonId, raceData) {
        const id = this.generateId();
        const now = new Date().toISOString();
        if (this.isPostgreSQL) {
            const client = this.db;
            await client.query(`INSERT INTO races (id, season_id, track_id, race_date, status, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`, [id, seasonId, raceData.trackId, raceData.raceDate, raceData.status ?? 'scheduled', now, now]);
        }
        else {
            const db = this.db;
            await new Promise((resolve, reject) => {
                db.run(`INSERT INTO races (id, seasonId, trackId, raceDate, status, createdAt, updatedAt) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [id, seasonId, raceData.trackId, raceData.raceDate, raceData.status ?? 'scheduled', now, now], (err) => err ? reject(err) : resolve());
            });
        }
        return id;
    }
    async removeRaceFromSeason(seasonId, raceId) {
        if (this.isPostgreSQL) {
            const client = this.db;
            await client.query('DELETE FROM races WHERE season_id = $1 AND id = $2', [seasonId, raceId]);
        }
        else {
            const db = this.db;
            await new Promise((resolve, reject) => {
                db.run('DELETE FROM races WHERE seasonId = ? AND id = ?', [seasonId, raceId], (err) => err ? reject(err) : resolve());
            });
        }
    }
    // Track management
    async createTrack(data) {
        const id = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        if (this.isPostgreSQL) {
            const client = this.db;
            await client.query('INSERT INTO tracks (id, name, country, city, length, laps, createdAt, updatedAt) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', [id, data.name, data.country, data.city || '', data.circuitLength, data.laps, now, now]);
        }
        else {
            const db = this.db;
            await new Promise((resolve, reject) => {
                db.run('INSERT INTO tracks (id, name, country, city, length, laps, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [id, data.name, data.country, data.city || '', data.circuitLength, data.laps, now, now], (err) => err ? reject(err) : resolve());
            });
        }
        return id;
    }
    async createTrackAndAddToSeason(seasonId, data) {
        const trackId = await this.createTrack(data);
        await this.addTrackToSeason(seasonId, trackId);
        return trackId;
    }
    async findOrCreateTrack(trackName) {
        // First try to find existing track
        let track = null;
        if (this.isPostgreSQL) {
            const client = this.db;
            const result = await client.query(`SELECT id, name, country, city, length, laps, created_at as "createdAt", updated_at as "updatedAt"
         FROM tracks WHERE name = $1`, [trackName]);
            track = result.rows[0] || null;
        }
        else {
            const db = this.db;
            track = await new Promise((resolve, reject) => {
                db.get(`SELECT id, name, country, city, length, laps, createdAt, updatedAt 
           FROM tracks WHERE name = ?`, [trackName], (err, row) => err ? reject(err) : resolve(row || null));
            });
        }
        if (track) {
            return track;
        }
        // Create new track if not found
        const id = this.generateId();
        const now = new Date().toISOString();
        if (this.isPostgreSQL) {
            const client = this.db;
            await client.query(`INSERT INTO tracks (id, name, country, city, length, laps, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [id, trackName, 'Unknown', 'Unknown', 0, 0, now, now]);
        }
        else {
            const db = this.db;
            await new Promise((resolve, reject) => {
                db.run(`INSERT INTO tracks (id, name, country, city, length, laps, createdAt, updatedAt) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [id, trackName, 'Unknown', 'Unknown', 0, 0, now, now], (err) => err ? reject(err) : resolve());
            });
        }
        return {
            id,
            name: trackName,
            country: 'Unknown',
            city: 'Unknown',
            length: 0,
            laps: 0,
            createdAt: now,
            updatedAt: now
        };
    }
    async createRace(data) {
        const id = this.generateId();
        const now = new Date().toISOString();
        if (this.isPostgreSQL) {
            const client = this.db;
            await client.query(`INSERT INTO races (id, season_id, track_id, race_date, status, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`, [id, data.seasonId, data.trackId, data.raceDate, data.status ?? 'scheduled', now, now]);
        }
        else {
            const db = this.db;
            await new Promise((resolve, reject) => {
                db.run(`INSERT INTO races (id, seasonId, trackId, raceDate, status, createdAt, updatedAt) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [id, data.seasonId, data.trackId, data.raceDate, data.status ?? 'scheduled', now, now], (err) => err ? reject(err) : resolve());
            });
        }
        return id;
    }
    // Driver mapping management
    async getDriverMappings(seasonId) {
        if (this.isPostgreSQL) {
            const client = this.db;
            const result = await client.query(`SELECT id, season_id as "seasonId", f123_driver_id as "f123DriverId", 
                f123_driver_name as "f123DriverName", f123_driver_number as "f123DriverNumber",
                f123_team_name as "f123TeamName", member_id as "memberId", 
                is_human as "isHuman", is_active as "isActive", 
                created_at as "createdAt", updated_at as "updatedAt"
         FROM f123_driver_mappings 
         WHERE season_id = $1 AND is_active = true
         ORDER BY f123_driver_name`, [seasonId]);
            return result.rows;
        }
        else {
            const db = this.db;
            return new Promise((resolve, reject) => {
                db.all(`SELECT id, seasonId, f123DriverId, f123DriverName, f123DriverNumber,
                  f123TeamName, memberId, isHuman, isActive, createdAt, updatedAt
           FROM f123_driver_mappings 
           WHERE seasonId = ? AND isActive = true
           ORDER BY f123DriverName`, [seasonId], (err, rows) => err ? reject(err) : resolve(rows));
            });
        }
    }
    async createDriverMapping(data) {
        const id = this.generateId();
        const now = new Date().toISOString();
        if (this.isPostgreSQL) {
            const client = this.db;
            await client.query(`INSERT INTO f123_driver_mappings 
         (id, season_id, f123_driver_id, f123_driver_name, f123_driver_number, 
          f123_team_name, member_id, is_human, is_active, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`, [id, data.seasonId, data.f123DriverId, data.f123DriverName, data.f123DriverNumber,
                data.f123TeamName, data.memberId, data.isHuman ?? true, true, now, now]);
        }
        else {
            const db = this.db;
            await new Promise((resolve, reject) => {
                db.run(`INSERT INTO f123_driver_mappings 
           (id, seasonId, f123DriverId, f123DriverName, f123DriverNumber, 
            f123TeamName, memberId, isHuman, isActive, createdAt, updatedAt) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, data.seasonId, data.f123DriverId, data.f123DriverName, data.f123DriverNumber,
                    data.f123TeamName, data.memberId, data.isHuman ?? true, true, now, now], (err) => err ? reject(err) : resolve());
            });
        }
        return id;
    }
    async importRaceResults(raceId, sessionData) {
        let resultsCount = 0;
        let lapTimesCount = 0;
        for (const result of sessionData.results) {
            const resultId = this.generateId();
            const now = new Date().toISOString();
            const query = `
        INSERT INTO f123_session_results (id, raceId, driverId, position, lapTime, sector1Time, sector2Time, sector3Time, fastestLap, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
            await this.executeUpdate(query, [
                resultId, raceId, result.yourDriverId, result.position,
                result.lapTime, result.sector1Time, result.sector2Time,
                result.sector1Time, result.sector2Time, result.sector3Time,
                this.isPostgreSQL ? result.fastestLap : (result.fastestLap ? 1 : 0),
                now
            ]);
            resultsCount++;
            // Import lap times if available
            if (result.lapTimes && result.lapTimes.length > 0) {
                for (const lapTime of result.lapTimes) {
                    const lapId = this.generateId();
                    const lapQuery = `
            INSERT INTO f123_telemetry_data (id, sessionId, driverId, lapNumber, sector1Time, sector2Time, sector3Time, lapTime, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
                    await this.executeUpdate(lapQuery, [
                        lapId, raceId, result.yourDriverId, lapTime.lapNumber,
                        lapTime.sector1Time, lapTime.sector2Time, lapTime.sector3Time,
                        lapTime.lapTime, now
                    ]);
                    lapTimesCount++;
                }
            }
        }
        return { resultsCount, lapTimesCount };
    }
}
exports.DatabaseService = DatabaseService;
//# sourceMappingURL=DatabaseService.js.map