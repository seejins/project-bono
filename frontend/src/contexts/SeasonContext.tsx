import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
      // TODO: Replace with actual API call
      // For now, using mock data with different years
      const mockSeasons: Season[] = [
        {
          id: 'season-2024',
          name: 'F1 Season 2024',
          year: 2024,
          status: 'active',
          start_date: '2024-01-01',
          end_date: '2024-12-31'
        },
        {
          id: 'season-2023',
          name: 'F1 Season 2023',
          year: 2023,
          status: 'completed',
          start_date: '2023-01-01',
          end_date: '2023-12-31'
        },
        {
          id: 'season-2025',
          name: 'F1 Season 2025',
          year: 2025,
          status: 'draft',
          start_date: '2025-01-01'
        }
      ];
      
      setSeasons(mockSeasons);
      
      // Set current season from localStorage or default to active season
      const savedSeasonId = localStorage.getItem('f1-current-season-id');
      const activeSeason = mockSeasons.find(s => s.status === 'active');
      const savedSeason = savedSeasonId ? mockSeasons.find(s => s.id === savedSeasonId) : null;
      
      setCurrentSeason(savedSeason || activeSeason || mockSeasons[0]);
    } catch (error) {
      console.error('Error fetching seasons:', error);
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
