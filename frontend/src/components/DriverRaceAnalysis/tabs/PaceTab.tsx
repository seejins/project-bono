import React, { useMemo, useCallback } from 'react';
import type { TooltipProps } from 'recharts';
import { ChartCard } from '../../charts/ChartCard';
import { BaseLineChart, type ReferenceLineConfig } from '../../charts/BaseLineChart';
import { BRAND_COLORS, STATUS_COLORS } from '../../../theme/colors';
import { useTireWearComparison } from '../hooks/useTireWearComparison';
import { LapData } from '../types';
import { getCompoundDisplayName, getCompoundKey } from '../utils';
import { F123DataService } from '../../../services/F123DataService';

type OverlayLegendItem = {
  status: string;
  label: string;
  color: string;
  pattern?: string;
};

type ChartOverlay = {
  key: string;
  x1: number;
  x2: number;
  statuses: string[];
};

interface ComparisonOption {
  id: string;
  name: string;
  position: number | null;
}

interface PaceTabProps {
  driverName: string;
  comparisonDriverName: string | null;
  comparisonDriverId: string | null;
  onSelectComparisonDriver: (id: string | null) => void;
  comparisonOptions: ComparisonOption[];
  lapComparisonData: any[];
  deltaComparisonData: any[];
  overlayLegendItems: OverlayLegendItem[];
  chartOverlays: ChartOverlay[];
  formatSecondsValue: (seconds?: number | null) => string;
  formatSecondsDifference: (seconds?: number | null) => string;
  LapTimeTooltipContent: React.FC<TooltipProps<number, string>>;
  DeltaTooltipContent: React.FC<TooltipProps<number, string>>;
  hexToRgba: (hex: string, alpha: number) => string;
  pitReferenceLines?: ReferenceLineConfig[];
  lapData: LapData[];
  comparisonDriver: any;
}

