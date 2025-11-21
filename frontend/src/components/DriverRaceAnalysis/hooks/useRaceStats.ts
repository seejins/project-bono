import { useMemo } from 'react';
import { LapData, RaceStats } from '../types';
import { calculateRaceAnalytics } from '../../../services/analytics';

interface UseRaceStatsParams {
  lapData: LapData[];
  driver: any;
  sessionDrivers?: any[]; // Add to get session fastest lap
}

/**
 * Legacy hook - wraps the shared analytics service for backward compatibility
 * @deprecated Consider using useRaceAnalytics from services/analytics for new code
 */
export const useRaceStats = ({ lapData, driver, sessionDrivers = [] }: UseRaceStatsParams): RaceStats | null => {
  return useMemo(() => {
    if (!lapData || lapData.length === 0 || !driver) {
      return null;
    }

    const analytics = calculateRaceAnalytics({
      lapData,
      driver: {
        gridPosition: driver.gridPosition || (driver as any).position || null,
        racePosition: driver.racePosition || (driver as any).position || null,
        raceGap: (driver as any).raceGap || null,
      },
      sessionDrivers,
    });

    if (!analytics) {
      return null;
    }

    // Use existing data from JSON import instead of recalculating
    const totalTime = (driver as any)._totalRaceTimeMs ?? null; // Already from JSON finalClassification
    const tireCompounds = lapData 
      ? [...new Set(lapData.map((lap) => lap.tire_compound).filter(Boolean))]
      : []; // Already available in lap_times array

    // Map to legacy RaceStats interface
    return {
      fastestLap: analytics.pace.fastestLap,
      sessionFastestLap: analytics.sessionFastestLap,
      slowestLap: analytics.pace.slowestLap,
      avgLap: analytics.pace.averageLap,
      consistencyPercent: analytics.pace.consistencyPercent,
      totalTime,
      gapToLeaderMs: analytics.gapToLeaderMs,
      pitStops: analytics.pitStops,
      tireCompounds,
      gridPosition: analytics.gridPosition,
      finishPosition: analytics.finishPosition,
      positionsGained: analytics.positionsGained,
      bestSector1: analytics.pace.bestSector1,
      bestSector2: analytics.pace.bestSector2,
      bestSector3: analytics.pace.bestSector3,
      scLaps: analytics.safetyCarLaps,
      vscLaps: analytics.virtualSafetyCarLaps,
      yellowFlags: analytics.yellowFlagLaps,
      totalLaps: analytics.pace.totalLaps,
      fastestLapNumber: analytics.pace.fastestLapNumber,
    };
  }, [lapData, driver, sessionDrivers]);
};

export default useRaceStats;

