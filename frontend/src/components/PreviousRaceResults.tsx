import React, { useState, useEffect } from 'react';
import { Zap, Trophy, ChevronRight, Loader2 } from 'lucide-react';
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

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-purple-500 animate-spin mr-2" />
          <span className="text-gray-500 dark:text-gray-400">Loading previous race...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <p className="text-red-500 text-center">{error}</p>
      </div>
    );
  }

  if (!previousRace) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Previous Race</h3>
        <p className="text-gray-500 dark:text-gray-400 text-center py-4">No previous race results available</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Previous Race</h3>
        <button
          onClick={handleRaceClick}
          className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 flex items-center space-x-1"
        >
          <span className="text-sm">View Full</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      
      <div className="mb-4">
        <h4 className="font-medium text-gray-900 dark:text-white">{previousRace.raceName}</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(previousRace.date).toLocaleDateString()}</p>
      </div>

      <div className="space-y-2">
        {(previousRace.drivers || []).slice(0, 5).map((driver) => (
          <div 
            key={driver.position}
            className={`flex items-center justify-between py-2 px-3 rounded-lg ${
              driver.status ? 'opacity-40' : ''
            }`}
          >
            <div className="flex items-center space-x-3">
              <span className={`text-sm font-medium ${getPositionColor(driver.position)}`}>
                {getPositionIcon(driver.position)}
              </span>
              <span className="text-sm text-gray-900 dark:text-white">{driver.name}</span>
              {driver.fastestLap && (
                <Zap className="w-3 h-3 text-purple-500" />
              )}
            </div>
            <div className="flex items-center space-x-2">
              {driver.points > 0 && (
                <span className="text-sm text-gray-600 dark:text-gray-400">{driver.points}pts</span>
              )}
              {driver.status && (
                <span className="text-xs text-gray-500 dark:text-gray-400">{driver.status}</span>
              )}
            </div>
          </div>
        ))}
        
        {previousRace.drivers && previousRace.drivers.length > 5 && (
          <div className="text-center pt-2">
            <button
              onClick={handleRaceClick}
              className="text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
            >
              +{previousRace.drivers.length - 5} more drivers
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

