import { Express } from 'express';
import { Server } from 'socket.io';
import { TelemetryService } from '../services/TelemetryService';
import { DatabaseService } from '../services/DatabaseService';
import { RaceResultsEditor } from '../services/RaceResultsEditor';
export declare function setupRoutes(app: Express, io: Server, services: {
    telemetryService: TelemetryService;
    databaseService: DatabaseService;
    raceResultsEditor: RaceResultsEditor;
}): void;
//# sourceMappingURL=index.d.ts.map