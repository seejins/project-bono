import { DatabaseService } from './DatabaseService';
import { Server } from 'socket.io';
export declare class RaceJSONImportService {
    private dbService;
    private io;
    constructor(dbService: DatabaseService, io: Server);
    /**
     * Validate JSON file structure
     */
    validateJSONFile(filePath: string): Promise<{
        valid: boolean;
        errors?: string[];
    }>;
    /**
     * Import race JSON file
     * Processes F1 23 JSON session files and stores them in the database
     */
    importRaceJSON(filePath: string, seasonId: string, raceId?: string): Promise<{
        raceId: string;
        sessionResultId: string;
        importedCount: number;
    }>;
    /**
     * Check if lap time is the fastest in the session
     */
    private isFastestLap;
}
//# sourceMappingURL=RaceJSONImportService.d.ts.map