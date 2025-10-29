import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, TrendingDown, Minus, Zap, Flag, Users, Target } from 'lucide-react';
import { useSeason } from '../contexts/SeasonContext';

interface Driver {
  id: string;
  name: string;
  team: string;
  number: number;
  seasonId: string;
  points: number;
  wins: number;
  podiums: number;
  fastestLaps: number;
  position: number;
  dnf: number;
  averageFinish: number;
  consistency: number;
}

interface DriverListProps {
  onDriverSelect?: (driverId: string) => void;
}

export const DriverList: React.FC<DriverListProps> = ({ onDriverSelect }) => {
  const { currentSeason } = useSeason();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentSeason) {
      fetchDrivers();
    }
  }, [currentSeason]);

  const fetchDrivers = async () => {
    if (!currentSeason) return;
    
    try {
      setLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      
      // Fetch drivers for the current season
      const response = await fetch(`${apiUrl}/api/seasons/${currentSeason.id}/drivers`);
      if (response.ok) {
        const data = await response.json();
        setDrivers(data.drivers || []);
      }
      
    } catch (error) {
      console.error('Error fetching drivers:', error);
      setError('Failed to load drivers');
      setDrivers([]);
    } finally {
      setLoading(false);
    }
  };

  const getTeamColor = (team: string) => {
    const colors: { [key: string]: string } = {
      'Mercedes': 'bg-teal-500',
      'Red Bull Racing': 'bg-blue-500',
      'Ferrari': 'bg-red-500',
      'McLaren': 'bg-orange-500',
      'Aston Martin': 'bg-green-500',
      'Alpine': 'bg-pink-500',
      'Williams': 'bg-blue-600',
      'AlphaTauri': 'bg-gray-500',
      'Alfa Romeo': 'bg-red-600',
      'Haas': 'bg-gray-600'
    };
    return colors[team] || 'bg-gray-400';
  };

  const getPositionColor = (position: number) => {
    if (position === 1) return 'bg-yellow-500 text-white';
    if (position === 2) return 'bg-gray-400 text-white';
    if (position === 3) return 'bg-amber-600 text-white';
    return 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
  };

  const getPositionChange = (currentPosition: number, previousPosition?: number) => {
    if (!previousPosition) return <Minus className="w-4 h-4 text-gray-400" />;
    
    if (currentPosition < previousPosition) {
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    } else if (currentPosition > previousPosition) {
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    } else {
      return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading drivers...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">{error}</div>
        </div>
    );
  }

  if (!currentSeason) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">No season selected</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Drivers</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{currentSeason.name}</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <Users className="w-4 h-4" />
            <span>{drivers.length} drivers</span>
          </div>
        </div>
      </div>

      {/* Drivers Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Position</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Driver</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Team</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Points</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Wins</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Podiums</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fastest Laps</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Avg Finish</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Consistency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {drivers.map((driver) => (
                <tr 
                  key={driver.id} 
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  onClick={() => onDriverSelect?.(driver.id)}
                >
                    <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getPositionColor(driver.position)}`}>
                      {driver.position}
                    </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-sm font-bold text-gray-700 dark:text-gray-300 mr-3">
                            {driver.number}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{driver.name}</div>
                        </div>
                      </div>
                    </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2 ${getTeamColor(driver.team)}`}></div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{driver.team}</span>
                    </div>
                    </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {driver.points}
                    </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    <div className="flex items-center space-x-1">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      <span>{driver.wins}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    <div className="flex items-center space-x-1">
                      <Flag className="w-4 h-4 text-gray-500" />
                      <span>{driver.podiums}</span>
                    </div>
                    </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    <div className="flex items-center space-x-1">
                      <Zap className="w-4 h-4 text-purple-500" />
                      <span>{driver.fastestLaps}</span>
                    </div>
                    </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    <div className="flex items-center space-x-1">
                      <Target className="w-4 h-4 text-blue-500" />
                      <span>{driver.averageFinish.toFixed(1)}</span>
                    </div>
                    </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ width: `${driver.consistency}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{driver.consistency}%</span>
                    </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      </div>

      {drivers.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No drivers found</h3>
          <p className="text-gray-500 dark:text-gray-400">No drivers have been added to this season yet.</p>
        </div>
      )}
    </div>
  );
};