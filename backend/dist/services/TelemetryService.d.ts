import { EventEmitter } from 'events';
export interface TelemetryData {
    speed: number;
    throttle: number;
    brake: number;
    steering: number;
    gear: number;
    engineRPM: number;
    engineTemperature: number;
    tireWear: {
        frontLeft: number;
        frontRight: number;
        rearLeft: number;
        rearRight: number;
    };
    tireTemperature: {
        frontLeft: number;
        frontRight: number;
        rearLeft: number;
        rearRight: number;
    };
    fuelLevel: number;
    fuelCapacity: number;
    energyStore: number;
    lapTime: number;
    sector1Time: number;
    sector2Time: number;
    sector3Time: number;
    lapDistance: number;
    totalDistance: number;
    airTemperature: number;
    trackTemperature: number;
    rainPercentage: number;
    drsEnabled: boolean;
    ersDeployMode: number;
    fuelMix: number;
    sessionType: string;
    sessionTime: number;
    sessionTimeLeft: number;
    lapNumber: number;
    currentLapTime: number;
    lastLapTime: number;
    bestLapTime: number;
    driverName: string;
    teamName: string;
    carPosition: number;
    numCars: number;
}
export declare class TelemetryService extends EventEmitter {
    private socket;
    isRunning: boolean;
    private lastData;
    private dataBuffer;
    private readonly BUFFER_SIZE;
    constructor();
    private setupSocketHandlers;
    private parseTelemetryData;
    private extractString;
    private getSessionType;
    private processTelemetryData;
    private addToBuffer;
    private checkCriticalConditions;
    start(): void;
    stop(): void;
    getLastData(): TelemetryData | null;
    getDataBuffer(): TelemetryData[];
    getAverageData(points?: number): TelemetryData | null;
}
//# sourceMappingURL=TelemetryService.d.ts.map