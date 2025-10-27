import { F123TelemetryData } from './TelemetryService';
export interface RaceStrategy {
    recommendedPitStop: boolean;
    pitStopLap: number;
    tireCompound: 'soft' | 'medium' | 'hard' | 'intermediate' | 'wet';
    fuelToAdd: number;
    strategy: 'aggressive' | 'conservative' | 'balanced';
    reasoning: string;
    confidence: number;
}
export interface LapAnalysis {
    lapNumber: number;
    lapTime: number;
    sectorTimes: number[];
    tireWear: number;
    fuelConsumption: number;
    pace: 'fast' | 'medium' | 'slow';
    issues: string[];
}
export interface WeatherConditions {
    airTemperature: number;
    trackTemperature: number;
    rainPercentage: number;
    humidity: number;
    windSpeed: number;
    windDirection: number;
}
export declare class StrategyEngine {
    private lapHistory;
    private weatherHistory;
    private currentStrategy;
    analyzeLap(telemetry: F123TelemetryData): LapAnalysis;
    generateStrategy(telemetry: F123TelemetryData, raceLength: number | undefined, weather: WeatherConditions): RaceStrategy;
    private shouldPitStop;
    private recommendTireCompound;
    private calculateFuelStrategy;
    private calculateAverageTireWear;
    private calculateFuelConsumption;
    private analyzePace;
    private identifyIssues;
    private canMakePitStop;
    private generateReasoning;
    private calculateConfidence;
    getLapHistory(): LapAnalysis[];
    getCurrentStrategy(): RaceStrategy | null;
    reset(): void;
    private analyzeTacticalSituation;
    private calculateTargetLapTime;
    private checkUndercutOpportunity;
    private checkOvercutOpportunity;
    private calculateGapToLeader;
    private calculateTireAdvantage;
    private analyzeFuelStrategy;
}
//# sourceMappingURL=StrategyEngine.d.ts.map