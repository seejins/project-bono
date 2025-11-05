import { DatabaseService } from './DatabaseService';
import { Server } from 'socket.io';
export declare class RaceResultsProcessor {
    private dbService;
    private io;
    constructor(dbService: DatabaseService, io: Server);
    private query;
    /**
     * Process session results and store in database
     */
    processSessionResults(sessionInfo: any, driverResults: any[], raceId?: string): Promise<{
        raceId: string;
        sessionResultId: string;
    }>;
    private findOrCreateRace;
    private generateTrackNameVariations;
    private mapDriversToLeague;
    private markEventAsCompleted;
    private recalculateSeasonStandings;
    private handleOrphanedSession;
    private logSessionError;
}
//# sourceMappingURL=RaceResultsProcessor.d.ts.map