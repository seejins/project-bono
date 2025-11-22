import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy,
  Award,
  Star,
  Flag,
  Zap,
  Target,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import type { TooltipProps } from 'recharts';

import { useSeason } from '../contexts/SeasonContext';
import {
  useSeasonAnalysis,
  type DriverSeasonSummary,
  type SeasonAnalysisHighlight,
  type SeasonEventSummary,
} from '../hooks/useSeasonAnalysis';
import { F123DataService } from '../services/F123DataService';
import { BaseLineChart, type LineConfig } from './charts/BaseLineChart';
import { BRAND_COLORS } from '../theme/colors';
import { getResultStatus } from '../utils/f123DataMapping';
import { apiGet } from '../utils/api';
import { formatDate, formatFullDate } from '../utils/dateUtils';
import { DashboardTable, type DashboardTableColumn } from './layout/DashboardTable';
import { useTheme } from '../contexts/ThemeContext';

interface DriverSeasonStatsProps {
  driverId: string;
  onRaceSelect?: (raceId: string) => void;
}

interface DriverRaceHistoryEntry {
  raceId: string;
  trackName: string | null;
  raceDate: string | null;
  position: number | null;
  gridPosition: number | null;
  points: number | null;
  fastestLap: boolean;
  polePosition: boolean;
  resultStatus: number | null;
  raceStatus: string | null;
  sessionName: string | null;
}

interface TrendPoint extends Record<string, unknown> {
  raceId: string;
  order: number;
  label: string;
  shortLabel: string;
  date: string | null;
  racePosition: number | null;
  qualifyingPosition: number | null;
  comparisonRacePosition: number | null;
  comparisonQualifyingPosition: number | null;
}

interface ComparisonOption {
  id: string;
  name: string;
  team: string | null;
}

interface RaceRow {
  raceId: string;
  eventName: string;
  trackName: string;
  date: string | null;
  points: number | null;
  position: number | null;
  gridPosition: number | null;
  fastestLap: boolean;
  polePosition: boolean;
  resultStatus: number | null;
  raceStatus: string | null;
  sessionTypes: string[];
}

const HighlightBadge: React.FC<{ label: string }> = ({ label }) => (
  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-900/80 px-3 py-1 text-xs font-semibold text-slate-900 dark:text-slate-100">
    <Star className="h-3 w-3 text-amber-500 dark:text-amber-400" />
    {label}
  </span>
);


const createShortLabel = (event: SeasonEventSummary | null, index: number): string => {
  if (!event) {
    return `R${index + 1}`;
  }
  if (event.shortEventName) {
    return event.shortEventName;
  }
  if (event.eventName) {
    const lower = event.eventName.toLowerCase();
    const gpIndex = lower.indexOf(' grand prix');
    if (gpIndex > 0) {
      return `${event.eventName.slice(0, gpIndex)} GP`;
    }
    return event.eventName;
  }
  if (event.trackName) {
    return event.trackName;
  }
  return `R${index + 1}`;
};

const mapRaceHistoryEntry = (entry: any): DriverRaceHistoryEntry => ({
  raceId: entry?.raceId ?? entry?.race_id ?? '',
  trackName: entry?.trackName ?? entry?.track_name ?? null,
  raceDate: entry?.raceDate ?? entry?.race_date ?? null,
  position:
    entry?.position !== undefined && entry?.position !== null
      ? Number(entry.position)
      : null,
  gridPosition:
    entry?.gridPosition !== undefined && entry?.gridPosition !== null
      ? Number(entry.gridPosition)
      : null,
  points:
    entry?.points !== undefined && entry?.points !== null
      ? Number(entry.points)
      : null,
  fastestLap: Boolean(entry?.fastestLap),
  polePosition: Boolean(entry?.polePosition),
  resultStatus:
    entry?.resultStatus !== undefined && entry?.resultStatus !== null
      ? Number(entry.resultStatus)
      : null,
  raceStatus: entry?.raceStatus ?? null,
  sessionName: entry?.sessionName ?? null,
});

const getPositionBadgeClass = (position: number | null | undefined): string => {
  if (position === 1) return 'text-yellow-400 bg-yellow-500/15';
  if (position === 2) return 'text-gray-200 bg-gray-400/20';
  if (position === 3) return 'text-amber-500 bg-amber-500/20';
  if (position && position > 0 && position <= 10) return 'text-emerald-400 bg-emerald-500/15';
  return 'text-slate-300 bg-slate-700/30';
};

