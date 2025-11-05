"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupRoutes = setupRoutes;
const upload_1 = __importDefault(require("./upload"));
const seasons_1 = __importDefault(require("./seasons"));
const sessions_1 = __importDefault(require("./sessions"));
const members_1 = __importDefault(require("./members"));
const tracks_1 = __importDefault(require("./tracks"));
const races_1 = __importStar(require("./races"));
function setupRoutes(app, io, services) {
    // Health check endpoint
    app.get('/health', (req, res) => {
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            telemetry: services.telemetryService.isRunning,
            f123UDPProcessor: services.f123UDPProcessor.isProcessorRunning()
        });
    });
    // Get current telemetry data
    app.get('/api/telemetry', (req, res) => {
        const data = services.telemetryService.getLastData();
        if (data) {
            res.json(data);
        }
        else {
            res.status(404).json({ error: 'No telemetry data available' });
        }
    });
    // Get telemetry history
    app.get('/api/telemetry/history', (req, res) => {
        const buffer = services.telemetryService.getDataBuffer();
        res.json(buffer);
    });
    // F1 23 UDP Processor status and control
    app.get('/api/f123-udp/status', (req, res) => {
        res.json({
            isRunning: services.f123UDPProcessor.isProcessorRunning(),
            sessionUid: services.f123UDPProcessor.getSessionUid(),
            participantMappings: Object.fromEntries(services.f123UDPProcessor.getParticipantMappings())
        });
    });
    app.post('/api/f123-udp/start', async (req, res) => {
        try {
            await services.f123UDPProcessor.initialize();
            res.json({ message: 'F1 23 UDP Processor initialized successfully' });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to initialize F1 23 UDP Processor' });
        }
    });
    app.post('/api/f123-udp/stop', async (req, res) => {
        try {
            services.f123UDPProcessor.stop();
            res.json({ message: 'F1 23 UDP Processor stopped successfully' });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to stop F1 23 UDP Processor' });
        }
    });
    app.post('/api/f123-udp/set-active-season/:seasonId', async (req, res) => {
        try {
            const { seasonId } = req.params;
            await services.f123UDPProcessor.setActiveSeason(seasonId);
            res.json({ message: `Active season set to ${seasonId}` });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to set active season' });
        }
    });
    app.post('/api/f123-udp/set-current-event/:eventId', async (req, res) => {
        try {
            const { eventId } = req.params;
            await services.f123UDPProcessor.setCurrentEvent(eventId);
            res.json({ message: `Current event set to ${eventId}` });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to set current event' });
        }
    });
    // Get UDP session results
    app.get('/api/f123-udp/session-results/:seasonId', async (req, res) => {
        try {
            const { seasonId } = req.params;
            const { eventId } = req.query;
            const results = await services.databaseService.getUDPSessionResults();
            res.json({ results });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to get session results' });
        }
    });
    // Get UDP lap history for a member
    app.get('/api/f123-udp/lap-history/:memberId', async (req, res) => {
        try {
            const { memberId } = req.params;
            const { sessionUid } = req.query;
            const lapHistory = await services.databaseService.getUDPLapHistory();
            res.json({ lapHistory });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to get lap history' });
        }
    });
    // Upload routes for F1 23 data
    app.use('/api/upload', (0, upload_1.default)(services.databaseService));
    // Seasons management routes
    app.use('/api/seasons', (0, seasons_1.default)(services.databaseService));
    // Members management routes
    app.use('/api/members', (0, members_1.default)(services.databaseService));
    // Tracks management routes
    app.use('/api/tracks', tracks_1.default);
    // Session data routes (for local host app)
    app.use('/api/sessions', (0, sessions_1.default)(services.databaseService));
    // Race results and editing routes
    (0, races_1.setupRacesRoutes)(services.databaseService, services.raceResultsEditor, io);
    app.use('/api/races', races_1.default);
}
//# sourceMappingURL=index.js.map