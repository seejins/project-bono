import { DatabaseService } from './DatabaseService';
import { TelemetryService } from './TelemetryService';
import { Server } from 'socket.io';
import { F123UDPProcessor } from './F123UDPProcessor';
export declare class PostSessionProcessor {
    private dbService;
    private telemetryService;
    private io;
    private f123UDPProcessor;
    constructor(dbService: DatabaseService, telemetryService: TelemetryService, io: Server, f123UDPProcessor?: F123UDPProcessor);
    private handleSessionEnd;
    private extractSessionInfo;
    private findActiveEventBySession;
    private findFlexibleMatch;
    private generateTrackNameVariations;
    private mapDriversToLeague;
    private markEventAsCompleted;
    private recalculateSeasonStandings;
    private handleOrphanedSession;
    private notifyAdminOfOrphanedSession;
    private logSessionError;
    private query;
}
//# sourceMappingURL=PostSessionProcessor.d.ts.map