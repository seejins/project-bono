import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { BarChart3, TrendingUp, Award, LineChart, ArrowLeft } from 'lucide-react';
import type { TooltipProps } from 'recharts';
import { DEFAULT_OVERLAY_STYLES, type LineConfig } from './charts/BaseLineChart';
import { F123DataService } from '../services/F123DataService';
import { useTheme } from '../contexts/ThemeContext';
import { useDriverRaceData } from './DriverRaceAnalysis/hooks/useDriverRaceData';
import { useLapAnalytics } from './DriverRaceAnalysis/hooks/useLapAnalytics';
import { useStintAnalytics } from './DriverRaceAnalysis/hooks/useStintAnalytics';
import { useRaceStats } from './DriverRaceAnalysis/hooks/useRaceStats';
import { DriverRaceAnalysisProps, LapStatusType, LapData } from './DriverRaceAnalysis/types';
import {
  formatSecondsValue,
  formatSecondsDifference,
  getCompoundKey,
  getCompoundDisplayName,
  isPitStopFlag,
  buildPitReferenceLines,
} from './DriverRaceAnalysis/utils';
import { BRAND_COLORS, STATUS_COLORS } from '../theme/colors';
import { OverviewTab } from './DriverRaceAnalysis/tabs/OverviewTab';
import { PaceTab as ComparisonTab } from './DriverRaceAnalysis/tabs/PaceTab';
import { StrategyTab } from './DriverRaceAnalysis/tabs/StrategyTab';
import { PaceGraphsTab } from './DriverRaceAnalysis/tabs/PaceGraphsTab';
import { DashboardTable, type DashboardTableColumn } from './layout/DashboardTable';
import { motion } from 'framer-motion';

type AnalyticsTab = 'overview' | 'pace' | 'comparison' | 'strategy';

