import React, { useState, useEffect, useMemo } from 'react';
import clsx from 'clsx';
import { Trophy, Loader2 } from 'lucide-react';
import logger from '../utils/logger';
import { getApiUrl } from '../utils/api';
import { PreviousRaceResults } from '../types';
import { F123DataService } from '../services/F123DataService';
import { formatFullDate } from '../utils/dateUtils';
import './PreviousRace/animations.css';

interface PreviousRaceResultsProps {
  seasonId: string;
  onRaceSelect?: (raceId: string) => void;
  onDriverSelect?: (driverId: string, raceId?: string) => void;
}

export const PreviousRaceResultsComponent: React.FC<PreviousRaceResultsProps> = ({
  seasonId,
  onRaceSelect,
  onDriverSelect,
}) => {
  const [previousRace, setPreviousRace] = useState<PreviousRaceResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const teamColorStyle = (team?: string | null) => {
    if (!team) return undefined;
    const color = F123DataService.getTeamColorHex(team);
    return color ? { color } : undefined;
  };

  useEffect(() => {
    const fetchPreviousRaceResults = async () => {
    try {
      setLoading(true);
      setError(null);

      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/seasons/${seasonId}/previous-race`);
      
      if (response.ok) {
        const data = await response.json();
        setPreviousRace(data.previousRace);
      } else {
        // No previous race is not an error
        setPreviousRace(null);
      }
    } catch (error) {
      logger.error('Error fetching previous race results:', error);
      setError('Failed to load previous race results');
    } finally {
      setLoading(false);
    }
    };

    fetchPreviousRaceResults();
  }, [seasonId]);

  const CardShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-md dark:border-slate-800 dark:bg-slate-950/70">
      <button
        type="button"
        onClick={() => previousRace && onRaceSelect?.(previousRace.raceId)}
        className="flex w-full items-center gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4 text-left transition hover:bg-red-50/60 focus:outline-none focus-visible:bg-red-100/70 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:bg-slate-800/70"
      >
        <div className="flex h-10 w-10 items-center justify-center text-purple-500">
          <Trophy className="w-5 h-5" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Previous Race</h2>
      </button>
      <div className="px-6 py-5">{children}</div>
    </div>
  );

  const formatLapTime = (value: number | null | undefined) => {
    if (value == null || Number.isNaN(value)) {
      return '—';
    }
    const totalMs = Math.round(value);
    const minutes = Math.floor(totalMs / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);
    const milliseconds = totalMs % 1000;
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds
      .toString()
      .padStart(3, '0')}`;
  };

  const summarySections = useMemo(() => {
    if (!previousRace?.summary) {
      return [];
    }

    const sections = [
      {
        key: 'topFinishers',
        label: 'Top Finishers',
        items: (previousRace.summary.topFinishers ?? []).slice(0, 3),
        render: (item: any) => (
          <>
            <span className="font-semibold text-slate-600 dark:text-slate-300">
              {item.position ?? '—'}
            </span>
            <div className="flex flex-col">
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {item.name ?? 'Awaiting data'}
              </span>
              {item.team ? (
                <span
                  className="text-xs text-slate-500 dark:text-slate-400"
                  style={teamColorStyle(item.team)}
                >
                  {item.team}
                </span>
              ) : null}
            </div>
            <span className="text-right font-semibold text-slate-700 dark:text-slate-200">
              {item.points != null ? `${item.points} pts` : '—'}
            </span>
          </>
        ),
      },
      {
        key: 'qualifyingHighlights',
        label: 'Qualifying',
        items: (previousRace.summary.qualifyingHighlights ?? []).slice(0, 3),
        render: (item: any) => (
          <>
            <span className="font-semibold text-slate-600 dark:text-slate-300">
              {item.position != null ? `Q${item.position}` : 'Q—'}
            </span>
            <div className="flex flex-col">
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {item.name ?? 'Awaiting data'}
              </span>
              {item.team ? (
                <span
                  className="text-xs text-slate-500 dark:text-slate-400"
                  style={teamColorStyle(item.team)}
                >
                  {item.team}
                </span>
              ) : null}
            </div>
            <span className="text-right font-semibold text-slate-700 dark:text-slate-200">
              {formatLapTime(item.lapTimeMs ?? null)}
            </span>
          </>
        ),
      },
      {
        key: 'fastestLaps',
        label: 'Fastest Laps',
        items: (previousRace.summary.fastestLaps ?? []).slice(0, 3),
        render: (item: any, index: number) => {
          const isFastestLap = item.fastestLap === true;
          return (
          <>
            <span className="font-semibold text-slate-600 dark:text-slate-300">
              {item.position ? `P${item.position}` : '—'}
            </span>
            <div className="flex flex-col">
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {item.name ?? 'Awaiting data'}
              </span>
              {item.team ? (
                <span
                  className="text-xs text-slate-500 dark:text-slate-400"
                  style={teamColorStyle(item.team)}
                >
                  {item.team}
                </span>
              ) : null}
            </div>
            <span
              className={clsx(
                'text-right font-semibold',
                isFastestLap
                ? 'text-purple-500 dark:text-purple-400'
                  : 'text-slate-700 dark:text-slate-200',
              )}
            >
              {formatLapTime(item.bestLapTimeMs ?? null)}
            </span>
          </>
          );
        },
      },
      {
        key: 'averageLapTimes',
        label: 'Avg Lap Pace',
        items: (previousRace.summary.averageLapTimes ?? []).slice(0, 3),
        render: (item: any) => (
          <>
            <span className="font-semibold text-slate-600 dark:text-slate-300">
              {item.position ? `P${item.position}` : '—'}
            </span>
            <div className="flex flex-col">
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {item.name ?? 'Awaiting data'}
              </span>
              {item.team ? (
                <span
                  className="text-xs text-slate-500 dark:text-slate-400"
                  style={teamColorStyle(item.team)}
                >
                  {item.team}
                </span>
              ) : null}
            </div>
            <span className="text-right font-semibold text-slate-700 dark:text-slate-200">
              {formatLapTime(item.averageLapTimeMs ?? null)}
            </span>
          </>
        ),
      },
    ];

    return sections.filter(
      (section) => Array.isArray(section.items) && section.items.length > 0,
    );
  }, [previousRace]);

  const activeSection =
    summarySections.length > 0
      ? summarySections[activeIndex % summarySections.length]
      : null;

  useEffect(() => {
    if (summarySections.length === 0) {
      setActiveIndex(0);
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % summarySections.length);
    }, 6000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [summarySections.length, activeIndex]);

  const handleIndicatorSelect = (index: number) => {
    if (summarySections.length === 0) return;
    setActiveIndex(index % summarySections.length);
  };

  if (loading) {
    return (
      <CardShell>
        <div className="flex items-center justify-center py-6 text-sm text-slate-500 dark:text-slate-400">
          <Loader2 className="mr-3 h-5 w-5 animate-spin text-red-500" />
          Loading previous race…
        </div>
      </CardShell>
    );
  }

  if (error) {
    return (
      <CardShell>
        <div className="py-6 text-center text-sm text-red-500">{error}</div>
      </CardShell>
    );
  }

  if (!previousRace || !previousRace.drivers || previousRace.drivers.length === 0) {
    return (
      <CardShell>
        <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
          No previous race results available yet.
        </p>
      </CardShell>
    );
  }

  const eventTitle =
    previousRace.shortEventName ||
    previousRace.eventName ||
    previousRace.raceName ||
    previousRace.trackName ||
    'Previous Race';

  return (
    <CardShell>
      <div className="mb-5 space-y-1.5">
        <div className="px-2">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
             {formatFullDate(previousRace.date)}
            </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {eventTitle}
          </h3>
        </div>
      </div>

      {summarySections.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
            <span>{activeSection?.label ?? 'Highlights'}</span>
            {summarySections.length > 1 && (
              <div className="flex gap-1.5">
                {summarySections.map((section, index) => (
                  <button
                    type="button"
                    key={section.key}
                    className={clsx(
                      'h-1.5 w-6 rounded-full transition-all duration-300 focus:outline-none',
                      index === activeIndex % summarySections.length
                        ? 'bg-red-500'
                        : 'bg-slate-200 dark:bg-slate-700',
                    )}
                    onClick={() => handleIndicatorSelect(index)}
                    aria-label={`Show ${section.label}`}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="overflow-hidden">
            <div
              key={activeSection?.key}
              className="space-y-2 animate-fade-in"
            >
              <div className="space-y-1.5">
                 {activeSection?.items.map((item, index) => (
                  <button
                     key={`${activeSection.key}-${item?.name ?? 'item'}-${index}`}
                    type="button"
                     onClick={() => onRaceSelect?.(previousRace.raceId)}
                    className={clsx(
                      'grid w-full grid-cols-[56px_1fr_80px] items-center rounded-2xl bg-white/60 px-3 py-2 text-left text-sm transition hover:bg-white/75 focus:outline-none dark:bg-slate-800/60 dark:hover:bg-slate-800/75',
                      item?.driverId ? 'cursor-pointer' : 'cursor-default',
                    )}
                  >
                    {activeSection.render(item, index)}
                  </button>
                ))}
              </div>

              {(!activeSection || activeSection.items.length === 0) && (
                <div className="rounded-2xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400 dark:border-slate-700 dark:text-slate-500">
                  Summary details unavailable for this race.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-[40px_1fr_60px] items-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
            <span>P</span>
            <span>Driver</span>
            <span className="text-right">Pts</span>
          </div>

          <div className="space-y-1.5">
            {previousRace.drivers.slice(0, 3).map((driver) => (
              <button
                key={`${driver.position}-${driver.name}`}
                type="button"
                onClick={() => onRaceSelect?.(previousRace.raceId)}
                className={clsx(
                  'grid w-full grid-cols-[40px_1fr_60px] items-center rounded-2xl bg-white/60 px-3 py-2 text-left text-sm transition hover:bg-white/75 focus:outline-none dark:bg-slate-800/60 dark:hover:bg-slate-800/75',
                  driver.driverId ? 'cursor-pointer' : 'cursor-default',
                )}
              >
                <span className="font-semibold text-slate-600 dark:text-slate-300">
                  {driver.position}
                </span>
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {driver.name}
                  </span>
                  {driver.team ? (
                    <span
                      className="text-xs text-slate-500 dark:text-slate-400"
                      style={teamColorStyle(driver.team)}
                    >
                      {driver.team}
                    </span>
                  ) : null}
                </div>
                <span className="text-right font-semibold text-slate-700 dark:text-slate-200">
                  {driver.points}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </CardShell>
  );
};

