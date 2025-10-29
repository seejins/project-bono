import React, { useState, useEffect } from 'react';
import { Plus, Calendar } from 'lucide-react';
import { CreateSeason } from './CreateSeason';
import { SeasonDetail } from './SeasonDetail';

interface Driver {
  id: string;
  name: string;
  team: string;
  number: number;
}

interface Track {
  id: string;
  name: string;
  country: string;
  length: number;
  laps: number;
}

interface Race {
  id: string;
  trackId: string;
  trackName: string;
  date: string;
  time: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  type: 'race' | 'qualifying' | 'practice' | 'sprint';
}

export interface Season {
  id: string;
  name: string;
  year: number;
  startDate: string;
  endDate: string;
  pointsSystem: 'f1_standard' | 'custom';
  fastestLapPoint: boolean;
  drivers: Driver[];
  tracks: Track[];
  races: Race[];
  isActive: boolean;
}

interface SeasonManagementProps {
  onSeasonSelect?: (seasonId: string) => void;
}

export const SeasonManagement: React.FC<SeasonManagementProps> = ({ onSeasonSelect }) => {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [showCreateSeason, setShowCreateSeason] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [viewSelectedSeason, setViewSelectedSeason] = useState(false);

  // Fetch seasons from API
  useEffect(() => {
    fetchSeasons();
  }, []);

  const fetchSeasons = async () => {
    try {
      setLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      
      const response = await fetch(`${apiUrl}/api/seasons`);
      if (response.ok) {
        const data = await response.json();
        setSeasons(data.seasons || []);
      }
      
    } catch (error) {
      console.error('Error fetching seasons:', error);
      setSeasons([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSeason = (season: Season) => {
    setSeasons([...seasons, season]);
    setShowCreateSeason(false);
    // Navigate to the new season's detail page
    setSelectedSeason(season);
    setViewSelectedSeason(true);
  };

  const handleSeasonSelect = (season: Season) => {
    setSelectedSeason(season);
    setViewSelectedSeason(true);
  };

  const handleUpdateSeason = (updatedSeason: Season) => {
    setSeasons(seasons.map(s => s.id === updatedSeason.id ? updatedSeason : s));
    setSelectedSeason(updatedSeason);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {showCreateSeason ? (
        <CreateSeason 
          onBack={() => setShowCreateSeason(false)}
          onSave={handleCreateSeason}
        />
      ) : viewSelectedSeason && selectedSeason ? (
        <SeasonDetail 
          season={selectedSeason}
          onBack={() => setViewSelectedSeason(false)}
          onUpdate={handleUpdateSeason}
        />
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="w-6 h-6 text-red-600 dark:text-blue-400" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Season Management</h1>
            </div>
            <button
              onClick={() => setShowCreateSeason(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Season</span>
            </button>
          </div>

          {/* Seasons List */}
          <div className="space-y-4">
            {seasons.map((season) => (
              <div 
                key={season.id} 
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                onClick={() => handleSeasonSelect(season)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${season.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{season.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {season.startDate && season.endDate && formatDate(season.startDate) !== 'Not set' && formatDate(season.endDate) !== 'Not set'
                          ? `${formatDate(season.startDate)} - ${formatDate(season.endDate)}`
                          : `Season ${season.year}`
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{season.drivers.length}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Drivers</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{season.tracks.length}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Tracks</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{season.races.length}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Events</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {season.races.filter(r => r.status === 'completed').length}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Completed</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {seasons.length === 0 && (
              <div className="text-center py-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500 dark:text-gray-400">No seasons created yet. Create your first season to get started!</p>
              </div>
            )}
          </div>

        </>
      )}
    </div>
  );
};
