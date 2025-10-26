import React, { useState, useEffect } from 'react';
import { Users, Trophy, Award, Clock, ChevronRight } from 'lucide-react';
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
  consistency: number; // percentage of races finished in points
}

interface DriverListProps {
  onDriverSelect?: (driverId: string) => void;
}

export const DriverList: React.FC<DriverListProps> = ({ onDriverSelect }) => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'position' | 'points' | 'wins' | 'name'>('position');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { currentSeason } = useSeason();

  useEffect(() => {
    if (currentSeason) {
      fetchDrivers();
    }
  }, [currentSeason]);

  const fetchDrivers = async () => {
    if (!currentSeason) return;
    
    try {
      // Different mock data for each season
      const getSeasonDrivers = (seasonId: string): Driver[] => {
        switch (seasonId) {
          case 'season-2024':
            return [
              {
                id: '1',
                name: 'Lewis Hamilton',
                team: 'Mercedes',
                number: 44,
                seasonId: currentSeason.id,
                points: 95,
                wins: 3,
                podiums: 8,
                fastestLaps: 2,
                position: 1,
                dnf: 0,
                averageFinish: 2.1,
                consistency: 100
              },
              {
                id: '2',
                name: 'Max Verstappen',
                team: 'Red Bull Racing',
                number: 1,
                seasonId: currentSeason.id,
                points: 87,
                wins: 2,
                podiums: 7,
                fastestLaps: 3,
                position: 2,
                dnf: 1,
                averageFinish: 2.8,
                consistency: 95
              },
              {
                id: '3',
                name: 'Charles Leclerc',
                team: 'Ferrari',
                number: 16,
                seasonId: currentSeason.id,
                points: 78,
                wins: 1,
                podiums: 6,
                fastestLaps: 1,
                position: 3,
                dnf: 0,
                averageFinish: 3.2,
                consistency: 100
              },
              {
                id: '4',
                name: 'Lando Norris',
                team: 'McLaren',
                number: 4,
                seasonId: currentSeason.id,
                points: 65,
                wins: 1,
                podiums: 4,
                fastestLaps: 2,
                position: 4,
                dnf: 0,
                averageFinish: 4.1,
                consistency: 90
              },
              {
                id: '5',
                name: 'Carlos Sainz',
                team: 'Ferrari',
                number: 55,
                seasonId: currentSeason.id,
                points: 58,
                wins: 0,
                podiums: 3,
                fastestLaps: 1,
                position: 5,
                dnf: 1,
                averageFinish: 4.8,
                consistency: 85
              }
            ];
          
          case 'season-2023':
            return [
              {
                id: '1',
                name: 'Max Verstappen',
                team: 'Red Bull Racing',
                number: 1,
                seasonId: currentSeason.id,
                points: 575,
                wins: 19,
                podiums: 21,
                fastestLaps: 9,
                position: 1,
                dnf: 0,
                averageFinish: 1.2,
                consistency: 100
              },
              {
                id: '2',
                name: 'Sergio Perez',
                team: 'Red Bull Racing',
                number: 11,
                seasonId: currentSeason.id,
                points: 285,
                wins: 2,
                podiums: 9,
                fastestLaps: 2,
                position: 2,
                dnf: 2,
                averageFinish: 4.8,
                consistency: 90
              },
              {
                id: '3',
                name: 'Lewis Hamilton',
                team: 'Mercedes',
                number: 44,
                seasonId: currentSeason.id,
                points: 234,
                wins: 0,
                podiums: 6,
                fastestLaps: 1,
                position: 3,
                dnf: 0,
                averageFinish: 5.2,
                consistency: 100
              },
              {
                id: '4',
                name: 'Fernando Alonso',
                team: 'Aston Martin',
                number: 14,
                seasonId: currentSeason.id,
                points: 206,
                wins: 0,
                podiums: 8,
                fastestLaps: 0,
                position: 4,
                dnf: 1,
                averageFinish: 6.1,
                consistency: 95
              },
              {
                id: '5',
                name: 'Charles Leclerc',
                team: 'Ferrari',
                number: 16,
                seasonId: currentSeason.id,
                points: 206,
                wins: 0,
                podiums: 5,
                fastestLaps: 2,
                position: 5,
                dnf: 2,
                averageFinish: 6.8,
                consistency: 85
              }
            ];
          
          case 'season-2025':
            return [
              {
                id: '1',
                name: 'Lewis Hamilton',
                team: 'Ferrari',
                number: 44,
                seasonId: currentSeason.id,
                points: 0,
                wins: 0,
                podiums: 0,
                fastestLaps: 0,
                position: 1,
                dnf: 0,
                averageFinish: 0,
                consistency: 0
              },
              {
                id: '2',
                name: 'Max Verstappen',
                team: 'Red Bull Racing',
                number: 1,
                seasonId: currentSeason.id,
                points: 0,
                wins: 0,
                podiums: 0,
                fastestLaps: 0,
                position: 2,
                dnf: 0,
                averageFinish: 0,
                consistency: 0
              },
              {
                id: '3',
                name: 'Charles Leclerc',
                team: 'Ferrari',
                number: 16,
                seasonId: currentSeason.id,
                points: 0,
                wins: 0,
                podiums: 0,
                fastestLaps: 0,
                position: 3,
                dnf: 0,
                averageFinish: 0,
                consistency: 0
              }
            ];
          
          default:
            return [];
        }
      };
      
      const seasonDrivers = getSeasonDrivers(currentSeason.id);
      setDrivers(seasonDrivers);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      setLoading(false);
    }
  };

  const sortedDrivers = [...drivers].sort((a, b) => {
    switch (sortBy) {
      case 'points':
        return b.points - a.points;
      case 'wins':
        return b.wins - a.wins;
      case 'name':
        return a.name.localeCompare(b.name);
      case 'position':
      default:
        return a.position - b.position;
    }
  });

  const getTeamColor = (team: string) => {
    const colors: { [key: string]: string } = {
      'Mercedes': 'text-cyan-400',
      'Red Bull Racing': 'text-blue-500',
      'Ferrari': 'text-red-600',
      'McLaren': 'text-orange-500',
      'Aston Martin': 'text-green-500',
      'Alpine': 'text-pink-500',
      'RB': 'text-gray-400',
      'Sauber': 'text-red-400',
      'Haas': 'text-gray-500',
      'Williams': 'text-blue-400'
    };
    return colors[team] || 'text-gray-500';
  };

  const getPositionColor = (position: number) => {
    if (position === 1) return 'text-yellow-500';
    if (position === 2) return 'text-gray-400';
    if (position === 3) return 'text-orange-500';
    return 'text-gray-600 dark:text-gray-400';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-400 animate-pulse" />
          <p className="text-xl text-gray-400">Loading drivers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Drivers</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Sort Options */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="position">Position</option>
            <option value="points">Points</option>
            <option value="wins">Wins</option>
            <option value="name">Name</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                viewMode === 'grid' ? 'bg-red-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                viewMode === 'list' ? 'bg-red-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Drivers Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedDrivers.map((driver) => (
            <div
              key={driver.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm cursor-pointer hover:shadow-lg transition-all"
              onClick={() => onDriverSelect?.(driver.id)}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                    <span className="text-lg font-bold text-gray-700 dark:text-gray-300">
                      {driver.number}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{driver.name}</h3>
                    <p className={`text-sm ${getTeamColor(driver.team)}`}>{driver.team}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Championship Position</span>
                  <span className={`text-lg font-bold ${getPositionColor(driver.position)}`}>
                    #{driver.position}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                    <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                      <Trophy className="w-4 h-4" />
                      <span className="text-sm font-semibold">{driver.points} pts</span>
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                    <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                      <Award className="w-4 h-4" />
                      <span className="text-sm font-semibold">{driver.wins}W</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-500 dark:text-gray-400">Podiums</span>
                    <span className="text-gray-900 dark:text-white">{driver.podiums}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-500 dark:text-gray-400">Fastest Laps</span>
                    <span className="text-gray-900 dark:text-white">{driver.fastestLaps}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Consistency</span>
                    <span className="text-gray-900 dark:text-white">{driver.consistency}%</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Consistency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {sortedDrivers.map((driver) => (
                  <tr key={driver.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" onClick={() => onDriverSelect?.(driver.id)}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-lg font-bold ${getPositionColor(driver.position)}`}>
                        #{driver.position}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center mr-3">
                          <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                            {driver.number}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{driver.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${getTeamColor(driver.team)}`}>
                      {driver.team}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900 dark:text-white">
                      {driver.points}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">
                      {driver.wins}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">
                      {driver.podiums}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">
                      {driver.fastestLaps}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">
                      {driver.consistency}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};