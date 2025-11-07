import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import type {
  TooltipProps,
  XAxisProps,
  YAxisProps,
  CartesianGridProps,
} from 'recharts';

export interface LineConfig {
  dataKey: string;
  name?: string;
  stroke: string;
  strokeWidth?: number;
  type?: 'monotone' | 'linear' | 'natural' | 'step' | 'stepAfter' | 'stepBefore';
  dot?: boolean | React.ReactElement | ((props: any) => React.ReactElement);
  connectNulls?: boolean;
  isAnimationActive?: boolean;
  strokeDasharray?: string;
  yAxisId?: string;
}

export interface ReferenceLineConfig {
  y: number;
  stroke?: string;
  strokeDasharray?: string;
  label?: any;
}

export interface ReferenceAreaConfig {
  x1?: number;
  x2?: number;
  y1?: number;
  y2?: number;
  stroke?: string;
  fill?: string;
  fillOpacity?: number;
  strokeOpacity?: number;
}

interface AutoDomainPadding {
  axis?: 'x' | 'y' | 'both';
  padding?: number;
  clampToZero?: boolean;
}

interface BaseLineChartProps {
  data: any[];
  lines: LineConfig[];
  xKey?: string;
  xAxisProps?: Partial<XAxisProps>;
  yAxisProps?: Partial<YAxisProps>;
  xTickFormatter?: (value: any) => any;
  yTickFormatter?: (value: number) => any;
  tooltipContent?: React.ReactNode | ((props: TooltipProps<number, string>) => React.ReactNode);
  tooltipProps?: Partial<TooltipProps<number, string>>;
  legend?: boolean;
  referenceLines?: ReferenceLineConfig[];
  referenceAreas?: ReferenceAreaConfig[];
  cartesianGrid?: boolean;
  cartesianGridProps?: CartesianGridProps;
  margin?: { top?: number; right?: number; bottom?: number; left?: number };
  className?: string;
  height?: number | string;
  autoDomainPadding?: AutoDomainPadding;
}

export const BaseLineChart: React.FC<BaseLineChartProps> = ({
  data,
  lines,
  xKey = 'lap',
  xAxisProps,
  yAxisProps,
  xTickFormatter,
  yTickFormatter,
  tooltipContent,
  tooltipProps,
  legend,
  referenceLines,
  referenceAreas,
  cartesianGrid = true,
  cartesianGridProps,
  margin,
  className,
  height = '100%',
  autoDomainPadding,
}) => {
  const mergedMargin = {
    top: 16,
    right: 24,
    bottom: 16,
    left: 0,
    ...margin,
  };

  const computePaddedDomain = (
    values: number[],
    padding: number,
    clampToZero: boolean
  ): [number, number] | undefined => {
    if (!values || values.length === 0) {
      return undefined;
    }

    const finiteValues = values.filter((value) => Number.isFinite(value));
    if (finiteValues.length === 0) {
      return undefined;
    }

    const min = Math.min(...finiteValues);
    const max = Math.max(...finiteValues);
    const lower = clampToZero ? Math.max(0, min - padding) : min - padding;
    const upper = max + padding;
    if (!Number.isFinite(lower) || !Number.isFinite(upper)) {
      return undefined;
    }
    return [lower, upper];
  };

  const deriveAxisDomain = (
    axis: 'x' | 'y',
    baseProps?: Partial<XAxisProps> | Partial<YAxisProps>
  ): Partial<XAxisProps> | Partial<YAxisProps> | undefined => {
    if (!autoDomainPadding || (autoDomainPadding.axis && autoDomainPadding.axis !== axis && autoDomainPadding.axis !== 'both')) {
      return baseProps;
    }

    // If caller already supplied a domain, respect it.
    if (baseProps && 'domain' in baseProps && baseProps.domain !== undefined) {
      return baseProps;
    }

    const padding = autoDomainPadding.padding ?? 0;
    const clampToZero = autoDomainPadding.clampToZero ?? true;

    let values: number[] = [];
    if (axis === 'y') {
      values = data.flatMap((entry) =>
        lines
          .map((line) => entry[line.dataKey])
          .filter((value): value is number => typeof value === 'number')
      );
    } else {
      values = data
        .map((entry) => entry[xKey])
        .filter((value): value is number => typeof value === 'number');
    }

    const domain = computePaddedDomain(values, padding, axis === 'y' && clampToZero);
    if (!domain) {
      return baseProps;
    }

    return {
      ...baseProps,
      domain,
    };
  };

  const derivedXAxisProps = deriveAxisDomain('x', xAxisProps);
  const derivedYAxisProps = deriveAxisDomain('y', yAxisProps);

  return (
    <div className={className} style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={mergedMargin}>
          {cartesianGrid && <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} {...cartesianGridProps} />}
          <XAxis
            dataKey={xKey}
            tick={{ fill: '#6b7280', fontSize: 12, ...(derivedXAxisProps?.tick as any) }}
            tickLine={false}
            {...derivedXAxisProps}
            tickFormatter={xTickFormatter ?? derivedXAxisProps?.tickFormatter}
          />
          <YAxis
            tick={{ fill: '#6b7280', fontSize: 12, ...(yAxisProps?.tick as any) }}
            tickLine={false}
            width={derivedYAxisProps?.width ?? 80}
            {...derivedYAxisProps}
            tickFormatter={yTickFormatter ?? derivedYAxisProps?.tickFormatter}
          />
          {tooltipContent !== undefined ? (
            <Tooltip content={tooltipContent as any} {...tooltipProps} />
          ) : (
            <Tooltip {...tooltipProps} />
          )}
          {legend && <Legend />}
          {referenceAreas?.map((area, index) => (
            <ReferenceArea key={`ref-area-${index}`} {...area} />
          ))}
          {referenceLines?.map((line, index) => (
            <ReferenceLine key={`ref-line-${index}`} {...line} />
          ))}
          {lines.map((line) => (
            <Line
              key={line.dataKey}
              type={line.type ?? 'monotone'}
              dataKey={line.dataKey}
              name={line.name}
              stroke={line.stroke}
              strokeWidth={line.strokeWidth ?? 2}
              dot={line.dot ?? false}
              connectNulls={line.connectNulls ?? true}
              isAnimationActive={line.isAnimationActive ?? false}
              strokeDasharray={line.strokeDasharray}
              yAxisId={line.yAxisId}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BaseLineChart;

