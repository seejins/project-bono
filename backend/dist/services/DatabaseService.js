"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const sqlite3_1 = __importDefault(require("sqlite3"));
class DatabaseService {
    constructor() {
        this.db = new sqlite3_1.default.Database(':memory:'); // Using in-memory database for simplicity
        this.initializeTables();
    }
    initializeTables() {
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
    saveTelemetry(data) {
        const stmt = this.db.prepare(`
      INSERT INTO telemetry (
        speed, throttle, brake, steering, gear, engineRPM, 
        engineTemperature, fuelLevel, lapNumber, carPosition, sessionType
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(data.speed, data.throttle, data.brake, data.steering, data.gear, data.engineRPM, data.engineTemperature, data.fuelLevel, data.lapNumber, data.carPosition, data.sessionType);
        stmt.finalize();
    }
    saveStrategy(strategy) {
        const stmt = this.db.prepare(`
      INSERT INTO strategy (
        recommendedPitStop, pitStopLap, tireCompound, 
        fuelToAdd, strategy, reasoning, confidence
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(strategy.recommendedPitStop, strategy.pitStopLap, strategy.tireCompound, strategy.fuelToAdd, strategy.strategy, strategy.reasoning, strategy.confidence);
        stmt.finalize();
    }
    saveAlert(alert) {
        const stmt = this.db.prepare(`
      INSERT INTO alerts (type, message, severity) VALUES (?, ?, ?)
    `);
        stmt.run(alert.type, alert.message, alert.severity || 'medium');
        stmt.finalize();
    }
    getTelemetryHistory(limit = 100) {
        return new Promise((resolve, reject) => {
            this.db.all(`SELECT * FROM telemetry ORDER BY timestamp DESC LIMIT ?`, [limit], (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
        });
    }
    getStrategyHistory(limit = 50) {
        return new Promise((resolve, reject) => {
            this.db.all(`SELECT * FROM strategy ORDER BY timestamp DESC LIMIT ?`, [limit], (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
        });
    }
    getAlerts(limit = 20) {
        return new Promise((resolve, reject) => {
            this.db.all(`SELECT * FROM alerts ORDER BY timestamp DESC LIMIT ?`, [limit], (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
        });
    }
    close() {
        this.db.close();
    }
}
exports.DatabaseService = DatabaseService;
//# sourceMappingURL=DatabaseService.js.map