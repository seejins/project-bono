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
}
export interface SessionResult {
    id: string;
    raceId: string;
    driverId: string;
    position: number;
    lapTime: number;
    sector1Time: number;
    sector2Time: number;
    sector3Time: number;
    fastestLap: boolean;
    createdAt: string;
}
export interface TelemetryData {
    id: string;
    sessionId: string;
    driverId: string;
    lapNumber: number;
    sector1Time: number;
    sector2Time: number;
    sector3Time: number;
    lapTime: number;
    timestamp: string;
}
export interface SessionFileUpload {
    id: string;
    filename: string;
    originalName: string;
    fileSize: number;
    uploadDate: string;
    processed: boolean;
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
    status?: 'active' | 'completed' | 'upcoming';
    pointsSystem?: string;
    fastestLapPoint?: boolean;
    isActive?: boolean;
}
export interface TrackData {
    name: string;
    country: string;
    location?: string;
    length: number;
    laps: number;
}
export interface RaceData {
    seasonId: string;
    trackId: string;
    raceDate: string | Date;
    status?: 'scheduled' | 'completed' | 'cancelled';
    date?: string | Date;
    time?: string;
    type?: string;
}
export interface DriverMappingData {
    seasonId: string;
    f123_driver_name: string;
    f123_driver_number?: number;
    yourDriverId: string;
}
export interface SessionFileUploadData {
    filename: string;
    originalName: string;
    fileSize: number;
    processed?: boolean;
}
export declare class DatabaseService {
    private db;
    private initialized;
    private isPostgreSQL;
    constructor();
    private initializeTables;
    private initializePostgreSQLTables;
    private initializeSQLiteTables;
    ensureInitialized(): Promise<void>;
    private generateId;
    private executeQuery;
    private executeQuerySingle;
    private executeUpdate;
    createDriver(data: DriverData): Promise<string>;
    getDriverById(id: string): Promise<Driver | null>;
    updateDriver(id: string, data: Partial<DriverData>): Promise<void>;
    deleteDriver(id: string): Promise<void>;
    getDriversBySeason(seasonId: string): Promise<Driver[]>;
    getAllSeasons(): Promise<Season[]>;
    getSeasonById(id: string): Promise<Season | null>;
    createSeason(data: SeasonData): Promise<string>;
    updateSeason(id: string, data: Partial<SeasonData>): Promise<Season | null>;
    deleteSeason(id: string): Promise<void>;
    findOrCreateTrack(name: string, country?: string): Promise<Track>;
    getTrackById(id: string): Promise<Track | null>;
    getTracksBySeason(seasonId: string): Promise<Track[]>;
    createRace(data: RaceData): Promise<string>;
    getRaceById(id: string): Promise<Race | null>;
    getRacesBySeason(seasonId: string): Promise<Race[]>;
    addDriverToSeason(seasonId: string, driverId: string): Promise<void>;
    removeDriverFromSeason(seasonId: string, driverId: string): Promise<void>;
    addTrackToSeason(seasonId: string, trackId: string): Promise<void>;
    removeTrackFromSeason(seasonId: string, trackId: string): Promise<void>;
    addRaceToSeason(seasonId: string, raceId: string): Promise<void>;
    removeRaceFromSeason(seasonId: string, raceId: string): Promise<void>;
    createDriverAndAddToSeason(seasonId: string, data: DriverData): Promise<Driver>;
    createTrackAndAddToSeason(seasonId: string, data: TrackData): Promise<Track>;
    createRaceAndAddToSeason(seasonId: string, data: RaceData): Promise<string>;
    getDriverMappings(seasonId: string): Promise<DriverMapping[]>;
    createDriverMapping(data: DriverMappingData): Promise<DriverMapping>;
    importRaceResults(raceId: string, sessionData: any): Promise<{
        resultsCount: number;
        lapTimesCount: number;
    }>;
}
//# sourceMappingURL=DatabaseService.d.ts.map