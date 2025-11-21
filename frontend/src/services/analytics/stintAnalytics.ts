import { StintMetrics } from './types';

export interface LapDataWithStint {
  lap_number: number | null;
  lap_time_ms?: number | null;
  tire_compound?: string | null;
}

export interface StintSegment {
  startLap: number;
  endLap: number;
  compound: string;
}

/**
 * Calculate stint metrics from lap data
 * 
 * @param lapData - Array of lap data with stint information (lap times, tire compounds)
 * @param stintSegments - Optional array of stint segments for calculating stint-specific metrics
 * @returns StintMetrics object with stint count, average length, compounds used, and pace by compound
 * 
 * @remarks
 * - When called from calculateRaceAnalytics, receives pre-filtered valid laps
 * - For backward compatibility, still filters for valid lap times if needed
 * - Returns empty arrays and zero values if no data is available
 */
export const calculateStintMetrics = (
  lapData: LapDataWithStint[],
  stintSegments: StintSegment[] = []
): StintMetrics => {
  if (!Array.isArray(lapData) || lapData.length === 0) {
    return {
      stintCount: 0,
      averageStintLength: 0,
      compoundsUsed: [],
      averagePaceByCompound: [],
    };
  }

  // Note: This function now expects pre-filtered valid laps when called from calculateRaceAnalytics
  // For backward compatibility, we still filter here if needed
  const validLaps = lapData.filter((lap) => 
    lap != null &&
    typeof lap.lap_time_ms === 'number' && 
    lap.lap_time_ms > 0 &&
    Number.isFinite(lap.lap_time_ms)
  );

  // Get unique compounds used
  const compoundsUsed = [...new Set(
    validLaps
      .map((lap) => lap.tire_compound)
      .filter((compound): compound is string => Boolean(compound))
  )];

  // Calculate average pace by compound
  const compoundGroups = new Map<string, { total: number; count: number }>();

  validLaps.forEach((lap) => {
    if (lap.lap_time_ms && lap.tire_compound) {
      const existing = compoundGroups.get(lap.tire_compound);
      if (existing) {
        existing.total += lap.lap_time_ms;
        existing.count += 1;
      } else {
        compoundGroups.set(lap.tire_compound, {
          total: lap.lap_time_ms,
          count: 1,
        });
      }
    }
  });

  const averagePaceByCompound = Array.from(compoundGroups.entries())
    .map(([compound, { total, count }]) => ({
      compound,
      averageSeconds: count > 0 ? total / count / 1000 : 0, // Convert to seconds
      lapCount: count,
    }))
    .sort((a, b) => a.averageSeconds - b.averageSeconds);

  // Calculate stint metrics
  const stintCount = stintSegments.length;
  const averageStintLength = stintCount > 0
    ? stintSegments.reduce((sum, stint) => sum + (stint.endLap - stint.startLap + 1), 0) / stintCount
    : 0;

  return {
    stintCount,
    averageStintLength,
    compoundsUsed,
    averagePaceByCompound,
  };
};

