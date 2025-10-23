import { TelemetryData } from './TelemetryService';

export interface RaceStrategy {
  recommendedPitStop: boolean;
  pitStopLap: number;
  tireCompound: 'soft' | 'medium' | 'hard' | 'intermediate' | 'wet';
  fuelToAdd: number;
  strategy: 'aggressive' | 'conservative' | 'balanced';
  reasoning: string;
  confidence: number; // 0-1
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

export class StrategyEngine {
  private lapHistory: LapAnalysis[] = [];
  private weatherHistory: WeatherConditions[] = [];
  private currentStrategy: RaceStrategy | null = null;

  public analyzeLap(telemetry: TelemetryData): LapAnalysis {
    const analysis: LapAnalysis = {
      lapNumber: telemetry.lapNumber,
      lapTime: telemetry.currentLapTime,
      sectorTimes: [
        telemetry.sector1Time,
        telemetry.sector2Time,
        telemetry.sector3Time
      ],
      tireWear: this.calculateAverageTireWear(telemetry.tireWear),
      fuelConsumption: this.calculateFuelConsumption(telemetry),
      pace: this.analyzePace(telemetry),
      issues: this.identifyIssues(telemetry)
    };

    this.lapHistory.push(analysis);
    return analysis;
  }

  public generateStrategy(
    telemetry: TelemetryData,
    raceLength: number = 50,
    weather: WeatherConditions
  ): RaceStrategy {
    const currentLap = telemetry.lapNumber;
    const lapsRemaining = raceLength - currentLap;
    const fuelRemaining = telemetry.fuelLevel;
    const tireWear = this.calculateAverageTireWear(telemetry.tireWear);
    
    // Analyze current conditions
    const needsPitStop = this.shouldPitStop(telemetry, lapsRemaining, weather);
    const tireCompound = this.recommendTireCompound(weather, telemetry);
    const fuelStrategy = this.calculateFuelStrategy(fuelRemaining, lapsRemaining);
    
    const strategy: RaceStrategy = {
      recommendedPitStop: needsPitStop,
      pitStopLap: needsPitStop ? currentLap + 1 : 0,
      tireCompound,
      fuelToAdd: fuelStrategy.fuelToAdd,
      strategy: fuelStrategy.strategy,
      reasoning: this.generateReasoning(telemetry, needsPitStop, tireCompound, weather),
      confidence: this.calculateConfidence(telemetry, weather)
    };

    this.currentStrategy = strategy;
    return strategy;
  }

  private shouldPitStop(
    telemetry: TelemetryData,
    lapsRemaining: number,
    weather: WeatherConditions
  ): boolean {
    const tireWear = this.calculateAverageTireWear(telemetry.tireWear);
    const fuelLevel = telemetry.fuelLevel;
    
    // Critical tire wear
    if (tireWear > 0.8) return true;
    
    // Low fuel
    if (fuelLevel < 5) return true;
    
    // Weather change (rain starting)
    if (weather.rainPercentage > 30 && telemetry.rainPercentage < 10) return true;
    
    // Strategic pit stop for tire advantage
    if (lapsRemaining > 20 && tireWear > 0.6 && this.canMakePitStop(telemetry)) {
      return true;
    }
    
    return false;
  }

  private recommendTireCompound(
    weather: WeatherConditions,
    telemetry: TelemetryData
  ): 'soft' | 'medium' | 'hard' | 'intermediate' | 'wet' {
    // Wet conditions
    if (weather.rainPercentage > 50) {
      return weather.rainPercentage > 80 ? 'wet' : 'intermediate';
    }
    
    // Dry conditions - base on track temperature and remaining laps
    const trackTemp = weather.trackTemperature;
    const lapsRemaining = 50 - telemetry.lapNumber; // Assuming 50 lap race
    
    if (trackTemp > 40 && lapsRemaining > 15) {
      return 'medium'; // Medium for high temp and long stint
    } else if (lapsRemaining < 10) {
      return 'soft'; // Soft for short stint
    } else {
      return 'hard'; // Hard for long stint
    }
  }

