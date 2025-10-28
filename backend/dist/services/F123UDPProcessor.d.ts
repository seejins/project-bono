import { DatabaseService } from './DatabaseService';
export interface UDPPacketHeader {
    packetFormat: number;
    gameYear: number;
    gameMajorVersion: number;
    gameMinorVersion: number;
    packetVersion: number;
    packetId: number;
    sessionUid: bigint;
    sessionTime: number;
    frameIdentifier: number;
    overallFrameIdentifier: number;
    playerCarIndex: number;
    secondaryPlayerCarIndex: number;
}
export interface UDPParticipantData {
    aiControlled: number;
    driverId: number;
    networkId: number;
    teamId: number;
    myTeam: number;
    raceNumber: number;
    nationality: number;
    name: string;
    yourTelemetry: number;
    showOnlineNames: number;
    platform: number;
}
export interface UDPFinalClassificationData {
    position: number;
    numLaps: number;
    gridPosition: number;
    points: number;
    numPitStops: number;
    resultStatus: number;
    bestLapTimeInMS: number;
    totalRaceTime: number;
    penaltiesTime: number;
    numPenalties: number;
    numTyreStints: number;
    tyreStintsActual: number[];
    tyreStintsVisual: number[];
    tyreStintsEndLaps: number[];
}
export interface UDPLapHistoryData {
    lapTimeInMS: number;
    sector1TimeInMS: number;
    sector1TimeMinutes: number;
    sector2TimeInMS: number;
    sector2TimeMinutes: number;
    sector3TimeInMS: number;
    sector3TimeMinutes: number;
    lapValidBitFlags: number;
}
export interface UDPTyreStintHistoryData {
    endLap: number;
    tyreActualCompound: number;
    tyreVisualCompound: number;
}
export declare class F123UDPProcessor {
    private f123;
    private dbService;
    private isRunning;
    private activeSeasonId;
    private currentEventId;
    private participantMappings;
    private sessionUid;
    constructor(dbService: DatabaseService);
    start(): Promise<void>;
    stop(): Promise<void>;
    private loadActiveSeason;
    private setupEventListeners;
    private handleParticipantsPacket;
    private handleFinalClassificationPacket;
    private handleSessionHistoryPacket;
    private handleSessionPacket;
    setActiveSeason(seasonId: string): Promise<void>;
    setCurrentEvent(eventId: string): Promise<void>;
    getParticipantMappings(): Map<number, string>;
    isProcessorRunning(): boolean;
    getSessionUid(): bigint | null;
}
//# sourceMappingURL=F123UDPProcessor.d.ts.map