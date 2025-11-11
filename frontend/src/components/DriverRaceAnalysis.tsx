import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { BarChart3, TrendingUp, Activity, Award, Clock, Target, Zap, Flag, AlertTriangle } from 'lucide-react';
import type { TooltipProps } from 'recharts';
import { ChartCard } from './charts/ChartCard';
import { BaseLineChart, DEFAULT_OVERLAY_STYLES, type LineConfig } from './charts/BaseLineChart';
import { BaseBarChart } from './charts/BaseBarChart';
import { F123DataService } from '../services/F123DataService';
import { useDriverRaceData } from './DriverRaceAnalysis/hooks/useDriverRaceData';
import { useLapAnalytics } from './DriverRaceAnalysis/hooks/useLapAnalytics';
import { useStintAnalytics } from './DriverRaceAnalysis/hooks/useStintAnalytics';
import { useRaceStats } from './DriverRaceAnalysis/hooks/useRaceStats';
import { DriverRaceAnalysisProps, LapStatusType } from './DriverRaceAnalysis/types';
import { formatSecondsValue, formatSecondsDifference, getCompoundKey, getCompoundDisplayName } from './DriverRaceAnalysis/utils';

type AnalyticsTab = 'overview' | 'pace' | 'strategy' | 'telemetry';

