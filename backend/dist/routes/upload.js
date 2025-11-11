"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = createUploadRoutes;
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const F123Parser_1 = require("../services/F123Parser");
function createUploadRoutes(dbService) {
    const router = express_1.default.Router();
    // Configure multer for file uploads
    const storage = multer_1.default.diskStorage({
        destination: (req, file, cb) => {
            const uploadDir = path_1.default.join(__dirname, '../../uploads');
            if (!fs_1.default.existsSync(uploadDir)) {
                fs_1.default.mkdirSync(uploadDir, { recursive: true });
            }
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, `f123-session-${uniqueSuffix}${path_1.default.extname(file.originalname)}`);
        }
    });
    const upload = (0, multer_1.default)({
        storage,
        limits: {
            fileSize: 10 * 1024 * 1024 // 10MB limit
        },
        fileFilter: (req, file, cb) => {
            const allowedTypes = ['.json', '.csv'];
            const fileExt = path_1.default.extname(file.originalname).toLowerCase();
            if (allowedTypes.includes(fileExt)) {
                cb(null, true);
            }
            else {
                cb(new Error('Only JSON and CSV files are allowed'));
            }
        }
    });
    // Upload F1 23 session file
    router.post('/session', upload.single('sessionFile'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }
            const { seasonId, raceId } = req.body;
            if (!seasonId) {
                return res.status(400).json({ error: 'Season ID is required' });
            }
            // Parse the uploaded file
            const sessionData = F123Parser_1.F123Parser.parseSessionFile(req.file.path);
            // Validate the parsed data
            const validation = F123Parser_1.F123Parser.validateSessionData(sessionData);
            if (!validation.isValid) {
                return res.status(400).json({
                    error: 'Invalid session data',
                    details: validation.errors
                });
            }
            await dbService.ensureInitialized();
            // Check if race exists or create new one
            let targetRaceId = raceId;
            if (!targetRaceId) {
                // Create new race
                const trackId = await dbService.findOrCreateTrack(sessionData.trackName);
                targetRaceId = await dbService.createRace({
                    seasonId,
                    trackId,
                    raceDate: new Date(sessionData.date).toISOString(),
                    status: 'completed'
                });
            }
            // Process driver mappings
            const driverMappings = await dbService.getDriverMappings(seasonId);
            const unmappedDrivers = [];
            for (const result of sessionData.results) {
                const mapping = driverMappings.find(m => m.f123DriverName === result.driverName &&
                    m.f123DriverNumber === result.driverNumber);
                if (!mapping) {
                    unmappedDrivers.push(`${result.driverName} (#${result.driverNumber})`);
                }
            }
            // If there are unmapped drivers, return them for manual mapping
            if (unmappedDrivers.length > 0) {
                return res.status(200).json({
                    success: true,
                    message: 'File parsed successfully, but some drivers need mapping',
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
            // Clean up uploaded file
            fs_1.default.unlinkSync(req.file.path);
            res.json({
                success: true,
                message: 'Session data imported successfully',
                raceId: targetRaceId,
                importedResults: importResult?.resultsCount ?? (sessionData.results?.length ?? 0),
                importedLapTimes: importResult?.lapTimesCount ?? 0
            });
        }
        catch (error) {
            console.error('Upload error:', error);
            // Clean up file if it exists
            if (req.file && fs_1.default.existsSync(req.file.path)) {
                fs_1.default.unlinkSync(req.file.path);
            }
            res.status(500).json({
                error: 'Failed to process session file',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
    // Get driver mappings for a season
    router.get('/mappings/:seasonId', async (req, res) => {
        try {
            const { seasonId } = req.params;
            await dbService.ensureInitialized();
            const mappings = await dbService.getDriverMappings(seasonId);
            const drivers = await dbService.getDriversBySeason(seasonId);
            res.json({
                mappings,
                availableDrivers: drivers
            });
        }
        catch (error) {
            console.error('Get mappings error:', error);
            res.status(500).json({
                error: 'Failed to get driver mappings',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
    // Create driver mapping
    router.post('/mappings', async (req, res) => {
        try {
            const { seasonId, f123DriverName, f123DriverNumber, yourDriverId } = req.body;
            if (!seasonId || !f123DriverName || !yourDriverId) {
                return res.status(400).json({ error: 'Missing required fields' });
            }
            await dbService.ensureInitialized();
            const mapping = await dbService.createDriverMapping({
                seasonId,
                f123DriverId: f123DriverNumber || 0,
                f123DriverName,
                f123DriverNumber: f123DriverNumber || undefined,
                f123TeamName: undefined,
                yourDriverId
            });
            res.json({
                success: true,
                mapping
            });
        }
        catch (error) {
            console.error('Create mapping error:', error);
            res.status(500).json({
                error: 'Failed to create driver mapping',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
    // Import session data with mappings
    router.post('/import', async (req, res) => {
        try {
            const { sessionData, raceId, driverMappings } = req.body;
            if (!sessionData || !raceId) {
                return res.status(400).json({ error: 'Missing required data' });
            }
            await dbService.ensureInitialized();
            // Apply driver mappings
            const mappedResults = sessionData.results.map((result) => {
                const mapping = driverMappings.find((m) => m.f123DriverName === result.driverName &&
                    m.f123DriverNumber === result.driverNumber);
                return {
                    ...result,
                    yourDriverId: mapping?.yourDriverId
                };
            });
            // Import the mapped results
            const importResult = await dbService.importRaceResults(raceId, {
                ...sessionData,
                results: mappedResults
            });
            res.json({
                success: true,
                message: 'Session data imported successfully',
                importedResults: importResult?.resultsCount ?? mappedResults.length,
                importedLapTimes: importResult?.lapTimesCount ?? 0
            });
        }
        catch (error) {
            console.error('Import error:', error);
            res.status(500).json({
                error: 'Failed to import session data',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
    return router;
}
//# sourceMappingURL=upload.js.map