import { RaceAnalytics } from './types';
import { calculateTireWearAnalytics, LapDataWithWear } from './tireWearAnalytics';
import { calculatePaceMetrics, LapDataWithPace } from './paceAnalytics';
import { calculateERSMetrics, LapDataWithERS } from './ersAnalytics';
import { calculateStintMetrics, LapDataWithStint, StintSegment } from './stintAnalytics';

// Re-export RaceAnalytics for convenience
export type { RaceAnalytics } from './types';

export interface CompleteLapData extends LapDataWithWear, LapDataWithPace, LapDataWithERS, LapDataWithStint {
  gap_to_leader_ms?: number | null;
  pit_stop?: boolean | null;
  max_safety_car_status?: string | null;
  vehicle_fia_flags?: string | null;
}

export interface RaceAnalyticsParams {
  lapData: CompleteLapData[];
  stintSegments?: StintSegment[];
  driver?: {
    gridPosition?: number | null;
    racePosition?: number | null;
    raceGap?: number | null;
  };
  sessionDrivers?: Array<{
    fastestLap?: boolean | any;
    fastest_lap?: boolean | any; // Support snake_case for backward compatibility
    fastestLapTime?: number | null;
    raceBestLapTime?: number | null;
    best_lap_time_ms?: number | null;
  }>;
}

/**
 * Calculate comprehensive race analytics from lap data
 * This is the main function to use for getting all race metrics
 * 
 * @param params - RaceAnalyticsParams object containing lap data, stint segments, driver info, and session drivers
 * @returns RaceAnalytics object with pace, tire wear, ERS, stint metrics, and race events, or null if no valid data
 * 
 * @remarks
 * - Filters valid laps once and reuses for all calculations (performance optimization)
 * - Handles missing or invalid data gracefully
 * - Returns null if no valid lap times are found
 * - All sub-metrics are calculated in a single pass where possible
 */
export const calculateRaceAnalytics = (params: RaceAnalyticsParams): RaceAnalytics | null => {
  const { lapData, stintSegments = [], driver, sessionDrivers = [] } = params;

  if (!Array.isArray(lapData) || lapData.length === 0) {
    return null;
  }

  // Filter valid laps once and reuse for all calculations
  const validLaps = lapData.filter((lap) => 
    lap != null &&
    typeof lap.lap_time_ms === 'number' && 
    lap.lap_time_ms > 0 &&
    Number.isFinite(lap.lap_time_ms)
  );
  
  if (validLaps.length === 0) {
    return null;
  }

  // Calculate all metrics using pre-filtered valid laps
  const pace = calculatePaceMetrics(validLaps);
  if (!pace) {
    return null; // Need at least pace data
  }

  const tireWear = calculateTireWearAnalytics(lapData, stintSegments); // Needs all laps for tire wear
  const ers = calculateERSMetrics(lapData); // Needs all laps for ERS
  const stints = calculateStintMetrics(validLaps, stintSegments);

  // Get session fastest lap
  let sessionFastestLap: number | null = null;
  if (sessionDrivers.length > 0) {
    const fastestLapDriver = sessionDrivers.find((d) => 
      d?.fastestLap === true || d?.fastest_lap === true || d?.fastest_lap === 1 || d?.fastest_lap === 'true'
    );
    
    if (fastestLapDriver) {
      const fastestTime = fastestLapDriver.fastestLapTime ?? 
                         fastestLapDriver.raceBestLapTime ?? 
                         fastestLapDriver.best_lap_time_ms ??
                         null;
      if (fastestTime != null && fastestTime > 0) {
        sessionFastestLap = Number(fastestTime);
      }
    }
  }

  // Race position metrics
  const gridPosition = driver?.gridPosition ?? null;
  const finishPosition = driver?.racePosition ?? null;
  const positionsGained = gridPosition && finishPosition ? gridPosition - finishPosition : null;

  // Gap to leader - find latest valid gap from end of race
  let gapToLeaderMs: number | null = null;
  for (let i = lapData.length - 1; i >= 0; i--) {
    const lap = lapData[i];
    if (lap != null && 
        typeof lap.gap_to_leader_ms === 'number' && 
        Number.isFinite(lap.gap_to_leader_ms) && 
        lap.gap_to_leader_ms > 0) {
      gapToLeaderMs = lap.gap_to_leader_ms;
      break;
    }
  }

  // Fallback to driver race gap if not found in lap data
  if (gapToLeaderMs === null && driver?.raceGap) {
    if (typeof driver.raceGap === 'number' && Number.isFinite(driver.raceGap) && driver.raceGap > 0) {
      gapToLeaderMs = driver.raceGap;
    }
  }

  // Race events - single pass instead of 4 separate filter operations
  let pitStops = 0;
  let safetyCarLaps = 0;
  let virtualSafetyCarLaps = 0;
  let yellowFlagLaps = 0;

  validLaps.forEach((lap) => {
    if (lap == null) return;
    
    if (lap.pit_stop === true) pitStops++;
    if (typeof lap.max_safety_car_status === 'string' && lap.max_safety_car_status === 'SAFETY_CAR') {
      safetyCarLaps++;
    }
    if (typeof lap.max_safety_car_status === 'string' && lap.max_safety_car_status === 'VIRTUAL_SAFETY_CAR') {
      virtualSafetyCarLaps++;
    }
    if (typeof lap.vehicle_fia_flags === 'string' &&
        lap.vehicle_fia_flags !== 'None' &&
        (lap.vehicle_fia_flags.includes('YELLOW') || lap.vehicle_fia_flags.includes('YELLOW_FLAG'))) {
      yellowFlagLaps++;
    }
  });

  return {
    pace,
    tireWear,
    ers,
    stints,
    gridPosition,
    finishPosition,
    positionsGained,
    gapToLeaderMs,
    pitStops,
    safetyCarLaps,
    virtualSafetyCarLaps,
    yellowFlagLaps,
    sessionFastestLap,
  };
};

