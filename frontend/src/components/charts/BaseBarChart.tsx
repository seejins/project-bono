import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
} from 'recharts';
import type {
  TooltipProps,
  XAxisProps,
  YAxisProps,
  CartesianGridProps,
} from 'recharts';

const AXIS_TICK_STYLE = {
  fill: '#6b7280',
  fontSize: 12,
} as const;

type HoveredBar = { key: string; index: number } | null;

export interface BarConfig<T extends Record<string, unknown> = Record<string, unknown>> {
  dataKey: keyof T & string;
  name?: string;
  fill: string;
  radius?: number | [number, number, number, number];
  barSize?: number;
  stackId?: string;
  isAnimationActive?: boolean;
  label?: any;
  getFill?: (entry: T, index: number) => string;
}

export interface ReferenceLineBarConfig {
  y: number;
  stroke?: string;
  strokeDasharray?: string;
  label?: any;
}

export interface BaseBarChartProps<T extends Record<string, unknown> = Record<string, unknown>> {
  data: T[];
  bars: BarConfig<T>[];
  xKey?: keyof T & string;
  xAxisProps?: Partial<XAxisProps>;
  yAxisProps?: Partial<YAxisProps>;
  xTickFormatter?: (value: any, index: number) => string | number;
  yTickFormatter?: (value: number, index: number) => string | number;
  tooltipContent?: React.ReactNode | ((props: TooltipProps<number, string>) => React.ReactNode);
  tooltipProps?: Partial<TooltipProps<number, string>>;
  legend?: boolean;
  referenceLines?: ReferenceLineBarConfig[];
  cartesianGrid?: boolean;
  cartesianGridProps?: Partial<CartesianGridProps>;
  margin?: { top?: number; right?: number; bottom?: number; left?: number };
  className?: string;
  height?: number | string;
  ariaLabel?: string;
}