const buildSessionTypeList = (sessionTypes?: string | null): string[] => {
  if (!sessionTypes) {
    return [];
  }
  return sessionTypes
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean);
};

export const DriverSeasonStats: React.FC<DriverSeasonStatsProps> = ({ driverId, onRaceSelect }) => {
  const { currentSeason } = useSeason();
  const { analysis, loading, error } = useSeasonAnalysis(currentSeason?.id);

  const [seasonRaceHistory, setSeasonRaceHistory] = useState<DriverRaceHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [comparisonDriverId, setComparisonDriverId] = useState<string>('');
  const [comparisonHistoryCache, setComparisonHistoryCache] = useState<Record<string, DriverRaceHistoryEntry[]>>({});
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);

  const driverSummary: DriverSeasonSummary | null = useMemo(() => {
    if (!analysis) {
      return null;
    }
    return analysis.drivers.find((driver) => driver.id === driverId) ?? null;
  }, [analysis, driverId]);

  const highlightBadges: string[] = useMemo(() => {
    if (!analysis || !driverSummary) {
      return [];
    }

    const labels: string[] = [];
    const { highlights } = analysis.summary;

    const pushIfMatch = (highlight: SeasonAnalysisHighlight | null | undefined, label: string) => {
      if (highlight?.id === driverSummary.id) {
        labels.push(label);
      }
    };

    pushIfMatch(highlights.mostWins, 'Season wins leader');
    pushIfMatch(highlights.mostPodiums, 'Podium leader');
    pushIfMatch(highlights.mostPoles, 'Pole position leader');
    pushIfMatch(highlights.mostFastestLaps, 'Fastest lap leader');
    pushIfMatch(highlights.bestAverageFinish, 'Best average finish');
    pushIfMatch(highlights.bestConsistency, 'Most consistent');

    return labels;
  }, [analysis, driverSummary]);

  const driverTeamDisplay = driverSummary
    ? F123DataService.getTeamDisplayName(driverSummary.team ?? undefined)
    : 'Unknown Team';
  const teamColorHex = driverSummary?.team ? F123DataService.getTeamColorHex(driverSummary.team) : '';

  const cleanFinishes = useMemo(
    () => Math.max((driverSummary?.totalRaces ?? 0) - (driverSummary?.dnfs ?? 0), 0),
    [driverSummary?.dnfs, driverSummary?.totalRaces]
  );

  const overviewCards = useMemo<
    Array<{
      id: string;
      title: string;
      icon: React.ComponentType<{ className?: string }>;
      iconClasses: string;
      metrics: Array<{ label: string; value: string }>;
    }>
  >(() => {
    if (!driverSummary) {
      return [];
    }

    const averagePoints =
      driverSummary.totalRaces > 0
        ? (driverSummary.points / driverSummary.totalRaces).toFixed(1)
        : '0.0';

    return [
      {
        id: 'championship',
        title: 'Championship',
        icon: Target,
        iconClasses: 'bg-red-500/15 text-red-400',
        metrics: [
          { label: 'Points', value: driverSummary.points.toLocaleString() },
          { label: 'Position', value: driverSummary.position ? `P${driverSummary.position}` : '—' },
          { label: 'Wins', value: driverSummary.wins.toString() },
        ],
      },
      {
        id: 'podiums',
        title: 'Podium Pace',
        icon: Trophy,
        iconClasses: 'bg-yellow-500/15 text-yellow-400',
        metrics: [
          { label: 'Podiums', value: driverSummary.podiums.toString() },
          { label: 'Poles', value: driverSummary.polePositions.toString() },
          { label: 'Fastest Laps', value: driverSummary.fastestLaps.toString() },
        ],
      },
      {
        id: 'consistency',
        title: 'Consistency',
        icon: Flag,
        iconClasses: 'bg-purple-500/15 text-purple-400',
        metrics: [
          {
            label: 'Avg Finish',
            value: driverSummary.averageFinish ? `P${driverSummary.averageFinish.toFixed(1)}` : '—',
          },
          { label: 'Consistency', value: `${driverSummary.consistency.toFixed(1)}%` },
          { label: 'Points Finishes', value: driverSummary.pointsFinishes.toString() },
        ],
      },
      {
        id: 'reliability',
        title: 'Season Reliability',
        icon: Award,
        iconClasses: 'bg-emerald-500/15 text-emerald-400',
        metrics: [
          { label: 'DNFs', value: driverSummary.dnfs.toString() },
          { label: 'Clean Finishes', value: cleanFinishes.toString() },
          { label: 'Pts / Race', value: averagePoints },
        ],
      },
    ];
  }, [cleanFinishes, driverSummary]);

  const fetchSeasonRaceHistory = useCallback(
    async (targetDriverId: string): Promise<DriverRaceHistoryEntry[]> => {
      if (!currentSeason?.id) {
        return [];
      }

      const response = await apiGet(`/api/drivers/${targetDriverId}/race-history?seasonId=${currentSeason.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch race history');
      }

      const payload = await response.json();
      const entries = Array.isArray(payload?.raceHistory) ? payload.raceHistory : [];
      return entries.map(mapRaceHistoryEntry);
    },
    [currentSeason?.id]
  );

  useEffect(() => {
    let cancelled = false;

    if (!driverId || !currentSeason?.id) {
      setSeasonRaceHistory([]);
      setHistoryError(null);
      return;
    }

    const load = async () => {
      try {
        setHistoryLoading(true);
        setHistoryError(null);
        const results = await fetchSeasonRaceHistory(driverId);
        if (!cancelled) {
          setSeasonRaceHistory(results);
        }
      } catch (err) {
        if (!cancelled) {
          setHistoryError(err instanceof Error ? err.message : 'Unable to load race history');
          setSeasonRaceHistory([]);
        }
      } finally {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [driverId, currentSeason?.id, fetchSeasonRaceHistory]);

  useEffect(() => {
    setComparisonDriverId('');
    setComparisonError(null);
    setComparisonLoading(false);
  }, [driverId]);

  useEffect(() => {
    let cancelled = false;

    if (!comparisonDriverId || !currentSeason?.id) {
      return;
    }

    if (comparisonHistoryCache[comparisonDriverId]) {
      return;
    }

    const loadComparison = async () => {
      try {
        setComparisonLoading(true);
        setComparisonError(null);

        const results = await fetchSeasonRaceHistory(comparisonDriverId);
        if (!cancelled) {
          setComparisonHistoryCache((prev) => ({
            ...prev,
            [comparisonDriverId]: results,
          }));
        }
      } catch (err) {
        if (!cancelled) {
          setComparisonError(err instanceof Error ? err.message : 'Unable to load comparison data');
        }
      } finally {
        if (!cancelled) {
          setComparisonLoading(false);
        }
      }
    };

    loadComparison();

    return () => {
      cancelled = true;
    };
  }, [comparisonDriverId, currentSeason?.id, comparisonHistoryCache, fetchSeasonRaceHistory]);

  const completedEvents = useMemo<SeasonEventSummary[]>(() => {
    if (!analysis?.events?.completed) {
      return [];
    }
    return [...analysis.events.completed].sort((a, b) => {
      const dateA = a?.raceDate ? new Date(a.raceDate).getTime() : Number.POSITIVE_INFINITY;
      const dateB = b?.raceDate ? new Date(b.raceDate).getTime() : Number.POSITIVE_INFINITY;
      return dateA - dateB;
    });
  }, [analysis]);

  const eventMap = useMemo(() => {
    const map = new Map<string, SeasonEventSummary>();
    analysis?.events?.all?.forEach((event) => {
      if (event?.id) {
        map.set(event.id, event);
      }
    });
    return map;
  }, [analysis]);

  const driverHistoryMap = useMemo(() => {
    const map = new Map<string, DriverRaceHistoryEntry>();
    for (const entry of seasonRaceHistory) {
      if (entry.raceId) {
        map.set(entry.raceId, entry);
      }
    }
    return map;
  }, [seasonRaceHistory]);

  const comparisonHistory = comparisonDriverId ? comparisonHistoryCache[comparisonDriverId] ?? [] : [];

  const comparisonHistoryMap = useMemo(() => {
    const map = new Map<string, DriverRaceHistoryEntry>();
    for (const entry of comparisonHistory) {
      if (entry.raceId) {
        map.set(entry.raceId, entry);
      }
    }
    return map;
  }, [comparisonHistory]);

  const raceRows = useMemo<RaceRow[]>(() => {
    // Only show races where the driver actually participated
    // Filter completedEvents to only include races where driver has a result
    return completedEvents
      .filter((event) => {
        // Only include events where driver has a result in driverHistoryMap
        return driverHistoryMap.has(event.id ?? '');
      })
      .map((event) => {
        const driverResult = driverHistoryMap.get(event.id ?? '') ?? null;
        const raceDate = driverResult?.raceDate ?? event.raceDate ?? null;
        const sessionTypes = buildSessionTypeList(event.sessionTypes);

        return {
          raceId: event.id ?? driverResult?.raceId ?? '',
          eventName: event.eventName ?? event.shortEventName ?? driverResult?.trackName ?? event.trackName ?? 'Race',
          trackName: event.track?.name ?? event.trackName ?? driverResult?.trackName ?? 'Track',
          date: raceDate,
          points: driverResult?.points ?? null,
          position: driverResult?.position ?? null,
          gridPosition: driverResult?.gridPosition ?? null,
          fastestLap: driverResult?.fastestLap ?? false,
          polePosition: driverResult?.polePosition ?? false,
          resultStatus: driverResult?.resultStatus ?? null,
          raceStatus: driverResult?.raceStatus ?? event.status ?? null,
          sessionTypes,
        };
      });
  }, [completedEvents, driverHistoryMap]);

  const raceTableColumns = useMemo<DashboardTableColumn<RaceRow>[]>(() => [
    {
      key: 'eventName',
      label: 'Event',
      align: 'left',
      render: (value: string) => (
        <span className="font-medium text-slate-900 dark:text-slate-100">{value}</span>
      ),
    },
    {
      key: 'trackName',
      label: 'Track',
      align: 'left',
      render: (value: string) => <span className="text-slate-500 dark:text-slate-400">{value}</span>,
    },
    {
      key: 'date',
      label: 'Date',
      align: 'left',
      render: (_value: string | null, row) => (
        <span className="text-slate-500 dark:text-slate-400">{formatDate(row.date)}</span>
      ),
    },
    {
      key: 'position',
      label: 'Result',
      align: 'left',
      render: (_value: number | null, row) => {
        const positionClass = getPositionBadgeClass(row.position);
        const positionDisplay =
          row.position != null
            ? `P${row.position}`
            : row.resultStatus != null
              ? getResultStatus(row.resultStatus)
              : '—';
        return (
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${positionClass}`}
            >
              {positionDisplay}
            </span>
            {row.fastestLap && (
              <span className="inline-flex items-center rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-purple-300">
                FL
              </span>
            )}
            {row.polePosition && (
              <span className="inline-flex items-center rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-blue-300">
                Pole
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'gridPosition',
      label: 'Grid',
      align: 'left',
      render: (_value: number | null, row) => (
        <span className="text-slate-500 dark:text-slate-400">
          {row.gridPosition != null ? `P${row.gridPosition}` : '—'}
        </span>
      ),
    },
    {
      key: 'raceStatus',
      label: 'Status',
      align: 'left',
      render: (_value: string | null, row) => (
        <span className="text-slate-500 dark:text-slate-400">{row.raceStatus ?? '—'}</span>
      ),
    },
    {
      key: 'sessionTypes',
      label: 'Sessions',
      align: 'left',
      render: (_value: string[], row) => (
        <div className="flex flex-wrap gap-2">
          {row.sessionTypes.length > 0 ? (
            row.sessionTypes.map((session) => (
              <span
                key={`${row.raceId}-${session}`}
                className="rounded-full bg-slate-200 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300"
              >
                {session}
              </span>
            ))
          ) : (
            <span className="text-xs text-slate-500">—</span>
          )}
        </div>
      ),
    },
    {
      key: 'points',
      label: 'Points',
      align: 'right',
      render: (_value: number | null, row) => (
        <span className="font-semibold text-slate-900 dark:text-slate-100">
          {row.points != null ? Number(row.points).toLocaleString() : '—'}
        </span>
      ),
    },
  ], []);

  const trendData = useMemo<TrendPoint[]>(() => {
    return completedEvents.map((event, index) => {
      const driverEntry = driverHistoryMap.get(event.id ?? '') ?? null;
      const comparisonEntry = comparisonHistoryMap.get(event.id ?? '') ?? null;
      const label =
        event.eventName ??
        event.shortEventName ??
        driverEntry?.trackName ??
        event.trackName ??
        `Race ${index + 1}`;

      return {
        raceId: event.id ?? driverEntry?.raceId ?? `race-${index}`,
        order: index + 1,
        label,
        shortLabel: createShortLabel(event, index),
        date: driverEntry?.raceDate ?? event.raceDate ?? null,
        racePosition: driverEntry?.position ?? null,
        qualifyingPosition: driverEntry?.gridPosition ?? null,
        comparisonRacePosition: comparisonEntry?.position ?? null,
        comparisonQualifyingPosition: comparisonEntry?.gridPosition ?? null,
      };
    });
  }, [completedEvents, driverHistoryMap, comparisonHistoryMap]);

  const averageRacePosition = useMemo(() => {
    // Single pass: filter valid values and sum in one iteration
    let total = 0;
    let count = 0;
    for (const point of trendData) {
      const value = point.racePosition;
      if (value !== null && Number.isFinite(value)) {
        total += value;
        count++;
      }
    }
    if (count === 0) {
      return null;
    }
    return Math.round((total / count) * 10) / 10;
  }, [trendData]);

  const averageQualifyingPosition = useMemo(() => {
    // Single pass: filter valid values and sum in one iteration
    let total = 0;
    let count = 0;
    for (const point of trendData) {
      const value = point.qualifyingPosition;
      if (value !== null && Number.isFinite(value)) {
        total += value;
        count++;
      }
    }
    if (count === 0) {
      return null;
    }
    return Math.round((total / count) * 10) / 10;
  }, [trendData]);

  const comparisonOptions: ComparisonOption[] = useMemo(() => {
    if (!analysis) {
      return [];
    }
    // Single pass: filter, map, and prepare for sort in one iteration
    const options: ComparisonOption[] = [];
    for (const driver of analysis.drivers) {
      if (driver.id !== driverId) {
        options.push({
        id: driver.id,
        name: driver.name,
        team: driver.team ?? null,
        });
      }
    }
    // Sort after single-pass filtering/mapping
    return options.sort((a, b) => a.name.localeCompare(b.name));
  }, [analysis, driverId]);

  const comparisonDriverSummary = useMemo(() => {
    if (!analysis || !comparisonDriverId) {
      return null;
    }
    return analysis.drivers.find((driver) => driver.id === comparisonDriverId) ?? null;
  }, [analysis, comparisonDriverId]);

  const buildTrendTooltip = useCallback(
    (chartType: 'race' | 'qualifying') =>
      ({ active, payload }: TooltipProps<number, string>) => {
        if (!active || !payload || payload.length === 0) {
          return null;
        }

        const datum = payload[0].payload as TrendPoint;
        const primary =
          chartType === 'race' ? datum.racePosition : datum.qualifyingPosition;
        const comparison =
          chartType === 'race'
            ? datum.comparisonRacePosition
            : datum.comparisonQualifyingPosition;

        return (
          <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 shadow-lg">
            <div className="font-semibold text-slate-900 dark:text-slate-100">{datum.label}</div>
            {datum.date && <div className="text-slate-600 dark:text-slate-400">{formatFullDate(datum.date)}</div>}
            <div className="mt-2 space-y-1">
              <div>
                {(driverSummary?.name ?? 'Driver')}: {primary != null ? `P${primary}` : '—'}
              </div>
              {comparisonDriverId && (
                <div>
                  {(comparisonDriverSummary?.name ?? 'Comparison')}:{' '}
                  {comparison != null ? `P${comparison}` : '—'}
                </div>
              )}
            </div>
          </div>
        );
      },
    [comparisonDriverId, comparisonDriverSummary?.name, driverSummary?.name]
  );

  const comparisonTeamColorHex = comparisonDriverSummary?.team ? F123DataService.getTeamColorHex(comparisonDriverSummary.team) : '';
  const fallbackGlow = 'rgba(255,255,255,0.28)';
  const glowGradient = teamColorHex
    ? teamColorHex.trim().startsWith('#')
      ? `radial-gradient(circle at top, ${teamColorHex}55, transparent 68%)`
      : `radial-gradient(circle at top, ${teamColorHex}, transparent 68%)`
    : `radial-gradient(circle at top, ${fallbackGlow}, transparent 72%)`;

  const raceLineColor = teamColorHex || BRAND_COLORS.primary;
  const qualLineColor = teamColorHex || BRAND_COLORS.electric;
  const comparisonRaceLineColor = comparisonTeamColorHex || BRAND_COLORS.purple;
  const comparisonQualLineColor = comparisonTeamColorHex || BRAND_COLORS.accent;

  const isLoading = loading || historyLoading;
  const { isDark } = useTheme();

  const latestRaceId = seasonRaceHistory.length > 0 ? seasonRaceHistory[0].raceId : null;
  const raceTableRows = historyLoading || historyError ? [] : raceRows;
  const raceTableEmptyMessage = historyLoading
    ? (
      <div className="flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading race results…</span>
      </div>
    )
    : historyError
      ? <div className="text-sm text-rose-400">{historyError}</div>
      : 'No completed races recorded for this season yet.';

  const renderTrendChart = (chartType: 'race' | 'qualifying') => {
    const primaryKey =
      chartType === 'race' ? ('racePosition' as const) : ('qualifyingPosition' as const);
    const comparisonKey =
      chartType === 'race'
        ? ('comparisonRacePosition' as const)
        : ('comparisonQualifyingPosition' as const);

    const chartPositions: number[] = [];
    trendData.forEach((point) => {
      const primaryValue = point[primaryKey];
      const comparisonValue = point[comparisonKey];
      if (primaryValue != null) chartPositions.push(primaryValue);
      if (comparisonValue != null) chartPositions.push(comparisonValue);
    });
    const maxDomainValue = chartPositions.length ? Math.max(...chartPositions, 10) : 10;

    const hasPrimaryData = chartType === 'race'
      ? trendData.some((point) => point.racePosition != null)
      : trendData.some((point) => point.qualifyingPosition != null);
    const hasComparisonData = chartType === 'race'
      ? trendData.some((point) => point.comparisonRacePosition != null)
      : trendData.some((point) => point.comparisonQualifyingPosition != null);

    const lines: LineConfig<TrendPoint>[] = [
      {
        dataKey: primaryKey,
        name: driverSummary?.name ?? 'Driver',
        stroke: chartType === 'race' ? raceLineColor : qualLineColor,
        dot: true,
        strokeWidth: 2,
      },
    ];

    if (comparisonDriverId && hasComparisonData) {
      lines.push({
        dataKey: comparisonKey,
        name: comparisonDriverSummary?.name ?? 'Comparison',
        stroke: chartType === 'race' ? comparisonRaceLineColor : comparisonQualLineColor,
        strokeDasharray: '6 3',
        dot: true,
        strokeWidth: 2,
      });
    }

    const average = chartType === 'race' ? averageRacePosition : averageQualifyingPosition;

    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 p-6 shadow-md">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {chartType === 'race' ? 'Race Finish Trend' : 'Qualifying Trend'}
            </h3>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-600 dark:text-slate-500">
              {trendData.length > 0 ? `${trendData.length} events` : 'Awaiting data'}
            </p>
          </div>
          {average !== null && (
            <div className="rounded-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
              Avg: P{average.toFixed(1)}
            </div>
          )}
        </div>
        {hasPrimaryData || (comparisonDriverId && hasComparisonData) ? (
          <div className="h-64 w-full">
            <BaseLineChart<TrendPoint>
              data={trendData}
              xKey="order"
              lines={lines}
              legend={Boolean(comparisonDriverId)}
              yAxisProps={{
                domain: [Math.max(maxDomainValue, 1) + 0.5, 0.5],
                reversed: true,
                allowDecimals: false,
              }}
              xTickFormatter={(_, index) => `Round ${trendData[index]?.order ?? index + 1}`}
              yTickFormatter={(value) => `P${Number(value).toFixed(0)}`}
              tooltipContent={buildTrendTooltip(chartType)}
              height="100%"
              cartesianGrid
              referenceLines={
                average !== null
                  ? [
                      {
                        y: average,
                        stroke: isDark ? '#ffffff' : '#475569',
                        strokeDasharray: '4 4',
                        label: {
                          position: 'right',
                          value: `Avg P${average.toFixed(1)}`,
                          fill: isDark ? '#ffffff' : '#475569',
                        },
                      },
                    ]
                  : undefined
              }
            />
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center text-sm text-slate-600 dark:text-slate-500">
            No {chartType === 'race' ? 'race' : 'qualifying'} data yet.
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-red-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-sm text-red-500">
        <p>Unable to load driver analysis.</p>
        <p className="mt-1 text-xs text-red-400">{error}</p>
      </div>
    );
  }

  if (!analysis || !driverSummary) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
        Driver analysis unavailable.
      </div>
    );
  }

  const easing: [number, number, number, number] = [0.22, 1, 0.36, 1];

  return (
    <div className="relative -mt-24 -ml-[calc(50vw-50%)] -mr-[calc(50vw-50%)] w-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-x-0 top-0 h-[520px] blur-[160px]"
          style={{ background: glowGradient }}
        />
              </div>
      <motion.div
        className="relative z-10 mx-auto max-w-[1600px] space-y-8 px-6 pt-40 pb-16 text-slate-900 dark:text-slate-100 lg:px-10"
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: easing }}
      >
        <motion.header
          className="flex flex-col items-center justify-center space-y-3 text-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easing, delay: 0.1 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.45em] text-slate-500 dark:text-slate-400">
            Season Overview
          </p>
          <h1 className="text-4xl font-black uppercase tracking-[0.18em] text-slate-900 dark:text-white sm:text-5xl">
            {driverSummary.name}
          </h1>
          <span className="text-sm font-medium uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
            {driverTeamDisplay}
          </span>
          {highlightBadges.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              {highlightBadges.map((label) => (
                <HighlightBadge key={label} label={label} />
              ))}
            </div>
          )}
        </motion.header>

        <motion.section
          className="space-y-8"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easing, delay: 0.18 }}
        >
          <div className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Season Statistics
              </h2>
              {comparisonOptions.length > 0 && (
                <div className="flex items-center gap-3">
                  <label className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                    Compare
                  </label>
                  <select
                    value={comparisonDriverId}
                    onChange={(event) => setComparisonDriverId(event.target.value)}
                    className="min-w-[200px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-slate-500 dark:focus:ring-slate-500/30"
                  >
                    <option value="">Driver only</option>
                    {comparisonOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                        {option.team ? ` • ${option.team}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {comparisonLoading && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading comparison data…</span>
              </div>
            )}

            {comparisonError && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                {comparisonError}
              </div>
            )}

            {overviewCards.length > 0 && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {overviewCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={card.id}
                      className="rounded-3xl border border-slate-200/40 bg-white/80 p-6 shadow-md dark:border-slate-800 dark:bg-slate-950/90"
                    >
                      <div className="mb-4 flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${card.iconClasses}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                          {card.title}
                        </h3>
                      </div>
                      <div className="space-y-3">
                        {card.metrics.map((metric) => (
                          <div key={`${card.id}-${metric.label}`} className="flex items-center justify-between">
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                              {metric.label}
                            </span>
                            <span className="text-base font-semibold text-slate-900 dark:text-slate-100">
                              {metric.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {renderTrendChart('race')}
              {renderTrendChart('qualifying')}
            </div>
          </div>

          <DashboardTable<RaceRow>
            title="Season Race Results"
            subtitle="Completed events for the current season"
            columns={raceTableColumns}
            rows={raceTableRows}
            rowKey={(row) => row.raceId || row.eventName}
            onRowClick={
              onRaceSelect
                ? (row) => {
                    if (row.raceId) {
                      onRaceSelect(row.raceId);
                    }
                  }
                : undefined
            }
            emptyMessage={raceTableEmptyMessage}
            headerActions={
              latestRaceId && onRaceSelect ? (
                  <button
                  onClick={() => onRaceSelect(latestRaceId)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
                  >
                  View latest race
                    <ChevronRight className="h-3 w-3" />
                  </button>
              ) : undefined
            }
          />
        </motion.section>
      </motion.div>
    </div>
  );
};
