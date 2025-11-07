import React, { useState } from 'react';
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

export interface BarConfig {
  dataKey: string;
  name?: string;
  fill: string;
  radius?: number | [number, number, number, number];
  barSize?: number;
  stackId?: string;
  isAnimationActive?: boolean;
  label?: any;
  getFill?: (entry: any, index: number) => string;
}

export interface ReferenceLineBarConfig {
  y: number;
  stroke?: string;
  strokeDasharray?: string;
  label?: any;
}

interface BaseBarChartProps {
  data: any[];
  bars: BarConfig[];
  xKey?: string;
  xAxisProps?: Partial<XAxisProps>;
  yAxisProps?: Partial<YAxisProps>;
  xTickFormatter?: (value: any) => any;
  yTickFormatter?: (value: number) => any;
  tooltipContent?: React.ReactNode | ((props: TooltipProps<number, string>) => React.ReactNode);
  tooltipProps?: Partial<TooltipProps<number, string>>;
  legend?: boolean;
  referenceLines?: ReferenceLineBarConfig[];
  cartesianGrid?: boolean;
  cartesianGridProps?: CartesianGridProps;
  margin?: { top?: number; right?: number; bottom?: number; left?: number };
  className?: string;
  height?: number | string;
}

export const BaseBarChart: React.FC<BaseBarChartProps> = ({
  data,
  bars,
  xKey = 'name',
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
}) => {
  const mergedMargin = {
    top: 16,
    right: 24,
    bottom: 16,
    left: 0,
    ...margin,
  };

  const [hovered, setHovered] = useState<{ key: string; index: number; entry: any } | null>(null);

  const renderTooltip = (props: TooltipProps<number, string>) => {
    if (!hovered || !props || !props.active) {
      return null;
    }

    if (tooltipContent !== undefined) {
      if (typeof tooltipContent === 'function') {
        return (tooltipContent as (p: TooltipProps<number, string>) => React.ReactNode)(props);
      }
      return tooltipContent;
    }

    const payload = props.payload && props.payload.length > 0 ? props.payload[0] : null;
    if (!payload) {
      return null;
    }

    return (
      <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 shadow-lg dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
        {props.label !== undefined && (
          <div className="font-semibold text-gray-900 dark:text-gray-100">{props.label}</div>
        )}
        <div className="mt-1">{payload.value}</div>
      </div>
    );
  };

  const handleMouseLeaveChart = () => {
    setHovered(null);
  };

  return (
    <div className={className} style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={mergedMargin} onMouseLeave={handleMouseLeaveChart}>
          {cartesianGrid && <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} {...cartesianGridProps} />}
          <XAxis
            dataKey={xKey}
            tick={{ fill: '#6b7280', fontSize: 12, ...(xAxisProps?.tick as any) }}
            tickLine={false}
            {...xAxisProps}
            tickFormatter={xTickFormatter ?? xAxisProps?.tickFormatter}
          />
          <YAxis
            tick={{ fill: '#6b7280', fontSize: 12, ...(yAxisProps?.tick as any) }}
            tickLine={false}
            width={yAxisProps?.width ?? 80}
            {...yAxisProps}
            tickFormatter={yTickFormatter ?? yAxisProps?.tickFormatter}
          />
          <Tooltip
            {...tooltipProps}
            cursor={false}
            content={renderTooltip}
            wrapperStyle={{ pointerEvents: 'none', ...(tooltipProps?.wrapperStyle as any) }}
          />
          {legend && <Legend />}
          {referenceLines?.map((ref, index) => (
            <ReferenceLine key={`bar-ref-line-${index}`} {...ref} />
          ))}
          {bars.map((bar) => (
            <Bar
              key={bar.dataKey}
              dataKey={bar.dataKey}
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
                const isActive = hovered?.key === bar.dataKey && hovered.index === index;
                const opacity = hovered ? (isActive ? 1 : 0.35) : 0.85;
                return (
                  <Cell
                    key={`cell-${bar.dataKey}-${index}`}
                    fill={defaultFill}
                    style={{
                      cursor: 'pointer',
                      opacity,
                      transition: 'opacity 150ms ease',
                    }}
                    onMouseEnter={() => setHovered({ key: bar.dataKey, index, entry })}
                    onMouseLeave={() =>
                      setHovered((prev) => (prev?.key === bar.dataKey && prev.index === index ? null : prev))
                    }
                  />
                );
              })}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BaseBarChart;