export const DriverRaceAnalysis: React.FC<DriverRaceAnalysisProps> = ({ driverId, raceId, initialSessionType }) => {
  const { raceData, sessions, defaultSessionId, loading, error } = useDriverRaceData(driverId, raceId);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const hasAppliedInitialSession = useRef(false);
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');
  const [comparisonDriverId, setComparisonDriverId] = useState<string | null>(null);

  const determineSessionKind = useCallback((sessionType: number): 'practice' | 'qualifying' | 'race' => {
    if (sessionType === 10) {
      return 'race';
    }
    if (sessionType >= 5 && sessionType <= 9) {
      return 'qualifying';
    }
    return 'practice';
  }, []);

  useEffect(() => {
    if (sessions.length === 0) {
      return;
    }

    const sessionIds = new Set(sessions.map((session) => session.sessionId));
    const selectedIsValid = selectedSessionId ? sessionIds.has(selectedSessionId) : false;

    if (selectedIsValid) {
      return;
    }

    let nextSessionId: string | null = null;

    if (!hasAppliedInitialSession.current && initialSessionType) {
      const matchingSession = sessions.find(
        (session) => determineSessionKind(session.sessionType) === initialSessionType
      );

      if (matchingSession?.sessionId) {
        nextSessionId = matchingSession.sessionId;
        hasAppliedInitialSession.current = true;
      }
    }

    if (!nextSessionId && defaultSessionId && sessionIds.has(defaultSessionId)) {
      nextSessionId = defaultSessionId;
    }

    if (!nextSessionId) {
      nextSessionId = sessions[0]?.sessionId ?? null;
    }

    if (nextSessionId && nextSessionId !== selectedSessionId) {
      setSelectedSessionId(nextSessionId);
    }
  }, [sessions, selectedSessionId, initialSessionType, defaultSessionId, determineSessionKind]);

  const selectedSession = useMemo(
    () => sessions.find((session) => session.sessionId === selectedSessionId) || null,
    [sessions, selectedSessionId]
  );

  const driver = selectedSession?.driver ?? null;
  const lapData = selectedSession?.lapData ?? [];
  const sessionDrivers = selectedSession?.sessionDrivers ?? [];
  const sessionLabel = selectedSession?.sessionName || selectedSession?.sessionTypeName || 'Session';
  const sessionKind = selectedSession ? determineSessionKind(selectedSession.sessionType) : null;

  const getTeamColor = (team: string) => F123DataService.getTeamColor(team);
  const getTireCompoundColor = (compound?: string) => F123DataService.getTireCompoundColor(compound);
  const getTireCompoundText = (compound?: string) => F123DataService.getTireCompoundText(compound);

  const getDriverDisplayName = (driverResult: any): string => {
    return (
      driverResult?.json_driver_name ??
      driverResult?.driver_name ??
      driverResult?.mapping_driver_name ??
      driverResult?.name ??
      driverResult?.additional_data?.participantData?.name ??
      'Unknown Driver'
    );
  };

  const comparisonOptions = useMemo(() => {
    if (!sessionDrivers || sessionDrivers.length === 0) {
      return [] as Array<{ id: string; name: string; position: number | null }>;
    }

    const filtered = sessionDrivers.filter((result: any) => result && result.id && result.id !== driver?.id);

    return filtered
      .sort((a: any, b: any) => (Number(a?.position ?? 999) - Number(b?.position ?? 999)))
      .map((result: any) => ({
        id: result.id as string,
        name: getDriverDisplayName(result),
        position: result?.position != null ? Number(result.position) : null,
      }));
  }, [sessionDrivers, driver]);

  const comparisonDriver = useMemo(() => {
    if (!comparisonDriverId) return null;
    return sessionDrivers.find((result: any) => result && result.id === comparisonDriverId) || null;
  }, [sessionDrivers, comparisonDriverId]);

  const comparisonDriverName = useMemo(() => {
    if (!comparisonDriver) return null;
    return getDriverDisplayName(comparisonDriver);
  }, [comparisonDriver]);

  useEffect(() => {
    if (!driver || sessionDrivers.length === 0) {
      if (comparisonDriverId !== null) {
        setComparisonDriverId(null);
      }
      return;
    }

    const availableDrivers = sessionDrivers.filter((result: any) => result && result.id && result.id !== driver.id);

    if (availableDrivers.length === 0) {
      if (comparisonDriverId !== null) {
        setComparisonDriverId(null);
      }
      return;
    }

    const isCurrentValid = comparisonDriverId
      ? availableDrivers.some((result: any) => result.id === comparisonDriverId)
      : false;

    if (isCurrentValid) {
      return;
    }

    const sortedDrivers = [...availableDrivers].sort(
      (a: any, b: any) => Number(a?.position ?? 999) - Number(b?.position ?? 999)
    );

    const leaderEntry = sortedDrivers.find((result: any) => Number(result?.position ?? 999) === 1 && result?.id);
    const defaultId = leaderEntry?.id && leaderEntry.id !== driver.id ? leaderEntry.id : sortedDrivers[0]?.id ?? null;

    setComparisonDriverId(defaultId ?? null);
  }, [driver, sessionDrivers, selectedSessionId, comparisonDriverId]);

  const { lapComparisonData, deltaComparisonData, statusOverlays, statusLegend } = useLapAnalytics({ lapData, comparisonDriver });
  const { stintChartData, stintSegments, stintStartLapInfo, compoundLineSetup, compoundAverages } =
    useStintAnalytics(lapData);
  const raceStats = useRaceStats({ lapData, driver });

  const createStintDotRenderer = useCallback(
    (compoundKey: string) =>
      (props: any) => {
        const { cx, cy, payload } = props;
        const lapNumber = payload?.lap;
        const info = lapNumber != null ? stintStartLapInfo.get(lapNumber) : undefined;
        if (!info || info.compoundKey !== compoundKey) {
          return <g />;
        }
        const x = typeof cx === 'number' ? cx : 0;
        const y = typeof cy === 'number' ? cy : 0;
        const initial = info.label ? info.label.charAt(0).toUpperCase() : compoundKey.charAt(0);
        const icon =
          F123DataService.getTireCompoundIcon(payload?.tireCompound || info.label || info.compoundKey) ||
          F123DataService.getTireCompoundIcon(initial) ||
          null;
        const iconSize = 20;
        const halfSize = iconSize / 2;

        if (icon) {
          return (
            <g pointerEvents="none">
              <image
                href={icon}
                x={x - halfSize}
                y={y - halfSize}
                width={iconSize}
                height={iconSize}
                preserveAspectRatio="xMidYMid meet"
              />
            </g>
          );
        }

        return (
          <text
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            alignmentBaseline="middle"
            fontSize={12}
            fontWeight={700}
            fill={F123DataService.getTireCompoundColor(info.compoundKey)}
          >
            {initial}
          </text>
        );
      },
    [stintStartLapInfo]
  );

  const stintLines = useMemo<LineConfig[]>(() => {
    return compoundLineSetup.lines.map((line) => ({
      ...line,
      dot: createStintDotRenderer(line.dataKey),
      connectNulls: false,
    }));
  }, [compoundLineSetup.lines, createStintDotRenderer]);

  const formatSecondsValue = (seconds?: number | null): string => {
    if (seconds === undefined || seconds === null) {
      return '--:--.---';
    }
    return F123DataService.formatTimeFromMs(Math.round(seconds * 1000));
  };

  const formatSecondsDifference = (seconds?: number | null): string => {
    if (seconds === undefined || seconds === null) {
      return '--:--.---';
    }
    const sign = seconds > 0 ? '+' : seconds < 0 ? '-' : '';
    const absolute = Math.abs(seconds);
    if (absolute >= 60) {
      return `${sign}${F123DataService.formatTimeFromMs(Math.round(absolute * 1000))}`;
    }
    return `${sign}${absolute.toFixed(3)}s`;
  };

  const LapTimeTooltipContent: React.FC<TooltipProps<number, string>> = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    return (
      <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-xs shadow-lg">
        <div className="mb-1 font-semibold text-gray-900 dark:text-gray-100">Lap {label}</div>
        {payload.map((entry) => {
          if (!entry) return null;
          const msKey =
            entry.dataKey === 'targetLapSeconds'
              ? 'targetLapMs'
              : entry.dataKey === 'comparisonLapSeconds'
                ? 'comparisonLapMs'
                : null;
          const rawMs = msKey ? (entry.payload as any)[msKey] : null;
          const formatted = rawMs !== null && rawMs !== undefined
            ? F123DataService.formatTimeFromMs(Math.round(rawMs))
            : entry.value !== null && entry.value !== undefined
              ? `${(entry.value as number).toFixed(3)}s`
              : '--:--.---';

          return (
            <div key={String(entry.dataKey)} className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
              <span
                className="inline-flex h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: entry.color || '#2563eb' }}
              ></span>
              <span>{entry.name}: {formatted}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const DeltaTooltipContent: React.FC<TooltipProps<number, string>> = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    const entry = payload[0];
    if (!entry || entry.value === undefined || entry.value === null) {
      return null;
    }

    const formatted = formatSecondsDifference(entry.value as number);

    return (
      <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-xs shadow-lg">
        <div className="mb-1 font-semibold text-gray-900 dark:text-gray-100">Lap {label}</div>
        <div className="text-gray-700 dark:text-gray-200">{driver?.name || 'Driver'} vs {comparisonDriverName || 'Comparison'}</div>
        <div className="mt-1 font-medium text-gray-900 dark:text-gray-100">Δ {formatted}</div>
      </div>
    );
  };

  const StintLapTooltip: React.FC<TooltipProps<number, string>> = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    const entry = payload[0];
    if (!entry) return null;

    const lapTimeSeconds = entry.value as number | null;
    const compound = (entry.payload as any)?.tireCompound || 'Unknown';
    const formattedLap = lapTimeSeconds !== null && lapTimeSeconds !== undefined
      ? formatSecondsValue(lapTimeSeconds)
      : '--:--.---';

    return (
      <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-xs shadow-lg">
        <div className="mb-1 font-semibold text-gray-900 dark:text-gray-100">Lap {label}</div>
        <div className="text-gray-700 dark:text-gray-200">Lap Time: {formattedLap}</div>
        <div className="text-gray-700 dark:text-gray-200">Compound: {compound}</div>
      </div>
    );
  };

  const CompoundBarTooltip: React.FC<TooltipProps<number, string>> = ({ active, payload }) => {
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    const entry = payload[0];
    if (!entry) return null;

    const compoundLabel = (entry.payload as any)?.compoundLabel || 'Unknown';
    const lapCount = (entry.payload as any)?.lapCount || null;
    const averageSeconds = entry.value as number | null;
    const formatted = averageSeconds !== null ? formatSecondsValue(averageSeconds) : '--:--.---';
    const color = (entry.payload as any)?.color;

    return (
      <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-xs shadow-lg">
        <div className="font-semibold text-gray-900 dark:text-gray-100">{compoundLabel}</div>
        <div className="mt-1 flex items-center gap-2 text-gray-700 dark:text-gray-200">
          {color && (
            <span
              className="inline-flex h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: color }}
            ></span>
          )}
          <span>Average Lap: {formatted}</span>
        </div>
        {lapCount !== null && (
          <div className="mt-1 text-gray-600 dark:text-gray-300">Stint: {lapCount}</div>
        )}
      </div>
    );
  };

  // Calculate statistics for Overview tab (must be before any conditional returns)
  const averageLapSeconds = useMemo(() => {
    if (!raceStats?.avgLap) return null;
    return raceStats.avgLap > 0 ? raceStats.avgLap / 1000 : null;
  }, [raceStats]);

  const chartOverlays = useMemo(
    () =>
      statusOverlays.map((segment, index) => ({
        key: `overlay-${segment.startLap}-${segment.endLap}-${index}`,
        x1: segment.startLap - 0.5,
        x2: segment.endLap + 0.5,
        statuses: segment.statuses,
      })),
    [statusOverlays]
  );

  const overlayLegendItems = useMemo(
    () =>
      statusLegend.map((status) => ({
        status,
        label:
          status === 'safetyCar'
            ? 'Safety Car'
            : status === 'virtualSafetyCar'
            ? 'Virtual Safety Car'
            : status === 'yellowFlag'
            ? 'Yellow Flag'
            : 'Rain',
        color: DEFAULT_OVERLAY_STYLES[status]?.color ?? '#9ca3af',
        pattern: DEFAULT_OVERLAY_STYLES[status]?.pattern,
      })),
    [statusLegend]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading driver race analysis...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (sessions.length > 0 && !selectedSession) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Preparing session data...</div>
      </div>
    );
  }

  // Calculate delta vs previous lap
  const getDeltaVsPrevLap = (lapNumber: number): number | null => {
    if (lapNumber === 1) return null;
    const currentLap = lapData.find(l => l.lap_number === lapNumber);
    const prevLap = lapData.find(l => l.lap_number === lapNumber - 1);
    if (!currentLap || !prevLap || !currentLap.lap_time_ms || !prevLap.lap_time_ms) return null;
    return currentLap.lap_time_ms - prevLap.lap_time_ms;
  };

  // Format gap time
  const formatGapTime = (ms?: number): string => {
    if (ms === undefined || ms === null) return '--.---';
    return F123DataService.formatGapTimeFromMs(ms);
  };

  // Format sector time
  const formatSectorTime = (ms?: number): string => {
    if (ms === undefined || ms === null) return '--.---';
    return F123DataService.formatSectorTimeFromMs(ms);
  };

  const hexToRgba = (hex: string, alpha: number): string => {
    if (!hex) {
      return `rgba(156, 163, 175, ${alpha})`;
    }

    const trimmed = hex.trim();
    if (trimmed.startsWith('rgba')) {
      return trimmed.replace(/rgba\(([^)]+)\)/, (_match, contents) => {
        const parts = contents.split(',').map((part: string) => part.trim());
        parts[3] = alpha.toString();
        return `rgba(${parts.join(', ')})`;
      });
    }
    if (trimmed.startsWith('rgb')) {
      return trimmed.replace(/rgb\(([^)]+)\)/, (_match, contents) => `rgba(${contents}, ${alpha})`);
    }

    let normalized = trimmed.replace('#', '');
    if (normalized.length === 3) {
      normalized = normalized
        .split('')
        .map((char) => char + char)
        .join('');
    }

    const intVal = parseInt(normalized, 16);
    const r = (intVal >> 16) & 255;
    const g = (intVal >> 8) & 255;
    const b = intVal & 255;

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const driverNumberLabel = driver?.number ?? '--';
  const driverNameLabel = driver?.name ?? 'Driver data unavailable';
  const driverTeamLabel = driver?.team ?? 'Unknown Team';
  const driverPositionLabel =
    driver?.racePosition ?? (driver as any)?.position ?? '--';
  const fastestLapDisplay =
    raceStats?.fastestLap && raceStats.fastestLap > 0
      ? F123DataService.formatTimeFromMs(raceStats.fastestLap)
      : '--:--.---';
  const driverTimeLabel =
    sessionKind === 'race'
      ? driver?.raceTime ?? '--:--.---'
      : fastestLapDisplay;
  const teamColorHex = F123DataService.getTeamColorHex(driverTeamLabel);
  const hasMultipleSessions = sessions.length > 1;

  return (
    <div className="max-w-[2048px] mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Driver Race Analysis</h1>
      </div>

      {/* Driver & Race Info */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-2xl font-bold text-gray-700 dark:text-gray-300">
              {driverNumberLabel}
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{driverNameLabel}</h2>
              <div className="flex items-center space-x-2 mt-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: teamColorHex }}></div>
                <span className="text-base text-gray-500 dark:text-gray-400">{driverTeamLabel}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              P{driverPositionLabel}
            </div>
            <div className="text-base text-gray-500 dark:text-gray-400">
              {driverTimeLabel}
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            <span>Viewing session:</span>
            {hasMultipleSessions ? (
              <select
                id="session-selector"
                className="rounded-md border border-transparent bg-gray-100 px-2.5 py-1.5 text-sm text-gray-700 transition hover:bg-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                value={selectedSessionId ?? ''}
                onChange={(event) => {
                  const nextId = event.target.value || null;
                  setSelectedSessionId(nextId);
                  setComparisonDriverId(null);
                }}
              >
                {[...sessions]
                  .sort((a, b) => {
                    const order: Record<'race' | 'qualifying' | 'practice', number> = {
                      race: 0,
                      qualifying: 1,
                      practice: 2,
                    };

                    const kindA = determineSessionKind(a.sessionType);
                    const kindB = determineSessionKind(b.sessionType);

                    if (order[kindA] !== order[kindB]) {
                      return order[kindA] - order[kindB];
                    }

                    if (a.sessionType !== b.sessionType) {
                      return b.sessionType - a.sessionType;
                    }

                    return 0;
                  })
                  .map((session) => {
                    const label = session.sessionName || session.sessionTypeName;
                    return (
                      <option key={session.sessionId} value={session.sessionId} disabled={!session.driver}>
                        {label}
                      </option>
                    );
                  })}
              </select>
            ) : (
              <span className="font-medium text-gray-900 dark:text-gray-100">{sessionLabel}</span>
            )}
            </div>
          </div>
        </div>
        
      {/* Analytics Tabs */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
          <div className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4" />
                <span>Overview</span>
          </div>
            </button>
            <button
              onClick={() => setActiveTab('pace')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'pace'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
          <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4" />
                <span>Pace</span>
          </div>
            </button>
            <button
              onClick={() => setActiveTab('strategy')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'strategy'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
          <div className="flex items-center space-x-2">
                <Award className="w-4 h-4" />
                <span>Stints</span>
          </div>
            </button>
            <button
              onClick={() => setActiveTab('telemetry')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'telemetry'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
          <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4" />
                <span>Telemetry</span>
        </div>
            </button>
          </nav>
      </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {raceStats ? (
                <>
                  {/* Summary Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Overall Pace Card */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-10 h-10 bg-blue-500/20 text-blue-500 rounded-lg flex items-center justify-center">
                          <TrendingUp className="w-5 h-5" />
        </div>
                        <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300">{sessionLabel} Pace</h3>
        </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Fastest Lap</span>
                          <span className="text-base font-bold text-gray-900 dark:text-white">
                            {F123DataService.formatTimeFromMs(raceStats.fastestLap)}
                          </span>
        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Avg Lap</span>
                          <span className="text-base font-bold text-gray-900 dark:text-white">
                            {raceStats.avgLap > 0 ? F123DataService.formatTimeFromMs(raceStats.avgLap) : '--:--.---'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Consistency</span>
                          <span className="text-base font-bold text-gray-900 dark:text-white">
                            {raceStats.consistencyPercent}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Session Summary Card */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                       <div className="flex items-center space-x-3 mb-3">
                         <div className="w-10 h-10 bg-green-500/20 text-green-500 rounded-lg flex items-center justify-center">
                           <Clock className="w-5 h-5" />
                         </div>
                        <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300">{sessionLabel} Summary</h3>
                       </div>
                       <div className="space-y-2">
                         <div className="flex justify-between items-center">
                           <span className="text-sm text-gray-500 dark:text-gray-400">Total Time</span>
                           <span className="text-base font-bold text-gray-900 dark:text-white">
                             {F123DataService.formatTimeFromMs(raceStats.totalTime)}
                           </span>
                         </div>
                         <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Gap to Leader</span>
                          <span className="text-base font-bold text-gray-900 dark:text-white">
                            {raceStats.gapToLeaderMs !== null && raceStats.gapToLeaderMs !== undefined
                              ? raceStats.gapToLeaderMs > 0
                                ? formatGapTime(raceStats.gapToLeaderMs)
                                : 'Leader'
                              : 'Leader'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Total Laps</span>
                          <span className="text-base font-bold text-gray-900 dark:text-white">
                            {raceStats.totalLaps}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Pit Strategy Card */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-10 h-10 bg-purple-500/20 text-purple-500 rounded-lg flex items-center justify-center">
                          <Target className="w-5 h-5" />
                        </div>
                        <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300">Session Strategy</h3>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Pit Stops</span>
                          <span className="text-base font-bold text-gray-900 dark:text-white">
                            {raceStats.pitStops}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-500 dark:text-gray-400 mb-1">Compounds Used</span>
                          <div className="flex flex-wrap gap-2 items-center">
                            {raceStats.tireCompounds.length > 0 ? (
                              raceStats.tireCompounds.map((compound, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  {(() => {
                                    const icon = F123DataService.getTireCompoundIcon(compound);
                                    const fullName = F123DataService.getTireCompoundFullName(compound);
                                    const label = F123DataService.getTireCompoundText(compound);
                                    return icon ? (
                                      <img src={icon} alt={`${fullName} tire`} className="h-6 w-6" />
                                    ) : (
                                      <span className={`px-2 py-0.5 rounded-full text-sm font-medium ${getTireCompoundColor(compound)}`}>
                                        {label}
                                      </span>
                                    );
                                  })()}
                                </div>
                              ))
                            ) : (
                              <span className="text-sm text-gray-400 dark:text-gray-500">--</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Positions Card */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-10 h-10 bg-yellow-500/20 text-yellow-500 rounded-lg flex items-center justify-center">
                          <Flag className="w-5 h-5" />
                        </div>
                        <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300">{sessionLabel} Positions</h3>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Grid</span>
                          <span className="text-base font-bold text-gray-900 dark:text-white">
                            {sessionKind === 'practice'
                              ? '--'
                              : `P${raceStats.gridPosition != null ? raceStats.gridPosition : '--'}`}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Finish</span>
                          <span className="text-base font-bold text-gray-900 dark:text-white">
                            {sessionKind === 'practice'
                              ? '--'
                              : `P${raceStats.finishPosition != null ? raceStats.finishPosition : '--'}`}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Change</span>
                          <span
                            className={`text-base font-bold ${
                              sessionKind === 'practice'
                                ? 'text-gray-400 dark:text-gray-500'
                                : raceStats.positionsGained !== null
                                    ? raceStats.positionsGained > 0
                                      ? 'text-green-500'
                                      : raceStats.positionsGained < 0
                                        ? 'text-red-500'
                                        : 'text-gray-500'
                                    : 'text-gray-500'
                            }`}
                          >
                            {sessionKind === 'practice'
                              ? '--'
                              : raceStats.positionsGained !== null
                                ? raceStats.positionsGained > 0
                                  ? `+${raceStats.positionsGained}`
                                  : raceStats.positionsGained < 0
                                    ? `${raceStats.positionsGained}`
                                    : '0'
                                : '--'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Highlights Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Best Sectors */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-10 h-10 bg-indigo-500/20 text-indigo-500 rounded-lg flex items-center justify-center">
                          <Zap className="w-5 h-5" />
                        </div>
                        <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300">Best Sectors</h3>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center">
                          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Sector 1</div>
                          <div className="text-base font-bold text-gray-900 dark:text-white">
                            {raceStats.bestSector1 !== undefined && raceStats.bestSector1 !== null
                              ? formatSectorTime(raceStats.bestSector1)
                              : '--.---'}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Sector 2</div>
                          <div className="text-base font-bold text-gray-900 dark:text-white">
                            {raceStats.bestSector2 !== undefined && raceStats.bestSector2 !== null
                              ? formatSectorTime(raceStats.bestSector2)
                              : '--.---'}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Sector 3</div>
                          <div className="text-base font-bold text-gray-900 dark:text-white">
                            {raceStats.bestSector3 !== undefined && raceStats.bestSector3 !== null
                              ? formatSectorTime(raceStats.bestSector3)
                              : '--.---'}
                          </div>
                        </div>
                      </div>
                      {raceStats.fastestLapNumber && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 text-center">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            Fastest Lap: Lap {raceStats.fastestLapNumber}
                          </span>
                        </div>
                      )}
      </div>

                    {/* Track Status */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-10 h-10 bg-orange-500/20 text-orange-500 rounded-lg flex items-center justify-center">
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                        <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300">Track Status</h3>
                      </div>
                      <div className="space-y-2">
                        {raceStats.scLaps > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Safety Car Laps</span>
                            <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-sm font-medium rounded">
                              {raceStats.scLaps}
                            </span>
                          </div>
                        )}
                        {raceStats.vscLaps > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Virtual Safety Car</span>
                            <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-sm font-medium rounded">
                              {raceStats.vscLaps}
                            </span>
                          </div>
                        )}
                        {raceStats.yellowFlags > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Yellow Flags</span>
                            <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-sm font-medium rounded">
                              {raceStats.yellowFlags}
                            </span>
                          </div>
                        )}
                        {raceStats.scLaps === 0 && raceStats.vscLaps === 0 && raceStats.yellowFlags === 0 && (
                          <div className="text-center py-2">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Clean race - no incidents</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  No race statistics available
                </div>
              )}
            </div>
          )}
          {activeTab === 'pace' && (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Driver Comparison</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Comparing lap pace for {driver?.name ?? 'Driver'}
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
                    onChange={(event) => setComparisonDriverId(event.target.value || null)}
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
                                backgroundColor:
                                  item.pattern ? undefined : item.color,
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
                    {comparisonDriverId && lapComparisonData.length > 0 && lapComparisonData.some((entry) => entry.comparisonLapSeconds !== null) ? (
                      <BaseLineChart
                        data={lapComparisonData}
                        lines={[
                          {
                            dataKey: 'targetLapSeconds',
                            name: driver?.name || 'Driver',
                            stroke: '#2563eb',
                            dot: false,
                          },
                          {
                            dataKey: 'comparisonLapSeconds',
                            name: comparisonDriverName || 'Comparison',
                            stroke: '#ef4444',
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
                  description={`Positive values indicate ${driver?.name || 'the selected driver'} is behind the comparison driver.`}
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
                            stroke: '#f97316',
                            dot: false,
                          },
                        ]}
                        yTickFormatter={(value) => formatSecondsDifference(value as number)}
                        tooltipContent={<DeltaTooltipContent />}
                        referenceLines={[{ y: 0, stroke: '#94a3b8', strokeDasharray: '4 4' }]}
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
          )}
          {activeTab === 'strategy' && (
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
                        referenceLines={
                          averageLapSeconds !== null
                            ? [
                                {
                                  y: averageLapSeconds,
                                  stroke: '#9ca3af',
                                  strokeDasharray: '4 4',
                                  label: { value: 'Avg', fill: '#6b7280', position: 'right' },
                                },
                              ]
                            : undefined
                        }
                        referenceAreas={stintSegments.map((segment, index) => ({
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
                            fill: '#2563eb',
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
          )}
          {activeTab === 'telemetry' && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              Telemetry data coming soon...
        </div>
          )}
        </div>
      </div>

      {/* Lap Times Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Lap Times</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-3 py-3 text-center text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">Lap</th>
                <th className="px-3 py-3 text-center text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">Lap Time</th>
                <th className="px-3 py-3 text-center text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">Delta</th>
                <th className="px-3 py-3 text-center text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">Pos</th>
                <th className="px-3 py-3 text-center text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">Gap</th>
                <th className="px-3 py-3 text-center text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">Interval</th>
                <th className="px-3 py-3 text-center text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">Tire</th>
                <th className="px-3 py-3 text-center text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">S1</th>
                <th className="px-3 py-3 text-center text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">S2</th>
                <th className="px-3 py-3 text-center text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">S3</th>
                <th className="px-3 py-3 text-center text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {lapData.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-base text-gray-500 dark:text-gray-400">
                    No lap data available
                  </td>
                </tr>
              ) : (
                lapData.map((lap) => {
                  const delta = getDeltaVsPrevLap(lap.lap_number);
                  const deltaClass = delta !== null 
                    ? delta > 0 
                      ? 'text-red-500' 
                      : delta < 0 
                        ? 'text-green-500' 
                        : 'text-gray-500'
                    : '';
                  
                  return (
                    <tr key={lap.lap_number} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-3 py-4 whitespace-nowrap text-center text-lg text-gray-900 dark:text-white w-16">
                        {lap.lap_number}
                  </td>
                      <td className={`px-3 py-4 whitespace-nowrap text-center text-lg w-32 ${
                        driver?.fastestLap && raceStats && lap.lap_time_ms === raceStats.fastestLap
                          ? 'text-purple-600 dark:text-purple-400 font-semibold'
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {F123DataService.formatTimeFromMs(lap.lap_time_ms)}
                  </td>
                      <td className={`px-3 py-4 whitespace-nowrap text-center text-lg font-medium w-24 ${deltaClass}`}>
                        {delta !== null 
                          ? (delta > 0 ? '+' : delta < 0 ? '-' : '') + formatGapTime(Math.abs(delta))
                          : '--.---'}
                  </td>
                      <td className="px-3 py-4 whitespace-nowrap text-center text-lg text-gray-900 dark:text-white w-16">
                        {lap.track_position || '--'}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-center text-lg text-gray-900 dark:text-white w-24">
                        {lap.track_position === 1
                          ? 'Leader'
                          : lap.gap_to_leader_ms !== null && lap.gap_to_leader_ms !== undefined && lap.gap_to_leader_ms > 0
                            ? formatGapTime(lap.gap_to_leader_ms)
                            : '--.---'}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-center text-lg text-gray-900 dark:text-white w-24">
                        {lap.gap_to_position_ahead_ms !== null && lap.gap_to_position_ahead_ms !== undefined && lap.gap_to_position_ahead_ms > 0
                          ? formatGapTime(lap.gap_to_position_ahead_ms)
                          : '--.---'}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-center w-24">
                        {lap.tire_compound ? (
                          <div className="flex items-center justify-center gap-2 text-base text-gray-700 dark:text-gray-300">
                            {(() => {
                              const icon = F123DataService.getTireCompoundIcon(lap.tire_compound);
                              const label = F123DataService.getTireCompoundText(lap.tire_compound);
                              return icon ? (
                                <img src={icon} alt={`${label} tire`} className="h-5 w-5" />
                              ) : (
                                <span className={`font-medium ${getTireCompoundColor(lap.tire_compound)}`}>
                                  {label}
                    </span>
                              );
                            })()}
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              - {lap.tire_age_laps ?? 0}
                            </span>
                    </div>
                        ) : (
                          <span className="text-lg text-gray-400 dark:text-gray-500">--</span>
                        )}
                  </td>
                      <td className={`px-3 py-4 whitespace-nowrap text-center text-lg font-medium w-24 ${
                        raceStats && lap.sector1_ms && raceStats.bestSector1 && lap.sector1_ms === raceStats.bestSector1
                          ? 'text-green-500'
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {formatSectorTime(lap.sector1_ms)}
                  </td>
                      <td className={`px-3 py-4 whitespace-nowrap text-center text-lg font-medium w-24 ${
                        raceStats && lap.sector2_ms && raceStats.bestSector2 && lap.sector2_ms === raceStats.bestSector2
                          ? 'text-green-500'
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {formatSectorTime(lap.sector2_ms)}
                  </td>
                      <td className={`px-3 py-4 whitespace-nowrap text-center text-lg font-medium w-24 ${
                        raceStats && lap.sector3_ms && raceStats.bestSector3 && lap.sector3_ms === raceStats.bestSector3
                          ? 'text-green-500'
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {formatSectorTime(lap.sector3_ms)}
                  </td>
                      <td className="px-3 py-4 whitespace-nowrap text-center text-lg text-gray-900 dark:text-white w-24">
                        <div className="flex flex-col items-center space-y-1">
                          {lap.pit_stop && (
                            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded">
                              PIT
                    </span>
                          )}
                          {lap.max_safety_car_status && lap.max_safety_car_status !== 'NO_SAFETY_CAR' && (
                            <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs rounded">
                              {lap.max_safety_car_status === 'SAFETY_CAR' ? 'SC' : 
                               lap.max_safety_car_status === 'VIRTUAL_SAFETY_CAR' ? 'VSC' : 
                               lap.max_safety_car_status}
                    </span>
                          )}
                          {lap.vehicle_fia_flags && lap.vehicle_fia_flags !== 'None' && (
                            <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs rounded">
                              {lap.vehicle_fia_flags}
                    </span>
                          )}
                          {!lap.pit_stop && 
                           (!lap.max_safety_car_status || lap.max_safety_car_status === 'NO_SAFETY_CAR') && 
                           (!lap.vehicle_fia_flags || lap.vehicle_fia_flags === 'None') && (
                            <span className="text-lg text-gray-500 dark:text-gray-400">-</span>
                          )}
                    </div>
                  </td>
                </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
