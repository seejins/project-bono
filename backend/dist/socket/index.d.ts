import { Server } from 'socket.io';
import { TelemetryService } from '../services/TelemetryService';
import { SessionExportService } from '../services/SessionExportService';
export declare function setupSocketHandlers(io: Server, services: {
    telemetryService: TelemetryService;
    sessionExportService: SessionExportService;
}): void;
//# sourceMappingURL=index.d.ts.map