import { EventEmitter } from 'events';
export interface PacketHeader {
    packetFormat: number;
    gameYear: number;
    gameMajorVersion: number;
    gameMinorVersion: number;
    packetVersion: number;
    packetId: number;
    sessionUid: number;
    sessionTime: number;
    frameIdentifier: number;
    overallFrameIdentifier: number;
    playerCarIndex: number;
    secondaryPlayerCarIndex: number;
}
export interface LapData {
    lastLapTimeInMS: number;
    currentLapTimeInMS: number;
    sector1TimeInMS: number;
    sector1TimeMinutes: number;
    sector2TimeInMS: number;
    sector2TimeMinutes: number;
    sector3TimeInMS: number;
    sector3TimeMinutes: number;
    deltaToCarInFrontInMS: number;
    deltaToRaceLeaderInMS: number;
    lapDistance: number;
    totalDistance: number;
    safetyCarDelta: number;
    carPosition: number;
    currentLapNum: number;
    pitStatus: number;
    numPitStops: number;
    sector: number;
    currentLapInvalid: number;
    penalties: number;
    totalWarnings: number;
    cornerCuttingWarnings: number;
    numUnservedDriveThroughPens: number;
    numUnservedStopGoPens: number;
    gridPosition: number;
    driverStatus: number;
    resultStatus: number;
    pitLaneTimerActive: number;
    pitLaneTimeInLaneInMS: number;
    pitStopTimerInMS: number;
    pitStopShouldServePen: number;
    bestLapTimeInMS: number;
}
export interface CarStatusData {
    tractionControl: number;
    antiLockBrakes: number;
    fuelMix: number;
    frontBrakeBias: number;
    pitLimiterStatus: number;
    fuelInTank: number;
    fuelCapacity: number;
    fuelRemainingLaps: number;
    maxRpm: number;
    idleRpm: number;
    maxGears: number;
    drsAllowed: number;
    drsActivationDistance: number;
    actualTyreCompound: number;
    visualTyreCompound: number;
    tyresAgeLaps: number;
    vehicleFiaFlags: number;
    enginePowerIce: number;
    enginePowerMguk: number;
    ersStoreEnergy: number;
    ersDeployMode: number;
    ersHarvestedThisLapMguk: number;
    ersHarvestedThisLapMguh: number;
    ersDeployedThisLap: number;
    networkPaused: number;
}
export interface TyreStintHistoryData {
    endLap: number;
    tyreActualCompound: number;
    tyreVisualCompound: number;
}
export interface MicroSectorData {
    time: number;
    driverId: string;
}
export interface DriverLapProgress {
    lapNumber: number;
    completedMicroSectors: Map<number, number>;
}
export interface MicroSectorTracker {
    fastestOverall: Map<number, MicroSectorData>;
    personalBest: Map<string, Map<number, number>>;
    currentLapProgress: Map<string, DriverLapProgress>;
    trackLength: number;
    microSectorsPerLap: number;
}
export interface F123TelemetryData {
    header: PacketHeader;
    sessionType: number;
    sessionTimeLeft: number;
    sessionDuration: number;
    sessionData?: {
        totalLaps: number;
        trackLength: number;
    };
    driverName: string;
    teamName: string;
    carPosition: number;
    carNumber: number;
    lapData: LapData;
    carStatus: CarStatusData;
    stintHistory: TyreStintHistoryData[];
    microSectors: Array<'purple' | 'green' | 'yellow' | 'grey'>;
    lapTime?: number;
    sector1Time?: number;
    sector2Time?: number;
    sector3Time?: number;
    lapNumber?: number;
    currentLapTime?: number;
    lastLapTime?: number;
    bestLapTime?: number;
    speed?: number;
    throttle?: number;
    brake?: number;
    steering?: number;
    gear?: number;
    engineRPM?: number;
    tireWear?: {
        frontLeft: number;
        frontRight: number;
        rearLeft: number;
        rearRight: number;
    };
    tireTemperature?: {
        frontLeft: number;
        frontRight: number;
        rearLeft: number;
        rearRight: number;
    };
    fuelLevel?: number;
    fuelCapacity?: number;
    energyStore?: number;
    airTemperature?: number;
    trackTemperature?: number;
    rainPercentage?: number;
    drsEnabled?: boolean;
    ersDeployMode?: number;
    fuelMix?: number;
    penalties?: number;
    warnings?: number;
    numUnservedDriveThroughPens?: number;
    numUnservedStopGoPens?: number;
    numCars?: number;
    gapToPole?: number;
    timestamp: Date;
}
export declare class TelemetryService extends EventEmitter {
    private f123;
    isRunning: boolean;
    private lastData;
    private dataBuffer;
    private readonly BUFFER_SIZE;
    private sessionStartTime;
    private currentSessionData;
    private lapDataMap;
    private carStatusMap;
    private stintHistoryMap;
    private participantsMap;
    private bestLapTimesMap;
    private finalClassificationData;
    private carDamageMap;
    private microSectorTracker;
    private sessionData;
    constructor();
    private setupF123Handlers;
    private processLapDataPacket;
    private processCarStatusPacket;
    private processSessionHistoryPacket;
    private processParticipantsPacket;
    private processSessionPacket;
    private processEventPacket;
    private processFinalClassificationPacket;
    private processCarDamagePacket;
    private emitCombinedTelemetryData;
    private getTeamName;
    private convertMotionData;
    private convertSessionData;
    private convertCarStatusData;
    private convertLapData;
    private handleSessionData;
    private processTelemetryData;
    private addToBuffer;
    private getSessionTypeName;
    private autoExportSessionData;
    private extractFinalResults;
    private findPoleTime;
    private checkCriticalConditions;
    start(): void;
    stop(): void;
    getLastData(): F123TelemetryData | null;
    getDataBuffer(): F123TelemetryData[];
    getCurrentSessionData(): F123TelemetryData[];
    private updateMicroSectorProgress;
    private updateFastestMicroSector;
    private updatePersonalBest;
    private getMicroSectorColors;
}
//# sourceMappingURL=TelemetryService.d.ts.map