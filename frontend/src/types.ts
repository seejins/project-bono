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

// History page interfaces
export interface HistoricInsights {
  totalRaces: number;
  totalSeasons: number;
  totalDrivers: number;
  totalPodiums: number;
  totalWins: number;
  totalChampionships: number;
}

export interface SeasonSummary {
  id: string;
  name: string;
  year: number;
  status: 'active' | 'completed' | 'draft';
  totalRaces: number;
  totalDrivers: number;
  champion: string;
}

export interface MemberCareerStats {
  wins: number;
  podiums: number;
  points: number;
  seasons: number;
  polePositions: number;
  fastestLaps: number;
  averageFinish: number;
  finishRate: number;
  championships: number;
  bestFinish: number;
}

export interface MemberCareerProfile {
  member: {
    id: string;
    name: string;
    steam_id?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
  careerStats: MemberCareerStats;
  seasons: Array<{
    id: string;
    year: number;
    name: string;
  }>;
}

export interface RaceHistoryEntry {
  id: string;
  seasonId: string;
  seasonYear: number;
  raceName: string;
  trackName: string;
  date: string;
  position: number;
  points: number;
  gridPosition: number;
  fastestLap: boolean;
  polePosition: boolean;
  status: string;
  teamColor: string;
}

export interface PreviousRaceResults {
  raceId: string;
  raceName: string;
  eventName?: string | null;
  shortEventName?: string | null;
  trackName: string;
  date: string;
  circuit?: string | null;
  status?: string | null;
  drivers: Array<{
    position: number;
    name: string;
    abbreviation?: string;
    teamColor?: string;
    points: number;
    fastestLap: boolean;
    status?: string | null;
    team?: string | null;
    driverId?: string | null;
  }>;
  summary?: {
    topFinishers: Array<{
      position: number;
      name: string;
      team: string | null;
      points: number;
      driverId?: string | null;
    }>;
    qualifyingHighlights: Array<{
      position: number;
      name: string;
      team: string | null;
      lapTimeMs: number | null;
      driverId?: string | null;
    }>;
    fastestLaps: Array<{
      position: number;
      name: string;
      team: string | null;
      bestLapTimeMs: number | null;
      fastestLap?: boolean;
      driverId?: string | null;
    }>;
    averageLapTimes: Array<{
      position: number;
      name: string;
      team: string | null;
      averageLapTimeMs: number | null;
      driverId?: string | null;
    }>;
  };
}

