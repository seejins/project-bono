import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { TelemetryService } from './services/TelemetryService';
import { StrategyEngine } from './services/StrategyEngine';
import { DatabaseService } from './services/DatabaseService';
import { SessionExportService } from './services/SessionExportService'; 
import { setupRoutes } from './routes';
import { setupSocketHandlers } from './socket';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Initialize services
const databaseService = new DatabaseService();
const telemetryService = new TelemetryService();
const strategyEngine = new StrategyEngine();
const sessionExportService = new SessionExportService();

// Setup routes
setupRoutes(app, { telemetryService, strategyEngine, databaseService });

// Setup Socket.IO handlers
setupSocketHandlers(io, { telemetryService, strategyEngine, sessionExportService });

// Start telemetry service only in development/local mode
const isProduction = process.env.NODE_ENV === 'production';
const disableUDP = process.env.DISABLE_UDP === 'true';

if (!isProduction && !disableUDP) {
  telemetryService.start();
  console.log('📡 UDP Telemetry service started (local mode)');
} else {
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
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
