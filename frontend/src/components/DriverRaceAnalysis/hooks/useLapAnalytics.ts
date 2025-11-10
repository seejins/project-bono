import { useMemo } from 'react';
import { LapData, LapAnalytics, LapComparisonEntry, StatusOverlaySegment, LapStatusType } from '../types';
import { sanitizeLapTimeMs, parseLapNumber } from '../utils';

interface UseLapAnalyticsParams {
  lapData: LapData[];
  comparisonDriver: any;
}

export const useLapAnalytics = ({ lapData, comparisonDriver }: UseLapAnalyticsParams): LapAnalytics => {
  const effectiveLapData = lapData;
  const effectiveComparisonDriver = comparisonDriver;

  const lapComparisonData = useMemo<LapComparisonEntry[]>(() => {
    if (!effectiveLapData || effectiveLapData.length === 0 || !effectiveComparisonDriver) {
      return [];
    }

    const targetMap = new Map<number, LapData>();
    effectiveLapData.forEach((lap) => {
      if (lap?.lap_number) {
        targetMap.set(lap.lap_number, lap);
      }
    });

    const comparisonLapTimes: any[] = Array.isArray(effectiveComparisonDriver?.lap_times)
      ? effectiveComparisonDriver.lap_times
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
  }, [effectiveLapData, effectiveComparisonDriver]);

  const deltaComparisonData = useMemo(() => {
    return lapComparisonData
      .filter((entry) => entry.deltaSeconds !== null)
      .map((entry) => ({ lap: entry.lap, deltaSeconds: entry.deltaSeconds as number }));
  }, [lapComparisonData]);

  const { statusOverlays, statusLegend } = useMemo(() => {
    if (!effectiveLapData || effectiveLapData.length === 0) {
      return { statusOverlays: [] as StatusOverlaySegment[], statusLegend: [] as LapStatusType[] };
    }

    const overlays: StatusOverlaySegment[] = [];
    const statusesPresent = new Set<LapStatusType>();

    const sortedLaps = [...effectiveLapData]
      .filter((lap) => typeof lap.lap_number === 'number')
      .sort((a, b) => (a.lap_number || 0) - (b.lap_number || 0));

    let currentStatusesKey: string | null = null;
    let currentStatuses: LapStatusType[] = [];
    let currentStartLap: number | null = null;

    const finalizeSegment = (endLap: number) => {
      if (currentStatusesKey && currentStatuses.length > 0 && currentStartLap !== null) {
        overlays.push({
          startLap: currentStartLap,
          endLap,
          statuses: currentStatuses,
        });
      }
      currentStatusesKey = null;
      currentStatuses = [];
      currentStartLap = null;
    };

    sortedLaps.forEach((lap, index) => {
      const lapNumber = lap.lap_number || 0;
      const statusesForLap = deriveLapStatuses(lap);

      statusesForLap.forEach((status) => statusesPresent.add(status));

      if (statusesForLap.length === 0) {
        if (currentStatusesKey !== null && currentStartLap !== null) {
          finalizeSegment(lapNumber - 1 >= currentStartLap ? lapNumber - 1 : lapNumber);
        }
        return;
      }

      const key = statusesForLap.join('|');

      if (currentStatusesKey === key) {
        // Continue the current segment
        return;
      }

      if (currentStatusesKey !== null && currentStartLap !== null) {
        finalizeSegment(sortedLaps[index - 1]?.lap_number || lapNumber);
      }

      currentStatusesKey = key;
      currentStatuses = statusesForLap;
      currentStartLap = lapNumber;
    });

    if (currentStatusesKey && currentStatuses.length > 0 && currentStartLap !== null) {
      const lastLapNumber = sortedLaps[sortedLaps.length - 1]?.lap_number || currentStartLap;
      finalizeSegment(lastLapNumber);
    }

    return {
      statusOverlays: overlays,
      statusLegend: Array.from(statusesPresent),
    };
  }, [effectiveLapData]);

  return {
    lapComparisonData,
    deltaComparisonData,
    statusOverlays,
    statusLegend,
  };
};

export default useLapAnalytics;

const deriveLapStatuses = (lap: LapData): LapStatusType[] => {
  const statuses = new Set<LapStatusType>();

  const safetyStatus = (lap.max_safety_car_status || '').toString().toUpperCase();
  if (safetyStatus === 'SAFETY_CAR') {
    statuses.add('safetyCar');
  } else if (safetyStatus === 'VIRTUAL_SAFETY_CAR') {
    statuses.add('virtualSafetyCar');
  }

  const vehicleFlags = (lap.vehicle_fia_flags || '').toString().toUpperCase();
  if (vehicleFlags.includes('YELLOW')) {
    statuses.add('yellowFlag');
  }

  if (isRainLap(lap)) {
    statuses.add('rain');
  }

  return Array.from(statuses).sort();
};

const isRainLap = (lap: LapData): boolean => {
  const potentialWeatherSources: Array<any> = [
    (lap as any).weather,
    (lap as any).trackWeather,
    lap.car_damage_data?.weather,
    lap.car_damage_data?.Weather,
    lap.tyre_sets_data?.weather,
    lap.tyre_sets_data?.Weather,
  ];

  for (const source of potentialWeatherSources) {
    if (typeof source === 'string' && source.toLowerCase().includes('rain')) {
      return true;
    }
  }

  const compound = (lap.tire_compound || '').toString().toLowerCase();
  if (compound.includes('intermediate') || compound === 'i') {
    return true;
  }
  if (compound.includes('wet') || compound === 'w') {
    return true;
  }

  const visualCompound = (lap.tyre_sets_data?.visual_compound || lap.tyre_sets_data?.visualCompound || '').toString().toLowerCase();
  if (visualCompound.includes('intermediate') || visualCompound.includes('wet')) {
    return true;
  }

  return false;
};

