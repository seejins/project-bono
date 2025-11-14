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
const drivers_1 = __importDefault(require("./drivers"));
const tracks_1 = __importDefault(require("./tracks"));
const races_1 = __importStar(require("./races"));
const RaceJSONImportService_1 = require("../services/RaceJSONImportService");
function setupRoutes(app, io, services) {
    const repositories = services.databaseService.repositories;
    const raceJsonImportService = new RaceJSONImportService_1.RaceJSONImportService(services.databaseService, io);
    // Health check endpoint with database connectivity check
    app.get('/health', async (req, res) => {
        try {
            // Test database connectivity
            await services.databaseService.query('SELECT 1');
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                telemetry: services.telemetryService.isRunning,
                database: 'connected'
            });
        }
        catch (error) {
            res.status(503).json({
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                telemetry: services.telemetryService.isRunning,
                database: 'disconnected',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
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
    // Upload routes for F1 23 data
    app.use('/api/upload', (0, upload_1.default)(services.databaseService));
    // Seasons management routes
    app.use('/api/seasons', (0, seasons_1.default)(services.databaseService, repositories, raceJsonImportService));
    // Drivers management routes
    app.use('/api/drivers', (0, drivers_1.default)(services.databaseService, repositories));
    // Tracks management routes
    app.use('/api/tracks', (0, tracks_1.default)(services.databaseService, repositories));
    // Session data routes (for local host app)
    app.use('/api/sessions', (0, sessions_1.default)(services.databaseService, repositories));
    // Race results and editing routes
    (0, races_1.setupRacesRoutes)(services.databaseService, services.raceResultsEditor, io, {
        raceJsonImportService,
    });
    app.use('/api/races', races_1.default);
}
//# sourceMappingURL=index.js.map