export interface Driver {
    id: string;
    name: string;
    team: string;
    number: number;
    createdAt: string;
    updatedAt: string;
}
export interface Season {
    id: string;
    name: string;
    year: number;
    startDate?: string;
    endDate?: string;
    status: 'active' | 'completed' | 'upcoming';
    createdAt: string;
    updatedAt: string;
}
export interface Track {
    id: string;
    name: string;
    country: string;
    location: string;
    length: number;
    laps: number;
    createdAt: string;
    updatedAt: string;
}
export interface Race {
    id: string;
    seasonId: string;
    trackId: string;
    raceDate: string;
    status: 'scheduled' | 'completed' | 'cancelled';
    createdAt: string;
    updatedAt: string;
}
export interface DriverMapping {
    id: string;
    seasonId: string;
    f123_driver_name: string;
    f123_driver_number?: number;
    yourDriverId: string;
    startDate: string;
    endDate?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface DriverData {
    name: string;
    team: string;
    number: number;
    seasonId?: string;
}
export interface SeasonData {
    name: string;
    year: number;
    startDate?: string | Date;
    endDate?: string | Date;
    status: 'active' | 'completed' | 'upcoming';
    pointsSystem?: string;
    fastestLapPoint?: boolean;
    isActive?: boolean;
}
export interface RaceData {
    seasonId: string;
    trackId: string;
    raceDate: string;
    status: 'scheduled' | 'completed' | 'cancelled';
}
export interface DriverMappingData {
    seasonId: string;
    f123_driver_name: string;
    f123_driver_number?: number;
    yourDriverId: string;
}
export declare class DatabaseService {
    private db;
    private initialized;
    constructor();
    private initializeTables;
    ensureInitialized(): Promise<void>;
    private generateId;
    private runQuery;
    private getQuery;
    private allQuery;
    getDriversBySeason(seasonId: string): Promise<Driver[]>;
    createDriver(driver: DriverData): Promise<Driver>;
    updateDriver(driverId: string, updates: Partial<DriverData>): Promise<Driver>;
    deleteDriver(driverId: string): Promise<void>;
    getAllSeasons(): Promise<Season[]>;
    getSeasonById(seasonId: string): Promise<Season | null>;
    createSeason(season: SeasonData): Promise<Season>;
    updateSeason(seasonId: string, updates: Partial<SeasonData>): Promise<Season>;
    deleteSeason(seasonId: string): Promise<void>;
    addDriverToSeason(seasonId: string, driverId: string): Promise<void>;
    createDriverAndAddToSeason(seasonId: string, driverData: DriverData): Promise<Driver>;
    removeDriverFromSeason(seasonId: string, driverId: string): Promise<void>;
    getTracksBySeason(seasonId: string): Promise<Track[]>;
    addTrackToSeason(seasonId: string, trackId: string): Promise<void>;
    createTrackAndAddToSeason(seasonId: string, trackData: any): Promise<Track>;
    removeTrackFromSeason(seasonId: string, trackId: string): Promise<void>;
    getRacesBySeason(seasonId: string): Promise<Race[]>;
    addRaceToSeason(seasonId: string, raceId: string): Promise<void>;
    createRaceAndAddToSeason(seasonId: string, raceData: any): Promise<string>;
    removeRaceFromSeason(seasonId: string, raceId: string): Promise<void>;
    findOrCreateTrack(trackName: string): Promise<Track>;
    createRace(race: RaceData): Promise<string>;
    getDriverMappings(seasonId: string): Promise<DriverMapping[]>;
    createDriverMapping(mapping: DriverMappingData): Promise<DriverMapping>;
    importRaceResults(raceId: string, sessionData: any): Promise<{
        resultsCount: number;
        lapTimesCount: number;
    }>;
    saveTelemetry(data: any): void;
    saveStrategy(strategy: any): void;
    saveAlert(alert: any): void;
    getTelemetryHistory(limit?: number): Promise<any[]>;
    getStrategyHistory(limit?: number): Promise<any[]>;
    getAlerts(limit?: number): Promise<any[]>;
    close(): void;
}
//# sourceMappingURL=DatabaseService.d.ts.map