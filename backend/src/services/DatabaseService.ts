import sqlite3 from 'sqlite3';
import { Client } from 'pg';

// Type definitions
export interface Driver {
  id: string;
  name: string;
  team: string;
  number: number;
  createdAt: string;
  updatedAt: string;
}

export interface Season {
  id: string;
  name: string;
  year: number;
  startDate?: string;
  endDate?: string;
  status: 'active' | 'completed' | 'upcoming';
  createdAt: string;
  updatedAt: string;
}

export interface Track {
  id: string;
  name: string;
  country: string;
  location: string;
  length: number;
  laps: number;
  createdAt: string;
  updatedAt: string;
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

export interface DriverMapping {
  id: string;
  seasonId: string;
  f123_driver_name: string; // Using snake_case to match route expectations
  f123_driver_number?: number;
  yourDriverId: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  createdAt: string;
}

export interface SessionResult {
  id: string;
  raceId: string;
  driverId: string;
  position: number;
  lapTime: number;
  sector1Time: number;
  sector2Time: number;
  sector3Time: number;
  fastestLap: boolean;
  createdAt: string;
}

export interface TelemetryData {
  id: string;
  sessionId: string;
  driverId: string;
  lapNumber: number;
  sector1Time: number;
  sector2Time: number;
  sector3Time: number;
  lapTime: number;
  timestamp: string;
}

export interface SessionFileUpload {
  id: string;
  filename: string;
  originalName: string;
  fileSize: number;
  uploadDate: string;
  processed: boolean;
}

// Data interfaces for creating records
export interface DriverData {
  name: string;
  team: string;
  number: number;
  seasonId?: string;
}

export interface SeasonData {
  name: string;
  year: number;
  startDate?: string | Date;
  endDate?: string | Date;
  status?: 'active' | 'completed' | 'upcoming';
  pointsSystem?: string;
  fastestLapPoint?: boolean;
  isActive?: boolean;
}

export interface TrackData {
  name: string;
  country: string;
  location?: string;
  length: number;
  laps: number;
}

export interface RaceData {
  seasonId: string;
  trackId: string;
  raceDate: string | Date;
  status?: 'scheduled' | 'completed' | 'cancelled';
  date?: string | Date;
  time?: string;
  type?: string;
}

export interface DriverMappingData {
  seasonId: string;
  f123_driver_name: string;
  f123_driver_number?: number;
  yourDriverId: string;
}

export interface SessionFileUploadData {
  filename: string;
  originalName: string;
  fileSize: number;
  processed?: boolean;
}

export class DatabaseService {
  private db: sqlite3.Database | Client;
  private initialized: boolean = false;
  private isPostgreSQL: boolean = false;

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (databaseUrl) {
      // Production: Use PostgreSQL (Supabase)
      console.log('🐘 Using PostgreSQL database (production)');
      this.db = new Client({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false }
      });
      this.isPostgreSQL = true;
      this.db.connect().catch((error) => {
        console.error('❌ PostgreSQL connection failed:', error);
        process.exit(1);
      });
    } else {
      // Development: Use SQLite
      console.log('🗄️ Using SQLite database (development)');
      this.db = new sqlite3.Database(':memory:');
      this.isPostgreSQL = false;
    }
    
