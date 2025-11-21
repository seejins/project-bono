import React, { useMemo, useCallback } from 'react';
import type { TooltipProps } from 'recharts';
import { ChartCard } from '../../charts/ChartCard';
import { BaseLineChart, type LineConfig, type ReferenceLineConfig } from '../../charts/BaseLineChart';
import { BaseBarChart } from '../../charts/BaseBarChart';
import { BRAND_COLORS, STATUS_COLORS } from '../../../theme/colors';
import { useTireWearAnalytics } from '../hooks/useTireWearAnalytics';
import { LapData } from '../types';
import { F123DataService } from '../../../services/F123DataService';

// Tire wear line configuration - constant since it never changes
const TIRE_WEAR_LINES: LineConfig[] = [
  {
    dataKey: 'Front Left',
    name: 'Front Left',
    stroke: '#ef4444', // red-500
    dot: false,
    connectNulls: false,
  },
  {
    dataKey: 'Front Right',
    name: 'Front Right',
    stroke: '#f97316', // orange-500
    dot: false,
    connectNulls: false,
  },
  {
    dataKey: 'Rear Left',
    name: 'Rear Left',
    stroke: '#3b82f6', // blue-500
    dot: false,
    connectNulls: false,
  },
  {
    dataKey: 'Rear Right',
    name: 'Rear Right',
    stroke: '#8b5cf6', // violet-500
    dot: false,
    connectNulls: false,
  },
];

type StintSegment = {
  startLap: number;
  endLap: number;
  color: string;
  compound?: string;
};

interface StrategyTabProps {
  averageLapSeconds: number | null;
  compoundLineSetup: { data: any[] };
  stintLines: LineConfig[];
  stintSegments: StintSegment[];
  compoundAverages: any[];
  formatSecondsValue: (seconds?: number | null) => string;
  StintLapTooltip: React.FC<TooltipProps<number, string>>;
  CompoundBarTooltip: React.FC<TooltipProps<number, string>>;
  pitReferenceLines?: ReferenceLineConfig[];
  lapData: LapData[];
}

