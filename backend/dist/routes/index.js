"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupRoutes = setupRoutes;
const upload_1 = __importDefault(require("./upload"));
const seasons_1 = __importDefault(require("./seasons"));
const sessions_1 = __importDefault(require("./sessions"));
function setupRoutes(app, services) {
    // Health check endpoint
    app.get('/health', (req, res) => {
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            telemetry: services.telemetryService.isRunning
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
    // Get current strategy
    app.get('/api/strategy', (req, res) => {
        const strategy = services.strategyEngine.getCurrentStrategy();
        if (strategy) {
            res.json(strategy);
        }
        else {
            res.status(404).json({ error: 'No strategy available' });
        }
    });
    // Get lap history
    app.get('/api/laps', (req, res) => {
        const laps = services.strategyEngine.getLapHistory();
        res.json(laps);
    });
    // Reset strategy engine
    app.post('/api/strategy/reset', (req, res) => {
        services.strategyEngine.reset();
        res.json({ message: 'Strategy engine reset' });
    });
    // Upload routes for F1 23 data
    app.use('/api/upload', upload_1.default);
    // Seasons management routes
    app.use('/api/seasons', seasons_1.default);
    // Session data routes (for local host app)
    app.use('/api/sessions', sessions_1.default);
}
//# sourceMappingURL=index.js.map