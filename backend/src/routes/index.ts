import { Express } from 'express';
import { TelemetryService } from '../services/TelemetryService';
import { StrategyEngine } from '../services/StrategyEngine';
import { DatabaseService } from '../services/DatabaseService';
import uploadRoutes from './upload';
import seasonsRoutes from './seasons';
import sessionsRoutes from './sessions';

export function setupRoutes(
  app: Express,
  services: {
    telemetryService: TelemetryService;
    strategyEngine: StrategyEngine;
    databaseService: DatabaseService;
  }
) {
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
    } else {
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
    } else {
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
  app.use('/api/upload', uploadRoutes(services.databaseService));
  
  // Seasons management routes
  app.use('/api/seasons', seasonsRoutes(services.databaseService));
  
  // Session data routes (for local host app)
  app.use('/api/sessions', sessionsRoutes(services.databaseService));
}
