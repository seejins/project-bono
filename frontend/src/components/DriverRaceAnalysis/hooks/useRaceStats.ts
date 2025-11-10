import { useMemo } from 'react';
import { LapData, RaceStats } from '../types';

interface UseRaceStatsParams {
  lapData: LapData[];
  driver: any;
}

export const useRaceStats = ({ lapData, driver }: UseRaceStatsParams): RaceStats | null => {
  return useMemo(() => {
    if (!lapData || lapData.length === 0 || !driver) {
      return null;
    }

    const validLaps = lapData.filter((lap) => lap.lap_time_ms && lap.lap_time_ms > 0);

    if (validLaps.length === 0) {
      return null;
    }

    const lapTimes = validLaps.map((lap) => lap.lap_time_ms);
    const fastestLap = Math.min(...lapTimes);
    const slowestLap = Math.max(...lapTimes);
    const avgLap = Math.round(lapTimes.reduce((sum, time) => sum + time, 0) / lapTimes.length);

    const variance = lapTimes.reduce((sum, time) => sum + Math.pow(time - avgLap, 2), 0) / lapTimes.length;
    const standardDeviation = Math.sqrt(variance);
    const consistencyPercent = ((standardDeviation / avgLap) * 100).toFixed(2);

    const totalTime = (driver as any)._totalRaceTimeMs || lapTimes.reduce((sum, time) => sum + time, 0);

    let gapToLeaderMs: number | null = null;

    const latestGapLap = [...lapData]
      .reverse()
      .find((lap) => typeof lap.gap_to_leader_ms === 'number' && Number.isFinite(lap.gap_to_leader_ms));

    if (latestGapLap && latestGapLap.gap_to_leader_ms && latestGapLap.gap_to_leader_ms > 0) {
      gapToLeaderMs = latestGapLap.gap_to_leader_ms;
    }

    if (gapToLeaderMs === null) {
      const driverGap = (driver as any).raceGap;
      if (typeof driverGap === 'number' && Number.isFinite(driverGap) && driverGap > 0) {
        gapToLeaderMs = driverGap;
      }
    }

    const pitStops = validLaps.filter((lap) => lap.pit_stop).length;
    const tireCompounds = [...new Set(validLaps.map((lap) => lap.tire_compound).filter(Boolean))];

    const gridPosition = driver.gridPosition || (driver as any).position || null;
    const finishPosition = driver.racePosition || (driver as any).position || null;
    const positionsGained = gridPosition && finishPosition ? gridPosition - finishPosition : null;

    const bestSector1 = Math.min(
      ...validLaps.map((lap) => lap.sector1_ms || Infinity).filter((ms) => ms !== Infinity)
    );
    const bestSector2 = Math.min(
      ...validLaps.map((lap) => lap.sector2_ms || Infinity).filter((ms) => ms !== Infinity)
    );
    const bestSector3 = Math.min(
      ...validLaps.map((lap) => lap.sector3_ms || Infinity).filter((ms) => ms !== Infinity)
    );

    const scLaps = validLaps.filter((lap) => lap.max_safety_car_status === 'SAFETY_CAR').length;
    const vscLaps = validLaps.filter((lap) => lap.max_safety_car_status === 'VIRTUAL_SAFETY_CAR').length;
    const yellowFlags = validLaps.filter((lap) =>
      lap.vehicle_fia_flags &&
      lap.vehicle_fia_flags !== 'None' &&
      (lap.vehicle_fia_flags.includes('YELLOW') || lap.vehicle_fia_flags.includes('YELLOW_FLAG'))
    ).length;

    return {
      fastestLap,
      slowestLap,
      avgLap,
      consistencyPercent,
      totalTime,
      gapToLeaderMs,
      pitStops,
      tireCompounds,
      gridPosition,
      finishPosition,
      positionsGained,
      bestSector1: bestSector1 !== Infinity ? bestSector1 : undefined,
      bestSector2: bestSector2 !== Infinity ? bestSector2 : undefined,
      bestSector3: bestSector3 !== Infinity ? bestSector3 : undefined,
      scLaps,
      vscLaps,
      yellowFlags,
      totalLaps: validLaps.length,
      fastestLapNumber: validLaps.find((lap) => lap.lap_time_ms === fastestLap)?.lap_number || null,
    };
  }, [lapData, driver]);
};

export default useRaceStats;

