import { useMemo } from 'react';
import { calculateRaceAnalytics, RaceAnalyticsParams, RaceAnalytics } from './raceMetrics';

/**
 * React hook for calculating comprehensive race analytics
 * 
 * Usage:
 * ```tsx
 * const analytics = useRaceAnalytics({
 *   lapData,
 *   stintSegments,
 *   driver,
 *   sessionDrivers
 * });
 * ```
 */
export const useRaceAnalytics = (params: RaceAnalyticsParams): RaceAnalytics | null => {
  return useMemo(() => {
    return calculateRaceAnalytics(params);
  }, [
    params.lapData,
    params.stintSegments,
    params.driver?.gridPosition,
    params.driver?.racePosition,
    params.driver?.raceGap,
    params.sessionDrivers,
  ]);
};