export const StrategyTab: React.FC<StrategyTabProps> = ({
  averageLapSeconds,
  compoundLineSetup,
  stintLines,
  stintSegments,
  compoundAverages,
  formatSecondsValue,
  StintLapTooltip,
  CompoundBarTooltip,
  pitReferenceLines = [],
  lapData,
}) => {
  const combinedReferenceLines = useMemo(() => {
    const pitLines = pitReferenceLines ?? [];
    if (averageLapSeconds === null) {
      return pitLines;
    }
    return [
      ...pitLines,
      {
        y: averageLapSeconds,
        stroke: STATUS_COLORS.neutral,
        strokeDasharray: '4 4',
        label: { value: 'Avg', fill: BRAND_COLORS.mutedStrong, position: 'right' },
      } as ReferenceLineConfig,
    ];
  }, [averageLapSeconds, pitReferenceLines]);

  // Normalize stint segments for the hook (memoized to avoid re-computation)
  const normalizedStintSegments = useMemo(() => {
    return stintSegments.map(s => ({ 
      startLap: s.startLap, 
      endLap: s.endLap, 
      compound: s.compound || 'Unknown' 
    }));
  }, [stintSegments]);

  // Process tire wear data
  const { tireWearData, stintStats } = useTireWearAnalytics(
    lapData,
    normalizedStintSegments
  );

  // Prepare tire wear chart data
  const tireWearChartData = useMemo(() => {
    return tireWearData.map((data) => ({
      lap: data.lap,
      'Front Left': data.frontLeft,
      'Front Right': data.frontRight,
      'Rear Left': data.rearLeft,
      'Rear Right': data.rearRight,
    }));
  }, [tireWearData]);

  // Memoize reference areas to avoid inline computation on every render
  const tireWearReferenceAreas = useMemo(() => {
    return stintSegments.map((segment) => ({
      x1: segment.startLap - 0.5,
      x2: segment.endLap + 0.5,
      fill: segment.color,
      fillOpacity: 0.08,
      strokeOpacity: 0,
    }));
  }, [stintSegments]);

  const TireWearTooltip = useCallback((props: TooltipProps<number, string>) => {
    const { active, payload } = props;
    if (!active || !payload || payload.length === 0) return null;

    const lap = payload[0]?.payload?.lap;
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800">
        <p className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">Lap {lap}</p>
        <div className="space-y-1">
          {payload.map((entry, index) => {
            const value = entry.value as number;
            if (value === null || value === undefined) return null;
            return (
              <div key={index} className="flex items-center justify-between gap-4 text-sm">
                <span className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: entry.color as string }}
                  />
                  <span className="text-gray-700 dark:text-gray-300">{entry.name}</span>
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {value.toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartCard
          title="Lap Pace by Tire Stint"
          description="Colored bands indicate tire stints. Dots show lap times for each stint start."
          headerSlot={
            averageLapSeconds !== null ? (
              <div className="text-right">
                <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Average Lap</div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  {formatSecondsValue(averageLapSeconds)}
                </div>
              </div>
            ) : null
          }
          bodyClassName="px-6 py-4"
        >
          <div className="h-96 w-full">
            {compoundLineSetup.data.length > 0 ? (
              <BaseLineChart
                data={compoundLineSetup.data}
                lines={stintLines}
                autoDomainPadding={{ axis: 'y', padding: 10, clampToZero: false }}
                yTickFormatter={(value) => formatSecondsValue(value as number)}
                tooltipContent={<StintLapTooltip />}
                referenceLines={combinedReferenceLines}
                referenceAreas={stintSegments.map((segment) => ({
                  x1: segment.startLap - 0.5,
                  x2: segment.endLap + 0.5,
                  fill: segment.color,
                  fillOpacity: 0.08,
                  strokeOpacity: 0,
                }))}
                className="h-full"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                Lap data not available to display stints.
              </div>
            )}
          </div>
        </ChartCard>

        <ChartCard
          title="Average Lap by Tire Compound"
          description="Average lap time recorded on each tire compound."
          bodyClassName="px-6 py-4"
        >
          <div className="h-96 w-full">
            {compoundAverages.length > 0 ? (
              <BaseBarChart
                data={compoundAverages}
                bars={[
                  {
                    dataKey: 'averageSeconds',
                    name: 'Average Lap',
                    fill: STATUS_COLORS.info,
                    barSize: 32,
                    getFill: (entry: any) => entry.color,
                  },
                ]}
                xKey="compoundLabel"
                xAxisProps={{ dataKey: 'compoundLabel' }}
                yTickFormatter={(value) => formatSecondsValue(value as number)}
                tooltipContent={(props) => <CompoundBarTooltip {...props} />}
                legend={false}
                className="h-full"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                No average lap data available for tire compounds.
              </div>
            )}
          </div>
        </ChartCard>
      </div>

      {/* Tire Wear Graph */}
      <ChartCard
        title="Tire Wear"
        description="Tire wear percentage over the race. Higher values indicate more wear."
        bodyClassName="px-6 py-4"
      >
        <div className="h-96 w-full">
          {tireWearChartData.length > 0 ? (
            <BaseLineChart
              data={tireWearChartData}
              lines={TIRE_WEAR_LINES}
              autoDomainPadding={{ axis: 'y', padding: 5, clampToZero: true }}
              yTickFormatter={(value) => `${Math.round(value)}%`}
              tooltipContent={<TireWearTooltip />}
              referenceLines={pitReferenceLines}
              referenceAreas={tireWearReferenceAreas}
              className="h-full"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">
              Tire wear data not available.
            </div>
          )}
        </div>

        {/* Stint Tire Wear Stats */}
        {stintStats.length > 0 && (
          <div className="mt-6 space-y-4">
            <div className="flex flex-wrap gap-4 justify-evenly">
              {stintStats.map((stint) => {
                const tireIcon = F123DataService.getTireCompoundIcon(stint.compound);
                const tireLabel = F123DataService.getTireCompoundText(stint.compound);
                return (
                  <div
                    key={stint.stintIndex}
                    className="rounded-lg border border-gray-200 p-4 dark:border-gray-700 min-w-[280px] flex-1 max-w-[400px]"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {tireIcon ? (
                          <img src={tireIcon} alt={`${tireLabel} tire`} className="h-5 w-5" />
                        ) : (
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {tireLabel || 'Unknown'}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Laps {stint.startLap}-{stint.endLap}
                      </span>
                    </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Total Wear:</span>
                      <div className="text-right">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {stint.total.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Wear per Lap:</span>
                      <div className="text-right">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {stint.perLap.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        )}
      </ChartCard>
    </div>
  );
};
