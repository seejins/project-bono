// Shared types for analytics across the application

export interface TireWearData {
  lap: number;
  frontLeft: number | null;
  frontRight: number | null;
  rearLeft: number | null;
  rearRight: number | null;
}

export interface StintTireWearStats {
  stintIndex: number;
  startLap: number;
  endLap: number;
  compound: string;
  total: number; // Combined total wear (average of all 4 tires)
  perLap: number; // Combined wear per lap (average of all 4 tires)
}

export interface TireWearAnalytics {
  tireWearData: TireWearData[];
  stintStats: StintTireWearStats[];
  averageWear: number | null; // Average across all laps and all tires
  averageWearPerLap: number | null; // Average wear per lap across all stints
}

export interface PaceMetrics {
  fastestLap: number; // Driver's personal best lap time (ms)
  slowestLap: number;
  averageLap: number; // Average lap time (ms)
  consistencyPercent: string; // Standard deviation as % of average
  bestSector1?: number; // Best sector 1 time (ms)
  bestSector2?: number; // Best sector 2 time (ms)
  bestSector3?: number; // Best sector 3 time (ms)
  totalLaps: number;
  fastestLapNumber: number | null;
}

export interface ERSMetrics {
  averageRemaining: number | null; // Average ERS remaining (%)
  averageDeployed: number | null; // Average ERS deployed per lap (%)
  averageHarvested: number | null; // Average ERS harvested per lap (%)
  totalDeployed: number | null; // Total ERS deployed (kJ)
  totalHarvested: number | null; // Total ERS harvested (kJ)
}

export interface StintMetrics {
  stintCount: number;
  averageStintLength: number; // Average laps per stint
  compoundsUsed: string[]; // Unique tire compounds used
  averagePaceByCompound: Array<{
    compound: string;
    averageSeconds: number;
    lapCount: number;
  }>;
}

export interface RaceAnalytics {
  // Pace metrics
  pace: PaceMetrics;
  
  // Tire wear metrics
  tireWear: TireWearAnalytics;
  
  // ERS metrics
  ers: ERSMetrics;
  
  // Stint metrics
  stints: StintMetrics;
  
  // Race position metrics
  gridPosition: number | null;
  finishPosition: number | null;
  positionsGained: number | null;
  gapToLeaderMs: number | null;
  
  // Race events
  pitStops: number;
  safetyCarLaps: number;
  virtualSafetyCarLaps: number;
  yellowFlagLaps: number;
  
  // Session info
  sessionFastestLap: number | null; // Session fastest lap (ms)
}

// Aggregated metrics for dashboard display (season-wide, driver-wide, etc.)
export interface AggregatedRaceMetrics {
  raceId: string;
  raceName: string;
  trackName: string;
  raceDate: string;
  driverId: string;
  driverName: string;
  
  // Summary metrics
  finishPosition: number | null;
  points: number | null;
  fastestLap: number | null; // ms
  averageLap: number | null; // ms
  consistencyPercent: string | null;
  averageTireWear: number | null; // Average wear per lap
  pitStops: number;
  
  // Full analytics (optional, can be loaded on demand)
  fullAnalytics?: RaceAnalytics;
}

