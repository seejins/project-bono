import React, { useMemo, useCallback, useState } from 'react';
import type { TooltipProps } from 'recharts';
import { ChartCard } from '../../charts/ChartCard';
import { BaseLineChart } from '../../charts/BaseLineChart';
import { LapData } from '../types';
import { buildPitReferenceLines } from '../utils';

interface PaceGraphsTabProps {
  driverName: string;
  lapData: LapData[];
  sessionDrivers: any[];
  formatSecondsValue: (seconds?: number | null) => string;
  getTeamColorHex: (team?: string | null) => string;
  pitLaps: number[];
  primaryDriverId?: string | number | null;
}

export const PaceGraphsTab: React.FC<PaceGraphsTabProps> = ({
  driverName,
  lapData,
  sessionDrivers,
  formatSecondsValue,
  getTeamColorHex,
  pitLaps,
  primaryDriverId = null,
}) => {
  const [hoveredSeries, setHoveredSeries] = useState<string | null>(null);
  const pitLapSet = useMemo(() => new Set(pitLaps), [pitLaps]);

  const paceSeries = useMemo(
    () =>
      lapData.map((lap) => ({
        lap: lap.lap_number,
        lapSeconds: lap.lap_time_ms != null ? lap.lap_time_ms / 1000 : null,
        sector1Seconds: lap.sector1_ms != null ? lap.sector1_ms / 1000 : null,
        sector2Seconds: lap.sector2_ms != null ? lap.sector2_ms / 1000 : null,
        sector3Seconds: lap.sector3_ms != null ? lap.sector3_ms / 1000 : null,
        pitStop:
          typeof lap.lap_number === 'number' && pitLapSet.has(lap.lap_number),
      })),
    [lapData, pitLapSet]
  );

  const paceLines = useMemo(
    () => [
      { dataKey: 'lapSeconds' as const, name: 'Lap', stroke: '#f97316' },
      { dataKey: 'sector1Seconds' as const, name: 'Sector 1', stroke: '#3b82f6' },
      { dataKey: 'sector2Seconds' as const, name: 'Sector 2', stroke: '#10b981' },
      { dataKey: 'sector3Seconds' as const, name: 'Sector 3', stroke: '#a855f7' },
    ],
    []
  );

  const normalizedPrimaryName = useMemo(
    () => (driverName ? driverName.trim().toLowerCase() : null),
    [driverName]
  );

  const driverMetadata = useMemo(() => {
    return sessionDrivers.map((driver: any, index: number) => {
      const rawId =
        driver?.id ?? driver?.driver_id ?? driver?.driverId ?? driver?.member_id ?? driver?.driverNumber;
      const id = String(rawId ?? driver?.name ?? `driver-${index}`);
      const name =
        driver?.name ??
        driver?.driverName ??
        driver?.json_driver_name ??
        driver?.mapping_driver_name ??
        driver?.additional_data?.participantData?.name ??
        `Driver ${index + 1}`;
      const team =
        driver?.team ??
        driver?.json_team_name ??
        driver?.additional_data?.participantData?.team ??
        driver?.additional_data?.teamName ??
        '';
      const stroke = getTeamColorHex(team) || '#94a3b8';
      const laps = Array.isArray(driver?.lap_times) ? driver.lap_times : [];

      const normalizedName = name ? String(name).trim().toLowerCase() : null;
      const stringPrimaryId = primaryDriverId != null ? String(primaryDriverId) : null;

      const isPrimary =
        (stringPrimaryId != null && stringPrimaryId === String(rawId ?? id)) ||
        (normalizedPrimaryName != null && normalizedName === normalizedPrimaryName);

      return {
        id,
        rawId: rawId ?? id,
        name,
        stroke,
        laps,
        strokeWidth: isPrimary ? 3 : 1.5,
        strokeOpacity: isPrimary ? 1 : 0.35,
      };
    });
  }, [sessionDrivers, getTeamColorHex, primaryDriverId, normalizedPrimaryName]);

  const maxLapNumber = useMemo(() => {
    const driverLapMax = lapData.reduce<number>(
      (acc, lap) => Math.max(acc, lap?.lap_number ?? 0),
      0
    );
    const sessionDriverMax = driverMetadata.reduce<number>((acc, driver) => {
      const lapsArray = Array.isArray(driver.laps) ? driver.laps : [];
      const lastLap = lapsArray.reduce<number>(
        (lapAcc, lap) =>
          Math.max(
            lapAcc,
            Number(lap?.lap_number ?? lap?.lapNumber ?? 0)
          ),
        0
      );
      return Math.max(acc, lastLap);
    }, 0);
    return Math.max(driverLapMax, sessionDriverMax);
  }, [driverMetadata, lapData]);

  const positionSeries = useMemo(() => {
    if (!maxLapNumber || maxLapNumber <= 0) {
      return [];
    }

    const series = [];
    for (let lapNumber = 1; lapNumber <= maxLapNumber; lapNumber += 1) {
      const entry: Record<string, number | null> & { lap: number } = {
        lap: lapNumber,
      };
      driverMetadata.forEach((driver) => {
        const lapEntry = driver.laps.find(
          (lap: any) => (lap?.lap_number ?? lap?.lapNumber) === lapNumber
        );
        const position =
          lapEntry?.track_position ??
          lapEntry?.trackPosition ??
          lapEntry?.position ??
          lapEntry?.racePosition ??
          null;
        entry[driver.id] =
          position != null && !Number.isNaN(Number(position)) ? Number(position) : null;
      });
      series.push(entry);
    }
    return series;
  }, [driverMetadata, maxLapNumber]);

  const positionLines = useMemo(
    () =>
      driverMetadata.map((driver) => ({
        dataKey: driver.id,
        name: driver.name,
        stroke: driver.stroke || '#94a3b8',
        strokeWidth: driver.strokeWidth ?? 2,
        strokeOpacity: driver.strokeOpacity ?? 1,
        dot: false,
        activeDot: driver.strokeOpacity === 1 ? { r: 4 } : false,
      })),
    [driverMetadata]
  );

  const primaryDriverKey = useMemo(() => {
    return driverMetadata.find((driver) => driver.strokeOpacity === 1)?.id ?? null;
  }, [driverMetadata]);

  const pitReferenceLines = useMemo(() => buildPitReferenceLines(pitLaps), [pitLaps]);

  const renderPaceTooltip = useCallback(
    ({ active, payload, label }: TooltipProps<number, string>) => {
      if (!active || !payload || payload.length === 0) {
        return null;
      }

      const entries = payload.filter((item) => item?.value != null);
      if (entries.length === 0) {
        return null;
      }

      return (
        <div className="rounded-lg border border-white/20 bg-white/90 px-3 py-2 text-xs text-slate-800 shadow-lg backdrop-blur dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-200">
          <div className="font-semibold text-slate-900 dark:text-white">Lap {label}</div>
          <div className="mt-1 space-y-1">
            {entries.map((entry) => (
              <div key={entry.dataKey} className="flex items-center justify-between gap-3">
                <span className="text-slate-600 dark:text-slate-300">{entry.name}</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {formatSecondsValue(typeof entry.value === 'number' ? entry.value : null)}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    },
    [formatSecondsValue]
  );

  const renderPositionTooltip = useCallback(
    ({ active, payload, label }: TooltipProps<number, string>) => {
      if (!active || !payload || payload.length === 0) {
        return null;
      }

      const targetEntry =
        (hoveredSeries && payload.find((item) => item.dataKey === hoveredSeries)) ||
        (primaryDriverKey && payload.find((item) => item.dataKey === primaryDriverKey)) ||
        payload.find((item) => item.value != null) ||
        payload[0];

      if (!targetEntry || (primaryDriverKey && targetEntry.dataKey !== primaryDriverKey)) {
        return null;
      }

      const driver = driverMetadata.find((metadata) => metadata.id === targetEntry.dataKey);
      const driverNameLabel = driver?.name ?? String(targetEntry.dataKey);
      const position = targetEntry.value != null ? `P${targetEntry.value}` : 'No data';

      return (
        <div className="rounded-lg border border-white/20 bg-white/90 px-3 py-2 text-xs text-slate-800 shadow-lg backdrop-blur dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-200">
          <div className="font-semibold text-slate-900 dark:text-white">{driverNameLabel}</div>
          <div className="text-slate-600 dark:text-slate-300">
            Lap {label}: {position}
          </div>
        </div>
      );
    },
    [driverMetadata, hoveredSeries, primaryDriverKey]
  );

  return (
    <div className="space-y-6">
      <ChartCard
        title="Pace by Lap"
        description={`${driverName}'s lap and sector pace across the session.`}
      >
        <div className="h-80">
          <BaseLineChart
            data={paceSeries}
            lines={paceLines}
            tooltipContent={renderPaceTooltip}
            yTickFormatter={(value) => formatSecondsValue(typeof value === 'number' ? value : null)}
            referenceLines={pitReferenceLines}
            legend
            enableSeriesHighlight
            dimmedOpacity={1}
          />
        </div>
      </ChartCard>

      <ChartCard
        title="Position by Lap"
        description="Track position trends for every driver in the session."
      >
        <div className="h-96">
          <BaseLineChart
            data={positionSeries}
            lines={positionLines}
            tooltipContent={renderPositionTooltip}
            yAxisProps={{
              type: 'number',
              allowDecimals: false,
              domain: ['dataMin', 'dataMax'],
              reversed: true,
              tickFormatter: (value: number) => `P${value}`,
            }}
            referenceLines={pitReferenceLines}
            legend={false}
            enableSeriesHighlight
            dimmedOpacity={1}
            onSeriesHoverStart={setHoveredSeries}
            onSeriesHoverEnd={() => setHoveredSeries(null)}
          />
        </div>
      </ChartCard>
    </div>
  );
};

export default PaceGraphsTab;

