import { Server } from 'socket.io';
import { TelemetryService } from '../services/TelemetryService';
import { StrategyEngine } from '../services/StrategyEngine';
export declare function setupSocketHandlers(io: Server, services: {
    telemetryService: TelemetryService;
    strategyEngine: StrategyEngine;
}): void;
//# sourceMappingURL=index.d.ts.map