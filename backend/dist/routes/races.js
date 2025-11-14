"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupRacesRoutes = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const RaceJSONImportService_1 = require("../services/RaceJSONImportService");
const F123JSONParser_1 = require("../services/F123JSONParser");
const router = (0, express_1.Router)();
// Configure multer for file uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path_1.default.join(__dirname, '../../data/race-json-files');
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `import-${uniqueSuffix}${path_1.default.extname(file.originalname)}`);
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.json'];
        const fileExt = path_1.default.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(fileExt)) {
            cb(null, true);
        }
        else {
            cb(new Error('Only JSON files are allowed'));
        }
    }
});
// Initialize services
let dbService;
let raceResultsEditor;
let raceJSONImportService;
const setupRacesRoutes = (databaseService, raceEditor, io, options) => {
    dbService = databaseService;
    raceResultsEditor = raceEditor;
    raceJSONImportService =
        options?.raceJsonImportService ?? new RaceJSONImportService_1.RaceJSONImportService(databaseService, io);
};
exports.setupRacesRoutes = setupRacesRoutes;
// Get race results for a specific race
router.get('/:raceId/results', async (req, res) => {
    try {
        const { raceId } = req.params;
        await dbService.ensureInitialized();
        console.log(`🔍 Fetching results for race: ${raceId}`);
        // Get all completed sessions for this race
        const sessions = await dbService.getCompletedSessions(raceId);
        console.log(`📊 Found ${sessions.length} sessions for race ${raceId}`);
        const results = await Promise.all(sessions.map(async (session) => {
            console.log(`🔍 Fetching driver results for session ${session.id} (${session.sessionName})`);
            // Include lap times for all sessions (they'll be empty arrays if no lap data exists)
            const driverResults = await dbService.getDriverSessionResults(session.id, true);
            console.log(`📊 Session ${session.id} has ${driverResults.length} driver results`);
            return {
                sessionId: session.id,
                sessionType: session.sessionType,
                sessionName: session.sessionName,
                completedAt: session.completedAt,
                results: driverResults
            };
        }));
        console.log(`✅ Returning ${results.length} sessions with total ${results.reduce((sum, s) => sum + s.results.length, 0)} driver results`);
        res.json({
            success: true,
            raceId,
            sessions: results
        });
    }
    catch (error) {
        console.error('Get race results error:', error);
        res.status(500).json({
            error: 'Failed to get race results',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Get edit history for a race
router.get('/:raceId/edit-history', async (req, res) => {
    try {
        const { raceId } = req.params;
        await dbService.ensureInitialized();
        const editHistory = await raceResultsEditor.getRaceEditHistory(raceId);
        res.json({
            success: true,
            raceId,
            editHistory
        });
    }
    catch (error) {
        console.error('Get edit history error:', error);
        res.status(500).json({
            error: 'Failed to get edit history',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Get edit history for a specific session
router.get('/sessions/:sessionId/edit-history', async (req, res) => {
    try {
        const { sessionId } = req.params;
        await dbService.ensureInitialized();
        const editHistory = await raceResultsEditor.getEditHistory(sessionId);
        res.json({
            success: true,
            sessionId,
            editHistory
        });
    }
    catch (error) {
        console.error('Get session edit history error:', error);
        res.status(500).json({
            error: 'Failed to get session edit history',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Get penalties for a specific driver session result
router.get('/driver-results/:driverSessionResultId/penalties', async (req, res) => {
    try {
        const { driverSessionResultId } = req.params;
        await dbService.ensureInitialized();
        const penalties = await dbService.getPenaltiesForDriverResult(driverSessionResultId);
        res.json({
            success: true,
            driverSessionResultId,
            penalties
        });
    }
    catch (error) {
        console.error('Get driver penalties error:', error);
        res.status(500).json({
            error: 'Failed to get driver penalties',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Get penalties for an entire session
router.get('/sessions/:sessionId/penalties', async (req, res) => {
    try {
        const { sessionId } = req.params;
        await dbService.ensureInitialized();
        const penalties = await dbService.getPenaltiesForSession(sessionId);
        res.json({
            success: true,
            sessionId,
            penalties
        });
    }
    catch (error) {
        console.error('Get session penalties error:', error);
        res.status(500).json({
            error: 'Failed to get session penalties',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Add penalty to a driver (penaltySeconds is in seconds, e.g., 5 for a 5-second penalty)
// Uses driverSessionResultId (UUID) for direct lookup - no JSONB queries needed
router.post('/driver-results/:driverSessionResultId/penalties', async (req, res) => {
    try {
        const { driverSessionResultId } = req.params;
        const { penaltySeconds, reason, editedBy } = req.body;
        if (penaltySeconds == null || penaltySeconds === '') {
            return res.status(400).json({
                error: 'Missing required field: penaltySeconds (in seconds)'
            });
        }
        if (!reason || !editedBy) {
            return res.status(400).json({
                error: 'Missing required fields: reason, editedBy'
            });
        }
        if (Number(penaltySeconds) <= 0) {
            return res.status(400).json({
                error: 'Penalty seconds must be greater than 0'
            });
        }
        await dbService.ensureInitialized();
        const penalty = await dbService.addPenalty(driverSessionResultId, penaltySeconds, reason, editedBy);
        res.json({
            success: true,
            message: `Added ${penalty.seconds} second penalty`,
            penalty
        });
    }
    catch (error) {
        console.error('Add penalty error:', error);
        res.status(500).json({
            error: 'Failed to add penalty',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Remove penalty from a driver (requires penaltyId from driver_penalties)
// Uses driverSessionResultId (UUID) for direct lookup - no JSONB queries needed
router.delete('/driver-results/:driverSessionResultId/penalties/:penaltyId', async (req, res) => {
    try {
        const { driverSessionResultId, penaltyId } = req.params;
        if (!penaltyId) {
            return res.status(400).json({
                error: 'Missing required path parameter: penaltyId'
            });
        }
        await dbService.ensureInitialized();
        await dbService.removePenalty(driverSessionResultId, penaltyId);
        res.json({
            success: true,
            message: `Removed penalty ${penaltyId}`
        });
    }
    catch (error) {
        console.error('Remove penalty error:', error);
        res.status(500).json({
            error: 'Failed to remove penalty',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Update driver-to-user mapping for a driver session result
router.put('/driver-results/:driverSessionResultId/mapping', async (req, res) => {
    try {
        const { driverSessionResultId } = req.params;
        const { userId, editedBy, reason } = req.body ?? {};
        if (!editedBy || typeof editedBy !== 'string') {
            return res.status(400).json({
                error: 'Missing required field: editedBy'
            });
        }
        await dbService.ensureInitialized();
        const normalizedUserId = userId === null || userId === undefined || userId === ''
            ? null
            : String(userId);
        const updates = await raceResultsEditor.updateDriverUserMapping(driverSessionResultId, normalizedUserId, editedBy, typeof reason === 'string' ? reason : undefined);
        res.json({
            success: true,
            updates
        });
    }
    catch (error) {
        console.error('Update driver mapping error:', error);
        const errorCode = error?.code;
        if (errorCode === 'USER_ALREADY_MAPPED') {
            return res.status(409).json({
                error: 'User already mapped to another driver in this session',
                conflictDriverSessionResultId: error?.conflictDriverSessionResultId
            });
        }
        if (errorCode === 'DRIVER_RESULT_NOT_FOUND') {
            return res.status(404).json({
                error: 'Driver session result not found'
            });
        }
        res.status(500).json({
            error: 'Failed to update driver mapping',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Change driver position
router.put('/sessions/:sessionId/positions/:driverId', async (req, res) => {
    try {
        const { sessionId, driverId } = req.params;
        const { newPosition, reason, editedBy } = req.body;
        if (!newPosition || !reason || !editedBy) {
            return res.status(400).json({
                error: 'Missing required fields: newPosition, reason, editedBy'
            });
        }
        await dbService.ensureInitialized();
        // Validate the edit
        const isValid = await raceResultsEditor.validateEdit(sessionId, 'position_change', { newPosition });
        if (!isValid) {
            return res.status(400).json({ error: 'Invalid position data' });
        }
        await raceResultsEditor.changePosition(sessionId, driverId, newPosition, reason, editedBy);
        res.json({
            success: true,
            message: `Changed driver ${driverId} position to ${newPosition}`
        });
    }
    catch (error) {
        console.error('Change position error:', error);
        res.status(500).json({
            error: 'Failed to change position',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Disqualify driver
router.post('/sessions/:sessionId/disqualify/:driverId', async (req, res) => {
    try {
        const { sessionId, driverId } = req.params;
        const { reason, editedBy } = req.body;
        if (!reason || !editedBy) {
            return res.status(400).json({
                error: 'Missing required fields: reason, editedBy'
            });
        }
        await dbService.ensureInitialized();
        // Validate the edit
        const isValid = await raceResultsEditor.validateEdit(sessionId, 'disqualification', { reason });
        if (!isValid) {
            return res.status(400).json({ error: 'Invalid disqualification data' });
        }
        await raceResultsEditor.disqualifyDriver(sessionId, driverId, reason, editedBy);
        res.json({
            success: true,
            message: `Disqualified driver ${driverId}`
        });
    }
    catch (error) {
        console.error('Disqualify driver error:', error);
        res.status(500).json({
            error: 'Failed to disqualify driver',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Reset specific driver to original state
router.post('/sessions/:sessionId/reset-driver/:driverId', async (req, res) => {
    try {
        const { sessionId, driverId } = req.params;
        await dbService.ensureInitialized();
        await raceResultsEditor.resetDriverToOriginal(sessionId, driverId);
        res.json({
            success: true,
            message: `Reset driver ${driverId} to original state`
        });
    }
    catch (error) {
        console.error('Reset driver error:', error);
        res.status(500).json({
            error: 'Failed to reset driver',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Reset entire race to original state
router.post('/:raceId/reset', async (req, res) => {
    try {
        const { raceId } = req.params;
        await dbService.ensureInitialized();
        await raceResultsEditor.resetRaceToOriginal(raceId);
        res.json({
            success: true,
            message: `Reset entire race ${raceId} to original state`
        });
    }
    catch (error) {
        console.error('Reset race error:', error);
        res.status(500).json({
            error: 'Failed to reset race',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Revert specific edit
router.post('/race-edits/:editId/revert', async (req, res) => {
    try {
        const { editId } = req.params;
        await dbService.ensureInitialized();
        await raceResultsEditor.revertEdit(editId);
        res.json({
            success: true,
            message: `Reverted edit ${editId}`
        });
    }
    catch (error) {
        console.error('Revert edit error:', error);
        res.status(500).json({
            error: 'Failed to revert edit',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Create backup of current results
router.post('/sessions/:sessionId/backup', async (req, res) => {
    try {
        const { sessionId } = req.params;
        await dbService.ensureInitialized();
        const backupId = await raceResultsEditor.createBackup(sessionId);
        res.json({
            success: true,
            backupId,
            message: `Created backup ${backupId} for session ${sessionId}`
        });
    }
    catch (error) {
        console.error('Create backup error:', error);
        res.status(500).json({
            error: 'Failed to create backup',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Restore from backup
router.post('/backups/:backupId/restore', async (req, res) => {
    try {
        const { backupId } = req.params;
        await dbService.ensureInitialized();
        await raceResultsEditor.restoreFromBackup(backupId);
        res.json({
            success: true,
            message: `Restored from backup ${backupId}`
        });
    }
    catch (error) {
        console.error('Restore backup error:', error);
        res.status(500).json({
            error: 'Failed to restore from backup',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Get orphaned sessions (for admin review)
router.get('/admin/orphaned-sessions', async (req, res) => {
    try {
        await dbService.ensureInitialized();
        const result = await dbService.query('SELECT * FROM orphaned_sessions WHERE status = $1 ORDER BY created_at DESC', ['pending']);
        res.json({
            success: true,
            orphanedSessions: result.rows
        });
    }
    catch (error) {
        console.error('Get orphaned sessions error:', error);
        res.status(500).json({
            error: 'Failed to get orphaned sessions',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Process orphaned session (link to existing event)
router.post('/admin/orphaned-sessions/:orphanedId/process', async (req, res) => {
    try {
        const { orphanedId } = req.params;
        const { eventId } = req.body;
        if (!eventId) {
            return res.status(400).json({ error: 'Missing eventId' });
        }
        await dbService.ensureInitialized();
        // Update orphaned session status
        await dbService.query('UPDATE orphaned_sessions SET status = $1, processed_event_id = $2 WHERE id = $3', ['processed', eventId, orphanedId]);
        res.json({
            success: true,
            message: `Processed orphaned session ${orphanedId} and linked to event ${eventId}`
        });
    }
    catch (error) {
        console.error('Process orphaned session error:', error);
        res.status(500).json({
            error: 'Failed to process orphaned session',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Ignore orphaned session
router.post('/admin/orphaned-sessions/:orphanedId/ignore', async (req, res) => {
    try {
        const { orphanedId } = req.params;
        await dbService.ensureInitialized();
        // Update orphaned session status
        await dbService.query('UPDATE orphaned_sessions SET status = $1 WHERE id = $2', ['ignored', orphanedId]);
        res.json({
            success: true,
            message: `Ignored orphaned session ${orphanedId}`
        });
    }
    catch (error) {
        console.error('Ignore orphaned session error:', error);
        res.status(500).json({
            error: 'Failed to ignore orphaned session',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Import multiple race JSON files (groups by track)
router.post('/import-json-batch', upload.array('raceFiles', 10), async (req, res) => {
    try {
        const files = req.files;
        if (!files || files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }
        const { seasonId } = req.body;
        if (!seasonId) {
            // Clean up uploaded files
            files.forEach(file => {
                if (fs_1.default.existsSync(file.path)) {
                    fs_1.default.unlinkSync(file.path);
                }
            });
            return res.status(400).json({ error: 'Season ID is required' });
        }
        await dbService.ensureInitialized();
        // Parse all files to determine track grouping
        const fileData = [];
        for (const file of files) {
            try {
                const validation = await raceJSONImportService.validateJSONFile(file.path);
                if (!validation.valid) {
                    fileData.push({
                        file,
                        trackName: 'Unknown',
                        sessionType: 0,
                        sessionTypeName: 'Unknown'
                    });
                    continue;
                }
                // Quick parse to get track name and session type
                const parsedData = F123JSONParser_1.F123JSONParser.parseSessionFile(file.path);
                fileData.push({
                    file,
                    trackName: parsedData.sessionInfo.trackName,
                    sessionType: parsedData.sessionInfo.sessionType,
                    sessionTypeName: parsedData.sessionInfo.sessionTypeName
                });
            }
            catch (error) {
                console.error(`Error parsing file ${file.originalname}:`, error);
                fileData.push({
                    file,
                    trackName: 'Unknown',
                    sessionType: 0,
                    sessionTypeName: 'Unknown'
                });
            }
        }
        // Group files by track name (case-insensitive)
        const trackGroups = new Map();
        fileData.forEach(data => {
            const trackKey = data.trackName.toLowerCase().trim();
            if (!trackGroups.has(trackKey)) {
                trackGroups.set(trackKey, []);
            }
            trackGroups.get(trackKey).push(data);
        });
        // Process each track group
        const results = [];
        let groupRaceId = null;
        for (const [trackName, groupFiles] of trackGroups.entries()) {
            let raceId = null;
            // Process files in order (practice -> qualifying -> race)
            const sortedFiles = groupFiles.sort((a, b) => {
                // Sort by session type: practice (1-4) < qualifying (5-9) < race (10-11)
                return a.sessionType - b.sessionType;
            });
            for (const fileData of sortedFiles) {
                try {
                    // Use the same raceId for all files in the group
                    const result = await raceJSONImportService.importRaceJSON(fileData.file.path, seasonId, raceId || undefined);
                    if (!raceId) {
                        raceId = result.raceId;
                        groupRaceId = raceId;
                    }
                    results.push({
                        file: fileData.file.originalname,
                        success: true,
                        importedCount: result.importedCount,
                        sessionType: fileData.sessionTypeName
                    });
                    // Clean up file
                    if (fs_1.default.existsSync(fileData.file.path)) {
                        fs_1.default.unlinkSync(fileData.file.path);
                    }
                }
                catch (error) {
                    results.push({
                        file: fileData.file.originalname,
                        success: false,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                    // Clean up file
                    if (fs_1.default.existsSync(fileData.file.path)) {
                        fs_1.default.unlinkSync(fileData.file.path);
                    }
                }
            }
        }
        res.json({
            success: true,
            message: `Processed ${files.length} file(s)`,
            raceId: groupRaceId,
            results
        });
    }
    catch (error) {
        console.error('Import race JSON batch error:', error);
        // Clean up any remaining files
        if (req.files) {
            const files = req.files;
            files.forEach(file => {
                if (fs_1.default.existsSync(file.path)) {
                    fs_1.default.unlinkSync(file.path);
                }
            });
        }
        res.status(500).json({
            error: 'Failed to import race JSON files',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Import race JSON file (single file - kept for backward compatibility)
router.post('/import-json', upload.single('raceFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const { seasonId, raceId } = req.body;
        if (!seasonId) {
            // Clean up uploaded file
            if (fs_1.default.existsSync(req.file.path)) {
                fs_1.default.unlinkSync(req.file.path);
            }
            return res.status(400).json({ error: 'Season ID is required' });
        }
        await dbService.ensureInitialized();
        // Validate file before import
        const validation = await raceJSONImportService.validateJSONFile(req.file.path);
        if (!validation.valid) {
            // Clean up uploaded file
            if (fs_1.default.existsSync(req.file.path)) {
                fs_1.default.unlinkSync(req.file.path);
            }
            return res.status(400).json({
                error: 'Invalid JSON file',
                details: validation.errors
            });
        }
        // Import the race JSON
        const result = await raceJSONImportService.importRaceJSON(req.file.path, seasonId, raceId);
        // Clean up uploaded file after successful import
        if (fs_1.default.existsSync(req.file.path)) {
            fs_1.default.unlinkSync(req.file.path);
        }
        res.json({
            success: true,
            message: 'Race JSON imported successfully',
            raceId: result.raceId,
            sessionResultId: result.sessionResultId,
            importedCount: result.importedCount
        });
    }
    catch (error) {
        console.error('Import race JSON error:', error);
        // Clean up uploaded file if it exists
        if (req.file && fs_1.default.existsSync(req.file.path)) {
            fs_1.default.unlinkSync(req.file.path);
        }
        res.status(500).json({
            error: 'Failed to import race JSON',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Import race JSON from existing file path
router.post('/import-json-path', async (req, res) => {
    try {
        const { filePath, seasonId, raceId } = req.body;
        if (!filePath || !seasonId) {
            return res.status(400).json({ error: 'File path and season ID are required' });
        }
        // Validate file exists
        if (!fs_1.default.existsSync(filePath)) {
            return res.status(400).json({ error: 'File does not exist' });
        }
        await dbService.ensureInitialized();
        // Validate file before import
        const validation = await raceJSONImportService.validateJSONFile(filePath);
        if (!validation.valid) {
            return res.status(400).json({
                error: 'Invalid JSON file',
                details: validation.errors
            });
        }
        // Import the race JSON
        const result = await raceJSONImportService.importRaceJSON(filePath, seasonId, raceId);
        res.json({
            success: true,
            message: 'Race JSON imported successfully',
            raceId: result.raceId,
            sessionResultId: result.sessionResultId,
            importedCount: result.importedCount
        });
    }
    catch (error) {
        console.error('Import race JSON from path error:', error);
        res.status(500).json({
            error: 'Failed to import race JSON',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Get a single race by ID (must be last to avoid conflicts with other routes)
router.get('/:raceId', async (req, res) => {
    try {
        const { raceId } = req.params;
        await dbService.ensureInitialized();
        const race = await dbService.getRaceById(raceId);
        if (!race) {
            return res.status(404).json({
                error: 'Race not found'
            });
        }
        res.json({
            success: true,
            race
        });
    }
    catch (error) {
        console.error('Get race error:', error);
        res.status(500).json({
            error: 'Failed to get race',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=races.js.map