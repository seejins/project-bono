import { Express } from 'express';
import { TelemetryService } from '../services/TelemetryService';
import { StrategyEngine } from '../services/StrategyEngine';
import { DatabaseService } from '../services/DatabaseService';
export declare function setupRoutes(app: Express, services: {
    telemetryService: TelemetryService;
    strategyEngine: StrategyEngine;
    databaseService: DatabaseService;
}): void;
//# sourceMappingURL=index.d.ts.map