export interface Member {
    id: string;
    name: string;
    steam_id?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface MemberData {
    name: string;
    steam_id?: string;
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
    fastestLap: boolean;
    createdAt: string;
}
export declare class DatabaseService {
    private db;
    private initialized;
    private initializationPromise;
    constructor();
    private initializeTables;
    private performInitialization;
    private runMigrations;
    private createMigrationsTable;
    private runMigration;
    private hasMigrationRun;
    private markMigrationAsRun;
    private addColumnIfNotExists;
    ensureInitialized(): Promise<void>;
    private executeQuery;
    private executeUpdate;
    createMember(data: MemberData): Promise<string>;
    getAllMembers(): Promise<Member[]>;
    getMemberById(id: string): Promise<Member | null>;
    updateMember(id: string, data: Partial<MemberData>): Promise<void>;
    deleteMember(id: string): Promise<void>;
    createSeason(data: SeasonData): Promise<string>;
    getAllSeasons(): Promise<Season[]>;
    getSeasonById(id: string): Promise<Season | null>;
    updateSeason(id: string, data: Partial<SeasonData>): Promise<void>;
    deleteSeason(id: string): Promise<void>;
    createTrack(data: TrackData): Promise<string>;
    getAllTracks(): Promise<Track[]>;
    getTrackById(id: string): Promise<Track | null>;
    createRace(data: RaceData): Promise<string>;
    getRacesBySeason(seasonId: string): Promise<Race[]>;
    createDriverMapping(data: DriverMappingData): Promise<string>;
    getDriverMappingsBySeason(seasonId: string): Promise<DriverMapping[]>;
    updateDriverMapping(id: string, data: Partial<DriverMappingData>): Promise<void>;
    deleteDriverMapping(id: string): Promise<void>;
    importSessionResults(raceId: string, results: SessionResult[]): Promise<void>;
    getSessionResultsByRace(raceId: string): Promise<SessionResult[]>;
    getMemberCareerStats(memberId: string): Promise<any>;
    getMemberSeasonStats(memberId: string, seasonId: string): Promise<any>;
    getMemberRaceHistory(memberId: string, limit?: number): Promise<any[]>;
    private getDefaultStats;
    getActiveSeason(): Promise<Season | null>;
    getMemberBySteamId(steamId: string): Promise<Member | null>;
    findOrCreateTrack(trackName: string): Promise<string>;
    getDriverMappings(seasonId: string): Promise<DriverMapping[]>;
    importRaceResults(raceId: string, results: SessionResult[]): Promise<void>;
    deactivateAllOtherSeasons(currentSeasonId: string): Promise<void>;
    getDriversBySeason(seasonId: string): Promise<Driver[]>;
    createDriver(data: DriverData): Promise<string>;
    updateDriver(id: string, data: Partial<DriverData>): Promise<void>;
    deleteDriver(id: string): Promise<void>;
    addUDPParticipant(data: any): Promise<void>;
    addUDPSessionResult(data: any): Promise<void>;
    addUDPTyreStint(data: any): Promise<void>;
    addUDPLapHistory(data: any): Promise<void>;
    getUDPSessionResults(): Promise<any[]>;
    getUDPLapHistory(): Promise<any[]>;
    addDriverToSeason(seasonId: string, memberId: string): Promise<void>;
    removeDriverFromSeason(seasonId: string, driverId: string): Promise<void>;
    getTracksBySeason(seasonId: string): Promise<Track[]>;
    createTrackAndAddToSeason(data: TrackData, seasonId: string): Promise<string>;
    removeTrackFromSeason(seasonId: string, trackId: string): Promise<void>;
    addRaceToSeason(data: RaceData): Promise<string>;
    removeRaceFromSeason(raceId: string): Promise<void>;
    getEventsBySeason(seasonId: string): Promise<any[]>;
    addEventToSeason(seasonId: string, eventData: any): Promise<string>;
    updateEventInSeason(eventId: string, eventData: any): Promise<void>;
    removeEventFromSeason(eventId: string): Promise<void>;
    close(): Promise<void>;
}
//# sourceMappingURL=DatabaseService.d.ts.map