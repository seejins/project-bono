/**
 * Shared Analytics Service
 * 
 * Provides reusable analytics functions and hooks for calculating
 * race metrics, tire wear, pace, ERS, and stint analytics.
 * 
 * These analytics can be used across:
 * - Driver Race Analysis page
 * - Grid Dashboard
 * - Season Dashboard
 * - Driver Dashboard
 * - Any other components that need race metrics
 */

// Types
export type {
  TireWearData,
  StintTireWearStats,
  TireWearAnalytics,
  PaceMetrics,
  ERSMetrics,
  StintMetrics,
  RaceAnalytics,
  AggregatedRaceMetrics,
} from './types';

// Analytics functions
export { calculateTireWearAnalytics } from './tireWearAnalytics';
export { calculatePaceMetrics } from './paceAnalytics';
export { calculateERSMetrics, ERS_MAX_LOAD } from './ersAnalytics';
export { calculateStintMetrics } from './stintAnalytics';
export { calculateRaceAnalytics } from './raceMetrics';

// React hooks
export { useRaceAnalytics } from './useRaceAnalytics';
export { useAggregatedMetrics } from './useAggregatedMetrics';
export type { AggregatedMetricsParams } from './useAggregatedMetrics';

// Type exports for use in components
export type {
  LapDataWithWear,
  StintSegment,
} from './tireWearAnalytics';

export type {
  LapDataWithPace,
} from './paceAnalytics';

export type {
  LapDataWithERS,
} from './ersAnalytics';

export type {
  LapDataWithStint,
} from './stintAnalytics';

export type {
  CompleteLapData,
  RaceAnalyticsParams,
} from './raceMetrics';

