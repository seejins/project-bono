export interface Member {
    id: string;
    name: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface MemberData {
    name: string;
    isActive?: boolean;
}
export interface Driver {
    id: string;
    name: string;
    team: string;
    number: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface DriverData {
    name: string;
    team: string;
    number: number;
    isActive?: boolean;
}
export interface Season {
    id: string;
    name: string;
    year: number;
    startDate?: string;
    endDate?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface SeasonData {
    name: string;
    year: number;
    startDate?: string;
    endDate?: string;
    isActive?: boolean;
}
export interface Track {
    id: string;
    name: string;
    country: string;
    city: string;
    length: number;
    laps: number;
    createdAt: string;
    updatedAt: string;
}
export interface TrackData {
    name: string;
    country: string;
    city?: string;
    circuitLength: number;
    laps: number;
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
export interface RaceData {
    seasonId: string;
    trackId: string;
    raceDate: string;
    status?: 'scheduled' | 'completed' | 'cancelled';
}
export interface DriverMapping {
    id: string;
    seasonId: string;
    f123DriverId: number;
    f123DriverName: string;
    f123DriverNumber?: number;
    f123TeamName?: string;
    memberId?: string;
    isHuman: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface DriverMappingData {
    seasonId: string;
    f123DriverId: number;
    f123DriverName: string;
    f123DriverNumber?: number;
    f123TeamName?: string;
    memberId?: string;
    isHuman?: boolean;
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
    private executeUpdate;
    createMember(data: MemberData): Promise<string>;
    getAllMembers(): Promise<Member[]>;
    getMemberById(id: string): Promise<Member | null>;
    updateMember(id: string, data: Partial<MemberData>): Promise<void>;
    deleteMember(id: string): Promise<void>;
    createDriver(data: DriverData): Promise<string>;
    updateDriver(id: string, data: Partial<DriverData>): Promise<void>;
    deleteDriver(id: string): Promise<void>;
    getAllSeasons(): Promise<Season[]>;
    getSeasonById(id: string): Promise<Season | null>;
    createSeason(data: SeasonData): Promise<string>;
    updateSeason(id: string, data: Partial<SeasonData>): Promise<void>;
    deleteSeason(id: string): Promise<void>;
    getDriversBySeason(seasonId: string): Promise<Member[]>;
    addDriverToSeason(seasonId: string, memberId: string): Promise<void>;
    removeDriverFromSeason(seasonId: string, memberId: string): Promise<void>;
    getTracksBySeason(seasonId: string): Promise<Track[]>;
    addTrackToSeason(seasonId: string, trackId: string): Promise<void>;
    removeTrackFromSeason(seasonId: string, trackId: string): Promise<void>;
    getRacesBySeason(seasonId: string): Promise<Race[]>;
    addRaceToSeason(seasonId: string, raceData: RaceData): Promise<string>;
    removeRaceFromSeason(seasonId: string, raceId: string): Promise<void>;
    createTrack(data: TrackData): Promise<string>;
    createTrackAndAddToSeason(seasonId: string, data: TrackData): Promise<string>;
    findOrCreateTrack(trackName: string): Promise<Track>;
    createRace(data: RaceData): Promise<string>;
    getDriverMappings(seasonId: string): Promise<DriverMapping[]>;
    createDriverMapping(data: DriverMappingData): Promise<string>;
    importRaceResults(raceId: string, sessionData: any): Promise<{
        resultsCount: number;
        lapTimesCount: number;
    }>;
}
//# sourceMappingURL=DatabaseService.d.ts.map