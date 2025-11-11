import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { TelemetryService } from './services/TelemetryService';
import { DatabaseService } from './services/DatabaseService';
import { SessionExportService } from './services/SessionExportService';
import { F123UDPProcessor } from './services/F123UDPProcessor';
import { PostSessionProcessor } from './services/PostSessionProcessor';
import { RaceResultsEditor } from './services/RaceResultsEditor';
import { setupRoutes } from './routes';
import { setupSocketHandlers } from './socket';
import { createPgPool } from './services/database/pool';
import path from 'path';

// Load .env file from backend directory
dotenv.config({ path: path.join(__dirname, '../.env') });

// Debug: Log database configuration
console.log('🔍 Database Config:', {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || '5432',
  database: process.env.DB_NAME || 'f1_race_engineer_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD ? '***' : '(empty)'
});

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176", "http://localhost:5177"],
    methods: ["GET", "POST"]
  },
  pingTimeout: 30000,  // Wait 30s before consider client dead
  pingInterval: 10000, // Send ping every 10s
});
console.log('[Socket.IO] Server initialized with robust pingTimeout/pingInterval');

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Initialize services
const pool = createPgPool();
const databaseService = new DatabaseService(pool);
const telemetryService = new TelemetryService();
const sessionExportService = new SessionExportService(databaseService);
const f123UDPProcessor = new F123UDPProcessor(databaseService, telemetryService);
const raceResultsEditor = new RaceResultsEditor(databaseService);
const postSessionProcessor = new PostSessionProcessor(databaseService, telemetryService, io, f123UDPProcessor);

// Initialize database tables
databaseService.ensureInitialized().then(() => {
  console.log('✅ Database initialized successfully');
}).catch((error) => {
  console.error('❌ Database initialization failed:', error);
  process.exit(1);
});

// Setup routes
setupRoutes(app, io, { 
  telemetryService, 
  databaseService, 
  f123UDPProcessor,
  postSessionProcessor,
  raceResultsEditor 
});

// Setup Socket.IO handlers
setupSocketHandlers(io, { telemetryService, sessionExportService });

// Start telemetry service only in development/local mode
const isProduction = process.env.NODE_ENV === 'production';
const disableUDP = process.env.DISABLE_UDP === 'true';

if (!isProduction && !disableUDP) {
  telemetryService.start();
  console.log('📡 UDP Telemetry service started (local mode)');
  // Initialize F123UDPProcessor (it listens to TelemetryService events, doesn't create its own UDP listener)
  f123UDPProcessor.initialize().then(() => {
    console.log('✅ F123UDPProcessor initialized');
  }).catch((error) => {
    console.error('❌ Failed to initialize F123UDPProcessor:', error);
  });
} else {
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
  f123UDPProcessor.stop(); // Just clears state, doesn't stop UDP (handled by TelemetryService)
  server.close(() => {
    console.log('✅ Server closed');
    pool.end().then(() => {
      console.log('✅ Database pool closed');
      process.exit(0);
    }).catch((error) => {
      console.error('❌ Error closing database pool:', error);
      process.exit(1);
    });
  });
});
