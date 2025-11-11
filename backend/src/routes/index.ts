import { Express } from 'express';
import { Server } from 'socket.io';
import { TelemetryService } from '../services/TelemetryService';
import { DatabaseService } from '../services/DatabaseService';
import { F123UDPProcessor } from '../services/F123UDPProcessor';
import { PostSessionProcessor } from '../services/PostSessionProcessor';
import { RaceResultsEditor } from '../services/RaceResultsEditor';
import uploadRoutes from './upload';
import seasonsRoutes from './seasons';
import sessionsRoutes from './sessions';
import driversRoutes from './drivers';
import tracksRoutes from './tracks';
import racesRoutes, { setupRacesRoutes } from './races';

export function setupRoutes(
  app: Express,
  io: Server,
  services: {
    telemetryService: TelemetryService;
    databaseService: DatabaseService;
    f123UDPProcessor: F123UDPProcessor;
    postSessionProcessor: PostSessionProcessor;
    raceResultsEditor: RaceResultsEditor;
  }
) {
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
    } else {
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
    } catch (error) {
      res.status(500).json({ error: 'Failed to initialize F1 23 UDP Processor' });
    }
  });

  app.post('/api/f123-udp/stop', async (req, res) => {
    try {
      services.f123UDPProcessor.stop();
      res.json({ message: 'F1 23 UDP Processor stopped successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to stop F1 23 UDP Processor' });
    }
  });

  app.post('/api/f123-udp/set-active-season/:seasonId', async (req, res) => {
    try {
      const { seasonId } = req.params;
      await services.f123UDPProcessor.setActiveSeason(seasonId);
      res.json({ message: `Active season set to ${seasonId}` });
    } catch (error) {
      res.status(500).json({ error: 'Failed to set active season' });
    }
  });

  app.post('/api/f123-udp/set-current-event/:eventId', async (req, res) => {
    try {
      const { eventId } = req.params;
      await services.f123UDPProcessor.setCurrentEvent(eventId);
      res.json({ message: `Current event set to ${eventId}` });
    } catch (error) {
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
    } catch (error) {
      res.status(500).json({ error: 'Failed to get session results' });
    }
  });

  // Get UDP lap history for a driver
  app.get('/api/f123-udp/lap-history/:driverId', async (req, res) => {
    try {
      const { driverId } = req.params;
      const { sessionUid } = req.query;
      const lapHistory = await services.databaseService.getUDPLapHistory(driverId);
      res.json({ lapHistory });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get lap history' });
    }
  });

  // Upload routes for F1 23 data
  app.use('/api/upload', uploadRoutes(services.databaseService));
  
  // Seasons management routes
  app.use('/api/seasons', seasonsRoutes(services.databaseService));
  
  // Drivers management routes
  app.use('/api/drivers', driversRoutes(services.databaseService));
  
  // Tracks management routes
  app.use('/api/tracks', tracksRoutes(services.databaseService));
  
  // Session data routes (for local host app)
  app.use('/api/sessions', sessionsRoutes(services.databaseService));
  
  // Race results and editing routes
  setupRacesRoutes(services.databaseService, services.raceResultsEditor, io);
  app.use('/api/races', racesRoutes);
}