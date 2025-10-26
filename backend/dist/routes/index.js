"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupRoutes = setupRoutes;
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
}
//# sourceMappingURL=index.js.map