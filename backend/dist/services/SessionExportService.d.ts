import { F123TelemetryData } from './TelemetryService';
export interface SessionExportData {
    sessionType: number;
    sessionTypeName: string;
    sessionStartTime: Date | null;
    sessionEndTime: Date;
    trackName: string;
    drivers: F123TelemetryData[];
}
export interface SessionResult {
    driverId: string;
    driverName: string;
    teamName: string;
    carNumber: number;
    position: number;
    lapTime: number;
    sector1Time: number;
    sector2Time: number;
    sector3Time: number;
    bestLapTime: number;
    gapToPole: number;
    penalties: number;
    warnings: number;
    dnfReason?: string;
    dataSource: 'UDP' | 'MANUAL' | 'FILE_UPLOAD';
}
export declare class SessionExportService {
    private dbService;
    constructor();
    /**
     * Export session data when a session ends
     */
    exportSessionData(sessionData: SessionExportData): Promise<void>;
    /**
     * Create or update race record
     */
    private createOrUpdateRace;
    /**
     * Process driver results from telemetry data
     */
    private processDriverResults;
    /**
     * Find pole position time
     */
    private findPoleTime;
    /**
     * Save session results to database
     */
    private saveSessionResults;
    /**
     * Save telemetry data to database
     */
    private saveTelemetryData;
    /**
     * Import session data from uploaded file
     */
    importSessionFile(raceId: string, filename: string, fileContent: string, fileType: 'JSON' | 'CSV' | 'TXT'): Promise<void>;
    /**
     * Parse CSV file content
     */
    private parseCSV;
    /**
     * Parse TXT file content
     */
    private parseTXT;
    /**
     * Process imported data
     */
    private processImportedData;
    /**
     * Get session statistics
     */
    getSessionStatistics(raceId: string): Promise<any>;
}
//# sourceMappingURL=SessionExportService.d.ts.map