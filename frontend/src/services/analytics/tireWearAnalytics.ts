import { TireWearData, StintTireWearStats, TireWearAnalytics } from './types';
import { extractTireWear, calculateAverageWear } from '../../components/DriverRaceAnalysis/utils/tireWearUtils';

export interface LapDataWithWear {
  lap_number: number | null;
  car_damage_data?: any;
}

export interface StintSegment {
  startLap: number;
  endLap: number;
  compound: string;
}

/**
 * Calculate tire wear analytics from lap data
 * 
 * @param lapData - Array of lap data with tire wear information
 * @param stintSegments - Optional array of stint segments for calculating stint-specific wear stats
 * @returns TireWearAnalytics object with per-lap wear data, stint stats, and averages
 * 
 * @remarks
 * - Extracts tire wear from car_damage_data (format: [RL, RR, FL, FR])
 * - Calculates average wear across all laps and all tires
 * - Calculates stint-specific wear stats if stint segments are provided
 * - Returns empty arrays and null values if no data is available
 */
export const calculateTireWearAnalytics = (
  lapData: LapDataWithWear[],
  stintSegments: StintSegment[] = []
): TireWearAnalytics => {
  if (!Array.isArray(lapData) || lapData.length === 0) {
    return {
      tireWearData: [],
      stintStats: [],
      averageWear: null,
      averageWearPerLap: null,
    };
  }

  // Extract tire wear data per lap and collect all wear values in single pass
  const sorted = [...lapData]
    .filter((lap) => lap != null && lap.lap_number != null && typeof lap.lap_number === 'number')
    .sort((a, b) => (a.lap_number || 0) - (b.lap_number || 0));

  const allWearValues: number[] = [];
  const tireWearData: TireWearData[] = sorted.map((lap) => {
    const wear = extractTireWear(lap.car_damage_data);
    const lapNumber = lap.lap_number!; // Safe: already filtered for non-null
    // Collect wear values during mapping to avoid extra iteration
    if (wear.fl !== null && typeof wear.fl === 'number' && Number.isFinite(wear.fl)) {
      allWearValues.push(wear.fl);
    }
    if (wear.fr !== null && typeof wear.fr === 'number' && Number.isFinite(wear.fr)) {
      allWearValues.push(wear.fr);
    }
    if (wear.rl !== null && typeof wear.rl === 'number' && Number.isFinite(wear.rl)) {
      allWearValues.push(wear.rl);
    }
    if (wear.rr !== null && typeof wear.rr === 'number' && Number.isFinite(wear.rr)) {
      allWearValues.push(wear.rr);
    }
    return {
      lap: lapNumber,
      frontLeft: wear.fl,
      frontRight: wear.fr,
      rearLeft: wear.rl,
      rearRight: wear.rr,
    };
  });

  // Calculate stint stats
  const stintStats: StintTireWearStats[] = stintSegments.map((stint, index) => {
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

  // Calculate overall averages (wear values already collected during mapping)
  const averageWear = allWearValues.length > 0
    ? allWearValues.reduce((sum, val) => sum + val, 0) / allWearValues.length
    : null;

  // Calculate average wear per lap across all stints
  const averageWearPerLap = stintStats.length > 0
    ? stintStats.reduce((sum, stint) => sum + stint.perLap, 0) / stintStats.length
    : null;

  return {
    tireWearData,
    stintStats,
    averageWear,
    averageWearPerLap,
  };
};

