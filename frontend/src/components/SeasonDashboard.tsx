import React, { useMemo } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Calendar, Award, Star, Flag } from 'lucide-react';
import { useSeason } from '../contexts/SeasonContext';
import { F123DataService } from '../services/F123DataService';
import { OverviewStatStrip, type OverviewStatConfig } from './common/OverviewStatStrip';
import { PreviousRaceResultsComponent } from './PreviousRaceResults';
import { DashboardPage } from './layout/DashboardPage';
import { DashboardTable } from './layout/DashboardTable';
import {
  useSeasonAnalysis,
  type DriverSeasonSummary,
  type SeasonAnalysisHighlight,
  type SeasonEventSummary,
} from '../hooks/useSeasonAnalysis';

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

  const parsed = new Date(event.raceDate);
  if (Number.isNaN(parsed.getTime())) {
    return 'Awaiting confirmation';
  }

  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const SeasonDashboard: React.FC<SeasonDashboardProps> = ({ onRaceSelect, onDriverSelect, onScheduleView }) => {
  const { currentSeason } = useSeason();
  const { analysis, loading, error } = useSeasonAnalysis(currentSeason?.id);
  const navigate = useNavigate();

  const driverSummaries: DriverSeasonSummary[] = useMemo(() => {
    if (!analysis) {
      return [];
    }

    return [...analysis.drivers].sort((a, b) => {
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
        className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-white/90 hover:text-slate-900 dark:bg-slate-900/50 dark:text-slate-100 dark:hover:bg-slate-900/70 dark:hover:text-white"
      >
        <Calendar className="h-4 w-4" />
        Next race
      </button>,
    );
  }

  const primaryAction = onScheduleView
    ? (
    <button
      onClick={onScheduleView}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-accent via-brand-highlight to-brand-electric px-5 py-2 text-sm font-semibold text-white shadow-brand-glow transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-accent"
    >
      <Calendar className="h-4 w-4" />
      View schedule
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
      accentClass: 'text-purple-400 dark:text-purple-300',
      onClick: handleNavigateToGrid,
    },
    {
      id: 'most-poles',
      title: 'Most Poles',
      value: highlights?.mostPoles?.name ?? 'Awaiting data',
      meta: formatHighlightMeta(highlights?.mostPoles, 'poles'),
      icon: <Star className="w-5 h-5" />,
      accentClass: 'text-amber-400 dark:text-amber-300',
      onClick: handleNavigateToGrid,
    },
    {
      id: 'most-podiums',
      title: 'Most Podiums',
      value: highlights?.mostPodiums?.name ?? 'Awaiting data',
      meta: formatHighlightMeta(highlights?.mostPodiums, 'podiums'),
      icon: <Flag className="w-5 h-5" />,
      accentClass: 'text-emerald-400 dark:text-emerald-300',
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
      accentClass: 'text-sky-400 dark:text-sky-300',
      onClick: nextEvent ? handleNextEventClick : undefined,
    },
  ];

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
        className: 'font-medium text-slate-900 dark:text-slate-100',
      },
      {
        key: 'team',
        label: 'Team',
        align: 'left' as const,
        headerClassName: 'text-left',
        render: (_: string, row: DriverSeasonSummary) => (
          <span
            className="font-medium"
            style={{ color: F123DataService.getTeamColorHex(row.team ?? '') }}
          >
            {row.team ?? '—'}
          </span>
        ),
      },
      {
        key: 'wins',
        label: 'Wins',
        className: 'text-slate-500 dark:text-slate-400',
      },
      {
        key: 'podiums',
        label: 'Podiums',
        className: 'text-slate-500 dark:text-slate-400',
      },
      {
        key: 'points',
        label: 'Points',
        render: (_: number, row: DriverSeasonSummary) => (
          <span className="font-semibold text-slate-900 dark:text-slate-100">{row.points} pts</span>
        ),
      },
    ],
    []
  );

  return (
    <DashboardPage
      hero={{
        imageSrc: '/raw/images/94mliza3aat71.jpg',
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
            <DashboardTable
              className="lg:col-span-2"
              title="Championship Standings"
              icon={<div className="flex h-10 w-10 items-center justify-center text-red-500"><Trophy className="h-5 w-5" /></div>}
              columns={standingsColumns}
              rows={driverSummaries}
              rowKey={(row, index) => row.id ?? `${row.name}-${index}`}
              onRowClick={onDriverSelect ? (row) => row.id && onDriverSelect(row.id) : undefined}
              emptyMessage="No drivers registered for this season yet."
            />

            <div className="space-y-6">
              <PreviousRaceResultsComponent 
                seasonId={currentSeason?.id || ''} 
                onRaceSelect={onRaceSelect}
                onDriverSelect={onDriverSelect}
              />
            </div>
          </div>
        </>
      )}
    </DashboardPage>
  );
};
