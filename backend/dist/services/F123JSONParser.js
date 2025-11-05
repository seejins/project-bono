"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.F123JSONParser = void 0;
const fs_1 = __importDefault(require("fs"));
class F123JSONParser {
    /**
     * Parse F1 23 JSON session file
     */
    static parseSessionFile(filePath) {
        try {
            const fileContent = fs_1.default.readFileSync(filePath, 'utf-8');
            const jsonData = JSON.parse(fileContent);
            return this.parseJSONData(jsonData);
        }
        catch (error) {
            throw new Error(`Failed to parse F1 23 JSON file: ${error}`);
        }
    }
    /**
     * Parse JSON data structure
     */
    static parseJSONData(data) {
        // Extract session info
        const sessionInfo = this.extractSessionInfo(data['session-info'] || data.sessionInfo || data);
        // Extract driver results from final classification
        const driverResults = this.extractDriverResults(data);
        // Extract lap history (optional)
        const lapHistory = this.extractLapHistory(data);
        return {
            sessionInfo,
            driverResults,
            lapHistory
        };
    }
    /**
     * Extract session metadata
     */
    static extractSessionInfo(sessionData) {
        const trackId = sessionData['track-id'] || sessionData.trackId || sessionData.track_id || 'Unknown';
        const trackName = this.mapTrackIdToName(trackId);
        const sessionTypeStr = sessionData['session-type'] || sessionData.sessionType || sessionData.session_type || 'Race';
        const sessionType = this.mapSessionTypeToNumber(sessionTypeStr);
        const sessionTypeName = sessionTypeStr;
        return {
            trackName,
            trackId: trackId.toString(),
            sessionType,
            sessionTypeName,
            airTemperature: sessionData['air-temperature'] || sessionData.airTemperature || sessionData.air_temperature || 22,
            trackTemperature: sessionData['track-temperature'] || sessionData.trackTemperature || sessionData.track_temperature || 30,
            rainPercentage: this.extractRainPercentage(sessionData),
            totalLaps: sessionData['total-laps'] || sessionData.totalLaps || sessionData.total_laps || 0,
            trackLength: sessionData['track-length'] || sessionData.trackLength || sessionData.track_length || 0,
            date: this.extractDate(sessionData),
            sessionUID: sessionData['session-uid'] || sessionData.sessionUid || sessionData.session_uid || null
        };
    }
    /**
     * Extract driver results from final classification
     */
    static extractDriverResults(data) {
        const participants = data.participants || [];
        const results = [];
        for (const participant of participants) {
            const participantData = participant['participant-data'] || participant.participantData || participant;
            const finalClassification = participant['final-classification'] || participant.finalClassification || participant.final_classification || {};
            const lapData = participant['lap-data'] || participant.lapData || participant.lap_data || {};
            // Extract best sector times from lap-time-history if available
            const lapTimeHistory = participant['lap-time-history'] || participant.lapTimeHistory || participant.lap_time_history || {};
            const bestLapData = this.extractBestLapData(lapTimeHistory, finalClassification);
            const resultStatus = this.mapResultStatus(finalClassification['result-status'] || finalClassification.resultStatus || finalClassification.result_status || 'FINISHED');
            results.push({
                driverName: participantData.name || participantData.driverName || participantData.driver_name || 'Unknown',
                carNumber: participantData['race-number'] || participantData.raceNumber || participantData.race_number || 0,
                teamName: participantData.team || participantData.teamName || participantData.team_name || 'Unknown',
                position: finalClassification.position || 0,
                gridPosition: finalClassification['grid-position'] || finalClassification.gridPosition || finalClassification.grid_position || 0,
                points: finalClassification.points || 0,
                numLaps: finalClassification['num-laps'] || finalClassification.numLaps || finalClassification.num_laps || 0,
                bestLapTimeMs: finalClassification['best-lap-time-ms'] || finalClassification.bestLapTimeMs || finalClassification.best_lap_time_ms || 0,
                sector1TimeMs: bestLapData.sector1TimeMs,
                sector2TimeMs: bestLapData.sector2TimeMs,
                sector3TimeMs: bestLapData.sector3TimeMs,
                totalRaceTimeMs: finalClassification['total-race-time'] ? Math.round(finalClassification['total-race-time'] * 1000) : undefined,
                penalties: lapData.penalties || finalClassification['num-penalties'] || finalClassification.numPenalties || 0,
                warnings: lapData['total-warnings'] || lapData.totalWarnings || lapData.total_warnings || 0,
                numUnservedDriveThroughPens: lapData['num-unserved-drive-through-pens'] || lapData.numUnservedDriveThroughPens || 0,
                numUnservedStopGoPens: lapData['num-unserved-stop-go-pens'] || lapData.numUnservedStopGoPens || 0,
                resultStatus,
                dnfReason: finalClassification['dnf-reason'] || finalClassification.dnfReason || finalClassification.dnf_reason || undefined,
                fastestLap: false, // Will be calculated later
                polePosition: finalClassification.position === 1 && (finalClassification['grid-position'] || finalClassification.gridPosition || 0) === 1,
                networkId: participantData['network-id'] || participantData.networkId || participantData.network_id,
                steamId: participantData['steam-id'] || participantData.steamId || participantData.steam_id
            });
        }
        // Mark fastest lap
        if (results.length > 0) {
            const fastestLapTime = Math.min(...results.map(r => r.bestLapTimeMs).filter(t => t > 0));
            results.forEach(r => {
                r.fastestLap = r.bestLapTimeMs === fastestLapTime && fastestLapTime > 0;
            });
        }
        return results.sort((a, b) => a.position - b.position);
    }
    /**
     * Extract best lap sector times from lap-time-history
     */
    static extractBestLapData(lapTimeHistory, finalClassification) {
        const bestLapNum = lapTimeHistory['best-lap-time-lap-num'] || lapTimeHistory.bestLapTimeLapNum || finalClassification['best-lap-time-lap-num'];
        if (!bestLapNum || !lapTimeHistory['lap-history-data']) {
            return {};
        }
        const lapHistoryData = lapTimeHistory['lap-history-data'] || lapTimeHistory.lapHistoryData || [];
        const bestLap = lapHistoryData.find((lap) => (lap['lap-number'] || lap.lapNumber || lap.lap_number) === bestLapNum);
        if (!bestLap) {
            return {};
        }
        return {
            sector1TimeMs: bestLap['sector-1-time-in-ms'] || bestLap.sector1TimeInMs || bestLap.sector1_time_in_ms,
            sector2TimeMs: bestLap['sector-2-time-in-ms'] || bestLap.sector2TimeInMs || bestLap.sector2_time_in_ms,
            sector3TimeMs: bestLap['sector-3-time-in-ms'] || bestLap.sector3TimeInMs || bestLap.sector3_time_in_ms
        };
    }
    /**
     * Extract lap history (optional)
     */
    static extractLapHistory(data) {
        const participants = data.participants || [];
        const lapHistory = [];
        for (const participant of participants) {
            const participantData = participant['participant-data'] || participant.participantData || participant;
            const lapTimeHistory = participant['lap-time-history'] || participant.lapTimeHistory || participant.lap_time_history || {};
            const lapHistoryData = lapTimeHistory['lap-history-data'] || lapTimeHistory.lapHistoryData || [];
            if (lapHistoryData.length === 0) {
                continue;
            }
            const laps = lapHistoryData.map((lap) => ({
                lapNumber: lap['lap-number'] || lap.lapNumber || lap.lap_number || 0,
                lapTimeMs: lap['lap-time-in-ms'] || lap.lapTimeInMs || lap.lap_time_in_ms || 0,
                sector1TimeMs: lap['sector-1-time-in-ms'] || lap.sector1TimeInMs || lap.sector1_time_in_ms || 0,
                sector2TimeMs: lap['sector-2-time-in-ms'] || lap.sector2TimeInMs || lap.sector2_time_in_ms || 0,
                sector3TimeMs: lap['sector-3-time-in-ms'] || lap.sector3TimeInMs || lap.sector3_time_in_ms || 0,
                valid: (lap['lap-valid-bit-flags'] || lap.lapValidBitFlags || lap.lap_valid_bit_flags || 0) === 15
            }));
            lapHistory.push({
                driverName: participantData.name || participantData.driverName || 'Unknown',
                carNumber: participantData['race-number'] || participantData.raceNumber || 0,
                laps
            });
        }
        return lapHistory.length > 0 ? lapHistory : undefined;
    }
    /**
     * Map track ID to name
     */
    static mapTrackIdToName(trackId) {
        // If it's already a name, return it
        if (typeof trackId === 'string' && !/^\d+$/.test(trackId)) {
            return trackId;
        }
        // Try to map from track ID
        const id = typeof trackId === 'number' ? trackId : parseInt(trackId);
        const trackNames = {
            17: 'Austria',
            3: 'Sakhir (Bahrain)',
            7: 'Silverstone',
            11: 'Monza',
            10: 'Spa',
            13: 'Suzuka',
            14: 'Abu Dhabi',
            15: 'Texas',
            16: 'Brazil',
            19: 'Mexico',
            20: 'Baku (Azerbaijan)',
            26: 'Zandvoort',
            27: 'Imola',
            28: 'Portimão',
            29: 'Jeddah',
            30: 'Miami',
            31: 'Las Vegas',
            32: 'Losail'
        };
        return trackNames[id] || trackId.toString();
    }
    /**
     * Map session type string to number
     */
    static mapSessionTypeToNumber(sessionType) {
        const typeMap = {
            'Race': 10,
            'One Shot Qualifying': 9,
            'One_Shot_Qualifying': 9,
            'OSQ': 9,
            'Qualifying': 5,
            'Qualifying_1': 5,
            'Qualifying_2': 6,
            'Qualifying_3': 7,
            'Practice': 1,
            'Practice_1': 1,
            'Practice_2': 2,
            'Practice_3': 3,
            'Short Practice': 4,
            'Short_Practice': 4,
            'Sprint': 11
        };
        return typeMap[sessionType] || 10; // Default to Race
    }
    /**
     * Map result status string to number
     */
    static mapResultStatus(status) {
        const statusMap = {
            'FINISHED': 2,
            'DNF': 4,
            'DSQ': 5,
            'NCL': 6,
            'RET': 7
        };
        return statusMap[status.toUpperCase()] || 2; // Default to FINISHED
    }
    /**
     * Extract rain percentage
     */
    static extractRainPercentage(sessionData) {
        // Check weather forecast samples
        const forecastSamples = sessionData['weather-forecast-samples'] || sessionData.weatherForecastSamples || [];
        if (forecastSamples.length > 0) {
            return forecastSamples[0]['rain-percentage'] || forecastSamples[0].rainPercentage || 0;
        }
        return 0;
    }
    /**
     * Extract date from filename or session data
     */
    static extractDate(sessionData) {
        // Try to get from session data
        if (sessionData.date) {
            return sessionData.date;
        }
        // Return current date if not found
        return new Date().toISOString();
    }
}
exports.F123JSONParser = F123JSONParser;
//# sourceMappingURL=F123JSONParser.js.map