export function BaseBarChart<T extends Record<string, unknown>>({
  data,
  bars,
  xKey = 'name' as keyof T & string,
  xAxisProps,
  yAxisProps,
  xTickFormatter,
  yTickFormatter,
  tooltipContent,
  tooltipProps,
  legend,
  referenceLines,
  cartesianGrid = true,
  cartesianGridProps,
  margin,
  className,
  height = '100%',
  ariaLabel,
}: BaseBarChartProps<T>): React.ReactElement {
  const [hovered, setHovered] = React.useState<HoveredBar>(null);

  const mergedMargin = React.useMemo(
    () => ({
      top: 16,
      right: 24,
      bottom: 16,
      left: 0,
      ...margin,
    }),
    [margin]
  );

  const handleMouseLeaveChart = React.useCallback(() => {
    setHovered(null);
  }, []);

  const handleCellMouseEnter = React.useCallback((event: React.MouseEvent<SVGRectElement>) => {
    const { barKey, barIndex } = event.currentTarget.dataset;
    if (!barKey || barIndex === undefined) {
      return;
    }
    setHovered({ key: barKey, index: Number(barIndex) });
  }, []);

  const handleCellMouseLeave = React.useCallback((event: React.MouseEvent<SVGRectElement>) => {
    const { barKey, barIndex } = event.currentTarget.dataset;
    if (!barKey || barIndex === undefined) {
      setHovered(null);
      return;
    }
    const index = Number(barIndex);
    setHovered((prev) => (prev?.key === barKey && prev.index === index ? null : prev));
  }, []);

  const tooltipRenderer = React.useCallback(
    (props: TooltipProps<number, string>) => {
      if (typeof tooltipContent === 'function') {
        return (tooltipContent as (p: TooltipProps<number, string>) => React.ReactNode)(props);
      }

      if (tooltipContent !== undefined) {
        return tooltipContent;
      }

      if (!props.active || !props.payload?.length) {
        return null;
      }

      const payload = props.payload[0];
      return (
        <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 shadow-lg dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
          {props.label !== undefined && (
            <div className="font-semibold text-gray-900 dark:text-gray-100">{props.label}</div>
          )}
          <div className="mt-1">{payload.value}</div>
        </div>
      );
    },
    [tooltipContent]
  );

  const tooltipWrapperStyle = React.useMemo(
    () => ({
      pointerEvents: 'none' as const,
      ...(tooltipProps?.wrapperStyle as React.CSSProperties),
    }),
    [tooltipProps?.wrapperStyle]
  );

  const resolvedXAxisTickFormatter = React.useCallback(
    (value: any, index: number): string => {
      const formatter =
        xTickFormatter ??
        (xAxisProps?.tickFormatter as
          | ((val: any, idx: number) => string | number | undefined)
          | undefined);

      const formatted = formatter ? formatter(value, index) : value;
      if (typeof formatted === 'string') return formatted;
      if (typeof formatted === 'number') return formatted.toString();
      if (typeof value === 'string') return value;
      if (typeof value === 'number') return value.toString();
      return '';
    },
    [xAxisProps?.tickFormatter, xTickFormatter]
  );

  const resolvedYAxisTickFormatter = React.useCallback(
    (value: any, index: number): string => {
      const formatter =
        yTickFormatter ??
        (yAxisProps?.tickFormatter as
          | ((val: any, idx: number) => string | number | undefined)
          | undefined);

      const formatted = formatter ? formatter(value, index) : value;
      if (typeof formatted === 'string') return formatted;
      if (typeof formatted === 'number') return formatted.toString();
      if (typeof value === 'string') return value;
      if (typeof value === 'number') return value.toString();
      return '';
    },
    [yAxisProps?.tickFormatter, yTickFormatter]
  );

  return (
    <div className={className} role="img" aria-label={ariaLabel} style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={mergedMargin} onMouseLeave={handleMouseLeaveChart}>
          {cartesianGrid && (
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} {...cartesianGridProps} />
          )}
          <XAxis
            dataKey={xKey as string}
            tick={{ ...AXIS_TICK_STYLE, ...(xAxisProps?.tick as any) }}
            tickLine={false}
            {...xAxisProps}
            tickFormatter={resolvedXAxisTickFormatter}
          />
          <YAxis
            tick={{ ...AXIS_TICK_STYLE, ...(yAxisProps?.tick as any) }}
            tickLine={false}
            width={yAxisProps?.width ?? 80}
            {...yAxisProps}
            tickFormatter={resolvedYAxisTickFormatter}
          />
          <Tooltip
            {...tooltipProps}
            cursor={false}
            content={tooltipRenderer}
            wrapperStyle={tooltipWrapperStyle}
          />
          {legend && <Legend />}
          {referenceLines?.map((ref, index) => (
            <ReferenceLine key={`bar-ref-line-${index}`} {...ref} />
          ))}
          {bars.map((bar) => (
            <Bar
              key={bar.dataKey}
              dataKey={bar.dataKey as string}
              name={bar.name}
              fill={bar.fill}
              radius={bar.radius ?? 4}
              barSize={bar.barSize}
              stackId={bar.stackId}
              isAnimationActive={bar.isAnimationActive ?? false}
              label={bar.label}
            >
              {data.map((entry, index) => {
                const defaultFill = bar.getFill ? bar.getFill(entry, index) : bar.fill;
                const isActive = hovered?.key === (bar.dataKey as string) && hovered.index === index;
                const opacity = hovered ? (isActive ? 1 : 0.35) : 0.85;
                return (
                  <Cell
                    key={`cell-${bar.dataKey}-${index}`}
                    data-bar-key={bar.dataKey as string}
                    data-bar-index={index}
                    fill={defaultFill}
                    style={{
                      cursor: 'pointer',
                      opacity,
                      transition: 'opacity 150ms ease',
                    }}
                    onMouseEnter={handleCellMouseEnter}
                    onMouseLeave={handleCellMouseLeave}
                  />
                );
              })}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default BaseBarChart;
