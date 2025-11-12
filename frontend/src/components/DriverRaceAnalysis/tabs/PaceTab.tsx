import React from 'react';
import type { TooltipProps } from 'recharts';
import { ChartCard } from '../../charts/ChartCard';
import { BaseLineChart } from '../../charts/BaseLineChart';
import { BRAND_COLORS, STATUS_COLORS } from '../../../theme/colors';

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
}) => {
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
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
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
                autoDomainPadding={{ axis: 'y', padding: 20, clampToZero: true }}
                yTickFormatter={(value) => formatSecondsValue(value as number)}
                tooltipContent={<LapTimeTooltipContent />}
                legend
                overlays={chartOverlays}
                className="h-full"
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
                referenceLines={[{ y: 0, stroke: BRAND_COLORS.muted, strokeDasharray: '4 4' }]}
                overlays={chartOverlays}
                className="h-full"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                Additional comparison data is not available for this driver pairing.
              </div>
            )}
          </div>
        </ChartCard>
      </div>
    </div>
  );
};
