import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getApiUrl } from '../utils/api';

interface Season {
  id: string;
  name: string;
  year: number;
  status: 'active' | 'completed' | 'draft';
  start_date: string;
  end_date?: string;
}

interface SeasonContextType {
  currentSeason: Season | null;
  seasons: Season[];
  setCurrentSeason: (season: Season) => void;
  refreshSeasons: () => Promise<void>;
  loading: boolean;
}

const SeasonContext = createContext<SeasonContextType | undefined>(undefined);

interface SeasonProviderProps {
  children: ReactNode;
}

export const SeasonProvider: React.FC<SeasonProviderProps> = ({ children }) => {
  const [currentSeason, setCurrentSeason] = useState<Season | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSeasons = async () => {
    try {
      setLoading(true);
      
      // Make actual API call to fetch seasons
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/seasons`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch seasons: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.seasons) {
        // Transform the API response to match our Season interface
        const apiSeasons: Season[] = data.seasons.map((season: any) => ({
          id: season.id,
          name: season.name,
          year: season.year,
          status: season.status || 'draft',
          start_date: season.startDate || season.start_date,
          end_date: season.endDate || season.end_date
        }));
        
        setSeasons(apiSeasons);
        
        // Set current season: prioritize active season from database, then saved from localStorage
        const savedSeasonId = localStorage.getItem('f1-current-season-id');
        const activeSeason = apiSeasons.find(s => s.status === 'active');
        const savedSeason = savedSeasonId ? apiSeasons.find(s => s.id === savedSeasonId) : null;
        
        // If there's an active season and it differs from current, use the active one
        // This ensures that when an admin activates a season, it becomes the current season
        // Otherwise, use saved season (if it exists), or active season, or first season
        const newCurrentSeason = activeSeason || savedSeason || apiSeasons[0];
        
        // Update localStorage if we're switching to a newly activated season
        if (activeSeason && activeSeason.id !== savedSeasonId) {
          localStorage.setItem('f1-current-season-id', activeSeason.id);
        }
        
        setCurrentSeason(newCurrentSeason);
      } else {
        console.error('Invalid API response:', data);
        // Fallback to empty array if API fails
        setSeasons([]);
        setCurrentSeason(null);
      }
    } catch (error) {
      console.error('Error fetching seasons:', error);
      // Fallback to empty array if API fails
      setSeasons([]);
      setCurrentSeason(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshSeasons = async () => {
    await fetchSeasons();
  };

  const handleSetCurrentSeason = (season: Season) => {
    setCurrentSeason(season);
    localStorage.setItem('f1-current-season-id', season.id);
  };

  useEffect(() => {
    fetchSeasons();
  }, []);

  const value: SeasonContextType = {
    currentSeason,
    seasons,
    setCurrentSeason: handleSetCurrentSeason,
    refreshSeasons,
    loading
  };

  return (
    <SeasonContext.Provider value={value}>
      {children}
    </SeasonContext.Provider>
  );
};

export const useSeason = (): SeasonContextType => {
  const context = useContext(SeasonContext);
  if (context === undefined) {
    throw new Error('useSeason must be used within a SeasonProvider');
  }
  return context;
};
