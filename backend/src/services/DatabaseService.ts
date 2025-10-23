import sqlite3 from 'sqlite3';

export class DatabaseService {
  private db: sqlite3.Database;

  constructor() {
    this.db = new sqlite3.Database(':memory:'); // Using in-memory database for simplicity
    this.initializeTables();
  }

  private initializeTables(): void {
    // Create telemetry table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS telemetry (
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
      )
    `);

    // Create strategy table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS strategy (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        recommendedPitStop BOOLEAN,
        pitStopLap INTEGER,
        tireCompound TEXT,
        fuelToAdd REAL,
        strategy TEXT,
        reasoning TEXT,
        confidence REAL
      )
    `);

    // Create alerts table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        type TEXT,
        message TEXT,
        severity TEXT
      )
    `);
  }

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
