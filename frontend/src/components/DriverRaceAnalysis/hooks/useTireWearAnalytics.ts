import { useMemo } from 'react';
import { LapData } from '../types';
import { 
  calculateTireWearAnalytics,
  type TireWearData,
  type StintTireWearStats,
  type TireWearAnalytics as SharedTireWearAnalytics,
} from '../../../services/analytics';

// Backward compatibility interface (subset of shared analytics)
interface TireWearAnalytics {
  tireWearData: TireWearData[];
  stintStats: StintTireWearStats[];
}

export const useTireWearAnalytics = (lapData: LapData[], stintSegments: Array<{ startLap: number; endLap: number; compound: string }>): TireWearAnalytics => {
  return useMemo(() => {
    const analytics = calculateTireWearAnalytics(lapData, stintSegments);
    // Return only the fields expected by the component (backward compatibility)
    return {
      tireWearData: analytics.tireWearData,
      stintStats: analytics.stintStats,
    };
  }, [lapData, stintSegments]);
};

