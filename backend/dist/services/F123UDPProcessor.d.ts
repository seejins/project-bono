import { DatabaseService } from './DatabaseService';
import { TelemetryService } from './TelemetryService';
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
    private telemetryService;
    private dbService;
    private isInitialized;
    private activeSeasonId;
    private currentEventId;
    private participantMappings;
    private sessionUid;
    private loggedEventWarnings;
    private pendingLapHistory;
    constructor(dbService: DatabaseService, telemetryService: TelemetryService);
    /**
     * Initialize the processor (loads active season, sets up event listeners)
     * Note: No longer manages UDP connection - that's handled by TelemetryService
     */
    initialize(): Promise<void>;
    /**
     * Stop processing (clears state but doesn't stop UDP - that's handled by TelemetryService)
     */
    stop(): void;
    private loadActiveSeason;
    private setupEventListeners;
    private handleParticipantsPacket;
    private handleFinalClassificationPacket;
    private handleSessionHistoryPacket;
    /**
     * Flush pending lap history data to database (called post-session only)
     * Uses batch insert for much better performance
     */
    flushPendingLapHistory(): Promise<void>;
    private handleSessionPacket;
    private getTrackNameFromId;
    setActiveSeason(seasonId: string): Promise<void>;
    setCurrentEvent(eventId: string): Promise<void>;
    getParticipantMappings(): Map<number, string>;
    isProcessorRunning(): boolean;
    getSessionUid(): bigint | null;
}
//# sourceMappingURL=F123UDPProcessor.d.ts.map