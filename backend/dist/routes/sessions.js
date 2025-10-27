"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const DatabaseService_1 = require("../services/DatabaseService");
const F123Parser_1 = require("../services/F123Parser");
const router = express_1.default.Router();
// Middleware to verify API key
const verifyApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    const expectedApiKey = process.env.API_KEY;
    if (!expectedApiKey) {
        return res.status(500).json({ error: 'API key not configured' });
    }
    if (!apiKey || apiKey !== expectedApiKey) {
        return res.status(401).json({ error: 'Invalid API key' });
    }
    next();
};
// Upload session data from local host app
router.post('/upload', verifyApiKey, async (req, res) => {
    try {
        const { sessionData, seasonId, raceId } = req.body;
        if (!sessionData || !seasonId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        // Validate the session data
        const validation = F123Parser_1.F123Parser.validateSessionData(sessionData);
        if (!validation.isValid) {
            return res.status(400).json({
                error: 'Invalid session data',
                details: validation.errors
            });
        }
        const dbService = new DatabaseService_1.DatabaseService();
        // Check if race exists or create new one
        let targetRaceId = raceId;
        if (!targetRaceId) {
            // Create new race
            const track = await dbService.findOrCreateTrack(sessionData.trackName);
            targetRaceId = await dbService.createRace({
                seasonId,
                trackId: track.id,
                raceDate: new Date(sessionData.date).toISOString(),
                status: 'completed'
            });
        }
        // Process driver mappings
        const driverMappings = await dbService.getDriverMappings(seasonId);
        const unmappedDrivers = [];
        for (const result of sessionData.results) {
            const mapping = driverMappings.find(m => m.f123_driver_name === result.driverName &&
                m.f123_driver_number === result.driverNumber);
            if (!mapping) {
                unmappedDrivers.push(`${result.driverName} (#${result.driverNumber})`);
            }
        }
        // If there are unmapped drivers, return them for manual mapping
        if (unmappedDrivers.length > 0) {
            return res.status(200).json({
                success: true,
                message: 'Session data received, but some drivers need mapping',
                unmappedDrivers,
                sessionData: {
                    trackName: sessionData.trackName,
                    sessionType: sessionData.sessionType,
                    date: sessionData.date,
                    totalDrivers: sessionData.drivers.length
                }
            });
        }
        // Import race results
        const importResult = await dbService.importRaceResults(targetRaceId, sessionData);
        res.json({
            success: true,
            message: 'Session data imported successfully',
            raceId: targetRaceId,
            importedResults: importResult.resultsCount,
            importedLapTimes: importResult.lapTimesCount
        });
    }
    catch (error) {
        console.error('Session upload error:', error);
        res.status(500).json({
            error: 'Failed to process session data',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Get session status
router.get('/status', verifyApiKey, async (req, res) => {
    try {
        res.json({
            success: true,
            message: 'Session API is active',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({
            error: 'Failed to check status',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=sessions.js.map