    this.initializeTables();
  }

  private async initializeTables(): Promise<void> {
    if (this.isPostgreSQL) {
      return this.initializePostgreSQLTables();
    } else {
      return this.initializeSQLiteTables();
    }
  }

  private async initializePostgreSQLTables(): Promise<void> {
    const client = this.db as Client;
    
    try {
      const tables = [
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
          status TEXT DEFAULT 'scheduled',
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (seasonId) REFERENCES seasons(id),
          FOREIGN KEY (trackId) REFERENCES tracks(id)
        )`,
        
        // Junction tables
        `CREATE TABLE IF NOT EXISTS season_drivers (
          seasonId TEXT,
          driverId TEXT,
          PRIMARY KEY (seasonId, driverId),
          FOREIGN KEY (seasonId) REFERENCES seasons(id),
          FOREIGN KEY (driverId) REFERENCES drivers(id)
        )`,
        
        `CREATE TABLE IF NOT EXISTS season_tracks (
          seasonId TEXT,
          trackId TEXT,
          PRIMARY KEY (seasonId, trackId),
          FOREIGN KEY (seasonId) REFERENCES seasons(id),
          FOREIGN KEY (trackId) REFERENCES tracks(id)
        )`,
        
        `CREATE TABLE IF NOT EXISTS season_races (
          seasonId TEXT,
          raceId TEXT,
          PRIMARY KEY (seasonId, raceId),
          FOREIGN KEY (seasonId) REFERENCES seasons(id),
          FOREIGN KEY (raceId) REFERENCES races(id)
        )`,
        
        // F1 23 specific tables
        `CREATE TABLE IF NOT EXISTS f123_driver_mappings (
          id TEXT PRIMARY KEY,
          seasonId TEXT,
          f123_driver_name TEXT NOT NULL,
          f123_driver_number INTEGER,
          yourDriverId TEXT,
          startDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          endDate TIMESTAMP,
          isActive BOOLEAN DEFAULT true,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (seasonId) REFERENCES seasons(id),
          FOREIGN KEY (yourDriverId) REFERENCES drivers(id)
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
        'CREATE INDEX IF NOT EXISTS idx_driver_mappings_season ON f123_driver_mappings(seasonId)'
      ];

      for (const index of indexes) {
        await client.query(index);
      }

      this.initialized = true;
      console.log('🎉 All PostgreSQL tables created successfully');
    } catch (error) {
      console.error('❌ PostgreSQL table creation failed:', error);
      throw error;
    }
  }

  private async initializeSQLiteTables(): Promise<void> {
    const db = this.db as sqlite3.Database;
    
    return new Promise((resolve, reject) => {
      const tables = [
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
          status TEXT DEFAULT 'scheduled',
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (seasonId) REFERENCES seasons(id),
          FOREIGN KEY (trackId) REFERENCES tracks(id)
        )`,
        
        // Junction tables
        `CREATE TABLE IF NOT EXISTS season_drivers (
          seasonId TEXT,
          driverId TEXT,
          PRIMARY KEY (seasonId, driverId),
          FOREIGN KEY (seasonId) REFERENCES seasons(id),
          FOREIGN KEY (driverId) REFERENCES drivers(id)
        )`,
        
        `CREATE TABLE IF NOT EXISTS season_tracks (
          seasonId TEXT,
          trackId TEXT,
          PRIMARY KEY (seasonId, trackId),
          FOREIGN KEY (seasonId) REFERENCES seasons(id),
          FOREIGN KEY (trackId) REFERENCES tracks(id)
        )`,
        
        `CREATE TABLE IF NOT EXISTS season_races (
          seasonId TEXT,
          raceId TEXT,
          PRIMARY KEY (seasonId, raceId),
          FOREIGN KEY (seasonId) REFERENCES seasons(id),
          FOREIGN KEY (raceId) REFERENCES races(id)
        )`,
        
        // F1 23 specific tables
        `CREATE TABLE IF NOT EXISTS f123_driver_mappings (
          id TEXT PRIMARY KEY,
          seasonId TEXT,
          f123_driver_name TEXT NOT NULL,
          f123_driver_number INTEGER,
          yourDriverId TEXT,
          startDate TEXT DEFAULT CURRENT_TIMESTAMP,
          endDate TEXT,
          isActive INTEGER DEFAULT 1,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (seasonId) REFERENCES seasons(id),
          FOREIGN KEY (yourDriverId) REFERENCES drivers(id)
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

      tables.forEach(sql => {
        db.run(sql, (err) => {
          if (err) {
            console.error('Error creating table:', err);
            reject(err);
            return;
          }
          completed++;
          console.log(`📊 SQLite Table ${completed}/${total} created`);
          if (completed === total) {
            this.initialized = true;
            console.log('🎉 All SQLite tables created successfully');
            resolve();
          }
        });
      });
    });
  }

  public async ensureInitialized(): Promise<void> {
    console.log('🔧 ensureInitialized called, initialized:', this.initialized);
    if (!this.initialized) {
      console.log('📋 Initializing database tables...');
      await this.initializeTables();
      console.log('✅ Database tables initialized');
    } else {
      console.log('✅ Database already initialized');
    }
  }

  // Helper method to generate unique IDs
  private generateId(): string {
    return `id_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
  }

  // Helper method to execute queries
  private async executeQuery(query: string, params: any[] = []): Promise<any> {
    if (this.isPostgreSQL) {
      const client = this.db as Client;
      const result = await client.query(query, params);
      return result.rows;
    } else {
      const db = this.db as sqlite3.Database;
      return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    }
  }

  // Helper method to execute single row queries
  private async executeQuerySingle(query: string, params: any[] = []): Promise<any> {
    if (this.isPostgreSQL) {
      const client = this.db as Client;
      const result = await client.query(query, params);
      return result.rows[0];
    } else {
      const db = this.db as sqlite3.Database;
      return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    }
  }

  // Helper method to execute insert/update/delete queries
  private async executeUpdate(query: string, params: any[] = []): Promise<any> {
    if (this.isPostgreSQL) {
      const client = this.db as Client;
      const result = await client.query(query, params);
      return result;
    } else {
      const db = this.db as sqlite3.Database;
      return new Promise((resolve, reject) => {
        db.run(query, params, function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
        });
      });
    }
  }

  // Driver CRUD operations
  async createDriver(data: DriverData): Promise<string> {
    const id = this.generateId();
    const now = new Date().toISOString();
    
    const query = `
      INSERT INTO drivers (id, name, team, number, seasonId, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    await this.executeUpdate(query, [
      id, data.name, data.team || 'No Team', data.number || 0, 
      data.seasonId || null, now, now
    ]);
    
    return id;
  }

  async getDriverById(id: string): Promise<Driver | null> {
    const query = 'SELECT * FROM drivers WHERE id = ?';
    return await this.executeQuerySingle(query, [id]);
  }

  async updateDriver(id: string, data: Partial<DriverData>): Promise<void> {
    const now = new Date().toISOString();
    const fields = [];
    const values = [];
    
    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.team !== undefined) {
      fields.push('team = ?');
      values.push(data.team);
    }
    if (data.number !== undefined) {
      fields.push('number = ?');
      values.push(data.number);
    }
    
    fields.push('updatedAt = ?');
    values.push(now);
    values.push(id);
    
    const query = `UPDATE drivers SET ${fields.join(', ')} WHERE id = ?`;
    await this.executeUpdate(query, values);
  }

  async deleteDriver(id: string): Promise<void> {
    const query = 'DELETE FROM drivers WHERE id = ?';
    await this.executeUpdate(query, [id]);
  }

  async getDriversBySeason(seasonId: string): Promise<Driver[]> {
    const query = `
      SELECT d.* FROM drivers d
      INNER JOIN season_drivers sd ON d.id = sd.driverId
      WHERE sd.seasonId = ?
      ORDER BY d.name
    `;
    return await this.executeQuery(query, [seasonId]);
  }

  // Season CRUD operations
  async getAllSeasons(): Promise<Season[]> {
    const query = 'SELECT * FROM seasons ORDER BY year DESC, name';
    return await this.executeQuery(query);
  }

  async getSeasonById(id: string): Promise<Season | null> {
    const query = 'SELECT * FROM seasons WHERE id = ?';
    return await this.executeQuerySingle(query, [id]);
  }

  async createSeason(data: SeasonData): Promise<string> {
    const id = this.generateId();
    const now = new Date().toISOString();
    
    // Convert dates to proper format
    const startDate = data.startDate ? 
      (data.startDate instanceof Date ? data.startDate.toISOString() : data.startDate) : null;
    const endDate = data.endDate ? 
      (data.endDate instanceof Date ? data.endDate.toISOString() : data.endDate) : null;
    
    const query = `
      INSERT INTO seasons (id, name, year, startDate, endDate, status, pointsSystem, fastestLapPoint, isActive, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await this.executeUpdate(query, [
      id, data.name, data.year, startDate, endDate,
      data.status || 'upcoming', data.pointsSystem || 'f1_standard',
      this.isPostgreSQL ? (data.fastestLapPoint !== false) : (data.fastestLapPoint !== false ? 1 : 0),
      this.isPostgreSQL ? (data.isActive || false) : (data.isActive ? 1 : 0),
      now, now
    ]);
    
    return id;
  }

  async updateSeason(id: string, data: Partial<SeasonData>): Promise<Season | null> {
    const now = new Date().toISOString();
    const fields = [];
    const values = [];
    
    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.year !== undefined) {
      fields.push('year = ?');
      values.push(data.year);
    }
    if (data.startDate !== undefined) {
      const startDate = data.startDate instanceof Date ? data.startDate.toISOString() : data.startDate;
      fields.push('startDate = ?');
      values.push(startDate);
    }
    if (data.endDate !== undefined) {
      const endDate = data.endDate instanceof Date ? data.endDate.toISOString() : data.endDate;
      fields.push('endDate = ?');
      values.push(endDate);
    }
    if (data.status !== undefined) {
      fields.push('status = ?');
      values.push(data.status);
    }
    if (data.pointsSystem !== undefined) {
      fields.push('pointsSystem = ?');
      values.push(data.pointsSystem);
    }
    if (data.fastestLapPoint !== undefined) {
      fields.push('fastestLapPoint = ?');
      values.push(this.isPostgreSQL ? data.fastestLapPoint : (data.fastestLapPoint ? 1 : 0));
    }
    if (data.isActive !== undefined) {
      fields.push('isActive = ?');
      values.push(this.isPostgreSQL ? data.isActive : (data.isActive ? 1 : 0));
    }
    
    fields.push('updatedAt = ?');
    values.push(now);
    values.push(id);
    
    const query = `UPDATE seasons SET ${fields.join(', ')} WHERE id = ?`;
    await this.executeUpdate(query, values);
    
    return await this.getSeasonById(id);
  }

  async deleteSeason(id: string): Promise<void> {
    const query = 'DELETE FROM seasons WHERE id = ?';
    await this.executeUpdate(query, [id]);
  }

  // Track operations
  async findOrCreateTrack(name: string, country?: string): Promise<Track> {
    let query = 'SELECT * FROM tracks WHERE name = ?';
    let existingTrack = await this.executeQuerySingle(query, [name]);
    
    if (existingTrack) {
      return existingTrack;
    }
    
    // Create new track
    const id = this.generateId();
    const now = new Date().toISOString();
    
    query = `
      INSERT INTO tracks (id, name, country, location, length, laps, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await this.executeUpdate(query, [
      id, name, country || 'Unknown', '', 0, 0, now, now
    ]);
    
    const track = await this.getTrackById(id);
    if (!track) throw new Error('Failed to create track');
    return track;
  }

  async getTrackById(id: string): Promise<Track | null> {
    const query = 'SELECT * FROM tracks WHERE id = ?';
    return await this.executeQuerySingle(query, [id]);
  }

  async getTracksBySeason(seasonId: string): Promise<Track[]> {
    const query = `
      SELECT t.* FROM tracks t
      INNER JOIN season_tracks st ON t.id = st.trackId
      WHERE st.seasonId = ?
      ORDER BY t.name
    `;
    return await this.executeQuery(query, [seasonId]);
  }

  // Race operations
  async createRace(data: RaceData): Promise<string> {
    const id = this.generateId();
    const now = new Date().toISOString();
    
    // Use raceDate if available, otherwise use date
    const raceDate = data.raceDate ? 
      (data.raceDate instanceof Date ? data.raceDate.toISOString() : data.raceDate) :
      (data.date instanceof Date ? data.date.toISOString() : data.date);
    
    const query = `
      INSERT INTO races (id, seasonId, trackId, raceDate, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    await this.executeUpdate(query, [
      id, data.seasonId, data.trackId, raceDate, data.status || 'scheduled', now, now
    ]);
    
    return id;
  }

  async getRaceById(id: string): Promise<Race | null> {
    const query = 'SELECT * FROM races WHERE id = ?';
    return await this.executeQuerySingle(query, [id]);
  }

  async getRacesBySeason(seasonId: string): Promise<Race[]> {
    const query = `
      SELECT r.* FROM races r
      INNER JOIN season_races sr ON r.id = sr.raceId
      WHERE sr.seasonId = ?
      ORDER BY r.raceDate
    `;
    return await this.executeQuery(query, [seasonId]);
  }

  // Junction table operations
  async addDriverToSeason(seasonId: string, driverId: string): Promise<void> {
    const query = 'INSERT OR IGNORE INTO season_drivers (seasonId, driverId) VALUES (?, ?)';
    await this.executeUpdate(query, [seasonId, driverId]);
  }

  async removeDriverFromSeason(seasonId: string, driverId: string): Promise<void> {
    const query = 'DELETE FROM season_drivers WHERE seasonId = ? AND driverId = ?';
    await this.executeUpdate(query, [seasonId, driverId]);
  }

  async addTrackToSeason(seasonId: string, trackId: string): Promise<void> {
    const query = 'INSERT OR IGNORE INTO season_tracks (seasonId, trackId) VALUES (?, ?)';
    await this.executeUpdate(query, [seasonId, trackId]);
  }

  async removeTrackFromSeason(seasonId: string, trackId: string): Promise<void> {
    const query = 'DELETE FROM season_tracks WHERE seasonId = ? AND trackId = ?';
    await this.executeUpdate(query, [seasonId, trackId]);
  }

  async addRaceToSeason(seasonId: string, raceId: string): Promise<void> {
    const query = 'INSERT OR IGNORE INTO season_races (seasonId, raceId) VALUES (?, ?)';
    await this.executeUpdate(query, [seasonId, raceId]);
  }

  async removeRaceFromSeason(seasonId: string, raceId: string): Promise<void> {
    const query = 'DELETE FROM season_races WHERE seasonId = ? AND raceId = ?';
    await this.executeUpdate(query, [seasonId, raceId]);
  }

  // Helper methods for creating and adding to seasons
  async createDriverAndAddToSeason(seasonId: string, data: DriverData): Promise<Driver> {
    const driverId = await this.createDriver(data);
    await this.addDriverToSeason(seasonId, driverId);
    const driver = await this.getDriverById(driverId);
    if (!driver) throw new Error('Failed to create driver');
    return driver;
  }

  async createTrackAndAddToSeason(seasonId: string, data: TrackData): Promise<Track> {
    const id = this.generateId();
    const now = new Date().toISOString();
    
    const query = `
      INSERT INTO tracks (id, name, country, location, length, laps, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await this.executeUpdate(query, [
      id, data.name, data.country, data.location || '', data.length, data.laps, now, now
    ]);
    
    await this.addTrackToSeason(seasonId, id);
    const track = await this.getTrackById(id);
    if (!track) throw new Error('Failed to create track');
    return track;
  }

  async createRaceAndAddToSeason(seasonId: string, data: RaceData): Promise<string> {
    const raceId = await this.createRace(data);
    await this.addRaceToSeason(seasonId, raceId);
    return raceId;
  }

  // Driver mapping operations
  async getDriverMappings(seasonId: string): Promise<DriverMapping[]> {
    const query = 'SELECT * FROM f123_driver_mappings WHERE seasonId = ? ORDER BY f123_driver_name';
    return await this.executeQuery(query, [seasonId]);
  }

  async createDriverMapping(data: DriverMappingData): Promise<DriverMapping> {
    const id = this.generateId();
    const now = new Date().toISOString();
    
    const query = `
      INSERT INTO f123_driver_mappings (id, seasonId, f123_driver_name, f123_driver_number, yourDriverId, startDate, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    await this.executeUpdate(query, [
      id, data.seasonId, data.f123_driver_name, data.f123_driver_number || null,
      data.yourDriverId, now, now
    ]);
    
    return await this.executeQuerySingle('SELECT * FROM f123_driver_mappings WHERE id = ?', [id]);
  }

  // Session import operations
  async importRaceResults(raceId: string, sessionData: any): Promise<{ resultsCount: number; lapTimesCount: number }> {
    let resultsCount = 0;
    let lapTimesCount = 0;
    
    for (const result of sessionData.results) {
      if (!result.yourDriverId) continue; // Skip unmapped drivers
      
      const id = this.generateId();
      const now = new Date().toISOString();
      
      const query = `
        INSERT INTO f123_session_results (id, raceId, driverId, position, lapTime, sector1Time, sector2Time, sector3Time, fastestLap, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      await this.executeUpdate(query, [
        id, raceId, result.yourDriverId, result.position, result.lapTime,
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