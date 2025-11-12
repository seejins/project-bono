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
const DatabaseService_1 = require("./services/DatabaseService");
const RaceResultsEditor_1 = require("./services/RaceResultsEditor");
const routes_1 = require("./routes");
const socket_1 = require("./socket");
const path_1 = __importDefault(require("path"));
// Load .env file from backend directory
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../.env') });
// Debug: Log database configuration
console.log('🔍 Database Config:', {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || '5432',
    database: process.env.DB_NAME || 'f1_race_engineer_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD ? '***' : '(empty)'
});
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176", "http://localhost:5177"],
        methods: ["GET", "POST"]
    },
    pingTimeout: 30000, // Wait 30s before consider client dead
    pingInterval: 10000, // Send ping every 10s
});
console.log('[Socket.IO] Server initialized with robust pingTimeout/pingInterval');
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Initialize services
const databaseService = new DatabaseService_1.DatabaseService();
const telemetryService = new TelemetryService_1.TelemetryService();
const raceResultsEditor = new RaceResultsEditor_1.RaceResultsEditor(databaseService);
// Initialize database tables
databaseService.ensureInitialized().then(() => {
    console.log('✅ Database initialized successfully');
}).catch((error) => {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
});
// Setup routes
(0, routes_1.setupRoutes)(app, io, {
    telemetryService,
    databaseService,
    raceResultsEditor
});
// Setup Socket.IO handlers
(0, socket_1.setupSocketHandlers)(io, { telemetryService });
// Start telemetry service only in development/local mode
const isProduction = process.env.NODE_ENV === 'production';
const disableUDP = process.env.DISABLE_UDP === 'true';
if (!isProduction && !disableUDP) {
    telemetryService.start();
    console.log('📡 UDP Telemetry service started (local mode)');
}
else {
    console.log('📡 UDP Telemetry service disabled (production mode)');
}
// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit the process for UDP port conflicts
    if (reason && typeof reason === 'object' && 'code' in reason && reason.code === 'EADDRINUSE') {
        console.log('⚠️ UDP port conflict detected, continuing without UDP service...');
        return;
    }
});
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    // Don't exit for UDP port conflicts
    if ('code' in error && error.code === 'EADDRINUSE') {
        console.log('⚠️ UDP port conflict detected, continuing without UDP service...');
        return;
    }
    process.exit(1);
});
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
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});
//# sourceMappingURL=index.js.map