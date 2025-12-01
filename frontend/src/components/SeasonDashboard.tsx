import React, { useMemo, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Calendar, Award, Star, Flag } from 'lucide-react';
import clsx from 'clsx';
import { useSeason } from '../contexts/SeasonContext';
import { F123DataService } from '../services/F123DataService';
import { OverviewStatStrip, type OverviewStatConfig } from './common/OverviewStatStrip';
import { PreviousRaceResultsComponent } from './PreviousRaceResults';
import { DashboardPage } from './layout/DashboardPage';
import { DashboardTable } from './layout/DashboardTable';
import {
  useSeasonAnalysis,
  type DriverSeasonSummary,
  type ConstructorSeasonSummary,
  type SeasonAnalysisHighlight,
  type SeasonEventSummary,
} from '../hooks/useSeasonAnalysis';
import { parseLocalDate } from '../utils/dateUtils';
// @ts-expect-error - vite-imagetools query parameters aren't recognized by TypeScript
import seasonHeroImage from '../assets/images/94mliza3aat71.jpg?w=1920&format=webp&q=85';

interface SeasonDashboardProps {
  onRaceSelect?: (raceId: string) => void;
  onDriverSelect?: (driverId: string) => void;
  onScheduleView?: () => void;
}

const formatHighlightMeta = (highlight: SeasonAnalysisHighlight | null | undefined, label: string) => {
  if (!highlight) {
    return 'Awaiting data';
  }
  return `${highlight.value} ${label}`;
};

