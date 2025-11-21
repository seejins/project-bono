import { PaceMetrics } from './types';

export interface LapDataWithPace {
  lap_number: number | null;
  lap_time_ms?: number | null;
  sector1_ms?: number | null;
  sector2_ms?: number | null;
  sector3_ms?: number | null;
}

/**
 * Calculate pace metrics from lap data
 * 
 * @param lapData - Array of lap data with pace information (lap times, sectors)
 * @returns PaceMetrics object with fastest/slowest lap, average, consistency, and best sectors, or null if no valid data
 * 
 * @remarks
 * - This function filters for valid lap times (> 0)
 * - When called from calculateRaceAnalytics, it receives pre-filtered valid laps
 * - Returns null if no valid lap times are found
 * - Handles edge cases like division by zero and invalid data
 */
export const calculatePaceMetrics = (
  lapData: LapDataWithPace[]
): PaceMetrics | null => {
  if (!Array.isArray(lapData) || lapData.length === 0) {
    return null;
  }

  // Note: This function now expects pre-filtered valid laps when called from calculateRaceAnalytics
  // For backward compatibility, we still filter here if needed
  const validLaps = lapData.filter((lap) => 
    lap != null && 
    typeof lap.lap_time_ms === 'number' && 
    lap.lap_time_ms > 0 &&
    Number.isFinite(lap.lap_time_ms)
  );

  if (validLaps.length === 0) {
    return null;
  }

  const lapTimes = validLaps
    .map((lap) => lap.lap_time_ms)
    .filter((time): time is number => typeof time === 'number' && time > 0);
  
  if (lapTimes.length === 0) {
    return null;
  }
  
  // Use loop instead of spread operator to avoid stack overflow on large arrays
  let fastestLap = Infinity;
  let slowestLap = -Infinity;
  let totalLapTime = 0;
  for (const time of lapTimes) {
    if (time < fastestLap) fastestLap = time;
    if (time > slowestLap) slowestLap = time;
    totalLapTime += time;
  }
  
  // Safety check: ensure we have valid lap times
  if (fastestLap === Infinity || slowestLap === -Infinity || lapTimes.length === 0) {
    return null;
  }
  
  const avgLap = Math.round(totalLapTime / lapTimes.length);
  
  // Calculate consistency (standard deviation as % of average)
  // Protect against division by zero
  if (avgLap <= 0) {
    return null;
  }
  
  const variance = lapTimes.reduce((sum, time) => sum + Math.pow(time - avgLap, 2), 0) / lapTimes.length;
  const standardDeviation = Math.sqrt(variance);
  const consistencyPercent = ((standardDeviation / avgLap) * 100).toFixed(2);

  // Best sectors - single pass instead of 3 separate iterations
  let bestSector1 = Infinity;
  let bestSector2 = Infinity;
  let bestSector3 = Infinity;
  
  validLaps.forEach((lap) => {
    if (lap.sector1_ms && lap.sector1_ms < bestSector1) bestSector1 = lap.sector1_ms;
    if (lap.sector2_ms && lap.sector2_ms < bestSector2) bestSector2 = lap.sector2_ms;
    if (lap.sector3_ms && lap.sector3_ms < bestSector3) bestSector3 = lap.sector3_ms;
  });

  const fastestLapNumber = validLaps.find((lap) => lap.lap_time_ms === fastestLap)?.lap_number || null;

  return {
    fastestLap,
    slowestLap,
    averageLap: avgLap,
    consistencyPercent,
    bestSector1: bestSector1 !== Infinity ? bestSector1 : undefined,
    bestSector2: bestSector2 !== Infinity ? bestSector2 : undefined,
    bestSector3: bestSector3 !== Infinity ? bestSector3 : undefined,
    totalLaps: validLaps.length,
    fastestLapNumber,
  };
};

