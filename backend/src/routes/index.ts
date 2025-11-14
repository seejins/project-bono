import { Express } from 'express';
import { Server } from 'socket.io';
import { TelemetryService } from '../services/TelemetryService';
import { DatabaseService } from '../services/DatabaseService';
import { RaceResultsEditor } from '../services/RaceResultsEditor';
import uploadRoutes from './upload';
import seasonsRoutes from './seasons';
import sessionsRoutes from './sessions';
import driversRoutes from './drivers';
import tracksRoutes from './tracks';
import racesRoutes, { setupRacesRoutes } from './races';
import { RaceJSONImportService } from '../services/RaceJSONImportService';

export function setupRoutes(
  app: Express,
  io: Server,
  services: {
    telemetryService: TelemetryService;
    databaseService: DatabaseService;
    raceResultsEditor: RaceResultsEditor;
  }
) {
  const repositories = services.databaseService.repositories;
  const raceJsonImportService = new RaceJSONImportService(services.databaseService, io);
  
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
    } catch (error) {
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
    } else {
      res.status(404).json({ error: 'No telemetry data available' });
    }
  });

  // Get telemetry history
  app.get('/api/telemetry/history', (req, res) => {
    const buffer = services.telemetryService.getDataBuffer();
    res.json(buffer);
  });

  // Upload routes for F1 23 data
  app.use('/api/upload', uploadRoutes(services.databaseService));
  
  // Seasons management routes
  app.use('/api/seasons', seasonsRoutes(services.databaseService, repositories, raceJsonImportService));
  
  // Drivers management routes
  app.use('/api/drivers', driversRoutes(services.databaseService, repositories));
  
  // Tracks management routes
  app.use('/api/tracks', tracksRoutes(services.databaseService, repositories));
  
  // Session data routes (for local host app)
  app.use('/api/sessions', sessionsRoutes(services.databaseService, repositories));
  
  // Race results and editing routes
  setupRacesRoutes(services.databaseService, services.raceResultsEditor, io, {
    raceJsonImportService,
  });
  app.use('/api/races', racesRoutes);
}