import { useMemo } from 'react';
import { LapData, StintAnalytics, StintChartPoint } from '../types';
import { getCompoundKey, getCompoundDisplayName, getTireCompoundHex } from '../utils';

export const useStintAnalytics = (lapData: LapData[]): StintAnalytics => {
  const stintChartData = useMemo<StintChartPoint[]>(() => {
    if (!lapData || lapData.length === 0) {
      return [];
    }

    const sorted = [...lapData]
      .filter((lap) => lap?.lap_number)
      .sort((a, b) => (a.lap_number || 0) - (b.lap_number || 0));

    return sorted.map((lap) => {
      const lapTimeSeconds = lap.lap_time_ms && lap.lap_time_ms > 0 ? lap.lap_time_ms / 1000 : null;
      const tireText = lap.tire_compound ? getCompoundDisplayName(getCompoundKey(lap.tire_compound)) : undefined;
      const compoundKey = getCompoundKey(lap.tire_compound);
      return {
        lap: lap.lap_number,
        lapTimeSeconds,
        tireCompound: tireText,
        tireColorHex: getTireCompoundHex(lap.tire_compound),
        compoundKey,
      };
    });
  }, [lapData]);

  const stintSegments = useMemo(() => {
    if (!stintChartData || stintChartData.length === 0) {
      return [] as StintAnalytics['stintSegments'];
    }

    const segments: Array<{ startLap: number; endLap: number; compound: string; color: string }> = [];
    let currentCompound = stintChartData[0].tireCompound || 'Unknown';
    let currentColor = stintChartData[0].tireColorHex;
    let startLap = stintChartData[0].lap;
    let previousLap = stintChartData[0].lap;

    for (let i = 1; i < stintChartData.length; i++) {
      const entry = stintChartData[i];
      const compound = entry.tireCompound || 'Unknown';
      const color = entry.tireColorHex;

      if (compound !== currentCompound) {
        segments.push({ startLap, endLap: previousLap, compound: currentCompound, color: currentColor });
        currentCompound = compound;
        currentColor = color;
        startLap = entry.lap;
      }

      previousLap = entry.lap;
    }

    segments.push({ startLap, endLap: previousLap, compound: currentCompound, color: currentColor });
    return segments;
  }, [stintChartData]);

  const stintStartLapInfo = useMemo(() => {
    const info = new Map<number, { compoundKey: string; color: string; label: string }>();
    stintSegments.forEach((segment) => {
      const compoundKey = getCompoundKey(segment.compound);
      info.set(segment.startLap, {
        compoundKey,
        color: segment.color,
        label: getCompoundDisplayName(compoundKey),
      });
    });
    return info;
  }, [stintSegments]);

  const compoundLineSetup = useMemo<StintAnalytics['compoundLineSetup']>(() => {
    if (!stintChartData || stintChartData.length === 0) {
      return { data: [], lines: [] };
    }

    const order: Array<{ key: string; color: string; label: string }> = [];
    const seen = new Set<string>();

    stintChartData.forEach((entry) => {
      const key = entry.compoundKey || getCompoundKey(entry.tireCompound);
      if (!seen.has(key)) {
        seen.add(key);
        order.push({ key, color: entry.tireColorHex, label: getCompoundDisplayName(key) });
      }
    });

    const data = stintChartData.map((entry) => {
      const record: any = {
        lap: entry.lap,
        tireCompound: entry.tireCompound,
        tireColorHex: entry.tireColorHex,
        compoundKey: entry.compoundKey,
      };
      order.forEach(({ key }) => {
        record[key] = null;
      });
      if (entry.lapTimeSeconds !== null) {
        record[entry.compoundKey] = entry.lapTimeSeconds;
      }
      return record;
    });

    const lines = order.map(({ key, color, label }) => ({
      dataKey: key,
      name: label,
      stroke: color,
    }));

    return { data, lines };
  }, [stintChartData]);

  const compoundAverages = useMemo(() => {
    if (!stintChartData || stintChartData.length === 0) {
      return [] as StintAnalytics['compoundAverages'];
    }

    const groups = new Map<string, { total: number; count: number; color: string }>();

    stintChartData.forEach((entry) => {
      if (entry.lapTimeSeconds === null || entry.lapTimeSeconds === undefined) return;
      const compoundKey = entry.compoundKey || 'UNK';
      const existing = groups.get(compoundKey);
      if (existing) {
        existing.total += entry.lapTimeSeconds;
        existing.count += 1;
      } else {
        groups.set(compoundKey, {
          total: entry.lapTimeSeconds,
          count: 1,
          color: entry.tireColorHex,
        });
      }
    });

    return Array.from(groups.entries())
      .map(([compoundKey, { total, count, color }]) => {
        const label = compoundKey === 'UNK' ? 'Unknown' : getCompoundDisplayName(compoundKey);
        return {
          compoundKey,
          compoundLabel: label,
          averageSeconds: count > 0 ? total / count : 0,
          color,
          lapCount: count,
        };
      })
      .sort((a, b) => a.averageSeconds - b.averageSeconds);
  }, [stintChartData]);

  return {
    stintChartData,
    stintSegments,
    stintStartLapInfo,
    compoundLineSetup,
    compoundAverages,
  };
};

export default useStintAnalytics;

