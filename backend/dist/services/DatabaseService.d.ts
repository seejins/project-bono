export interface Driver {
    id: string;
    name: string;
    team?: string;
    number?: number;
    seasonId?: string;
    steam_id?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface DriverData {
    name: string;
    team?: string;
    number?: number;
    seasonId?: string;
    steam_id?: string;
    isActive?: boolean;
}
export type Member = Driver;
export type MemberData = DriverData;
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
    trackName?: string;
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
    yourDriverId?: string;
    createdAt: string;
    updatedAt: string;
}
export interface DriverMappingData {
    seasonId: string;
    f123DriverId: number;
    f123DriverName: string;
    f123DriverNumber?: number;
    f123TeamName?: string;
    yourDriverId?: string;
}
export interface SessionResult {
    driverId?: string | null;
    driverName: string;
    teamName?: string | null;
    carNumber?: number | null;
    position?: number | null;
    lapTime?: number | null;
    sector1Time?: number | null;
    sector2Time?: number | null;
    sector3Time?: number | null;
    bestLapTime?: number | null;
    gapToPole?: number | null;
    fastestLap?: boolean | null;
    polePosition?: boolean | null;
    penalties?: number | null;
    warnings?: number | null;
    dnfReason?: string | null;
    points?: number | null;
    lapTimes?: Array<{
        lapNumber?: number;
        lapTime?: number;
        sector1Time?: number;
        sector2Time?: number;
        sector3Time?: number;
    }>;
    dataSource?: 'UDP' | 'FILE_UPLOAD' | 'MANUAL';
}
export declare class DatabaseService {
    private db;
    private initialized;
    private initializationPromise;
    constructor();
    private transformSeasonToCamelCase;
    private transformDriverToCamelCase;
    private transformRaceToCamelCase;
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
    /**
     * Public method to execute SQL queries
     * Use this instead of accessing private db property
     */
    query(sql: string, params?: any[]): Promise<any>;
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
    getRaceById(raceId: string): Promise<any | null>;
    createDriverMapping(data: DriverMappingData): Promise<string>;
    getDriverMappingsBySeason(seasonId: string): Promise<DriverMapping[]>;
    updateDriverMapping(id: string, data: Partial<DriverMappingData>): Promise<void>;
    deleteDriverMapping(id: string): Promise<void>;
    importSessionResults(raceId: string, results: SessionResult[]): Promise<{
        resultsCount: number;
        lapTimesCount: number;
    }>;
    getSessionResultsByRace(raceId: string): Promise<SessionResult[]>;
    storeF123SessionResults(raceId: string, sessionType: number, driverResults: any[]): Promise<void>;
    getMemberCareerStats(memberId: string): Promise<any>;
    private getDefaultStats;
    getActiveSeason(): Promise<Season | null>;
    getDriverBySteamId(steamId: string): Promise<Driver | null>;
    findOrCreateTrack(trackName: string, lengthKm?: number): Promise<string>;
    getDriverMappings(seasonId: string): Promise<DriverMapping[]>;
    importRaceResults(raceId: string, data: SessionResult[] | {
        results?: any[];
    }): Promise<{
        resultsCount: number;
        lapTimesCount: number;
    }>;
    deactivateAllOtherSeasons(currentSeasonId: string): Promise<void>;
    getDriversBySeason(seasonId: string): Promise<Driver[]>;
    getAllDrivers(): Promise<Driver[]>;
    getAllMembers(): Promise<Member[]>;
    createMember(data: MemberData): Promise<string>;
    getMemberById(id: string): Promise<Member | null>;
    updateMember(id: string, data: Partial<MemberData>): Promise<void>;
    deleteMember(id: string): Promise<void>;
    getMemberCareerProfile(memberId: string): Promise<any>;
    getMemberSeasonStats(memberId: string, seasonId: string): Promise<any>;
    getMemberRaceHistory(memberId: string, seasonId?: string): Promise<any[]>;
    createDriver(data: DriverData): Promise<string>;
    updateDriver(id: string, data: Partial<DriverData>): Promise<void>;
    getDriverById(id: string): Promise<Driver | null>;
    deleteDriver(id: string): Promise<void>;
    addUDPParticipant(data: any): Promise<void>;
    addUDPSessionResult(data: any): Promise<void>;
    addUDPTyreStint(data: any): Promise<void>;
    addUDPLapHistory(data: any): Promise<void>;
    /**
     * Batch insert lap history data (much more efficient than individual inserts)
     */
    batchAddUDPLapHistory(lapHistoryArray: any[]): Promise<void>;
    getUDPSessionResults(): Promise<any[]>;
    getUDPLapHistory(driverId?: string): Promise<any[]>;
    getCurrentEventForSeason(seasonId: string): Promise<string | null>;
    getUDPParticipantsBySession(sessionUid: bigint): Promise<any[]>;
    getUDPSessionResultsBySession(sessionUid: bigint): Promise<any[]>;
    getUDPLapHistoryByDriver(driverId: string, sessionUid?: bigint): Promise<any[]>;
    getUDPTyreStintsByDriver(driverId: string, sessionUid?: bigint): Promise<any[]>;
    addDriverToSeason(seasonId: string, driverId: string): Promise<void>;
    removeDriverFromSeason(seasonId: string, driverId: string): Promise<void>;
    updateSeasonParticipant(driverId: string, data: {
        team?: string;
        number?: number;
    }): Promise<void>;
    getTracksBySeason(seasonId: string): Promise<Track[]>;
    createTrackAndAddToSeason(data: TrackData, seasonId: string): Promise<string>;
    removeTrackFromSeason(seasonId: string, trackId: string): Promise<void>;
    addRaceToSeason(data: RaceData): Promise<string>;
    removeRaceFromSeason(raceId: string): Promise<void>;
    getEventsBySeason(seasonId: string): Promise<any[]>;
    addEventToSeason(seasonId: string, eventData: any): Promise<string>;
    updateEventInSeason(eventId: string, eventData: any): Promise<void>;
    removeEventFromSeason(eventId: string): Promise<void>;
    findActiveEventByTrack(trackName: string): Promise<string | null>;
    getSessionByUID(sessionUID: bigint): Promise<{
        id: string;
        sessionName: string;
        trackName: string;
        raceDate: string;
        raceId: string;
    } | null>;
    createSessionResult(raceId: string, sessionType: number, sessionName: string, sessionUID: bigint | null, additionalData?: any): Promise<string>;
    deleteDriverSessionResults(sessionResultId: string): Promise<void>;
    storeDriverSessionResults(sessionResultId: string, driverResults: any[]): Promise<Map<number, string>>;
    storeLapTimes(driverSessionResultId: string, raceId: string, lapData: Array<{
        lapNumber: number;
        lapTimeMs: number;
        sector1Ms?: number;
        sector2Ms?: number;
        sector3Ms?: number;
        sector1TimeMinutes?: number;
        sector2TimeMinutes?: number;
        sector3TimeMinutes?: number;
        lapValidBitFlags?: number;
        tireCompound?: string;
        trackPosition?: number;
        tireAgeLaps?: number;
        topSpeedKmph?: number;
        maxSafetyCarStatus?: string;
        vehicleFiaFlags?: string;
        pitStop?: boolean;
        ersStoreEnergy?: number;
        ersDeployedThisLap?: number;
        ersDeployMode?: string;
        fuelInTank?: number;
        fuelRemainingLaps?: number;
        gapToLeaderMs?: number;
        gapToPositionAheadMs?: number;
        carDamageData?: any;
        tyreSetsData?: any;
    }>): Promise<void>;
    getCompletedSessions(raceId: string): Promise<any[]>;
    getDriverSessionResults(sessionResultId: string, includeLapTimes?: boolean): Promise<any[]>;
    deleteOriginalSessionResults(sessionResultId: string): Promise<void>;
    storeOriginalSessionResults(sessionResultId: string, driverResults: any[]): Promise<void>;
    getSeasonIdFromEvent(eventId: string): Promise<string>;
    getSessionTypeName(sessionType: number): string;
    private recalculateDriverPostRacePenalties;
    getPenaltiesForDriverResult(driverSessionResultId: string): Promise<Array<{
        id: string;
        driver_session_result_id: string;
        seconds: number;
        reason: string | null;
        created_at: string;
        created_by: string | null;
    }>>;
    getPenaltiesForSession(sessionResultId: string): Promise<Array<{
        id: string;
        driver_session_result_id: string;
        seconds: number;
        reason: string | null;
        created_at: string;
        created_by: string | null;
    }>>;
    addPenalty(driverSessionResultId: string, penaltySeconds: number, reason: string, editedBy: string): Promise<{
        id: string;
        driver_session_result_id: string;
        seconds: number;
        reason: string | null;
        created_at: string;
        created_by: string | null;
    }>;
    removePenalty(driverSessionResultId: string, penaltyId: string): Promise<void>;
    recalculatePositions(sessionResultId: string): Promise<void>;
    changePosition(sessionResultId: string, driverId: string, newPosition: number, reason: string, editedBy: string): Promise<void>;
    resetDriverToOriginal(sessionResultId: string, driverId: string): Promise<void>;
    getEditHistory(sessionResultId: string): Promise<any[]>;
    getEditHistoryForDriver(driverSessionResultId: string): Promise<any[]>;
    revertEdit(editId: string): Promise<void>;
    getHistoricInsights(): Promise<any>;
    getSeasonsForHistory(): Promise<any[]>;
    getDriverCareerProfile(driverId: string): Promise<any>;
    getDriverSeasonStats(driverId: string, seasonId: string): Promise<any>;
    getDriverRaceHistory(driverId: string, seasonId?: string): Promise<any[]>;
    getPreviousRaceResults(seasonId: string): Promise<any>;
    close(): Promise<void>;
}
//# sourceMappingURL=DatabaseService.d.ts.map