"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const TelemetryService_1 = require("./services/TelemetryService");
const StrategyEngine_1 = require("./services/StrategyEngine");
const DatabaseService_1 = require("./services/DatabaseService");
const SessionExportService_1 = require("./services/SessionExportService");
const F123UDPProcessor_1 = require("./services/F123UDPProcessor");
const routes_1 = require("./routes");
const socket_1 = require("./socket");
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Initialize services
const databaseService = new DatabaseService_1.DatabaseService();
const telemetryService = new TelemetryService_1.TelemetryService();
const strategyEngine = new StrategyEngine_1.StrategyEngine();
const sessionExportService = new SessionExportService_1.SessionExportService();
const f123UDPProcessor = new F123UDPProcessor_1.F123UDPProcessor(databaseService);
// Initialize database tables
databaseService.ensureInitialized().then(() => {
    console.log('✅ Database initialized successfully');
}).catch((error) => {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
});
// Setup routes
(0, routes_1.setupRoutes)(app, { telemetryService, strategyEngine, databaseService, f123UDPProcessor });
// Setup Socket.IO handlers
(0, socket_1.setupSocketHandlers)(io, { telemetryService, strategyEngine, sessionExportService });
// Start telemetry service only in development/local mode
const isProduction = process.env.NODE_ENV === 'production';
const disableUDP = process.env.DISABLE_UDP === 'true';
if (!isProduction && !disableUDP) {
    telemetryService.start();
    console.log('📡 UDP Telemetry service started (local mode)');
    // Start F1 23 UDP processor
    f123UDPProcessor.start().then(() => {
        console.log('🏎️ F1 23 UDP Processor started');
    }).catch((error) => {
        console.error('❌ Failed to start F1 23 UDP Processor:', error);
    });
}
else {
    console.log('📡 UDP Telemetry service disabled (production mode)');
}
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🏎️  Project Bono Backend running on port ${PORT}`);
    console.log(`📡 Telemetry service: ${telemetryService.isRunning ? 'Active' : 'Inactive'}`);
    console.log(`🌍 Environment: ${isProduction ? 'Production' : 'Development'}`);
});
// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down gracefully...');
    telemetryService.stop();
    f123UDPProcessor.stop();
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});
//# sourceMappingURL=index.js.map