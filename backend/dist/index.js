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
const pool_1 = require("./services/database/pool");
const errorHandler_1 = require("./middleware/errorHandler");
const env_1 = require("./config/env");
const logger_1 = __importDefault(require("./utils/logger"));
const path_1 = __importDefault(require("path"));
// Load .env file from backend directory
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../.env') });
// Validate environment variables
try {
    (0, env_1.validateEnvironment)();
}
catch (error) {
    // Use console.error here because logger might not be initialized yet
    console.error('❌ Environment validation failed:', error);
    process.exit(1);
}
// Determine environment
const isProduction = process.env.NODE_ENV === 'production';
// Debug: Log database configuration
logger_1.default.debug('🔍 Database Config:', {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || '5432',
    database: process.env.DB_NAME || 'f1_race_engineer_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD ? '***' : '(empty)'
});
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
// CORS configuration - restrict to FRONTEND_URL in production
const corsOptions = {
    origin: isProduction && process.env.FRONTEND_URL
        ? process.env.FRONTEND_URL
        : process.env.FRONTEND_URL
            ? [process.env.FRONTEND_URL, "http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176", "http://localhost:5177"]
            : ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176", "http://localhost:5177"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
};
const io = new socket_io_1.Server(server, {
    cors: corsOptions,
    pingTimeout: 30000, // Wait 30s before consider client dead
    pingInterval: 10000, // Send ping every 10s
});
logger_1.default.debug('[Socket.IO] Server initialized with robust pingTimeout/pingInterval');
// Middleware
app.use((0, helmet_1.default)({
    contentSecurityPolicy: isProduction ? undefined : false, // Disable CSP in dev for easier debugging
    crossOriginEmbedderPolicy: false, // Allow embedding if needed
}));
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json({ limit: '10mb' })); // Limit JSON payload size to prevent DoS
// Initialize services
const pool = (0, pool_1.createPgPool)();
const databaseService = new DatabaseService_1.DatabaseService(pool);
const telemetryService = new TelemetryService_1.TelemetryService();
const raceResultsEditor = new RaceResultsEditor_1.RaceResultsEditor(databaseService);
// Initialize database tables
databaseService.ensureInitialized().then(() => {
    logger_1.default.log('✅ Database initialized successfully');
}).catch((error) => {
    logger_1.default.error('❌ Database initialization failed:', error);
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
// Error handling middleware (must be last)
app.use(errorHandler_1.errorHandler);
// Start telemetry service only in development/local mode
const disableUDP = process.env.DISABLE_UDP === 'true';
const udpPort = process.env.F1_UDP_PORT ? parseInt(process.env.F1_UDP_PORT, 10) : 20999;
const udpAddress = process.env.F1_UDP_ADDR || '127.0.0.1';
if (!isProduction && !disableUDP) {
    try {
        telemetryService.start();
        logger_1.default.log(`📡 UDP Telemetry service started (local mode) on ${udpAddress}:${udpPort}`);
    }
    catch (error) {
        if (error?.code === 'EADDRINUSE') {
            logger_1.default.warn(`⚠️ UDP port ${udpPort} conflict detected, continuing without UDP service...`);
        }
        else {
            throw error;
        }
    }
}
else {
    logger_1.default.debug('📡 UDP Telemetry service disabled (production mode)');
}
// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger_1.default.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit the process for UDP port conflicts
    if (reason && typeof reason === 'object' && 'code' in reason && reason.code === 'EADDRINUSE') {
        logger_1.default.warn('⚠️ UDP port conflict detected, continuing without UDP service...');
        return;
    }
});
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger_1.default.error('❌ Uncaught Exception:', error);
    // Don't exit for UDP port conflicts
    if ('code' in error && error.code === 'EADDRINUSE') {
        logger_1.default.warn('⚠️ UDP port conflict detected, continuing without UDP service...');
        return;
    }
    process.exit(1);
});
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    logger_1.default.log(`🏎️  Project Bono Backend running on port ${PORT}`);
    logger_1.default.log(`📡 Telemetry service: ${telemetryService.isRunning ? 'Active' : 'Inactive'}`);
    logger_1.default.log(`🌍 Environment: ${isProduction ? 'Production' : 'Development'}`);
});
// Graceful shutdown
process.on('SIGINT', () => {
    logger_1.default.log('\n🛑 Shutting down gracefully...');
    telemetryService.stop();
    server.close(() => {
        logger_1.default.log('✅ Server closed');
        pool.end().then(() => {
            logger_1.default.log('✅ Database pool closed');
            process.exit(0);
        }).catch((error) => {
            logger_1.default.error('❌ Error closing database pool:', error);
            process.exit(1);
        });
    });
});
//# sourceMappingURL=index.js.map