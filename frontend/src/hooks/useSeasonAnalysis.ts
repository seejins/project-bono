import { useEffect, useMemo, useState } from 'react';

export interface SeasonAnalysisHighlight {
  id: string;
  name: string;
  team: string | null;
  value: number;
}

export interface DriverSeasonSummary {
  id: string;
  name: string;
  team: string | null;
  number: number | null;
  points: number;
  wins: number;
  podiums: number;
  polePositions: number;
  fastestLaps: number;
  averageFinish: number;
  totalRaces: number;
  dnfs: number;
  pointsFinishes: number;
  consistency: number;
  position: number | null;
  recentResults: Array<{
    raceId: string;
    trackName: string;
    date: string | null;
    position: number | null;
    points: number;
    gridPosition: number | null;
    fastestLap: boolean;
    resultStatus: number | null;
  }>;
}

export interface SeasonEventSummary {
  id: string;
  trackName: string;
  raceDate: string | null;
  status: string;
  sessionTypes: string | null;
  track?: {
    id?: string;
    name?: string;
    country?: string;
    length?: number;
  } | null;
}

export interface SeasonAnalysis {
  season: {
    id: string;
    name: string;
    year: number;
    status: string;
  };
  summary: {
    totalEvents: number;
    completedEvents: number;
    upcomingEvents: number;
    highlights: {
      mostWins: SeasonAnalysisHighlight | null;
      mostPodiums: SeasonAnalysisHighlight | null;
      mostPoles: SeasonAnalysisHighlight | null;
      mostFastestLaps: SeasonAnalysisHighlight | null;
      bestAverageFinish: SeasonAnalysisHighlight | null;
      bestConsistency: SeasonAnalysisHighlight | null;
      [key: string]: SeasonAnalysisHighlight | null;
    };
  };
  drivers: DriverSeasonSummary[];
  events: {
    all: SeasonEventSummary[];
    completed: SeasonEventSummary[];
    upcoming: SeasonEventSummary[];
  };
  nextEvent: SeasonEventSummary | null;
  previousRace: any;
}

interface UseSeasonAnalysisResult {
  analysis: SeasonAnalysis | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useSeasonAnalysis(seasonId?: string): UseSeasonAnalysisResult {
  const [analysis, setAnalysis] = useState<SeasonAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchAnalysis = async () => {
      if (!seasonId) {
        setAnalysis(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const response = await fetch(`${apiUrl}/api/seasons/${seasonId}/analysis`);

        if (!response.ok) {
          if (response.status === 404) {
            if (!cancelled) {
              setAnalysis(null);
              setError('Season analysis not available');
            }
            return;
          }

          throw new Error(`Failed to load season analysis (${response.status})`);
        }

        const payload = await response.json();
        if (!cancelled) {
          setAnalysis(payload.analysis ?? null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load season analysis');
          setAnalysis(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchAnalysis();

    return () => {
      cancelled = true;
    };
  }, [seasonId, refreshToken]);

  const result = useMemo(
    () => ({
      analysis,
      loading,
      error,
      refresh: () => setRefreshToken((token) => token + 1),
    }),
    [analysis, loading, error],
  );

  return result;
}

