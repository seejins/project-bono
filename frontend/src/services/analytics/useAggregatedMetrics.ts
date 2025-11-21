import { useMemo } from 'react';
import { calculateRaceAnalytics, RaceAnalyticsParams } from './raceMetrics';
import { AggregatedRaceMetrics } from './types';

export interface AggregatedMetricsParams extends RaceAnalyticsParams {
  raceId: string;
  raceName?: string;
  trackName?: string;
  raceDate?: string;
  driverId: string;
  driverName: string;
  points?: number | null;
}

/**
 * Hook for calculating aggregated race metrics suitable for dashboard display
 * 
 * This hook provides a simplified view of race analytics that can be used
 * in tables, cards, and summary views across different dashboards.
 * 
 * Usage:
 * ```tsx
 * const metrics = useAggregatedMetrics({
 *   raceId: 'race-123',
 *   driverId: 'driver-456',
 *   driverName: 'Max Verstappen',
 *   lapData: lapTimes,
 *   driver: { gridPosition: 1, racePosition: 1 },
 * });
 * ```
 */
export const useAggregatedMetrics = (
  params: AggregatedMetricsParams
): AggregatedRaceMetrics | null => {
  return useMemo(() => {
    const analytics = calculateRaceAnalytics(params);

    if (!analytics) {
      return null;
    }

    return {
      raceId: params.raceId,
      raceName: params.raceName || 'Unknown Race',
      trackName: params.trackName || 'Unknown Track',
      raceDate: params.raceDate || new Date().toISOString(),
      driverId: params.driverId,
      driverName: params.driverName,
      
      // Summary metrics
      finishPosition: analytics.finishPosition,
      points: params.points ?? null,
      fastestLap: analytics.pace.fastestLap,
      averageLap: analytics.pace.averageLap,
      consistencyPercent: analytics.pace.consistencyPercent,
      averageTireWear: analytics.tireWear.averageWearPerLap,
      pitStops: analytics.pitStops,
      
      // Full analytics available on demand
      fullAnalytics: analytics,
    };
  }, [
    params.raceId,
    params.raceName,
    params.trackName,
    params.raceDate,
    params.driverId,
    params.driverName,
    params.points,
    params.lapData,
    params.stintSegments,
    params.driver?.gridPosition,
    params.driver?.racePosition,
    params.driver?.raceGap,
    params.sessionDrivers,
  ]);
};

