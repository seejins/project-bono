"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RaceJSONImportService = void 0;
const RaceResultsProcessor_1 = require("./RaceResultsProcessor");
const F123JSONParser_1 = require("./F123JSONParser");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class RaceJSONImportService {
    constructor(dbService, io) {
        this.dbService = dbService;
        this.io = io;
        this.raceResultsProcessor = new RaceResultsProcessor_1.RaceResultsProcessor(dbService, io);
        console.log('🔄 RaceJSONImportService initialized');
    }
    /**
     * Import race JSON file
     */
    async importRaceJSON(filePath, seasonId, raceId) {
        try {
            console.log(`📂 Importing race JSON from: ${filePath}`);
            // 1. Parse JSON file
            const parsedData = F123JSONParser_1.F123JSONParser.parseSessionFile(filePath);
            console.log(`✅ Parsed JSON: ${parsedData.driverResults.length} drivers, session type: ${parsedData.sessionInfo.sessionTypeName}`);
            // 2. Transform to database format
            const transformedData = this.transformToDatabaseFormat(parsedData, seasonId);
            // 3. Process session results
            const result = await this.raceResultsProcessor.processSessionResults(transformedData.sessionInfo, transformedData.driverResults, raceId);
            console.log(`✅ Successfully imported ${transformedData.driverResults.length} driver results`);
            return {
                raceId: result.raceId,
                sessionResultId: result.sessionResultId,
                importedCount: transformedData.driverResults.length
            };
        }
        catch (error) {
            console.error('❌ Error importing race JSON:', error);
            throw error;
        }
    }
    /**
     * Transform parsed data to database format
     */
    transformToDatabaseFormat(parsedData, seasonId) {
        // Transform session info
        const sessionInfo = {
            ...parsedData.sessionInfo,
            seasonId,
            sessionUID: parsedData.sessionInfo.sessionUID ? Number(parsedData.sessionInfo.sessionUID) : null
        };
        // Transform driver results to match what storeDriverSessionResults expects
        const driverResults = parsedData.driverResults.map(result => ({
            position: result.position,
            grid_position: result.gridPosition,
            points: result.points,
            num_laps: result.numLaps,
            best_lap_time_ms: result.bestLapTimeMs,
            sector1_time_ms: result.sector1TimeMs,
            sector2_time_ms: result.sector2TimeMs,
            sector3_time_ms: result.sector3TimeMs,
            total_race_time_ms: result.totalRaceTimeMs,
            penalties: result.penalties,
            warnings: result.warnings,
            num_unserved_drive_through_pens: result.numUnservedDriveThroughPens,
            num_unserved_stop_go_pens: result.numUnservedStopGoPens,
            result_status: result.resultStatus,
            dnf_reason: result.dnfReason,
            fastest_lap: result.fastestLap,
            pole_position: result.polePosition,
            // Driver mapping fields (will be populated by mapDriversToLeague)
            driverName: result.driverName,
            carNumber: result.carNumber,
            teamName: result.teamName,
            networkId: result.networkId,
            steamId: result.steamId,
            driver_id: null, // Will be set if driver exists
            member_id: null // Will be set by mapping
        }));
        return {
            sessionInfo,
            driverResults
        };
    }
    /**
     * Import multiple JSON files (for batch processing)
     */
    async importMultipleJSONFiles(filePaths, seasonId) {
        const results = [];
        for (const filePath of filePaths) {
            try {
                const result = await this.importRaceJSON(filePath, seasonId);
                results.push({
                    file: path_1.default.basename(filePath),
                    success: true,
                    raceId: result.raceId
                });
            }
            catch (error) {
                results.push({
                    file: path_1.default.basename(filePath),
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
        return results;
    }
    /**
     * Validate JSON file before import
     */
    async validateJSONFile(filePath) {
        const errors = [];
        try {
            if (!fs_1.default.existsSync(filePath)) {
                errors.push('File does not exist');
                return { valid: false, errors };
            }
            const parsedData = F123JSONParser_1.F123JSONParser.parseSessionFile(filePath);
            // Validate session info
            if (!parsedData.sessionInfo.trackName || parsedData.sessionInfo.trackName === 'Unknown') {
                errors.push('Track name is missing or invalid');
            }
            if (!parsedData.sessionInfo.sessionType || parsedData.sessionInfo.sessionType === 0) {
                errors.push('Session type is missing or invalid');
            }
            // Validate driver results
            if (!parsedData.driverResults || parsedData.driverResults.length === 0) {
                errors.push('No driver results found');
            }
            // Check for duplicate positions
            const positions = parsedData.driverResults.map(r => r.position);
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
                valid: errors.length === 0,
                errors
            };
        }
        catch (error) {
            errors.push(`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return { valid: false, errors };
        }
    }
}
exports.RaceJSONImportService = RaceJSONImportService;
//# sourceMappingURL=RaceJSONImportService.js.map