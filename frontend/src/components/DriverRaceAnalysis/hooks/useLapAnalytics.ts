import { useMemo } from 'react';
import { LapData, LapAnalytics, LapComparisonEntry } from '../types';
import { sanitizeLapTimeMs, parseLapNumber } from '../utils';

interface UseLapAnalyticsParams {
  lapData: LapData[];
  comparisonDriver: any;
}

export const useLapAnalytics = ({ lapData, comparisonDriver }: UseLapAnalyticsParams): LapAnalytics => {
  const lapComparisonData = useMemo<LapComparisonEntry[]>(() => {
    if (!lapData || lapData.length === 0 || !comparisonDriver) {
      return [];
    }

    const targetMap = new Map<number, LapData>();
    lapData.forEach((lap) => {
      if (lap?.lap_number) {
        targetMap.set(lap.lap_number, lap);
      }
    });

    const comparisonLapTimes: any[] = Array.isArray(comparisonDriver?.lap_times)
      ? comparisonDriver.lap_times
      : [];

    if (comparisonLapTimes.length === 0) {
      return [];
    }

    const comparisonMap = new Map<number, any>();
    comparisonLapTimes.forEach((lap) => {
      const lapNumber = parseLapNumber(lap);
      if (lapNumber) {
        comparisonMap.set(lapNumber, lap);
      }
    });

    const lapNumbers = Array.from(new Set([...targetMap.keys(), ...comparisonMap.keys()])).sort(
      (a, b) => a - b
    );

    let targetCumulative = 0;
    let comparisonCumulative = 0;

    const comparisonEntries: LapComparisonEntry[] = lapNumbers.map((lapNumber) => {
      const targetLap = targetMap.get(lapNumber);
      const comparisonLap = comparisonMap.get(lapNumber);

      const targetMs = sanitizeLapTimeMs(targetLap?.lap_time_ms);
      const comparisonMs = sanitizeLapTimeMs(
        comparisonLap?.lap_time_ms ?? comparisonLap?.lap_time_in_ms ?? comparisonLap?.lapTimeInMs
      );

      if (targetMs !== null) {
        targetCumulative += targetMs;
      }
      if (comparisonMs !== null) {
        comparisonCumulative += comparisonMs;
      }

      return {
        lap: lapNumber,
        targetLapSeconds: targetMs !== null ? targetMs / 1000 : null,
        comparisonLapSeconds: comparisonMs !== null ? comparisonMs / 1000 : null,
        targetLapMs: targetMs,
        comparisonLapMs: comparisonMs,
        targetCumulativeSeconds: targetCumulative > 0 ? targetCumulative / 1000 : null,
        comparisonCumulativeSeconds: comparisonCumulative > 0 ? comparisonCumulative / 1000 : null,
        deltaSeconds:
          targetMs !== null && comparisonMs !== null
            ? (targetCumulative - comparisonCumulative) / 1000
            : null,
      };
    });

    return comparisonEntries.filter(
      (entry) => entry.targetLapSeconds !== null || entry.comparisonLapSeconds !== null
    );
  }, [lapData, comparisonDriver]);

  const deltaComparisonData = useMemo(() => {
    return lapComparisonData
      .filter((entry) => entry.deltaSeconds !== null)
      .map((entry) => ({ lap: entry.lap, deltaSeconds: entry.deltaSeconds as number }));
  }, [lapComparisonData]);

  return {
    lapComparisonData,
    deltaComparisonData,
  };
};

export default useLapAnalytics;