export const PaceTab: React.FC<PaceTabProps> = ({
  driverName,
  comparisonDriverName,
  comparisonDriverId,
  onSelectComparisonDriver,
  comparisonOptions,
  lapComparisonData,
  deltaComparisonData,
  overlayLegendItems,
  chartOverlays,
  formatSecondsValue,
  formatSecondsDifference,
  LapTimeTooltipContent,
  DeltaTooltipContent,
  hexToRgba,
  pitReferenceLines = [],
  lapData,
  comparisonDriver,
}) => {
  // Process tire wear comparison
  const comparisonLapTimes = useMemo(() => {
    return Array.isArray(comparisonDriver?.lap_times) ? comparisonDriver.lap_times : [];
  }, [comparisonDriver]);

  const { tireWearComparisonData } = useTireWearComparison(lapData, comparisonLapTimes);

  // Prepare tire wear chart data with fixed keys to avoid unnecessary re-renders
  const tireWearChartData = useMemo(() => {
    return tireWearComparisonData.map((data) => ({
      lap: data.lap,
      target: data.targetAverageWear,
      comparison: data.comparisonAverageWear,
      targetTireCompound: data.targetTireCompound,
      comparisonTireCompound: data.comparisonTireCompound,
    }));
  }, [tireWearComparisonData]);

  // Tire wear tooltip
  const TireWearTooltip = useCallback((props: TooltipProps<number, string>) => {
    const { active, payload } = props;
    if (!active || !payload || payload.length === 0) return null;

    const lap = payload[0]?.payload?.lap;
    const targetTireCompound = payload[0]?.payload?.targetTireCompound;
    const comparisonTireCompound = payload[0]?.payload?.comparisonTireCompound;
    
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800">
        <p className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">Lap {lap}</p>
        <div className="space-y-1">
          {payload.map((entry, index) => {
            const value = entry.value as number;
            if (value === null || value === undefined) return null;
            
            // Determine which tire compound to show based on the dataKey (target vs comparison)
            const isTargetDriver = entry.dataKey === 'target';
            const tireCompound = isTargetDriver ? targetTireCompound : comparisonTireCompound;
            const tireLabel = tireCompound ? getCompoundDisplayName(getCompoundKey(tireCompound)) : null;
            const tireIcon = tireCompound ? F123DataService.getTireCompoundIcon(tireCompound) : null;
            
            return (
              <div key={index} className="flex items-center justify-between gap-4 text-sm">
                <span className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: entry.color as string }}
                  />
                  <span className="text-gray-700 dark:text-gray-300">{entry.name}</span>
                  {tireLabel && (
                    <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      {tireIcon ? (
                        <img src={tireIcon} alt={`${tireLabel} tire`} className="h-3 w-3" />
                      ) : (
                        <span>({tireLabel})</span>
                      )}
                    </span>
                  )}
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
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Driver Comparison</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Comparing lap pace for {driverName}
            {comparisonDriverName ? ` vs ${comparisonDriverName}` : ''}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label
            htmlFor="comparison-driver"
            className="text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            Compare against
          </label>
          <select
            id="comparison-driver"
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-400/40"
            value={comparisonDriverId ?? ''}
            onChange={(event) => onSelectComparisonDriver(event.target.value || null)}
          >
            {comparisonOptions.length === 0 ? (
              <option value="">No other drivers available</option>
            ) : (
              comparisonOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.position ? `P${option.position} - ${option.name}` : option.name}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartCard
          title="Lap Time Comparison"
          description="Lap times in seconds — lower values indicate a faster lap."
          bodyClassName="px-6 py-4"
        >
          <div className="relative h-80 w-full">
            {overlayLegendItems.length > 0 && (
              <div className="absolute right-3 top-3 z-10 flex flex-wrap gap-2 rounded-md bg-white/80 px-3 py-2 text-xs text-gray-600 backdrop-blur dark:bg-gray-900/70 dark:text-gray-200">
                {overlayLegendItems.map((item) => (
                  <div key={item.status} className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{
                        backgroundColor: item.pattern ? undefined : item.color,
                        backgroundImage:
                          item.pattern === 'rain'
                            ? `repeating-linear-gradient(45deg, ${hexToRgba(
                                item.color,
                                0.45
                              )} 0, ${hexToRgba(item.color, 0.45)} 4px, ${hexToRgba(
                                item.color,
                                0.18
                              )} 4px, ${hexToRgba(item.color, 0.18)} 8px)`
                            : item.pattern === 'vsc'
                            ? `repeating-linear-gradient(0deg, ${hexToRgba(
                                item.color,
                                0.6
                              )} 0, ${hexToRgba(item.color, 0.6)} 2px, ${hexToRgba(
                                item.color,
                                0.2
                              )} 2px, ${hexToRgba(item.color, 0.2)} 5px)`
                            : undefined,
                      }}
                    ></span>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            )}
            {comparisonDriverId &&
            lapComparisonData.length > 0 &&
            lapComparisonData.some((entry) => entry.comparisonLapSeconds !== null) ? (
              <BaseLineChart
                data={lapComparisonData}
                lines={[
                  {
                    dataKey: 'targetLapSeconds',
                    name: driverName || 'Driver',
                    stroke: STATUS_COLORS.info,
                    dot: false,
                  },
                  {
                    dataKey: 'comparisonLapSeconds',
                    name: comparisonDriverName || 'Comparison',
                    stroke: STATUS_COLORS.danger,
                    dot: false,
                  },
                ]}
                autoDomainPadding={{ axis: 'y', padding: 10, clampToZero: false }}
                yTickFormatter={(value) => formatSecondsValue(value as number)}
                tooltipContent={<LapTimeTooltipContent />}
                legend
                overlays={chartOverlays}
                className="h-full"
                enableSeriesHighlight
                dimmedOpacity={1}
                referenceLines={pitReferenceLines}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                {comparisonOptions.length === 0
                  ? 'Comparison data is not available for this session.'
                  : 'Comparison driver has no lap time data available.'}
              </div>
            )}
          </div>
        </ChartCard>

        <ChartCard
          title="Cumulative Time Delta"
          description={`Positive values indicate ${driverName || 'the selected driver'} is behind the comparison driver.`}
          bodyClassName="px-6 py-4"
        >
          <div className="relative h-72 w-full">
            {overlayLegendItems.length > 0 && (
              <div className="absolute right-3 top-3 z-10 flex flex-wrap gap-2 rounded-md bg-white/80 px-3 py-2 text-xs text-gray-600 backdrop-blur dark:bg-gray-900/70 dark:text-gray-200">
                {overlayLegendItems.map((item) => (
                  <div key={`delta-${item.status}`} className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{ backgroundColor: item.color }}
                    ></span>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            )}
            {comparisonDriverId && deltaComparisonData.length > 0 ? (
              <BaseLineChart
                data={deltaComparisonData}
                lines={[
                  {
                    dataKey: 'deltaSeconds',
                    name: 'Δ time vs comparison',
                    stroke: STATUS_COLORS.amber,
                    dot: false,
                  },
                ]}
                yTickFormatter={(value) => formatSecondsDifference(value as number)}
                tooltipContent={<DeltaTooltipContent />}
                referenceLines={[
                  { y: 0, stroke: BRAND_COLORS.muted, strokeDasharray: '4 4' },
                  ...pitReferenceLines,
                ]}
                overlays={chartOverlays}
                className="h-full"
                enableSeriesHighlight
                dimmedOpacity={1}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                Additional comparison data is not available for this driver pairing.
              </div>
            )}
          </div>
        </ChartCard>
      </div>

      {/* Tire Wear Comparison Graph */}
      <ChartCard
        title="Tire Wear Comparison"
        description="Average tire wear (all 4 tires combined) per lap comparison."
        bodyClassName="px-6 py-4"
      >
        <div className="h-96 w-full">
          {comparisonDriverId && tireWearChartData.length > 0 &&
           tireWearChartData.some(
             (d) =>
               d.target !== null ||
               d.comparison !== null
           ) ? (
            <BaseLineChart
              data={tireWearChartData}
              lines={[
                {
                  dataKey: 'target',
                  name: driverName || 'Driver',
                  stroke: STATUS_COLORS.info,
                  dot: false,
                  connectNulls: false,
                },
                {
                  dataKey: 'comparison',
                  name: comparisonDriverName || 'Comparison',
                  stroke: STATUS_COLORS.danger,
                  dot: false,
                  connectNulls: false,
                },
              ]}
              autoDomainPadding={{ axis: 'y', padding: 5, clampToZero: true }}
              yTickFormatter={(value) => `${Math.round(value)}%`}
              tooltipContent={<TireWearTooltip />}
              referenceLines={pitReferenceLines}
              className="h-full"
              legend
              enableSeriesHighlight
              dimmedOpacity={1}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">
              Tire wear comparison data is not available.
            </div>
          )}
        </div>
      </ChartCard>
    </div>
  );
};
