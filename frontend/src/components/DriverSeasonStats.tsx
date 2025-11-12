import React, { useMemo } from 'react';
import { Trophy, Award, Star, Flag, Zap, Target, ChevronRight } from 'lucide-react';
import { useSeason } from '../contexts/SeasonContext';
import { OverviewStatStrip, type OverviewStatConfig } from './common/OverviewStatStrip';
import { PreviousRaceResultsComponent } from './PreviousRaceResults';
import {
  useSeasonAnalysis,
  type DriverSeasonSummary,
  type SeasonAnalysisHighlight,
} from '../hooks/useSeasonAnalysis';

interface DriverSeasonStatsProps {
  driverId: string;
  onRaceSelect?: (raceId: string) => void;
}

const HighlightBadge: React.FC<{ label: string }> = ({ label }) => (
  <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-200">
    <Star className="h-3 w-3 text-amber-400" />
    {label}
  </span>
);

export const DriverSeasonStats: React.FC<DriverSeasonStatsProps> = ({ driverId, onRaceSelect }) => {
  const { currentSeason } = useSeason();
  const { analysis, loading, error } = useSeasonAnalysis(currentSeason?.id);

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

  const summaryCards: OverviewStatConfig[] = useMemo(() => {
    if (!driverSummary) {
      return [];
    }

    return [
      {
        id: 'points',
        title: 'Championship Points',
        value: driverSummary.points.toLocaleString(),
        meta: driverSummary.position ? `P${driverSummary.position}` : 'Unclassified',
        icon: <Target className="w-5 h-5" />,
        accentClass: 'text-slate-300',
      },
      {
        id: 'wins',
        title: 'Wins',
        value: driverSummary.wins,
        meta: `${driverSummary.podiums} podiums`,
        icon: <Trophy className="w-5 h-5" />,
        accentClass: 'text-slate-300',
      },
      {
        id: 'poles',
        title: 'Poles',
        value: driverSummary.polePositions,
        meta: `${driverSummary.fastestLaps} fastest laps`,
        icon: <Flag className="w-5 h-5" />,
        accentClass: 'text-slate-300',
      },
      {
        id: 'consistency',
        title: 'Consistency',
        value: `${driverSummary.consistency.toFixed(1)}%`,
        meta: `${driverSummary.pointsFinishes} points finishes`,
        icon: <Award className="w-5 h-5" />,
        accentClass: 'text-slate-300',
      },
    ];
  }, [driverSummary]);

  if (loading) {
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

  const recentResults = driverSummary.recentResults;

  return (
    <div className="mx-auto max-w-[2048px] space-y-6">
      {/* Title Card */}
      <div className="rounded-3xl border border-slate-800 bg-slate-950/70 shadow-lg">
        <div className="border-b border-slate-800 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-xl font-semibold text-slate-100">
                {driverSummary.number ?? '--'}
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-slate-100">{driverSummary.name}</h1>
                <p className="text-sm text-slate-400">{driverSummary.team ?? 'Independent'} • {currentSeason?.name || 'Season'}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {highlightBadges.map((label) => (
                <HighlightBadge key={label} label={label} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-3">
          {/* Season Snapshot */}
          <div className="rounded-3xl border border-slate-800 bg-slate-950/70 shadow-lg">
            <div className="border-b border-slate-800 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-slate-100 shadow">
                  <Target className="h-4 w-4" />
                </div>
                <h2 className="text-xl font-semibold text-slate-100">Season Snapshot</h2>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 px-6 py-5 text-sm text-slate-300 lg:grid-cols-4">
              <div className="rounded-2xl bg-slate-900/80 px-4 py-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
                  <Award className="h-4 w-4 text-amber-400" />
                  Championship
                </div>
                <div className="mt-3 text-2xl font-bold text-slate-100">P{driverSummary.position ?? '—'}</div>
                <div className="text-xs text-slate-400">Points: {driverSummary.points.toLocaleString()}</div>
              </div>

              <div className="rounded-2xl bg-slate-900/80 px-4 py-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
                  <Trophy className="h-4 w-4 text-yellow-400" />
                  Wins & Podiums
                </div>
                <div className="mt-3 text-2xl font-bold text-slate-100">{driverSummary.wins}</div>
                <div className="text-xs text-slate-400">Podiums: {driverSummary.podiums}</div>
              </div>

              <div className="rounded-2xl bg-slate-900/80 px-4 py-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
                  <Star className="h-4 w-4 text-purple-400" />
                  Qualifying Pace
                </div>
                <div className="mt-3 text-2xl font-bold text-slate-100">{driverSummary.polePositions}</div>
                <div className="text-xs text-slate-400">Fastest laps: {driverSummary.fastestLaps}</div>
              </div>

              <div className="rounded-2xl bg-slate-900/80 px-4 py-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
                  <Flag className="h-4 w-4 text-emerald-400" />
                  Consistency
                </div>
                <div className="mt-3 text-2xl font-bold text-slate-100">{driverSummary.consistency.toFixed(1)}%</div>
                <div className="text-xs text-slate-400">Points finishes: {driverSummary.pointsFinishes}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 px-6 pb-6 text-sm text-slate-300 lg:grid-cols-2">
              <div className="rounded-2xl bg-slate-900/80 px-4 py-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
                  <Zap className="h-4 w-4 text-sky-400" />
                  Average Finish
                </div>
                <div className="mt-3 text-xl font-bold text-slate-100">
                  {driverSummary.averageFinish ? `P${driverSummary.averageFinish.toFixed(1)}` : '—'}
                </div>
                <div className="text-xs text-slate-400">Total races: {driverSummary.totalRaces}</div>
              </div>

              <div className="rounded-2xl bg-slate-900/80 px-4 py-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
                  <Trophy className="h-4 w-4 text-red-400" />
                  Reliability
                </div>
                <div className="mt-3 text-xl font-bold text-slate-100">{driverSummary.dnfs} DNFs</div>
                <div className="text-xs text-slate-400">Clean finishes: {Math.max(driverSummary.totalRaces - driverSummary.dnfs, 0)}</div>
              </div>
            </div>
          </div>

          {/* Recent Results */}
          <div className="rounded-3xl border border-slate-800 bg-slate-950/70 shadow-lg">
            <div className="border-b border-slate-800 px-6 py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-slate-100 shadow">
                    <Zap className="h-4 w-4" />
                  </div>
                  <h2 className="text-xl font-semibold text-slate-100">Recent Results</h2>
                </div>
                {driverSummary.recentResults.length > 0 && onRaceSelect && (
                  <button
                    onClick={() => onRaceSelect(driverSummary.recentResults[0].raceId)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-800 px-3 py-1 text-xs font-semibold text-slate-300 transition hover:border-slate-700 hover:text-slate-100"
                  >
                    View race
                    <ChevronRight className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto px-6 py-5">
              <table className="w-full text-sm text-slate-300">
                <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left">Event</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Result</th>
                    <th className="px-4 py-3 text-right">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {recentResults.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                        No completed races yet.
                      </td>
                    </tr>
                  )}
                  {recentResults.map((result) => {
                    const date = result.date ? new Date(result.date) : null;
                    const formattedDate = date && !Number.isNaN(date.getTime())
                      ? date.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })
                      : 'N/A';

                    return (
                      <tr key={`${result.raceId}-${result.trackName}`} className="transition hover:bg-slate-900/60">
                        <td className="px-4 py-3 font-medium text-slate-100">{result.trackName}</td>
                        <td className="px-4 py-3 text-slate-400">{formattedDate}</td>
                        <td className="px-4 py-3 text-slate-300">
                          {result.position ? `P${result.position}` : result.resultStatus ?? '—'}
                          {result.fastestLap && <Zap className="ml-2 inline h-3.5 w-3.5 text-purple-500" />}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-100">{result.points}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
