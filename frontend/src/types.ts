export interface TelemetryData {
  // Car telemetry
  speed: number;
  throttle: number;
  brake: number;
  steering: number;
  gear: number;
  engineRPM: number;
  engineTemperature: number;
  
  // Tire data
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
  
  // Fuel and energy
  fuelLevel: number;
  fuelCapacity: number;
  energyStore: number;
  
  // Position and timing
  lapTime: number;
  sector1Time: number;
  sector2Time: number;
  sector3Time: number;
  lapDistance: number;
  totalDistance: number;
  
  // Weather and track conditions
  airTemperature: number;
  trackTemperature: number;
  rainPercentage: number;
  
  // Car status
  drsEnabled: boolean;
  ersDeployMode: number;
  fuelMix: number;
  
  // Session info
  sessionType: string;
  sessionTime: number;
  sessionTimeLeft: number;
  lapNumber: number;
  currentLapTime: number;
  lastLapTime: number;
  bestLapTime: number;
  
  // Driver info
  driverName: string;
  teamName: string;
  carPosition: number;
  numCars: number;
}

export interface RaceStrategy {
  recommendedPitStop: boolean;
  pitStopLap: number;
  tireCompound: 'soft' | 'medium' | 'hard' | 'intermediate' | 'wet';
  fuelToAdd: number;
  strategy: 'aggressive' | 'conservative' | 'balanced';
  reasoning: string;
  confidence: number; // 0-1
}

