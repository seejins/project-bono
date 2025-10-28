import { Express } from 'express';
import { TelemetryService } from '../services/TelemetryService';
import { StrategyEngine } from '../services/StrategyEngine';
import { DatabaseService } from '../services/DatabaseService';
import { F123UDPProcessor } from '../services/F123UDPProcessor';
export declare function setupRoutes(app: Express, services: {
    telemetryService: TelemetryService;
    strategyEngine: StrategyEngine;
    databaseService: DatabaseService;
    f123UDPProcessor: F123UDPProcessor;
}): void;
//# sourceMappingURL=index.d.ts.map