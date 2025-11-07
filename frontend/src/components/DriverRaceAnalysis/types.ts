import { F123DriverResult } from '../../services/F123DataService';

export interface DriverRaceAnalysisProps {
  driverId: string;
  raceId: string;
  onBack: () => void;
}

export interface LapData {
  lap_number: number;
  lap_time_ms: number;
  sector1_ms?: number;
  sector2_ms?: number;
  sector3_ms?: number;
  sector1_time_minutes?: number;
  sector2_time_minutes?: number;
  sector3_time_minutes?: number;
  lap_valid_bit_flags?: number;
  tire_compound?: string;
  track_position?: number;
  tire_age_laps?: number;
  top_speed_kmph?: number;
  max_safety_car_status?: string;
  vehicle_fia_flags?: string;
  pit_stop?: boolean;
  ers_store_energy?: number;
  ers_deployed_this_lap?: number;
  ers_deploy_mode?: string;
  fuel_in_tank?: number;
  fuel_remaining_laps?: number;
  gap_to_leader_ms?: number;
  gap_to_position_ahead_ms?: number;
  car_damage_data?: any;
  tyre_sets_data?: any;
}

export interface DriverRaceData {
  driver: (F123DriverResult & {
    lap_times?: any[];
    additional_data?: any;
    additionalData?: any;
    _totalRaceTimeMs?: number;
  }) | null;
  raceData: any;
  lapData: LapData[];
  sessionDrivers: any[];
  loading: boolean;
  error: string | null;
}

export interface LapComparisonEntry {
  lap: number;
  targetLapSeconds: number | null;
  comparisonLapSeconds: number | null;
  targetLapMs: number | null;
  comparisonLapMs: number | null;
  targetCumulativeSeconds: number | null;
  comparisonCumulativeSeconds: number | null;
  deltaSeconds: number | null;
}

export interface LapAnalytics {
  lapComparisonData: LapComparisonEntry[];
  deltaComparisonData: Array<{ lap: number; deltaSeconds: number }>;
}

export interface StintChartPoint {
  lap: number;
  lapTimeSeconds: number | null;
  tireCompound: string | undefined;
  tireColorHex: string;
  compoundKey: string;
}

export interface StintAnalytics {
  stintChartData: StintChartPoint[];
  stintSegments: Array<{ startLap: number; endLap: number; compound: string; color: string }>;
  stintStartLapInfo: Map<number, { compoundKey: string; color: string; label: string }>;
  compoundLineSetup: { data: any[]; lines: Array<{ dataKey: string; name: string; stroke: string; dot: any; connectNulls: boolean }> };
  compoundAverages: Array<{ compoundKey: string; compoundLabel: string; averageSeconds: number; color: string; lapCount: number }>;
}

export interface RaceStats {
  fastestLap: number;
  slowestLap: number;
  avgLap: number;
  consistencyPercent: string;
  totalTime: number;
  gapToWinner: number | null;
  pitStops: number;
  tireCompounds: Array<string | undefined>;
  gridPosition: number | null;
  finishPosition: number | null;
  positionsGained: number | null;
  bestSector1?: number;
  bestSector2?: number;
  bestSector3?: number;
  scLaps: number;
  vscLaps: number;
  yellowFlags: number;
  totalLaps: number;
  fastestLapNumber: number | null;
}

