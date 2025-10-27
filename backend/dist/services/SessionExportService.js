"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionExportService = void 0;
const DatabaseService_1 = require("./DatabaseService");
class SessionExportService {
    constructor() {
        this.dbService = new DatabaseService_1.DatabaseService();
    }
    /**
     * Export session data when a session ends
     */
    async exportSessionData(sessionData) {
        try {
            console.log(`Exporting ${sessionData.sessionTypeName} session data...`);
            // Create or update race record
            const raceId = await this.createOrUpdateRace(sessionData);
            // Process driver results
            const sessionResults = this.processDriverResults(sessionData.drivers);
            // Calculate gaps to pole
            const poleTime = this.findPoleTime(sessionResults);
            if (poleTime) {
                sessionResults.forEach(driver => {
                    driver.gapToPole = driver.bestLapTime - poleTime;
                });
            }
            // Save session results to database
            await this.saveSessionResults(raceId, sessionResults, sessionData.sessionType);
            // Save telemetry data
            await this.saveTelemetryData(raceId, sessionData.drivers, sessionData.sessionType);
            console.log('Session data exported successfully');
        }
        catch (error) {
            console.error('Error exporting session data:', error);
            throw error;
        }
    }
    /**
     * Create or update race record
     */
    async createOrUpdateRace(sessionData) {
        // For now, we'll create a new race record for each session
        // In a real implementation, you might want to group sessions by race weekend
        const raceData = {
            trackName: sessionData.trackName,
            raceDate: sessionData.sessionEndTime.toISOString().split('T')[0],
            sessionType: sessionData.sessionType,
            sessionDuration: sessionData.sessionStartTime
                ? Math.floor((sessionData.sessionEndTime.getTime() - sessionData.sessionStartTime.getTime()) / 1000)
                : 0,
            weatherAirTemp: sessionData.drivers[0]?.airTemperature || 0,
            weatherTrackTemp: sessionData.drivers[0]?.trackTemperature || 0,
            weatherRainPercentage: sessionData.drivers[0]?.rainPercentage || 0,
            status: 'completed'
        };
        // TODO: Implement createRace method in DatabaseService
        // For now, return a mock race ID
        return 'race-' + Date.now();
    }
    /**
     * Process driver results from telemetry data
     */
    processDriverResults(drivers) {
        return drivers.map(driver => ({
            driverId: driver.driverName.toLowerCase().replace(/\s+/g, '-'), // Convert name to ID
            driverName: driver.driverName,
            teamName: driver.teamName,
            carNumber: driver.carNumber,
            position: driver.carPosition,
            lapTime: driver.lapTime,
            sector1Time: driver.sector1Time,
            sector2Time: driver.sector2Time,
            sector3Time: driver.sector3Time,
            bestLapTime: driver.bestLapTime,
            gapToPole: 0, // Will be calculated later
            penalties: driver.penalties,
            warnings: driver.warnings,
            dnfReason: driver.penalties > 0 ? 'Penalty' : undefined,
            dataSource: 'UDP'
        }));
    }
    /**
     * Find pole position time
     */
    findPoleTime(results) {
        const validTimes = results
            .map(r => r.bestLapTime)
            .filter(time => time > 0);
        return validTimes.length > 0 ? Math.min(...validTimes) : null;
    }
    /**
     * Save session results to database
     */
    async saveSessionResults(raceId, results, sessionType) {
        // TODO: Implement saveSessionResults method in DatabaseService
        console.log(`Saving ${results.length} driver results for session type ${sessionType}`);
        for (const result of results) {
            console.log(`Driver: ${result.driverName}, Position: ${result.position}, Time: ${result.lapTime}ms`);
        }
    }
    /**
     * Save telemetry data to database
     */
    async saveTelemetryData(raceId, drivers, sessionType) {
        // TODO: Implement saveTelemetryData method in DatabaseService
        console.log(`Saving telemetry data for ${drivers.length} drivers`);
    }
    /**
     * Import session data from uploaded file
     */
    async importSessionFile(raceId, filename, fileContent, fileType) {
        try {
            console.log(`Importing session file: ${filename}`);
            // Parse file content based on type
            let sessionData;
            switch (fileType) {
                case 'JSON':
                    sessionData = JSON.parse(fileContent);
                    break;
                case 'CSV':
                    sessionData = this.parseCSV(fileContent);
                    break;
                case 'TXT':
                    sessionData = this.parseTXT(fileContent);
                    break;
                default:
                    throw new Error(`Unsupported file type: ${fileType}`);
            }
            // Process and save the data
            await this.processImportedData(raceId, sessionData);
            console.log('Session file imported successfully');
        }
        catch (error) {
            console.error('Error importing session file:', error);
            throw error;
        }
    }
    /**
     * Parse CSV file content
     */
    parseCSV(content) {
        const lines = content.split('\n');
        const headers = lines[0].split(',');
        const data = [];
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
                const values = lines[i].split(',');
                const row = {};
                headers.forEach((header, index) => {
                    row[header.trim()] = values[index]?.trim();
                });
                data.push(row);
            }
        }
        return data;
    }
    /**
     * Parse TXT file content
     */
    parseTXT(content) {
        // Simple text parsing - this would need to be customized based on F1 23 export format
        const lines = content.split('\n');
        const data = [];
        for (const line of lines) {
            if (line.trim()) {
                // Parse line format (this is a placeholder)
                const parts = line.split(/\s+/);
                if (parts.length >= 3) {
                    data.push({
                        position: parts[0],
                        driver: parts[1],
                        time: parts[2]
                    });
                }
            }
        }
        return data;
    }
    /**
     * Process imported data
     */
    async processImportedData(raceId, data) {
        // TODO: Implement data processing logic
        console.log(`Processing imported data for race ${raceId}:`, data);
    }
    /**
     * Get session statistics
     */
    async getSessionStatistics(raceId) {
        // TODO: Implement session statistics
        return {
            totalDrivers: 0,
            averageLapTime: 0,
            fastestLap: 0,
            slowestLap: 0,
            totalPenalties: 0
        };
    }
}
exports.SessionExportService = SessionExportService;
//# sourceMappingURL=SessionExportService.js.map