const formatEventMeta = (event: SeasonEventSummary | null) => {
  if (!event?.raceDate) {
    return 'Awaiting confirmation';
  }

  const parsed = parseLocalDate(event.raceDate);
  if (!parsed) {
    return 'Awaiting confirmation';
  }

  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// Helper function moved outside component for better performance
const getPositionBadgeClass = (position?: number | null) => {
  if (position === 1) {
    return 'inline-flex items-center rounded-full bg-amber-500/15 px-3 py-1 text-xs 2xl:text-sm font-semibold text-amber-500';
  }
  if (position === 2) {
    return 'inline-flex items-center rounded-full bg-slate-400/15 px-3 py-1 text-xs 2xl:text-sm font-semibold text-slate-400';
  }
  if (position === 3) {
    return 'inline-flex items-center rounded-full bg-orange-400/15 px-3 py-1 text-xs 2xl:text-sm font-semibold text-orange-400';
  }
  return 'inline-flex items-center rounded-full bg-slate-900/10 px-3 py-1 text-xs 2xl:text-sm font-semibold text-slate-600 dark:bg-slate-700/40 dark:text-slate-300';
};

// Shared render function for points column to avoid duplication
const renderPointsCell = (points: number) => (
  <span className="font-semibold text-slate-900 dark:text-slate-100">{points} pts</span>
);

export const SeasonDashboard: React.FC<SeasonDashboardProps> = ({ onRaceSelect, onDriverSelect, onScheduleView }) => {
  const { currentSeason } = useSeason();
  const { analysis, loading, error } = useSeasonAnalysis(currentSeason?.id);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'drivers' | 'constructors'>('drivers');
  const [showAllDrivers, setShowAllDrivers] = useState(false);
  const [rowsVisible, setRowsVisible] = useState(false);
  
  const ROW_STAGGER_MS = 100;
  const ROW_INITIAL_DELAY_MS = 100;

  const driverSummaries: DriverSeasonSummary[] = useMemo(() => {
    if (!analysis) {
      return [];
    }

    // Get all drivers (league + AI) or just league drivers based on toggle
    const standingsList = showAllDrivers 
      ? (analysis.standings || [])
      : (analysis.drivers || []);
    
    return [...standingsList].sort((a, b) => {
      const positionA = a.position ?? Number.MAX_SAFE_INTEGER;
      const positionB = b.position ?? Number.MAX_SAFE_INTEGER;
      return positionA - positionB;
    });
  }, [analysis, showAllDrivers]);

  const constructorSummaries: ConstructorSeasonSummary[] = useMemo(() => {
    if (!analysis?.constructors) {
      return [];
    }

    return [...analysis.constructors].sort((a, b) => {
      const positionA = a.position ?? Number.MAX_SAFE_INTEGER;
      const positionB = b.position ?? Number.MAX_SAFE_INTEGER;
      return positionA - positionB;
    });
  }, [analysis]);

  const highlights = analysis?.summary.highlights;
  const nextEvent = analysis?.nextEvent ?? null;

  const handleNavigateToGrid = () => {
    navigate('/grid');
  };

  const handleNextEventClick = () => {
    if (nextEvent?.id && onRaceSelect) {
      onRaceSelect(nextEvent.id);
    }
  };

  const totalEvents = analysis?.summary.totalEvents ?? 0;
  const completedEventsCount = analysis?.summary.completedEvents ?? 0;
  const upcomingEventsCount = analysis?.summary.upcomingEvents ?? Math.max(totalEvents - completedEventsCount, 0);
  const driverCount = driverSummaries.length;

  const headerSecondaryActions: ReactNode[] = [];

  if (nextEvent) {
    headerSecondaryActions.push(
      <button
        key="next-race"
        onClick={handleNextEventClick}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white/70 px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-white/90 hover:text-slate-900 dark:bg-slate-900/50 dark:text-slate-100 dark:hover:bg-slate-900/70 dark:hover:text-white sm:px-4 sm:text-sm"
      >
        <Calendar className="h-4 w-4" />
        <span className="hidden sm:inline">Next race</span>
        <span className="sm:hidden">Next</span>
      </button>,
    );
  }

  const primaryAction = onScheduleView
    ? (
    <button
      onClick={onScheduleView}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-gradient-to-r from-brand-accent via-brand-highlight to-brand-electric px-4 py-2 text-xs font-semibold text-white shadow-brand-glow transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-accent sm:px-5 sm:text-sm"
    >
      <Calendar className="h-4 w-4" />
      <span className="hidden sm:inline">View schedule</span>
      <span className="sm:hidden">Schedule</span>
    </button>
      )
    : undefined;

  const eventProgressText =
    totalEvents > 0 ? `${completedEventsCount}/${totalEvents} races complete` : 'No races scheduled yet';

  const upcomingText =
    upcomingEventsCount > 0
    ? `${upcomingEventsCount} upcoming`
    : completedEventsCount === totalEvents && totalEvents > 0
      ? 'Season complete'
      : 'Awaiting next update';

  const overviewDescription = currentSeason
    ? `Season ${currentSeason.year} • ${eventProgressText} • ${driverCount} drivers • ${upcomingText}`
    : undefined;

  const summaryCards: OverviewStatConfig[] = [
    {
      id: 'most-wins',
      title: 'Most Wins',
      value: highlights?.mostWins?.name ?? 'Awaiting data',
      meta: formatHighlightMeta(highlights?.mostWins, 'wins'),
      icon: <Award className="w-5 h-5" />,
      accentClass: 'text-amber-500',
      onClick: handleNavigateToGrid,
    },
    {
      id: 'most-poles',
      title: 'Most Poles',
      value: highlights?.mostPoles?.name ?? 'Awaiting data',
      meta: formatHighlightMeta(highlights?.mostPoles, 'poles'),
      icon: <Star className="w-5 h-5" />,
      accentClass: 'text-purple-500',
      onClick: handleNavigateToGrid,
    },
    {
      id: 'most-podiums',
      title: 'Most Podiums',
      value: highlights?.mostPodiums?.name ?? 'Awaiting data',
      meta: formatHighlightMeta(highlights?.mostPodiums, 'podiums'),
      icon: <Flag className="w-5 h-5" />,
      accentClass: 'text-blue-500',
      onClick: handleNavigateToGrid,
    },
    {
      id: 'next-event',
      title: 'Next Event',
      value:
        nextEvent?.shortEventName ||
        nextEvent?.eventName ||
        nextEvent?.trackName ||
        'To be announced',
      meta: formatEventMeta(nextEvent),
      icon: <Calendar className="w-5 h-5" />,
      accentClass: 'text-red-500',
      onClick: nextEvent ? handleNextEventClick : undefined,
    },
  ];

  const standingsColumns = useMemo(
    () => [
      {
        key: 'position',
        label: 'Pos',
        render: (_: number | undefined, row: DriverSeasonSummary) => (
          <span className={getPositionBadgeClass(row.position)}>P{row.position ?? '—'}</span>
        ),
        className: 'font-semibold text-slate-800 dark:text-slate-100',
      },
      {
        key: 'name',
        label: 'Driver',
        align: 'left' as const,
        headerClassName: 'text-left',
        render: (_: string, row: DriverSeasonSummary) => (
          <span className={clsx('font-medium text-slate-900 dark:text-slate-100', row.isAi && 'opacity-70')}>
            {row.name}{row.isAi && <span className="ml-2 text-xs text-slate-400">(AI)</span>}
          </span>
        ),
      },
      {
        key: 'team',
        label: 'Team',
        align: 'left' as const,
        headerClassName: 'text-left',
        render: (_: string, row: DriverSeasonSummary) => (
          <span className={clsx('font-medium', F123DataService.getTeamColor(row.team ?? ''))}>
            {row.team ? F123DataService.getTeamDisplayName(row.team) : '—'}
          </span>
        ),
      },
      {
        key: 'wins',
        label: 'Wins',
        className: 'text-slate-500 dark:text-slate-400',
        hideOnMobile: true,
      },
      {
        key: 'podiums',
        label: 'Podiums',
        className: 'text-slate-500 dark:text-slate-400',
        hideOnMobile: true,
      },
      {
        key: 'points',
        label: 'Points',
        render: (_: number, row: DriverSeasonSummary) => renderPointsCell(row.points),
      },
    ],
    []
  );

  const constructorColumns = useMemo(
    () => [
      {
        key: 'position',
        label: 'Pos',
        render: (_: number | undefined, row: ConstructorSeasonSummary) => (
          <span className={getPositionBadgeClass(row.position)}>P{row.position ?? '—'}</span>
        ),
        className: 'font-semibold text-slate-800 dark:text-slate-100',
      },
      {
        key: 'team',
        label: 'Team',
        align: 'left' as const,
        headerClassName: 'text-left',
        render: (_: string, row: ConstructorSeasonSummary) => (
          <span className={clsx('font-medium', F123DataService.getTeamColor(row.team ?? ''))}>
            {row.team ? F123DataService.getTeamDisplayName(row.team) : '—'}
          </span>
        ),
      },
      {
        key: 'wins',
        label: 'Wins',
        className: 'text-slate-500 dark:text-slate-400',
        hideOnMobile: true,
      },
      {
        key: 'podiums',
        label: 'Podiums',
        className: 'text-slate-500 dark:text-slate-400',
        hideOnMobile: true,
      },
      {
        key: 'points',
        label: 'Points',
        render: (_: number, row: ConstructorSeasonSummary) => renderPointsCell(row.points),
      },
    ],
    []
  );

  useEffect(() => {
    if (driverSummaries.length > 0 || constructorSummaries.length > 0) {
      // First animate out (fade/slide down)
      setRowsVisible(false);
      
      // After animation completes, animate back in
      const frame = requestAnimationFrame(() => {
        setTimeout(() => {
          setRowsVisible(true);
        }, 500); // Wait for fade-out to complete
      });
      
      return () => {
        cancelAnimationFrame(frame);
      };
    } else {
      setRowsVisible(false);
    }
  }, [driverSummaries, constructorSummaries, activeTab, showAllDrivers]);

  const previousRaceComponent = useMemo(
    () => (
      <PreviousRaceResultsComponent 
        seasonId={currentSeason?.id || ''} 
        onRaceSelect={onRaceSelect}
        onDriverSelect={onDriverSelect}
      />
    ),
    [currentSeason?.id, onRaceSelect, onDriverSelect]
  );

  return (
    <DashboardPage
      hero={{
        imageSrc: seasonHeroImage,
        title: 'Season Dashboard',
        subtitle: currentSeason?.name ?? 'F1 25',
        description:
          overviewDescription ??
          'Dive into the latest standings, discover race-winning strategies, and keep pace with championship momentum.',
        content: loading
          ? (
            <div className="rounded-full border border-white/25 px-5 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-white/70 backdrop-blur">
              Loading Season Data
            </div>
          )
          : undefined,
      }}
      isReady={!loading && !!analysis}
    >
      {loading ? (
        <div className="rounded-3xl border border-white/15 bg-white/10 p-10 text-center text-sm text-white/80 backdrop-blur dark:border-white/10 dark:bg-slate-900/60">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          <p className="uppercase tracking-[0.3em] text-white/70">Loading season data</p>
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-10 text-center text-sm text-red-200 backdrop-blur dark:border-red-400/40 dark:bg-red-500/15">
          <p className="text-base font-semibold uppercase tracking-[0.3em]">Unable to load</p>
          <p className="mt-2 text-sm text-red-200/80">{error}</p>
        </div>
      ) : !analysis ? (
        <div className="rounded-3xl border border-dashed border-white/20 bg-white/10 p-12 text-center text-sm text-white/70 backdrop-blur dark:border-white/15 dark:bg-slate-900/50">
          <p className="text-base font-semibold uppercase tracking-[0.3em] text-white/80">Select a season</p>
          <p className="mt-2 text-sm text-white/65">Choose a season to see standings, race history, and highlights.</p>
        </div>
      ) : (
        <>
          <OverviewStatStrip items={summaryCards} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              {/* Tab Navigation */}
              <div className="flex rounded-lg bg-slate-100 p-1 text-xs dark:bg-slate-900 sm:text-sm">
                <button
                  onClick={() => setActiveTab('drivers')}
                  className={clsx(
                    'flex-1 min-h-[44px] rounded-md px-2 py-2 transition-colors sm:px-3 sm:py-1',
                    activeTab === 'drivers'
                      ? 'bg-red-600 text-white'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  )}
                >
                  <span className="hidden sm:inline">Drivers Championship</span>
                  <span className="sm:hidden">Drivers</span>
                </button>
                <button
                  onClick={() => setActiveTab('constructors')}
                  className={clsx(
                    'flex-1 min-h-[44px] rounded-md px-2 py-2 transition-colors sm:px-3 sm:py-1',
                    activeTab === 'constructors'
                      ? 'bg-red-600 text-white'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  )}
                >
                  <span className="hidden sm:inline">Constructors Championship</span>
                  <span className="sm:hidden">Constructors</span>
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === 'drivers' ? (
                <DashboardTable
                  title="Championship Standings"
                  icon={<div className="flex h-10 w-10 items-center justify-center text-red-500"><Trophy className="h-5 w-5" /></div>}
                  headerActions={
                    <label className="flex cursor-pointer items-center gap-2">
                      <span className="text-xs text-slate-600 dark:text-slate-400 sm:text-sm">AI</span>
                      <div className="relative inline-block">
                        <input
                          type="checkbox"
                          checked={showAllDrivers}
                          onChange={(e) => setShowAllDrivers(e.target.checked)}
                          className="peer sr-only"
                        />
                        <div className="h-7 w-12 rounded-full bg-slate-300 transition-colors duration-200 peer-checked:bg-red-600 dark:bg-slate-700 dark:peer-checked:bg-red-600">
                          <div className={clsx(
                            "absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-transform duration-200",
                            showAllDrivers && "translate-x-5"
                          )}></div>
                        </div>
                      </div>
                    </label>
                  }
                  columns={standingsColumns}
                  rows={driverSummaries}
                  rowKey={(row, index) => row.id ?? `${row.name}-${index}`}
                  onRowClick={onDriverSelect ? (row) => {
                    // Only allow clicking on league drivers (not AI drivers)
                    if (!row.isAi && row.id) {
                      onDriverSelect(row.id);
                    }
                  } : undefined}
                  emptyMessage="No drivers registered for this season yet."
                  rowsVisible={rowsVisible}
                  rowStaggerMs={ROW_STAGGER_MS}
                  rowInitialDelayMs={ROW_INITIAL_DELAY_MS}
                />
              ) : (
                <DashboardTable
                  title="Championship Standings"
                  icon={<div className="flex h-10 w-10 items-center justify-center text-red-500"><Trophy className="h-5 w-5" /></div>}
                  columns={constructorColumns}
                  rows={constructorSummaries}
                  rowKey={(row, index) => `${row.team}-${index}`}
                  emptyMessage="No constructors registered for this season yet."
                  rowsVisible={rowsVisible}
                  rowStaggerMs={ROW_STAGGER_MS}
                  rowInitialDelayMs={ROW_INITIAL_DELAY_MS}
                />
              )}
            </div>

            <div className="space-y-6">
              {previousRaceComponent}
            </div>
          </div>
        </>
      )}
    </DashboardPage>
  );
};
