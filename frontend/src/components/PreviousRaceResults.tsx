import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import { Zap, Trophy, ChevronRight, Loader2, Star } from 'lucide-react';
import { PreviousRaceResults } from '../types';

interface PreviousRaceResultsProps {
  seasonId: string;
  onRaceSelect?: (raceId: string) => void;
}

export const PreviousRaceResultsComponent: React.FC<PreviousRaceResultsProps> = ({ 
  seasonId, 
  onRaceSelect 
}) => {
  const [previousRace, setPreviousRace] = useState<PreviousRaceResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPreviousRaceResults();
  }, [seasonId]);

  const fetchPreviousRaceResults = async () => {
    try {
      setLoading(true);
      setError(null);

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/seasons/${seasonId}/previous-race`);
      
      if (response.ok) {
        const data = await response.json();
        setPreviousRace(data.previousRace);
      } else {
        // No previous race is not an error
        setPreviousRace(null);
      }
    } catch (error) {
      console.error('Error fetching previous race results:', error);
      setError('Failed to load previous race results');
    } finally {
      setLoading(false);
    }
  };

  const handleRaceClick = () => {
    if (previousRace && onRaceSelect) {
      onRaceSelect(previousRace.raceId);
    }
  };

  const getPositionIcon = (position: number) => {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return position;
  };

  const getPositionColor = (position: number) => {
    if (position === 1) return 'text-yellow-600 dark:text-yellow-400';
    if (position === 2) return 'text-gray-600 dark:text-gray-400';
    if (position === 3) return 'text-orange-600 dark:text-orange-400';
    return 'text-gray-900 dark:text-white';
  };

  const CardShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-md dark:border-slate-800 dark:bg-slate-950/70">
      <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex h-10 w-10 items-center justify-center text-purple-500">
          <Trophy className="w-5 h-5" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Previous Race</h2>
        {previousRace && (
          <button
            onClick={handleRaceClick}
            className="ml-auto inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            View Full
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );

  if (loading) {
    return (
      <CardShell>
        <div className="flex items-center justify-center py-6 text-sm text-slate-500 dark:text-slate-400">
          <Loader2 className="mr-3 h-5 w-5 animate-spin text-purple-500" />
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

  if (!previousRace) {
    return (
      <CardShell>
        <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
          No previous race results available yet.
        </p>
      </CardShell>
    );
  }

  return (
    <CardShell>
      <div className="mb-5 space-y-1.5">
        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          {new Date(previousRace.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{previousRace.raceName}</h3>
        {previousRace.circuit && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{previousRace.circuit}</p>
        )}
      </div>

      <div className="space-y-2">
        {(previousRace.drivers || []).slice(0, 5).map((driver) => {
          const teamLabel = driver.team || 'Unknown Team';
          const pointsLabel = driver.points ?? 0;

          return (
          <div
            key={`${driver.position}-${driver.name}`}
            className={clsx(
              'flex items-center justify-between rounded-2xl bg-white/45 px-3 py-2 backdrop-blur transition hover:bg-white/65 dark:bg-slate-800/60 dark:hover:bg-slate-800/75',
              driver.status && 'opacity-60',
            )}
          >
            <div className="flex items-center gap-3">
              <span className={clsx('text-sm 2xl:text-base font-semibold', getPositionColor(driver.position))}>
                {getPositionIcon(driver.position)}
              </span>
              <div className="flex items-center gap-2">
                <p className="text-sm 2xl:text-base font-semibold text-slate-900 dark:text-slate-100">{driver.name}</p>
                <span className="text-xs 2xl:text-sm font-medium text-slate-500 dark:text-slate-400">
                  {teamLabel}
                </span>
              </div>
              {driver.fastestLap && <Zap className="h-3.5 w-3.5 text-purple-500" />}
            </div>
            <div className="flex items-center gap-2 text-xs 2xl:text-sm font-medium text-slate-500 dark:text-slate-400">
              <span>{pointsLabel} pts</span>
            </div>
          </div>
        );
        })}

        {previousRace.drivers && previousRace.drivers.length > 5 && (
          <button
            onClick={handleRaceClick}
            className="w-full rounded-2xl border border-purple-200/50 py-2 text-sm font-semibold text-purple-600 transition hover:bg-purple-50/80 dark:border-white/10 dark:text-purple-300 dark:hover:bg-white/5"
          >
            +{previousRace.drivers.length - 5} more drivers
          </button>
        )}
      </div>
    </CardShell>
  );
};