export const DriverRaceAnalysis: React.FC<DriverRaceAnalysisProps> = ({ driverId, raceId, initialSessionType }) => {
  const { raceData, sessions, defaultSessionId, loading, error } = useDriverRaceData(driverId, raceId);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') as AnalyticsTab | null;
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const hasAppliedInitialSession = useRef(false);
  const [activeTab, setActiveTab] = useState<AnalyticsTab>(
    tabFromUrl && ['overview', 'pace', 'comparison', 'strategy'].includes(tabFromUrl) ? tabFromUrl : 'overview'
  );
  const [comparisonDriverId, setComparisonDriverId] = useState<string | null>(null);

  // Handle tab change - update both state and URL
  const handleTabChange = useCallback((tab: AnalyticsTab) => {
    setActiveTab(tab);
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('tab', tab);
      return newParams;
    });
  }, [setSearchParams]);

  // Restore tab from URL on mount
  useEffect(() => {
    if (tabFromUrl && ['overview', 'pace', 'comparison', 'strategy'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

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
  const getTeamColorHex = (team?: string | null) => F123DataService.getTeamColorHex(team ?? '');
  const getTireCompoundColor = (compound?: string) => F123DataService.getTireCompoundColor(compound);
  const getTireCompoundText = (compound?: string) => F123DataService.getTireCompoundText(compound);

  const pitLapNumbers = useMemo(
    () =>
      lapData
        .filter((lap) =>
          isPitStopFlag(
            (lap as any)?.pit_stop ??
              (lap as any)?.pitStop ??
              (lap as any)?.pit ??
              (lap as any)?.isPitStop
          )
        )
        .map((lap) => lap.lap_number)
        .filter((lap): lap is number => typeof lap === 'number' && Number.isFinite(lap) && lap > 0),
    [lapData]
  );

  const { isDark } = useTheme();
  const pitReferenceLines = useMemo(
    () => buildPitReferenceLines(pitLapNumbers, isDark),
    [pitLapNumbers, isDark]
  );

  const getDriverDisplayName = (driverResult: any): string => {
    const candidateNames = [
      driverResult?.mappedUserName,
      driverResult?.mapped_user_name,
      driverResult?.mappedDriverName,
      driverResult?.mapped_driver_name,
      driverResult?.driver_name,
      driverResult?.json_driver_name,
      driverResult?.mapping_driver_name,
      driverResult?.name,
      driverResult?.additional_data?.participantData?.name,
      driverResult?.additionalData?.participantData?.name,
      driverResult?.additional_data?.participantData?.driverName,
      driverResult?.additionalData?.participantData?.driverName,
    ];

    for (const rawName of candidateNames) {
      if (typeof rawName === 'string') {
        const trimmed = rawName.trim();
        if (trimmed.length > 0) {
          return trimmed;
        }
      }
    }

    return 'Unknown Driver';
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
  const raceStats = useRaceStats({ lapData, driver, sessionDrivers });
  
  // Calculate session fastest sectors from ALL laps in the session (not just best laps)
  const sessionFastestSectors = useMemo(() => {
    if (!sessionDrivers || sessionDrivers.length === 0) {
      return { sector1: null, sector2: null, sector3: null };
    }
    
    let fastestS1 = Infinity;
    let fastestS2 = Infinity;
    let fastestS3 = Infinity;
    
    // Single pass through all drivers and their laps
    for (const sessionDriver of sessionDrivers) {
      const lapTimes = Array.isArray(sessionDriver.lap_times) ? sessionDriver.lap_times : [];
      for (const lap of lapTimes) {
        // Early validation - only check if values exist and are positive
        if (lap.sector1_ms && lap.sector1_ms > 0 && lap.sector1_ms < fastestS1) {
          fastestS1 = lap.sector1_ms;
        }
        if (lap.sector2_ms && lap.sector2_ms > 0 && lap.sector2_ms < fastestS2) {
          fastestS2 = lap.sector2_ms;
        }
        if (lap.sector3_ms && lap.sector3_ms > 0 && lap.sector3_ms < fastestS3) {
          fastestS3 = lap.sector3_ms;
        }
      }
    }
    
    return {
      sector1: fastestS1 !== Infinity ? fastestS1 : null,
      sector2: fastestS2 !== Infinity ? fastestS2 : null,
      sector3: fastestS3 !== Infinity ? fastestS3 : null,
    };
  }, [sessionDrivers]);

  const createStintDotRenderer = useCallback(
    (compoundKey: string) =>
      (props: any) => {
        const { cx, cy, payload } = props;
        const lapNumber = payload?.lap;
        const info = lapNumber != null ? stintStartLapInfo.get(lapNumber) : undefined;
        if (!info || info.compoundKey !== compoundKey) {
          return <g key={`stint-dot-placeholder-${compoundKey}-${lapNumber ?? 'na'}`} />;
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
            <g
              key={`stint-dot-icon-${compoundKey}-${lapNumber ?? 'na'}`}
              pointerEvents="none"
            >
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
            key={`stint-dot-text-${compoundKey}-${lapNumber ?? 'na'}`}
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
      connectNulls: true,
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
                style={{ backgroundColor: entry.color || STATUS_COLORS.info }}
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
        color: DEFAULT_OVERLAY_STYLES[status]?.color ?? STATUS_COLORS.neutral,
        pattern: DEFAULT_OVERLAY_STYLES[status]?.pattern,
      })),
    [statusLegend]
  );

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

  const formatGapTime = (ms?: number | null): string => {
    if (ms === undefined || ms === null) return '--.---';
    return F123DataService.formatGapTimeFromMs(ms);
  };

  const formatSectorTime = (ms?: number | null): string => {
    if (ms === undefined || ms === null) return '--.---';
    return F123DataService.formatSectorTimeFromMs(ms);
  };

  const deltaByLap = useMemo(() => {
    const map = new Map<number, number | null>();
    if (lapData.length === 0) {
      return map;
    }

    let previousLap: LapData | null = null;
    for (const lap of lapData) {
      if (!previousLap || previousLap.lap_time_ms == null || lap.lap_time_ms == null) {
        map.set(lap.lap_number, null);
      } else {
        map.set(lap.lap_number, lap.lap_time_ms - previousLap.lap_time_ms);
      }
      previousLap = lap;
    }

    return map;
  }, [lapData]);

  const lapTableHeaderPadding = 'px-3 py-3 2xl:px-4 2xl:py-4';
  const lapTableCellPadding = 'px-3 py-3 2xl:px-4 2xl:py-4';

  const lapTableColumns = useMemo<DashboardTableColumn<LapData>[]>(() => [
    {
      key: 'lap_number',
      label: 'Lap',
      headerClassName: `${lapTableHeaderPadding} w-16`,
      className: `${lapTableCellPadding} w-16 text-lg font-semibold text-slate-900 dark:text-white`,
      render: (_: unknown, row) => row.lap_number ?? '—',
    },
    {
      key: 'lap_time_ms',
      label: 'Lap Time',
      headerClassName: lapTableHeaderPadding,
      className: `${lapTableCellPadding} text-lg`,
      render: (_: unknown, row) => {
        const isPersonalBest = Boolean(
          raceStats?.fastestLap && row.lap_time_ms && raceStats.fastestLap === row.lap_time_ms
        );
        const isSessionFastest = Boolean(
          raceStats?.sessionFastestLap && row.lap_time_ms && raceStats.sessionFastestLap === row.lap_time_ms
        );
        
        let className = 'text-slate-900 dark:text-white';
        if (isSessionFastest) {
          className = 'text-purple-600 dark:text-purple-400 font-semibold'; // Session fastest - purple
        } else if (isPersonalBest) {
          className = 'text-green-600 dark:text-green-400 font-semibold'; // Personal best - green
        }

        return (
          <span className={className}>
            {row.lap_time_ms != null ? F123DataService.formatTimeFromMs(row.lap_time_ms) : '--:--.---'}
          </span>
        );
      },
    },
    {
      key: 'delta',
      label: 'Delta',
      headerClassName: lapTableHeaderPadding,
      className: `${lapTableCellPadding} text-lg font-medium`,
      render: (_: unknown, row) => {
        const delta = deltaByLap.get(row.lap_number) ?? null;
        if (delta === null) {
          return <span className="text-slate-400">--.---</span>;
        }

        const className =
          delta > 0
            ? 'text-red-500'
            : delta < 0
              ? 'text-green-500'
              : 'text-gray-500 dark:text-gray-400';
        const sign = delta > 0 ? '+' : delta < 0 ? '-' : '';
        const formatted = formatGapTime(Math.abs(delta));

        return <span className={className}>{`${sign}${formatted}`}</span>;
      },
    },
    {
      key: 'track_position',
      label: 'Pos',
      headerClassName: `${lapTableHeaderPadding} w-16`,
      className: `${lapTableCellPadding} w-16 text-lg text-slate-900 dark:text-white`,
      render: (_: unknown, row) => row.track_position ?? '—',
    },
    {
      key: 'gap_to_leader_ms',
      label: 'Gap',
      headerClassName: lapTableHeaderPadding,
      className: `${lapTableCellPadding} text-lg text-slate-900 dark:text-white`,
      render: (_: unknown, row) => {
        if (row.track_position === 1) {
          return 'Leader';
        }
        if (row.gap_to_leader_ms && row.gap_to_leader_ms > 0) {
          return formatGapTime(row.gap_to_leader_ms);
        }
        return '--.---';
      },
    },
    {
      key: 'gap_to_position_ahead_ms',
      label: 'Interval',
      headerClassName: lapTableHeaderPadding,
      className: `${lapTableCellPadding} text-lg text-slate-900 dark:text-white`,
      render: (_: unknown, row) => {
        if (row.gap_to_position_ahead_ms && row.gap_to_position_ahead_ms > 0) {
          return formatGapTime(row.gap_to_position_ahead_ms);
        }
        return '--.---';
      },
    },
    {
      key: 'tire_compound',
      label: 'Tire',
      headerClassName: lapTableHeaderPadding,
      className: `${lapTableCellPadding} text-base`,
      render: (compound: string | undefined, row) => {
        if (!compound) {
          return <span className="text-lg text-gray-400 dark:text-gray-500">--</span>;
        }

        const icon = F123DataService.getTireCompoundIcon(compound);
        const label = F123DataService.getTireCompoundText(compound);
        return (
          <div className="flex items-center justify-center gap-2 text-base text-gray-700 dark:text-gray-200">
            {icon ? (
              <img src={icon} alt={`${label} tire`} className="h-5 w-5" />
            ) : (
              <span className={`font-medium ${getTireCompoundColor(compound)}`}>{label}</span>
            )}
           </div>
        );
      },
    },
    {
      key: 'sector1_ms',
      label: 'S1',
      headerClassName: lapTableHeaderPadding,
      className: `${lapTableCellPadding} text-lg font-medium`,
      render: (value: number | undefined) => {
        const isSessionFastest = Boolean(
          sessionFastestSectors?.sector1 != null && 
          value != null && 
          Math.abs(value - sessionFastestSectors.sector1) < 1
        );
        const isPersonalBest = Boolean(
          raceStats?.bestSector1 != null && value != null && raceStats.bestSector1 === value
        );
        
        let className = 'text-slate-900 dark:text-white';
        if (isSessionFastest) {
          className = 'text-purple-600 dark:text-purple-400 font-semibold'; // Session fastest - purple
        } else if (isPersonalBest) {
          className = 'text-green-600 dark:text-green-400 font-semibold'; // Personal best - green
        }
        
        return (
          <span className={className}>
            {formatSectorTime(value)}
          </span>
        );
      },
    },
    {
      key: 'sector2_ms',
      label: 'S2',
      headerClassName: lapTableHeaderPadding,
      className: `${lapTableCellPadding} text-lg font-medium`,
      render: (value: number | undefined) => {
        const isSessionFastest = Boolean(
          sessionFastestSectors?.sector2 != null && 
          value != null && 
          Math.abs(value - sessionFastestSectors.sector2) < 1
        );
        const isPersonalBest = Boolean(
          raceStats?.bestSector2 != null && value != null && raceStats.bestSector2 === value
        );
        
        let className = 'text-slate-900 dark:text-white';
        if (isSessionFastest) {
          className = 'text-purple-600 dark:text-purple-400 font-semibold'; // Session fastest - purple
        } else if (isPersonalBest) {
          className = 'text-green-600 dark:text-green-400 font-semibold'; // Personal best - green
        }
        
        return (
          <span className={className}>
            {formatSectorTime(value)}
          </span>
        );
      },
    },
    {
      key: 'sector3_ms',
      label: 'S3',
      headerClassName: lapTableHeaderPadding,
      className: `${lapTableCellPadding} text-lg font-medium`,
      render: (value: number | undefined) => {
        const isSessionFastest = Boolean(
          sessionFastestSectors?.sector3 != null && 
          value != null && 
          Math.abs(value - sessionFastestSectors.sector3) < 1
        );
        const isPersonalBest = Boolean(
          raceStats?.bestSector3 != null && value != null && raceStats.bestSector3 === value
        );
        
        let className = 'text-slate-900 dark:text-white';
        if (isSessionFastest) {
          className = 'text-purple-600 dark:text-purple-400 font-semibold'; // Session fastest - purple
        } else if (isPersonalBest) {
          className = 'text-green-600 dark:text-green-400 font-semibold'; // Personal best - green
        }
        
        return (
          <span className={className}>
            {formatSectorTime(value)}
          </span>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      headerClassName: lapTableHeaderPadding,
      className: `${lapTableCellPadding} text-center`,
      render: (_: unknown, row) => {
        const badges: React.ReactNode[] = [];

        if (row.pit_stop) {
          badges.push(
            <span key="pit" className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-semibold">
              PIT
            </span>
          );
        }

        if (row.max_safety_car_status && row.max_safety_car_status !== 'NO_SAFETY_CAR') {
          badges.push(
            <span key="sc" className="px-2 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs font-semibold">
              {row.max_safety_car_status === 'SAFETY_CAR'
                ? 'SC'
                : row.max_safety_car_status === 'VIRTUAL_SAFETY_CAR'
                  ? 'VSC'
                  : row.max_safety_car_status}
            </span>
          );
        }

        if (row.vehicle_fia_flags && row.vehicle_fia_flags !== 'None') {
          badges.push(
            <span key="flag" className="px-2 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs font-semibold">
              {row.vehicle_fia_flags}
            </span>
          );
        }

        if (badges.length === 0) {
          return <span className="text-lg text-gray-400 dark:text-gray-500">-</span>;
        }

        return <div className="flex flex-col items-center space-y-1">{badges}</div>;
      },
    },
  ], [deltaByLap, formatGapTime, formatSectorTime, getTireCompoundColor, raceStats, sessionFastestSectors]);

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
  const teamColorHex = getTeamColorHex(driverTeamLabel);
  const fallbackGlow = 'rgba(255,255,255,0.28)';
  const glowGradient = teamColorHex
    ? teamColorHex.trim().startsWith('#')
      ? `radial-gradient(circle at top, ${teamColorHex}55, transparent 68%)`
      : `radial-gradient(circle at top, ${teamColorHex}, transparent 68%)`
    : `radial-gradient(circle at top, ${fallbackGlow}, transparent 68%)`;
  const eventName = raceData?.eventName || raceData?.track?.name || raceData?.race?.name || 'Event';

  const handleSelectSession = useCallback(
    (sessionId: string | null) => {
      setSelectedSessionId(sessionId);
                  setComparisonDriverId(null);
    },
    []
  );

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
          className="relative flex flex-col items-center justify-center space-y-4 text-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easing, delay: 0.1 }}
        >
          <div className="absolute left-0 top-0">
            <button
              onClick={() => navigate(`/races/${raceId}`)}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              aria-label="Back to results"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Results</span>
            </button>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.45em] text-slate-500 dark:text-slate-400">
            {driverNameLabel}
          </p>
          <h1 className="text-4xl font-black uppercase tracking-[0.18em] text-slate-900 dark:text-white sm:text-5xl">
            Race Analysis
          </h1>
          <span className="text-sm font-medium uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
            {eventName}
          </span>
        </motion.header>

        <motion.section
          className="space-y-6"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easing, delay: 0.18 }}
        >
          <motion.nav
            className="flex flex-col gap-4 border-b border-slate-200 pb-2 dark:border-slate-800 md:flex-row md:items-center md:justify-between"
            aria-label="Tabs"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: easing, delay: 0.22 }}
          >
            <div className="flex flex-wrap gap-3 sm:gap-4 lg:gap-6">
            <button
              onClick={() => handleTabChange('overview')}
              className={`pt-4 pb-2 px-1 border-b-2 font-medium text-base transition-colors ${
                activeTab === 'overview'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-400 hover:border-gray-300'
              }`}
            >
          <div className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4" />
                <span>Overview</span>
          </div>
            </button>
            <button
              onClick={() => handleTabChange('pace')}
              className={`pt-4 pb-2 px-1 border-b-2 font-medium text-base transition-colors ${
                activeTab === 'pace'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-400 hover:border-gray-300'
              }`}
            >
          <div className="flex items-center space-x-2">
                <LineChart className="w-4 h-4" />
                <span>Pace</span>
          </div>
            </button>
            <button
              onClick={() => handleTabChange('comparison')}
              className={`pt-4 pb-2 px-1 border-b-2 font-medium text-base transition-colors ${
                activeTab === 'comparison'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-400 hover:border-gray-300'
              }`}
            >
          <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4" />
                <span>Comparison</span>
          </div>
            </button>
            <button
              onClick={() => handleTabChange('strategy')}
              className={`pt-4 pb-2 px-1 border-b-2 font-medium text-base transition-colors ${
                activeTab === 'strategy'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-400 hover:border-gray-300'
              }`}
            >
          <div className="flex items-center space-x-2">
                <Award className="w-4 h-4" />
                <span>Strategy</span>
        </div>
            </button>
      </div>
            <div className="w-full md:w-auto">
               {sessions.length > 1 ? (
                  <select
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-400/40"
                   value={selectedSessionId ?? ''}
                   onChange={(event) => handleSelectSession(event.target.value || null)}
                 >
                  {[...sessions]
                    .filter((session) => !!session?.sessionId)
                    .sort((a, b) => {
                      const order: Record<'race' | 'qualifying' | 'practice', number> = { race: 0, qualifying: 1, practice: 2 };
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
                    .map((session) => (
                      <option key={session.sessionId} value={session.sessionId} disabled={!session.driver}>
                        {session.sessionName || session.sessionTypeName || 'Session'}
                        </option>
                    ))}
                </select>
              ) : (
                <span className="inline-flex items-center justify-center rounded-full border border-slate-200 px-3 py-1 text-sm font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">
                  Session: {sessionLabel}
                </span>
                    )}
                  </div>
          </motion.nav>

          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4, ease: easing }}
            className="space-y-6"
          >
            {activeTab === 'overview' && (
              <OverviewTab
                raceStats={raceStats}
                sessionLabel={sessionLabel}
                sessionKind={sessionKind}
                formatGapTime={formatGapTime}
                formatSectorTime={formatSectorTime}
                getTireCompoundColor={getTireCompoundColor}
                sessionFastestSectors={sessionFastestSectors}
              />
            )}
            {activeTab === 'pace' && (
              <PaceGraphsTab
                driverName={driver?.name ?? 'Driver'}
                lapData={lapData}
                sessionDrivers={sessionDrivers}
                formatSecondsValue={formatSecondsValue}
                getTeamColorHex={getTeamColorHex}
                pitLaps={pitLapNumbers}
                primaryDriverId={
                  driver
                    ? (driver as any)?.id ??
                      (driver as any)?.driver_id ??
                      (driver as any)?.driverId ??
                      (driver as any)?.member_id ??
                      null
                    : null
                }
              />
          )}
            {activeTab === 'comparison' && (
              <ComparisonTab
                driverName={driver?.name ?? 'Driver'}
                comparisonDriverName={comparisonDriverName}
                comparisonDriverId={comparisonDriverId}
                onSelectComparisonDriver={setComparisonDriverId}
                comparisonOptions={comparisonOptions}
                lapComparisonData={lapComparisonData}
                deltaComparisonData={deltaComparisonData}
                formatSecondsValue={formatSecondsValue}
                formatSecondsDifference={formatSecondsDifference}
                overlayLegendItems={overlayLegendItems}
                chartOverlays={chartOverlays}
                LapTimeTooltipContent={LapTimeTooltipContent}
                DeltaTooltipContent={DeltaTooltipContent}
                hexToRgba={hexToRgba}
                pitReferenceLines={pitReferenceLines}
                lapData={lapData}
                comparisonDriver={comparisonDriver}
              />
          )}
          {activeTab === 'strategy' && (
              <StrategyTab
                averageLapSeconds={averageLapSeconds}
                compoundLineSetup={compoundLineSetup}
                stintLines={stintLines}
                stintSegments={stintSegments}
                compoundAverages={compoundAverages}
                formatSecondsValue={formatSecondsValue}
                StintLapTooltip={StintLapTooltip}
                CompoundBarTooltip={CompoundBarTooltip}
                pitReferenceLines={pitReferenceLines}
                lapData={lapData}
              />
            )}
          </motion.div>

          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: easing, delay: 0.26 }}
          >
            <motion.div
              className="flex items-center justify-between text-slate-900 dark:text-slate-100"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: easing, delay: 0.32 }}
            >
              <h3 className="text-lg font-semibold">Lap Times</h3>
              {lapData.length > 0 && (
                <span className="text-sm text-slate-500 dark:text-slate-400">{lapData.length} laps recorded</span>
                    )}
                  </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: easing, delay: 0.36 }}
            >
              <DashboardTable
                columns={lapTableColumns}
                rows={lapData}
                rowKey={(row) => row.lap_number}
                emptyMessage="No lap data available"
              />
            </motion.div>
          </motion.div>
        </motion.section>
      </motion.div>
    </div>
  );
};
