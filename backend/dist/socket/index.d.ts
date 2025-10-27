import { Server } from 'socket.io';
import { TelemetryService } from '../services/TelemetryService';
import { StrategyEngine } from '../services/StrategyEngine';
import { SessionExportService } from '../services/SessionExportService';
export declare function setupSocketHandlers(io: Server, services: {
    telemetryService: TelemetryService;
    strategyEngine: StrategyEngine;
    sessionExportService: SessionExportService;
}): void;
//# sourceMappingURL=index.d.ts.map