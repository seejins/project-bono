import { useMemo } from 'react';
import { LapData } from '../types';
import { extractTireWear, calculateAverageWear } from '../utils/tireWearUtils';

interface TireWearComparisonData {
  lap: number;
  targetAverageWear: number | null;
  comparisonAverageWear: number | null;
  targetTireCompound: string | null;
  comparisonTireCompound: string | null;
}

interface TireWearComparison {
  tireWearComparisonData: TireWearComparisonData[];
}

export const useTireWearComparison = (targetLapData: LapData[], comparisonLapTimes: any[]): TireWearComparison => {
  const tireWearComparisonData = useMemo<TireWearComparisonData[]>(() => {
    if (!targetLapData?.length || !comparisonLapTimes?.length) {
      return [];
    }

    // Build maps for both drivers
    const targetMap = new Map<number, LapData>();
    targetLapData.forEach((lap) => {
      if (lap?.lap_number != null) {
        targetMap.set(lap.lap_number, lap);
      }
    });

    const comparisonMap = new Map<number, any>();
    comparisonLapTimes.forEach((lap: any) => {
      const lapNumber = lap?.lap_number ?? lap?.lapNumber;
      if (lapNumber != null) {
        comparisonMap.set(lapNumber, lap);
      }
    });

    // Get all unique lap numbers
    const allLapNumbers = Array.from(new Set([...targetMap.keys(), ...comparisonMap.keys()])).sort((a, b) => a - b);

    return allLapNumbers.map((lapNumber) => {
      const targetLap = targetMap.get(lapNumber);
      const comparisonLap = comparisonMap.get(lapNumber);

      const targetWear = targetLap ? extractTireWear(targetLap.car_damage_data) : { fl: null, fr: null, rl: null, rr: null };
      const comparisonWear = comparisonLap ? extractTireWear(comparisonLap.car_damage_data ?? comparisonLap.carDamageData) : { fl: null, fr: null, rl: null, rr: null };

      return {
        lap: lapNumber,
        targetAverageWear: calculateAverageWear(targetWear),
        comparisonAverageWear: calculateAverageWear(comparisonWear),
        targetTireCompound: targetLap?.tire_compound ?? null,
        comparisonTireCompound: comparisonLap?.tire_compound ?? comparisonLap?.tireCompound ?? null,
      };
    }).filter((entry) => entry.targetAverageWear !== null || entry.comparisonAverageWear !== null);
  }, [targetLapData, comparisonLapTimes]);

  return {
    tireWearComparisonData,
  };
};

