import { DatabaseService } from './DatabaseService';
import { Server } from 'socket.io';
export declare class RaceJSONImportService {
    private dbService;
    private raceResultsProcessor;
    private io;
    constructor(dbService: DatabaseService, io: Server);
    /**
     * Import race JSON file
     */
    importRaceJSON(filePath: string, seasonId: string, raceId?: string): Promise<{
        raceId: string;
        sessionResultId: string;
        importedCount: number;
    }>;
    /**
     * Transform parsed data to database format
     */
    private transformToDatabaseFormat;
    /**
     * Import multiple JSON files (for batch processing)
     */
    importMultipleJSONFiles(filePaths: string[], seasonId: string): Promise<Array<{
        file: string;
        success: boolean;
        raceId?: string;
        error?: string;
    }>>;
    /**
     * Validate JSON file before import
     */
    validateJSONFile(filePath: string): Promise<{
        valid: boolean;
        errors: string[];
    }>;
}
//# sourceMappingURL=RaceJSONImportService.d.ts.map