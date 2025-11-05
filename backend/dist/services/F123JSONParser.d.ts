export interface ParsedSessionData {
    sessionInfo: {
        trackName: string;
        trackId: string;
        sessionType: number;
        sessionTypeName: string;
        airTemperature: number;
        trackTemperature: number;
        rainPercentage: number;
        totalLaps: number;
        trackLength: number;
        date?: string;
        sessionUID?: bigint;
    };
    driverResults: Array<{
        driverName: string;
        carNumber: number;
        teamName: string;
        position: number;
        gridPosition: number;
        points: number;
        numLaps: number;
        bestLapTimeMs: number;
        sector1TimeMs?: number;
        sector2TimeMs?: number;
        sector3TimeMs?: number;
        totalRaceTimeMs?: number;
        penalties: number;
        warnings: number;
        numUnservedDriveThroughPens: number;
        numUnservedStopGoPens: number;
        resultStatus: number;
        dnfReason?: string;
        fastestLap: boolean;
        polePosition: boolean;
        networkId?: number;
        steamId?: string;
    }>;
    lapHistory?: Array<{
        driverName: string;
        carNumber: number;
        laps: Array<{
            lapNumber: number;
            lapTimeMs: number;
            sector1TimeMs: number;
            sector2TimeMs: number;
            sector3TimeMs: number;
            valid: boolean;
        }>;
    }>;
}
export declare class F123JSONParser {
    /**
     * Parse F1 23 JSON session file
     */
    static parseSessionFile(filePath: string): ParsedSessionData;
    /**
     * Parse JSON data structure
     */
    private static parseJSONData;
    /**
     * Extract session metadata
     */
    private static extractSessionInfo;
    /**
     * Extract driver results from final classification
     */
    private static extractDriverResults;
    /**
     * Extract best lap sector times from lap-time-history
     */
    private static extractBestLapData;
    /**
     * Extract lap history (optional)
     */
    private static extractLapHistory;
    /**
     * Map track ID to name
     */
    private static mapTrackIdToName;
    /**
     * Map session type string to number
     */
    private static mapSessionTypeToNumber;
    /**
     * Map result status string to number
     */
    private static mapResultStatus;
    /**
     * Extract rain percentage
     */
    private static extractRainPercentage;
    /**
     * Extract date from filename or session data
     */
    private static extractDate;
}
//# sourceMappingURL=F123JSONParser.d.ts.map