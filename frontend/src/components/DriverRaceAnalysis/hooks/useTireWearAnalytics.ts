import { useMemo } from 'react';
import { LapData } from '../types';
import { extractTireWear } from '../utils/tireWearUtils';

interface TireWearData {
  lap: number;
  frontLeft: number | null;
  frontRight: number | null;
  rearLeft: number | null;
  rearRight: number | null;
}

interface StintTireWearStats {
  stintIndex: number;
  startLap: number;
  endLap: number;
  compound: string;
  total: number; // Combined total wear (average of all 4 tires)
  perLap: number; // Combined wear per lap (average of all 4 tires)
}

interface TireWearAnalytics {
  tireWearData: TireWearData[];
  stintStats: StintTireWearStats[];
}

export const useTireWearAnalytics = (lapData: LapData[], stintSegments: Array<{ startLap: number; endLap: number; compound: string }>): TireWearAnalytics => {
  const tireWearData = useMemo<TireWearData[]>(() => {
    if (!lapData || lapData.length === 0) {
      return [];
    }

    const sorted = [...lapData]
      .filter((lap) => lap?.lap_number != null)
      .sort((a, b) => (a.lap_number || 0) - (b.lap_number || 0));

    return sorted.map((lap) => {
      const wear = extractTireWear(lap.car_damage_data);
      return {
        lap: lap.lap_number,
        frontLeft: wear.fl,
        frontRight: wear.fr,
        rearLeft: wear.rl,
        rearRight: wear.rr,
      };
    });
  }, [lapData]);

  const stintStats = useMemo<StintTireWearStats[]>(() => {
    if (!stintSegments || stintSegments.length === 0 || tireWearData.length === 0) {
      return [];
    }

    return stintSegments.map((stint, index) => {
      const stintLaps = tireWearData.filter(
        (data) => data.lap >= stint.startLap && data.lap <= stint.endLap
      );

      // Extract all tire values once to avoid multiple iterations
      const tireValues = {
        frontLeft: stintLaps.map(lap => lap.frontLeft).filter((v): v is number => v !== null && typeof v === 'number'),
        frontRight: stintLaps.map(lap => lap.frontRight).filter((v): v is number => v !== null && typeof v === 'number'),
        rearLeft: stintLaps.map(lap => lap.rearLeft).filter((v): v is number => v !== null && typeof v === 'number'),
        rearRight: stintLaps.map(lap => lap.rearRight).filter((v): v is number => v !== null && typeof v === 'number'),
      };

      const getWear = (values: number[]) => {
        if (values.length === 0) return { total: 0, perLap: 0 };
        const startWear = values[0];
        const endWear = values[values.length - 1];
        const total = endWear - startWear;
        const lapCount = stint.endLap - stint.startLap + 1;
        return { total, perLap: lapCount > 0 ? total / lapCount : 0 };
      };

      const frontLeft = getWear(tireValues.frontLeft);
      const frontRight = getWear(tireValues.frontRight);
      const rearLeft = getWear(tireValues.rearLeft);
      const rearRight = getWear(tireValues.rearRight);

      // Calculate average across all 4 tires
      const total = (frontLeft.total + frontRight.total + rearLeft.total + rearRight.total) / 4;
      const perLap = (frontLeft.perLap + frontRight.perLap + rearLeft.perLap + rearRight.perLap) / 4;

      return {
        stintIndex: index + 1,
        startLap: stint.startLap,
        endLap: stint.endLap,
        compound: stint.compound,
        total,
        perLap,
      };
    });
  }, [stintSegments, tireWearData]);

  return {
    tireWearData,
    stintStats,
  };
};

