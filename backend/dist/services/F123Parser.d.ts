export interface F123SessionData {
    sessionType: 'practice' | 'qualifying' | 'race' | 'sprint';
    trackName: string;
    date: string;
    drivers: F123DriverData[];
    results: F123RaceResult[];
}
export interface F123DriverData {
    name: string;
    number: number;
    team: string;
    position: number;
    points: number;
    fastestLap: boolean;
    polePosition: boolean;
    dnf: boolean;
    dnfReason?: string;
    raceTime?: number;
    gapToLeader?: number;
    lapTimes: F123LapTime[];
}
export interface F123LapTime {
    lapNumber: number;
    lapTime: number;
    sector1: number;
    sector2: number;
    sector3: number;
    tireCompound: string;
}
export interface F123RaceResult {
    driverName: string;
    driverNumber: number;
    position: number;
    points: number;
    fastestLap: boolean;
    polePosition: boolean;
    dnf: boolean;
    dnfReason?: string;
    raceTime?: number;
    gapToLeader?: number;
}
export declare class F123Parser {
    /**
     * Parse F1 23 session file and extract race data
     */
    static parseSessionFile(filePath: string): F123SessionData;
    /**
     * Parse JSON format F1 23 session file
     */
    private static parseJSONFile;
    /**
     * Parse CSV format F1 23 session file
     */
    private static parseCSVFile;
    /**
     * Detect session type from F1 23 data
     */
    private static detectSessionType;
    /**
     * Extract lap times from F1 23 data
     */
    private static extractLapTimes;
    /**
     * Convert time string to milliseconds
     */
    private static convertTimeToMs;
    /**
     * Validate parsed session data
     */
    static validateSessionData(data: F123SessionData): {
        isValid: boolean;
        errors: string[];
    };
}
//# sourceMappingURL=F123Parser.d.ts.map