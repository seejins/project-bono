import React, { useMemo } from 'react';
import type { TooltipProps } from 'recharts';
import { ChartCard } from '../../charts/ChartCard';
import { BaseLineChart, type LineConfig, type ReferenceLineConfig } from '../../charts/BaseLineChart';
import { BaseBarChart } from '../../charts/BaseBarChart';
import { BRAND_COLORS, STATUS_COLORS } from '../../../theme/colors';

type StintSegment = {
  startLap: number;
  endLap: number;
  color: string;
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
                autoDomainPadding={{ axis: 'y', padding: 20, clampToZero: true }}
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
    </div>
  );
};
