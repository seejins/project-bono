import sqlite3 from 'sqlite3';

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
  updatedAt: string;
}

export interface DriverData {
  name: string;
  team: string;
  number: number;
  seasonId?: string; // Optional for backward compatibility
}

export interface SeasonData {
  name: string;
  year: number;
  startDate?: string | Date;
  endDate?: string | Date;
  status: 'active' | 'completed' | 'upcoming';
  pointsSystem?: string;
  fastestLapPoint?: boolean;
  isActive?: boolean;
}

export interface RaceData {
  seasonId: string;
  trackId: string;
  raceDate: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

export interface DriverMappingData {
  seasonId: string;
  f123_driver_name: string; // Using snake_case to match route expectations
  f123_driver_number?: number;
  yourDriverId: string;
}

export class DatabaseService {
  private db: sqlite3.Database;
  private initialized: boolean = false;

  constructor() {
    this.db = new sqlite3.Database(':memory:'); // Using in-memory database for simplicity
    this.initializeTables();
  }

  private async initializeTables(): Promise<void> {
    return new Promise((resolve, reject) => {
      const tables = [
        // Create telemetry table
        `CREATE TABLE IF NOT EXISTS telemetry (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          speed REAL,
          throttle REAL,
          brake REAL,
          steering REAL,
          gear INTEGER,
          engineRPM INTEGER,
          engineTemperature REAL,
          fuelLevel REAL,
          lapNumber INTEGER,
          carPosition INTEGER,
          sessionType TEXT
        )`,
        
        // Create strategy table
        `CREATE TABLE IF NOT EXISTS strategy (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          recommendedPitStop BOOLEAN,
          pitStopLap INTEGER,
          tireCompound TEXT,
          fuelToAdd REAL,
          strategy TEXT,
          reasoning TEXT,
          confidence REAL
        )`,
        
        // Create alerts table
        `CREATE TABLE IF NOT EXISTS alerts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          type TEXT,
          message TEXT,
          severity TEXT
        )`,
        
        // Create drivers table
        `CREATE TABLE IF NOT EXISTS drivers (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          team TEXT NOT NULL,
          number INTEGER NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // Create seasons table
        `CREATE TABLE IF NOT EXISTS seasons (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          year INTEGER NOT NULL,
          startDate DATETIME,
          endDate DATETIME,
          status TEXT DEFAULT 'upcoming',
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // Create tracks table
        `CREATE TABLE IF NOT EXISTS tracks (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          country TEXT NOT NULL,
          location TEXT NOT NULL,
          length REAL NOT NULL,
          laps INTEGER NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // Create races table
        `CREATE TABLE IF NOT EXISTS races (
          id TEXT PRIMARY KEY,
          seasonId TEXT NOT NULL,
          trackId TEXT NOT NULL,
          raceDate DATETIME NOT NULL,
          status TEXT DEFAULT 'scheduled',
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (seasonId) REFERENCES seasons (id),
          FOREIGN KEY (trackId) REFERENCES tracks (id)
        )`,
        
        // Create season_drivers junction table
        `CREATE TABLE IF NOT EXISTS season_drivers (
          seasonId TEXT NOT NULL,
          driverId TEXT NOT NULL,
          PRIMARY KEY (seasonId, driverId),
          FOREIGN KEY (seasonId) REFERENCES seasons (id),
          FOREIGN KEY (driverId) REFERENCES drivers (id)
        )`,
        
        // Create season_tracks junction table
        `CREATE TABLE IF NOT EXISTS season_tracks (
          seasonId TEXT NOT NULL,
          trackId TEXT NOT NULL,
          PRIMARY KEY (seasonId, trackId),
          FOREIGN KEY (seasonId) REFERENCES seasons (id),
          FOREIGN KEY (trackId) REFERENCES tracks (id)
        )`,
        
        // Create driver mappings table
        `CREATE TABLE IF NOT EXISTS f123_driver_mappings (
          id TEXT PRIMARY KEY,
          seasonId TEXT NOT NULL,
          f123_driver_name TEXT NOT NULL,
          f123_driver_number INTEGER,
          yourDriverId TEXT NOT NULL,
          startDate DATETIME DEFAULT CURRENT_TIMESTAMP,
          endDate DATETIME,
          isActive BOOLEAN DEFAULT true,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (seasonId) REFERENCES seasons (id),
          FOREIGN KEY (yourDriverId) REFERENCES drivers (id)
        )`,
        
        // Create F1 23 session results table
        `CREATE TABLE IF NOT EXISTS f123_session_results (
          id TEXT PRIMARY KEY,
          raceId TEXT NOT NULL,
          driverId TEXT NOT NULL,
          position INTEGER NOT NULL,
          lapTime REAL,
          sector1Time REAL,
          sector2Time REAL,
          sector3Time REAL,
          fastestLap BOOLEAN DEFAULT false,
          status TEXT DEFAULT 'running',
          gridPosition INTEGER,
          pitStops INTEGER DEFAULT 0,
          tireCompound TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (raceId) REFERENCES races (id),
          FOREIGN KEY (driverId) REFERENCES drivers (id)
        )`,
        
        // Create F1 23 telemetry data table
        `CREATE TABLE IF NOT EXISTS f123_telemetry_data (
          id TEXT PRIMARY KEY,
          sessionId TEXT NOT NULL,
          driverId TEXT NOT NULL,
          lapNumber INTEGER NOT NULL,
          position INTEGER,
          gap REAL,
          sector1Time REAL,
          sector2Time REAL,
          sector3Time REAL,
          lapTime REAL,
          tireCompound TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (driverId) REFERENCES drivers (id)
        )`,
        
        // Create session file uploads table
        `CREATE TABLE IF NOT EXISTS session_file_uploads (
          id TEXT PRIMARY KEY,
          filename TEXT NOT NULL,
          originalName TEXT NOT NULL,
          fileSize INTEGER NOT NULL,
          uploadDate DATETIME DEFAULT CURRENT_TIMESTAMP,
          processed BOOLEAN DEFAULT false,
          raceId TEXT,
          FOREIGN KEY (raceId) REFERENCES races (id)
        )`
      ];

      let completed = 0;
      const total = tables.length;

      tables.forEach(sql => {
        this.db.run(sql, (err) => {
          if (err) {
            console.error('Error creating table:', err);
            reject(err);
            return;
          }
          completed++;
          if (completed === total) {
            this.initialized = true;
            resolve();
          }
        });
      });
    });
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initializeTables();
    }
  }

  // Utility method to generate UUID
  private generateId(): string {
    return 'id_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  // Utility method to run queries with promises
  private runQuery(sql: string, params: any[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private getQuery(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  private allQuery(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // Driver Management Methods
  async getDriversBySeason(seasonId: string): Promise<Driver[]> {
    const sql = `
      SELECT d.* FROM drivers d
      INNER JOIN season_drivers sd ON d.id = sd.driverId
      WHERE sd.seasonId = ?
      ORDER BY d.name
    `;
    return this.allQuery(sql, [seasonId]);
  }

  async createDriver(driver: DriverData): Promise<Driver> {
    const id = this.generateId();
    const now = new Date().toISOString();
    const newDriver: Driver = {
      id,
      ...driver,
      createdAt: now,
      updatedAt: now
    };

    const sql = `
      INSERT INTO drivers (id, name, team, number, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    await this.runQuery(sql, [id, driver.name, driver.team, driver.number, now, now]);
    return newDriver;
  }

  async updateDriver(driverId: string, updates: Partial<DriverData>): Promise<Driver> {
    const now = new Date().toISOString();
    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    
    const sql = `
      UPDATE drivers 
      SET ${setClause}, updatedAt = ?
      WHERE id = ?
    `;
    
    await this.runQuery(sql, [...values, now, driverId]);
    
    const updatedDriver = await this.getQuery('SELECT * FROM drivers WHERE id = ?', [driverId]);
    return updatedDriver;
  }

  async deleteDriver(driverId: string): Promise<void> {
    await this.runQuery('DELETE FROM drivers WHERE id = ?', [driverId]);
  }

  // Season Management Methods
  async getAllSeasons(): Promise<Season[]> {
    return this.allQuery('SELECT * FROM seasons ORDER BY year DESC, name');
  }

  async getSeasonById(seasonId: string): Promise<Season | null> {
    return this.getQuery('SELECT * FROM seasons WHERE id = ?', [seasonId]);
  }

  async createSeason(season: SeasonData): Promise<Season> {
    const id = this.generateId();
    const now = new Date().toISOString();
    
    // Convert Date objects to ISO strings
    const startDate = season.startDate ? 
      (season.startDate instanceof Date ? season.startDate.toISOString() : season.startDate) : 
      undefined;
    const endDate = season.endDate ? 
      (season.endDate instanceof Date ? season.endDate.toISOString() : season.endDate) : 
      undefined;
    
    const newSeason: Season = {
      id,
      name: season.name,
      year: season.year,
      startDate,
      endDate,
      status: season.status,
      createdAt: now,
      updatedAt: now
    };

    const sql = `
      INSERT INTO seasons (id, name, year, startDate, endDate, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await this.runQuery(sql, [
      id, season.name, season.year, startDate, endDate, 
      season.status, now, now
    ]);
    return newSeason;
  }

  async updateSeason(seasonId: string, updates: Partial<SeasonData>): Promise<Season> {
    const now = new Date().toISOString();
    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    
    const sql = `
      UPDATE seasons 
      SET ${setClause}, updatedAt = ?
      WHERE id = ?
    `;
    
    await this.runQuery(sql, [...values, now, seasonId]);
    
    const updatedSeason = await this.getQuery('SELECT * FROM seasons WHERE id = ?', [seasonId]);
    return updatedSeason;
  }

  async deleteSeason(seasonId: string): Promise<void> {
    await this.runQuery('DELETE FROM seasons WHERE id = ?', [seasonId]);
  }

  async addDriverToSeason(seasonId: string, driverId: string): Promise<void> {
    const sql = 'INSERT INTO season_drivers (seasonId, driverId) VALUES (?, ?)';
    await this.runQuery(sql, [seasonId, driverId]);
  }

  async createDriverAndAddToSeason(seasonId: string, driverData: DriverData): Promise<Driver> {
    // First create the driver
    const driver = await this.createDriver(driverData);
    // Then add to season
    await this.addDriverToSeason(seasonId, driver.id);
    return driver;
  }

  async removeDriverFromSeason(seasonId: string, driverId: string): Promise<void> {
    const sql = 'DELETE FROM season_drivers WHERE seasonId = ? AND driverId = ?';
    await this.runQuery(sql, [seasonId, driverId]);
  }

  async getTracksBySeason(seasonId: string): Promise<Track[]> {
    const sql = `
      SELECT t.* FROM tracks t
      INNER JOIN season_tracks st ON t.id = st.trackId
      WHERE st.seasonId = ?
      ORDER BY t.name
    `;
    return this.allQuery(sql, [seasonId]);
  }

  async addTrackToSeason(seasonId: string, trackId: string): Promise<void> {
    const sql = 'INSERT INTO season_tracks (seasonId, trackId) VALUES (?, ?)';
    await this.runQuery(sql, [seasonId, trackId]);
  }

  async createTrackAndAddToSeason(seasonId: string, trackData: any): Promise<Track> {
    // First create the track
    const track = await this.findOrCreateTrack(trackData.name);
    // Then add to season
    await this.addTrackToSeason(seasonId, track.id);
    return track;
  }

  async removeTrackFromSeason(seasonId: string, trackId: string): Promise<void> {
    const sql = 'DELETE FROM season_tracks WHERE seasonId = ? AND trackId = ?';
    await this.runQuery(sql, [seasonId, trackId]);
  }

  async getRacesBySeason(seasonId: string): Promise<Race[]> {
    const sql = `
      SELECT r.*, t.name as trackName FROM races r
      INNER JOIN tracks t ON r.trackId = t.id
      WHERE r.seasonId = ?
      ORDER BY r.raceDate
    `;
    return this.allQuery(sql, [seasonId]);
  }

  async addRaceToSeason(seasonId: string, raceId: string): Promise<void> {
    // This method assumes the race already exists and we're just linking it
    const sql = 'UPDATE races SET seasonId = ? WHERE id = ?';
    await this.runQuery(sql, [seasonId, raceId]);
  }

  async createRaceAndAddToSeason(seasonId: string, raceData: any): Promise<string> {
    // First create the race
    const raceId = await this.createRace({
      seasonId,
      trackId: raceData.trackId,
      raceDate: raceData.date instanceof Date ? raceData.date.toISOString() : raceData.date,
      status: raceData.status || 'scheduled'
    });
    return raceId;
  }

  async removeRaceFromSeason(seasonId: string, raceId: string): Promise<void> {
    const sql = 'DELETE FROM races WHERE id = ? AND seasonId = ?';
    await this.runQuery(sql, [raceId, seasonId]);
  }

  // Track and Race Methods
  async findOrCreateTrack(trackName: string): Promise<Track> {
    // First try to find existing track
    const existingTrack = await this.getQuery('SELECT * FROM tracks WHERE name = ?', [trackName]);
    if (existingTrack) {
      return existingTrack;
    }

    // Create new track with default values
    const id = this.generateId();
    const now = new Date().toISOString();
    const newTrack: Track = {
      id,
      name: trackName,
      country: 'Unknown',
      location: 'Unknown',
      length: 0,
      laps: 0,
      createdAt: now,
      updatedAt: now
    };

    const sql = `
      INSERT INTO tracks (id, name, country, location, length, laps, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await this.runQuery(sql, [id, trackName, 'Unknown', 'Unknown', 0, 0, now, now]);
    return newTrack;
  }

  async createRace(race: RaceData): Promise<string> {
    const id = this.generateId();
    const now = new Date().toISOString();

    const sql = `
      INSERT INTO races (id, seasonId, trackId, raceDate, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    await this.runQuery(sql, [
      id, race.seasonId, race.trackId, race.raceDate, 
      race.status, now, now
    ]);
    return id;
  }

  // Driver Mapping Methods
  async getDriverMappings(seasonId: string): Promise<DriverMapping[]> {
    const sql = `
      SELECT dm.*, d.name as driverName FROM f123_driver_mappings dm
      INNER JOIN drivers d ON dm.yourDriverId = d.id
      WHERE dm.seasonId = ? AND dm.isActive = true
      ORDER BY dm.f123_driver_name
    `;
    return this.allQuery(sql, [seasonId]);
  }

  async createDriverMapping(mapping: DriverMappingData): Promise<DriverMapping> {
    const id = this.generateId();
    const now = new Date().toISOString();
    const newMapping: DriverMapping = {
      id,
      ...mapping,
      startDate: now,
      isActive: true,
      createdAt: now,
      updatedAt: now
    };

    const sql = `
      INSERT INTO f123_driver_mappings (
        id, seasonId, f123_driver_name, f123_driver_number, yourDriverId, 
        startDate, isActive, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await this.runQuery(sql, [
      id, mapping.seasonId, mapping.f123_driver_name, mapping.f123_driver_number,
      mapping.yourDriverId, now, true, now, now
    ]);
    return newMapping;
  }

  // Session Import Methods
  async importRaceResults(raceId: string, sessionData: any): Promise<{resultsCount: number, lapTimesCount: number}> {
    let resultsCount = 0;
    let lapTimesCount = 0;

    // Import session results
    for (const result of sessionData.results) {
      const resultId = this.generateId();
      const sql = `
        INSERT INTO f123_session_results (
          id, raceId, driverId, position, lapTime, sector1Time, sector2Time, sector3Time,
          fastestLap, status, gridPosition, pitStops, tireCompound
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      await this.runQuery(sql, [
        resultId, raceId, result.yourDriverId || result.driverId, result.position,
        result.lapTime, result.sector1Time, result.sector2Time, result.sector3Time,
        result.fastestLap || false, result.status || 'running',
        result.gridPosition || result.position, result.pitStops || 0,
        result.tireCompound || 'unknown'
      ]);
      resultsCount++;
    }

    // Import lap times if available
    if (sessionData.lapTimes) {
      for (const lapTime of sessionData.lapTimes) {
        const lapId = this.generateId();
        const sql = `
          INSERT INTO f123_telemetry_data (
            id, sessionId, driverId, lapNumber, position, gap,
            sector1Time, sector2Time, sector3Time, lapTime, tireCompound
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        await this.runQuery(sql, [
          lapId, raceId, lapTime.driverId, lapTime.lapNumber,
          lapTime.position, lapTime.gap, lapTime.sector1Time,
          lapTime.sector2Time, lapTime.sector3Time, lapTime.lapTime,
          lapTime.tireCompound || 'unknown'
        ]);
        lapTimesCount++;
      }
    }

    return { resultsCount, lapTimesCount };
  }

  // Original telemetry methods (keeping for compatibility)
  public saveTelemetry(data: any): void {
    const stmt = this.db.prepare(`
      INSERT INTO telemetry (
        speed, throttle, brake, steering, gear, engineRPM, 
        engineTemperature, fuelLevel, lapNumber, carPosition, sessionType
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      data.speed,
      data.throttle,
      data.brake,
      data.steering,
      data.gear,
      data.engineRPM,
      data.engineTemperature,
      data.fuelLevel,
      data.lapNumber,
      data.carPosition,
      data.sessionType
    );

    stmt.finalize();
  }

  public saveStrategy(strategy: any): void {
    const stmt = this.db.prepare(`
      INSERT INTO strategy (
        recommendedPitStop, pitStopLap, tireCompound, 
        fuelToAdd, strategy, reasoning, confidence
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      strategy.recommendedPitStop,
      strategy.pitStopLap,
      strategy.tireCompound,
      strategy.fuelToAdd,
      strategy.strategy,
      strategy.reasoning,
      strategy.confidence
    );

    stmt.finalize();
  }

  public saveAlert(alert: any): void {
    const stmt = this.db.prepare(`
      INSERT INTO alerts (type, message, severity) VALUES (?, ?, ?)
    `);

    stmt.run(alert.type, alert.message, alert.severity || 'medium');
    stmt.finalize();
  }

  public getTelemetryHistory(limit: number = 100): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM telemetry ORDER BY timestamp DESC LIMIT ?`,
        [limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  public getStrategyHistory(limit: number = 50): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM strategy ORDER BY timestamp DESC LIMIT ?`,
        [limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  public getAlerts(limit: number = 20): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM alerts ORDER BY timestamp DESC LIMIT ?`,
        [limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  public close(): void {
    this.db.close();
  }
}