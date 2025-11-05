"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.F123Parser = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class F123Parser {
    /**
     * Parse F1 23 session file and extract race data
     */
    static parseSessionFile(filePath) {
        try {
            const fileContent = fs_1.default.readFileSync(filePath, 'utf-8');
            const fileExtension = path_1.default.extname(filePath).toLowerCase();
            if (fileExtension === '.json') {
                return this.parseJSONFile(fileContent);
            }
            else if (fileExtension === '.csv') {
                return this.parseCSVFile(fileContent);
            }
            else {
                throw new Error(`Unsupported file format: ${fileExtension}`);
            }
        }
        catch (error) {
            throw new Error(`Failed to parse F1 23 session file: ${error}`);
        }
    }
    /**
     * Parse JSON format F1 23 session file
     */
    static parseJSONFile(content) {
        const data = JSON.parse(content);
        // Extract session information
        const sessionType = this.detectSessionType(data);
        const trackName = data.trackName || data.track || 'Unknown Track';
        const date = data.date || data.sessionDate || new Date().toISOString();
        // Extract driver data
        const drivers = [];
        const results = [];
        if (data.drivers && Array.isArray(data.drivers)) {
            for (const driver of data.drivers) {
                const driverData = {
                    name: driver.name || driver.driverName || 'Unknown Driver',
                    number: driver.number || driver.driverNumber || 0,
                    team: driver.team || 'Unknown Team',
                    position: driver.position || 0,
                    points: driver.points || 0,
                    fastestLap: driver.fastestLap || false,
                    polePosition: driver.polePosition || false,
                    dnf: driver.dnf || false,
                    dnfReason: driver.dnfReason,
                    raceTime: driver.raceTime,
                    gapToLeader: driver.gapToLeader,
                    lapTimes: this.extractLapTimes(driver.lapTimes || [])
                };
                drivers.push(driverData);
                // Create race result
                results.push({
                    driverName: driverData.name,
                    driverNumber: driverData.number,
                    position: driverData.position,
                    points: driverData.points,
                    fastestLap: driverData.fastestLap,
                    polePosition: driverData.polePosition,
                    dnf: driverData.dnf,
                    dnfReason: driverData.dnfReason,
                    raceTime: driverData.raceTime,
                    gapToLeader: driverData.gapToLeader
                });
            }
        }
        return {
            sessionType,
            trackName,
            date,
            drivers,
            results
        };
    }
    /**
     * Parse CSV format F1 23 session file
     */
    static parseCSVFile(content) {
        const lines = content.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        // Find column indices
        const nameIndex = headers.findIndex(h => h.toLowerCase().includes('name') || h.toLowerCase().includes('driver'));
        const positionIndex = headers.findIndex(h => h.toLowerCase().includes('position') || h.toLowerCase().includes('pos'));
        const pointsIndex = headers.findIndex(h => h.toLowerCase().includes('points'));
        const fastestLapIndex = headers.findIndex(h => h.toLowerCase().includes('fastest') || h.toLowerCase().includes('fl'));
        const poleIndex = headers.findIndex(h => h.toLowerCase().includes('pole'));
        const dnfIndex = headers.findIndex(h => h.toLowerCase().includes('dnf'));
        const drivers = [];
        const results = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line)
                continue;
            const values = line.split(',').map(v => v.trim());
            const driverData = {
                name: values[nameIndex] || 'Unknown Driver',
                number: parseInt(values[1]) || 0,
                team: values[2] || 'Unknown Team',
                position: parseInt(values[positionIndex]) || 0,
                points: parseInt(values[pointsIndex]) || 0,
                fastestLap: values[fastestLapIndex]?.toLowerCase() === 'true' || false,
                polePosition: values[poleIndex]?.toLowerCase() === 'true' || false,
                dnf: values[dnfIndex]?.toLowerCase() === 'true' || false,
                dnfReason: values[dnfIndex + 1] || undefined,
                lapTimes: [] // CSV format typically doesn't include lap times
            };
            drivers.push(driverData);
            results.push({
                driverName: driverData.name,
                driverNumber: driverData.number,
                position: driverData.position,
                points: driverData.points,
                fastestLap: driverData.fastestLap,
                polePosition: driverData.polePosition,
                dnf: driverData.dnf,
                dnfReason: driverData.dnfReason
            });
        }
        return {
            sessionType: 'race', // Default for CSV
            trackName: 'Unknown Track',
            date: new Date().toISOString(),
            drivers,
            results
        };
    }
    /**
     * Detect session type from F1 23 data
     */
    static detectSessionType(data) {
        const sessionType = data.sessionType || data.session || 'race';
        switch (sessionType.toLowerCase()) {
            case 'practice':
            case 'fp1':
            case 'fp2':
            case 'fp3':
                return 'practice';
            case 'qualifying':
            case 'qual':
            case 'q1':
            case 'q2':
            case 'q3':
                return 'qualifying';
            case 'sprint':
            case 'sprint_qualifying':
                return 'sprint';
            case 'race':
            default:
                return 'race';
        }
    }
    /**
     * Extract lap times from F1 23 data
     */
    static extractLapTimes(lapTimesData) {
        if (!Array.isArray(lapTimesData))
            return [];
        return lapTimesData.map(lap => ({
            lapNumber: lap.lapNumber || lap.lap || 0,
            lapTime: this.convertTimeToMs(lap.lapTime || lap.time || 0),
            sector1: this.convertTimeToMs(lap.sector1 || lap.s1 || 0),
            sector2: this.convertTimeToMs(lap.sector2 || lap.s2 || 0),
            sector3: this.convertTimeToMs(lap.sector3 || lap.s3 || 0),
            tireCompound: lap.tireCompound || lap.tire || 'unknown'
        }));
    }
    /**
     * Convert time string to milliseconds
     */
    static convertTimeToMs(time) {
        if (typeof time === 'number')
            return time;
        if (typeof time === 'string') {
            // Handle formats like "1:23.456" or "83.456"
            const parts = time.split(':');
            if (parts.length === 2) {
                const minutes = parseInt(parts[0]) * 60 * 1000;
                const seconds = parseFloat(parts[1]) * 1000;
                return minutes + seconds;
            }
            else {
                return parseFloat(time) * 1000;
            }
        }
        return 0;
    }
    /**
     * Validate parsed session data
     */
    static validateSessionData(data) {
        const errors = [];
        if (!data.trackName || data.trackName === 'Unknown Track') {
            errors.push('Track name is missing or invalid');
        }
        if (!data.drivers || data.drivers.length === 0) {
            errors.push('No driver data found');
        }
        if (!data.results || data.results.length === 0) {
            errors.push('No race results found');
        }
        // Check for duplicate positions
        const positions = data.results.map(r => r.position);
        const uniquePositions = new Set(positions);
        if (positions.length !== uniquePositions.size) {
            errors.push('Duplicate positions found in results');
        }
        // Check for missing positions
        const maxPosition = Math.max(...positions);
        for (let i = 1; i <= maxPosition; i++) {
            if (!positions.includes(i)) {
                errors.push(`Position ${i} is missing`);
            }
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
}
exports.F123Parser = F123Parser;
//# sourceMappingURL=F123Parser.js.map