  private calculateFuelStrategy(fuelRemaining: number, lapsRemaining: number) {
    const fuelPerLap = 2.5; // Average fuel consumption per lap
    const fuelNeeded = lapsRemaining * fuelPerLap;
    const fuelDeficit = fuelNeeded - fuelRemaining;
    
    if (fuelDeficit > 0) {
      return {
        fuelToAdd: Math.ceil(fuelDeficit),
        strategy: 'conservative' as const
      };
    } else if (fuelDeficit < -10) {
      return {
        fuelToAdd: 0,
        strategy: 'aggressive' as const
      };
    } else {
      return {
        fuelToAdd: 0,
        strategy: 'balanced' as const
      };
    }
  }

  private calculateAverageTireWear(tireWear: TelemetryData['tireWear']): number {
    const values = Object.values(tireWear);
    return values.reduce((sum, wear) => sum + wear, 0) / values.length;
  }

  private calculateFuelConsumption(telemetry: TelemetryData): number {
    // Simplified fuel consumption calculation
    return telemetry.throttle * 0.1; // Rough estimate
  }

  private analyzePace(telemetry: TelemetryData): 'fast' | 'medium' | 'slow' {
    const currentLapTime = telemetry.currentLapTime;
    const bestLapTime = telemetry.bestLapTime;
    
    if (bestLapTime === 0) return 'medium';
    
    const paceDifference = (currentLapTime - bestLapTime) / bestLapTime;
    
    if (paceDifference < 0.02) return 'fast';
    if (paceDifference < 0.05) return 'medium';
    return 'slow';
  }

  private identifyIssues(telemetry: TelemetryData): string[] {
    const issues: string[] = [];
    
    // High tire wear
    const maxTireWear = Math.max(...Object.values(telemetry.tireWear));
    if (maxTireWear > 0.7) {
      issues.push('High tire wear detected');
    }
    
    // Engine temperature
    if (telemetry.engineTemperature > 120) {
      issues.push('High engine temperature');
    }
    
    // Fuel consumption
    if (telemetry.fuelLevel < 10) {
      issues.push('Low fuel level');
    }
    
    // Pace issues
    if (telemetry.currentLapTime > telemetry.bestLapTime * 1.1) {
      issues.push('Lap time slower than best');
    }
    
    return issues;
  }

  private canMakePitStop(telemetry: TelemetryData): boolean {
    // Check if we're in a position to make a strategic pit stop
    // This would consider track position, gaps to other cars, etc.
    return telemetry.carPosition > 3; // Simplified logic
  }

  private generateReasoning(
    telemetry: TelemetryData,
    needsPitStop: boolean,
    tireCompound: string,
    weather: WeatherConditions
  ): string {
    if (!needsPitStop) {
      return "Continue current strategy. Tires and fuel levels are good.";
    }
    
    const reasons: string[] = [];
    
    if (this.calculateAverageTireWear(telemetry.tireWear) > 0.8) {
      reasons.push("High tire wear");
    }
    
    if (telemetry.fuelLevel < 5) {
      reasons.push("Low fuel level");
    }
    
    if (weather.rainPercentage > 30) {
      reasons.push("Weather conditions changing");
    }
    
    return `Pit stop recommended: ${reasons.join(', ')}. Switch to ${tireCompound} tires.`;
  }

  private calculateConfidence(telemetry: TelemetryData, weather: WeatherConditions): number {
    let confidence = 0.8; // Base confidence
    
    // Reduce confidence based on uncertainty factors
    if (weather.rainPercentage > 20) confidence -= 0.2;
    if (telemetry.lapNumber < 5) confidence -= 0.3; // Early in race
    if (this.lapHistory.length < 3) confidence -= 0.2; // Not enough data
    
    return Math.max(0, Math.min(1, confidence));
  }

  public getLapHistory(): LapAnalysis[] {
    return [...this.lapHistory];
  }

  public getCurrentStrategy(): RaceStrategy | null {
    return this.currentStrategy;
  }

  public reset(): void {
    this.lapHistory = [];
    this.weatherHistory = [];
    this.currentStrategy = null;
  }
}
