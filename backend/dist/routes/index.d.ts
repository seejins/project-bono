import { Express } from 'express';
import { Server } from 'socket.io';
import { TelemetryService } from '../services/TelemetryService';
import { DatabaseService } from '../services/DatabaseService';
import { F123UDPProcessor } from '../services/F123UDPProcessor';
import { PostSessionProcessor } from '../services/PostSessionProcessor';
import { RaceResultsEditor } from '../services/RaceResultsEditor';
export declare function setupRoutes(app: Express, io: Server, services: {
    telemetryService: TelemetryService;
    databaseService: DatabaseService;
    f123UDPProcessor: F123UDPProcessor;
    postSessionProcessor: PostSessionProcessor;
    raceResultsEditor: RaceResultsEditor;
}): void;
//# sourceMappingURL=index.d.ts.map