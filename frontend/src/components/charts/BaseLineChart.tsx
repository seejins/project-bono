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

import { BRAND_COLORS, STATUS_COLORS } from '../../theme/colors';

const AXIS_TICK_STYLE = {
  fill: BRAND_COLORS.mutedStrong,
  fontSize: 12,
} as const;

export interface LineConfig<T extends Record<string, unknown> = Record<string, unknown>> {
  dataKey: keyof T & string;
  name?: string;
  stroke: string;
  strokeWidth?: number;
  type?: 'monotone' | 'linear' | 'natural' | 'step' | 'stepAfter' | 'stepBefore';
  dot?: boolean | React.ReactElement | ((props: any) => React.ReactElement);
  connectNulls?: boolean;
  isAnimationActive?: boolean;
  strokeDasharray?: string;
  yAxisId?: string;
  strokeOpacity?: number;
  activeDot?: boolean | object;
}

export interface ReferenceLineConfig {
  x?: number;
  y?: number;
  stroke?: string;
  strokeDasharray?: string;
  strokeWidth?: number;
  label?: any;
  ifFront?: boolean;
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

export interface ChartOverlayConfig {
  key: string;
  x1: number;
  x2: number;
  statuses: string[];
}

export type OverlayPattern = 'rain' | 'vsc';

export interface OverlayStyle {
  color: string;
  fillOpacity?: number;
  pattern?: OverlayPattern;
}

export const DEFAULT_OVERLAY_STYLES: Record<string, OverlayStyle> = {
  safetyCar: {
    color: STATUS_COLORS.warning,
    fillOpacity: 0.26,
  },
  virtualSafetyCar: {
    color: STATUS_COLORS.purple,
    fillOpacity: 0.26,
  },
  yellowFlag: {
    color: STATUS_COLORS.amber,
    fillOpacity: 0.26,
  },
  rain: {
    color: STATUS_COLORS.cyan,
    fillOpacity: 0.26,
    pattern: 'rain',
  },
};

interface AutoDomainPadding {
  axis?: 'x' | 'y' | 'both';
  padding?: number;
  clampToZero?: boolean;
}

interface NormalizedOverlay extends ChartOverlayConfig {
  sortedStatuses: string[];
}

export interface BaseLineChartProps<T extends Record<string, unknown> = Record<string, unknown>> {
  data: T[];
  lines: LineConfig<T>[];
  xKey?: keyof T & string;
  xAxisProps?: Partial<XAxisProps>;
  yAxisProps?: Partial<YAxisProps>;
  xTickFormatter?: (value: any, index: number) => string | number;
  yTickFormatter?: (value: number, index: number) => string | number;
  tooltipContent?: React.ReactNode | ((props: TooltipProps<number, string>) => React.ReactNode);
  tooltipProps?: Partial<TooltipProps<number, string>>;
  legend?: boolean;
  referenceLines?: ReferenceLineConfig[];
  referenceAreas?: ReferenceAreaConfig[];
  cartesianGrid?: boolean;
  cartesianGridProps?: Partial<CartesianGridProps>;
  margin?: { top?: number; right?: number; bottom?: number; left?: number };
  className?: string;
  height?: number | string;
  autoDomainPadding?: AutoDomainPadding;
  overlays?: ChartOverlayConfig[];
  overlayStyles?: Record<string, Partial<OverlayStyle>>;
  ariaLabel?: string;
  enableSeriesHighlight?: boolean;
  dimmedOpacity?: number;
  onSeriesHoverStart?: (dataKey: string) => void;
  onSeriesHoverEnd?: () => void;
}

export function BaseLineChart<T extends Record<string, unknown>>({
  data,
  lines,
  xKey = 'lap' as keyof T & string,
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
  overlays,
  overlayStyles,
  ariaLabel,
  enableSeriesHighlight = false,
  dimmedOpacity = 0.18,
  onSeriesHoverStart,
  onSeriesHoverEnd,
}: BaseLineChartProps<T>): React.ReactElement {
  const chartInstanceId = React.useId();
  const [hoveredSeries, setHoveredSeries] = React.useState<string | null>(null);

  const mergedMargin = React.useMemo(
    () => ({
      top: 8,
      right: 8,
      bottom: 8,
      left: 0,
      ...margin,
    }),
    [margin]
  );

  const overlayMeta = React.useMemo(
    () => buildOverlayMeta(overlays, overlayStyles, chartInstanceId),
    [chartInstanceId, overlays, overlayStyles]
  );

  const normalizedOverlays = overlayMeta.normalized;
  const resolvedOverlayStyles = overlayMeta.styles;
  const patternNodes = overlayMeta.patternDefs;

  const derivedXAxisProps = React.useMemo(
    () =>
      deriveXAxisDomain({
        baseProps: xAxisProps,
        autoDomainPadding,
        data,
        xKey,
      }),
    [autoDomainPadding, data, xAxisProps, xKey]
  );

  const derivedYAxisProps = React.useMemo(
    () =>
      deriveYAxisDomain({
        baseProps: yAxisProps,
        autoDomainPadding,
        data,
        lines,
      }),
    [autoDomainPadding, data, lines, yAxisProps]
  );

  const xAxisHasNumericValues = React.useMemo(
    () => data.some((entry) => typeof entry[xKey] === 'number'),
    [data, xKey]
  );

  const shouldForceNumericAxis = Boolean(normalizedOverlays?.length && xAxisHasNumericValues);

  const resolvedXAxisTickFormatter = React.useMemo(
    () =>
      buildStringFormatter(
        xTickFormatter,
        derivedXAxisProps?.tickFormatter as
          | ((value: any, index: number) => string | number | undefined)
          | undefined
      ),
    [derivedXAxisProps?.tickFormatter, xTickFormatter]
  );

  const resolvedYAxisTickFormatter = React.useMemo(
    () =>
      buildStringFormatter(
        yTickFormatter,
        derivedYAxisProps?.tickFormatter as
          | ((value: any, index: number) => string | number | undefined)
          | undefined
      ),
    [derivedYAxisProps?.tickFormatter, yTickFormatter]
  );

  const tooltipElement = React.useMemo(() => {
    if (tooltipContent !== undefined) {
      return <Tooltip content={tooltipContent as any} {...tooltipProps} />;
    }
    return <Tooltip {...tooltipProps} />;
  }, [tooltipContent, tooltipProps]);

  const handleSeriesMouseEnter = React.useCallback(
    (key: string) => {
      if (!enableSeriesHighlight) {
        return;
      }
      setHoveredSeries(key);
      onSeriesHoverStart?.(key);
    },
    [enableSeriesHighlight, onSeriesHoverStart]
  );

  const handleSeriesMouseLeave = React.useCallback(() => {
    if (!enableSeriesHighlight) {
      return;
    }
    setHoveredSeries(null);
    onSeriesHoverEnd?.();
  }, [enableSeriesHighlight, onSeriesHoverEnd]);

  return (
    <div className={className} role="img" aria-label={ariaLabel} style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={mergedMargin}>
          {patternNodes && <defs>{patternNodes}</defs>}
          {cartesianGrid && (
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} {...cartesianGridProps} />
          )}
          <XAxis
            dataKey={xKey as string}
            type={shouldForceNumericAxis ? 'number' : derivedXAxisProps?.type}
            allowDataOverflow={
              shouldForceNumericAxis ? true : derivedXAxisProps?.allowDataOverflow
            }
            tick={{ ...AXIS_TICK_STYLE, ...(derivedXAxisProps?.tick as any) }}
            tickLine={false}
            {...derivedXAxisProps}
            tickFormatter={resolvedXAxisTickFormatter}
          />
          <YAxis
            tick={{ ...AXIS_TICK_STYLE, ...(yAxisProps?.tick as any) }}
            tickLine={false}
            width={derivedYAxisProps?.width ?? 80}
            {...derivedYAxisProps}
            tickFormatter={resolvedYAxisTickFormatter}
          />
          {tooltipElement}
          {legend && <Legend />}
          {referenceAreas?.map((area, index) => (
            <ReferenceArea key={`ref-area-${index}`} {...area} />
          ))}
          {referenceLines?.map((line, index) => (
            <ReferenceLine key={`ref-line-${index}`} {...line} />
          ))}
          {normalizedOverlays?.map((overlay) => {
            if (!overlay.sortedStatuses.length) {
              return null;
            }

            const comboKey = overlay.sortedStatuses.join('|');

            if (overlay.sortedStatuses.length === 1) {
              const status = overlay.sortedStatuses[0];
              const style =
                resolvedOverlayStyles[status] ?? { color: STATUS_COLORS.neutral, fillOpacity: 0.26 };

              if (style.pattern) {
                const sanitizedStatus = sanitizeForId(status);
                return (
                  <ReferenceArea
                    key={overlay.key}
                    x1={overlay.x1}
                    x2={overlay.x2}
                    fill={`url(#${chartInstanceId}-${sanitizedStatus})`}
                    strokeOpacity={0}
                  />
                );
              }

              return (
                <ReferenceArea
                  key={overlay.key}
                  x1={overlay.x1}
                  x2={overlay.x2}
                  fill={applyAlpha(style.color, style.fillOpacity ?? 0.26)}
                  strokeOpacity={0}
                />
              );
            }

            const patternId = `${chartInstanceId}-${sanitizeForId(comboKey)}`;
            return (
              <ReferenceArea
                key={overlay.key}
                x1={overlay.x1}
                x2={overlay.x2}
                fill={`url(#${patternId})`}
                strokeOpacity={0}
              />
            );
          })}
          {lines.map((line) => {
            const baseOpacity = line.strokeOpacity ?? 1;
            const isDimmed =
              enableSeriesHighlight &&
              hoveredSeries !== null &&
              hoveredSeries !== (line.dataKey as string);

            return (
              <Line
                key={line.dataKey}
                type={line.type ?? 'monotone'}
                dataKey={line.dataKey as string}
                name={line.name}
                stroke={line.stroke}
                strokeWidth={line.strokeWidth ?? 2}
                dot={line.dot ?? false}
                connectNulls={line.connectNulls ?? true}
                isAnimationActive={line.isAnimationActive ?? false}
                strokeDasharray={line.strokeDasharray}
                yAxisId={line.yAxisId}
                strokeOpacity={isDimmed ? baseOpacity * dimmedOpacity : baseOpacity}
                activeDot={line.activeDot}
                onMouseEnter={() => handleSeriesMouseEnter(line.dataKey as string)}
                onMouseLeave={handleSeriesMouseLeave}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default BaseLineChart;

const computePaddedDomain = (
  values: number[],
  padding: number,
  clampToZero: boolean
): [number, number] | undefined => {
  if (!values.length) {
    return undefined;
  }

  const finiteValues = values.filter((value) => Number.isFinite(value));
  if (!finiteValues.length) {
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

const deriveXAxisDomain = <T extends Record<string, unknown>>({
  baseProps,
  autoDomainPadding,
  data,
  xKey,
}: {
  baseProps?: Partial<XAxisProps>;
  autoDomainPadding?: AutoDomainPadding;
  data: T[];
  xKey: keyof T & string;
}): Partial<XAxisProps> | undefined => {
  if (
    !autoDomainPadding ||
    (autoDomainPadding.axis &&
      autoDomainPadding.axis !== 'x' &&
      autoDomainPadding.axis !== 'both')
  ) {
    return baseProps;
  }

  if (baseProps?.domain !== undefined) {
    return baseProps;
  }

  const padding = autoDomainPadding.padding ?? 0;
  const values = data.reduce<number[]>((acc, entry) => {
    const value = entry[xKey];
    if (typeof value === 'number') {
      acc.push(value);
    }
    return acc;
  }, []);

  const domain = computePaddedDomain(values, padding, false);
  if (!domain) {
    return baseProps;
  }

  return {
    ...baseProps,
    domain,
  };
};

const deriveYAxisDomain = <T extends Record<string, unknown>>({
  baseProps,
  autoDomainPadding,
  data,
  lines,
}: {
  baseProps?: Partial<YAxisProps>;
  autoDomainPadding?: AutoDomainPadding;
  data: T[];
  lines: LineConfig<T>[];
}): Partial<YAxisProps> | undefined => {
  if (
    !autoDomainPadding ||
    (autoDomainPadding.axis &&
      autoDomainPadding.axis !== 'y' &&
      autoDomainPadding.axis !== 'both')
  ) {
    return baseProps;
  }

  if (baseProps?.domain !== undefined) {
    return baseProps;
  }

  const padding = autoDomainPadding.padding ?? 0;
  const clampToZero = autoDomainPadding.clampToZero ?? true;

  const values = data.reduce<number[]>((acc, entry) => {
    lines.forEach((line) => {
      const value = entry[line.dataKey];
      if (typeof value === 'number') {
        acc.push(value);
      }
    });
    return acc;
  }, []);

  const domain = computePaddedDomain(values, padding, clampToZero);
  if (!domain) {
    return baseProps;
  }

  return {
    ...baseProps,
    domain,
  };
};

interface OverlayMeta {
  normalized: NormalizedOverlay[] | null;
  styles: Record<string, OverlayStyle>;
  patternDefs: React.ReactNode[] | null;
}

const buildOverlayMeta = (
  overlays: ChartOverlayConfig[] | undefined,
  overrides: Record<string, Partial<OverlayStyle>> | undefined,
  chartInstanceId: string
): OverlayMeta => {
  if (!overlays?.length) {
    return { normalized: null, styles: {}, patternDefs: null };
  }

  const normalized: NormalizedOverlay[] = overlays.map((overlay) => ({
    ...overlay,
    sortedStatuses: overlay.statuses?.slice().sort() ?? [],
  }));

  const statusSet = new Set<string>();
  const combinationMap = new Map<string, string[]>();

  normalized.forEach((overlay) => {
    overlay.sortedStatuses.forEach((status) => statusSet.add(status));
    if (overlay.sortedStatuses.length > 1) {
      combinationMap.set(overlay.sortedStatuses.join('|'), overlay.sortedStatuses);
    }
  });

  const styles: Record<string, OverlayStyle> = {};
  statusSet.forEach((status) => {
    const base = DEFAULT_OVERLAY_STYLES[status] ?? { color: STATUS_COLORS.neutral, fillOpacity: 0.26 };
    const override = overrides?.[status];
    styles[status] = {
      color: override?.color ?? base.color,
      fillOpacity: override?.fillOpacity ?? base.fillOpacity ?? 0.26,
      pattern: override?.pattern ?? base.pattern,
    };
  });

  const patternDefs: React.ReactNode[] = [];
  const renderedStatuses = new Set<string>();

  normalized.forEach((overlay) => {
    overlay.sortedStatuses.forEach((status) => {
      if (renderedStatuses.has(status)) {
        return;
      }

      const style = styles[status];
      if (!style?.pattern) {
        return;
      }

      const sanitizedStatus = sanitizeForId(status);
      const patternId = `${chartInstanceId}-${sanitizedStatus}`;

      if (style.pattern === 'rain') {
        patternDefs.push(
          <pattern
            id={patternId}
            key={patternId}
            patternUnits="userSpaceOnUse"
            width={10}
            height={10}
            patternTransform="rotate(45)"
          >
            <rect width={10} height={10} fill={applyAlpha(style.color, 0.18)} />
            <rect x={0} width={2} height={10} fill={applyAlpha(style.color, 0.45)} />
          </pattern>
        );
      } else if (style.pattern === 'vsc') {
        patternDefs.push(
          <pattern
            id={patternId}
            key={patternId}
            patternUnits="userSpaceOnUse"
            width={8}
            height={8}
          >
            <rect width={8} height={8} fill={applyAlpha(style.color, 0.16)} />
            <rect x={0} y={0} width={6} height={2} fill={applyAlpha(style.color, 0.55)} />
            <rect x={2} y={4} width={6} height={2} fill={applyAlpha(style.color, 0.55)} />
          </pattern>
        );
      }

      renderedStatuses.add(status);
    });
  });

  combinationMap.forEach((statuses, comboKey) => {
    const colors = statuses.map((status) => styles[status]?.color ?? STATUS_COLORS.neutral);
    const segmentWidth = 12;
    const width = Math.max(segmentWidth * statuses.length, 6);
    const patternId = `${chartInstanceId}-${sanitizeForId(comboKey)}`;

    patternDefs.push(
      <pattern
        id={patternId}
        key={patternId}
        patternUnits="userSpaceOnUse"
        width={width}
        height={width}
        patternTransform="rotate(45)"
      >
        <rect width={width} height={width} fill={applyAlpha(colors[0], 0.18)} />
        {statuses.map((status, index) => (
          <rect
            key={`${patternId}-${status}-${index}`}
            x={(width / statuses.length) * index}
            y={0}
            width={width / statuses.length}
            height={width}
            fill={applyAlpha(colors[index], 0.35)}
          />
        ))}
      </pattern>
    );
  });

  return {
    normalized,
    styles,
    patternDefs: patternDefs.length ? patternDefs : null,
  };
};

const sanitizeForId = (value: string): string => value.replace(/[^a-zA-Z0-9]/g, '-');

const buildStringFormatter = (
  primary?: ((value: any, index: number) => string | number) | undefined,
  fallback?:
    | ((value: any, index: number) => string | number | undefined)
    | undefined
): ((value: any, index: number) => string) => {
  return (value: any, index: number): string => {
    const formatted =
      (primary ? primary(value, index) : undefined) ??
      (fallback ? fallback(value, index) : undefined) ??
      value;

    if (typeof formatted === 'string') return formatted;
    if (typeof formatted === 'number') return formatted.toString();
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    return '';
  };
};

const applyAlpha = (color: string, alpha: number): string => {
  const hex = color.trim();

  if (hex.startsWith('rgba')) {
    return hex.replace(/rgba\(([^)]+)\)/, (_match, contents) => {
      const parts = contents.split(',').map((part: string) => part.trim());
      if (parts.length === 4) {
        parts[3] = alpha.toString();
        return `rgba(${parts.join(', ')})`;
      }
      return `rgba(${parts.join(', ')}, ${alpha})`;
    });
  }

  if (hex.startsWith('rgb')) {
    return hex.replace(/rgb\(([^)]+)\)/, (_match, contents) => {
      return `rgba(${contents}, ${alpha})`;
    });
  }

  let normalized = hex.replace('#', '');
  if (normalized.length === 3 || normalized.length === 4) {
    normalized = normalized
      .split('')
      .map((char) => char + char)
      .join('');
  }

  if (normalized.length === 8) {
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  const int = parseInt(normalized, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
