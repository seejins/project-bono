import React, { useState, useEffect } from 'react';
import { Users, Trophy, Award, Clock, ChevronRight } from 'lucide-react';

interface Driver {
  id: string;
  name: string;
  team: string;
  number: number;
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

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      // TODO: Replace with actual API call
      // For now, using mock data
      const mockDrivers: Driver[] = [
        {
          id: '1',
          name: 'Lewis Hamilton',
          team: 'Mercedes',
          number: 44,
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
          team: 'Red Bull',
          number: 1,
          points: 87,
          wins: 2,
          podiums: 7,
          fastestLaps: 3,
          position: 2,
          dnf: 1,
          averageFinish: 2.8,
          consistency: 87
        },
        {
          id: '3',
          name: 'Charles Leclerc',
          team: 'Ferrari',
          number: 16,
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
          points: 65,
          wins: 1,
          podiums: 4,
          fastestLaps: 1,
          position: 4,
          dnf: 1,
          averageFinish: 4.1,
          consistency: 87
        },
        {
          id: '5',
          name: 'Carlos Sainz',
          team: 'Ferrari',
          number: 55,
          points: 58,
          wins: 0,
          podiums: 3,
          fastestLaps: 0,
          position: 5,
          dnf: 1,
          averageFinish: 5.3,
          consistency: 75
        }
      ];

      setDrivers(mockDrivers);
    } catch (error) {
      console.error('Error fetching drivers:', error);
    } finally {
      setLoading(false);
    }
  };

  const sortedDrivers = [...drivers].sort((a, b) => {
    switch (sortBy) {
      case 'position':
        return a.position - b.position;
      case 'points':
        return b.points - a.points;
      case 'wins':
        return b.wins - a.wins;
      case 'name':
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  const getPositionColor = (position: number) => {
    switch (position) {
      case 1: return 'text-yellow-400';
      case 2: return 'text-gray-300';
      case 3: return 'text-amber-600';
      default: return 'text-gray-400';
    }
  };

  const getTeamColor = (team: string) => {
    const teamColors: { [key: string]: string } = {
      'Mercedes': 'text-cyan-400',
      'Red Bull': 'text-blue-400',
      'Ferrari': 'text-red-400',
      'McLaren': 'text-orange-400',
      'Aston Martin': 'text-green-400',
      'Alpine': 'text-pink-400',
      'AlphaTauri': 'text-white',
      'Alfa Romeo': 'text-red-300',
      'Haas': 'text-gray-300',
      'Williams': 'text-blue-300'
    };
    return teamColors[team] || 'text-gray-400';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
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
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      driver.position === 1 ? 'position-1' :
                      driver.position === 2 ? 'position-2' :
                      driver.position === 3 ? 'position-3' :
                      'bg-gray-600 text-white'
                    }`}>
                      {driver.position}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{driver.name}</h3>
                      <p className={`text-sm ${getTeamColor(driver.team)}`}>{driver.team}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">Points</span>
                    <span className="text-xl font-bold text-gray-900 dark:text-white">{driver.points}</span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="flex items-center justify-center space-x-1 text-yellow-600">
                        <Trophy className="w-4 h-4" />
                        <span className="text-sm font-semibold">{driver.wins}</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Wins</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center space-x-1 text-green-600">
                        <Award className="w-4 h-4" />
                        <span className="text-sm font-semibold">{driver.podiums}</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Podiums</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center space-x-1 text-purple-600">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-semibold">{driver.fastestLaps}</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">FL</p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Avg Finish</span>
                      <span className="text-gray-900 dark:text-white">{driver.averageFinish.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Consistency</span>
                      <span className="text-gray-900 dark:text-white">{driver.consistency}%</span>
                    </div>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Avg Finish</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {sortedDrivers.map((driver) => (
                  <tr
                    key={driver.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => onDriverSelect?.(driver.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-lg font-bold ${getPositionColor(driver.position)}`}>
                        {driver.position}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-600 flex items-center justify-center">
                            <span className="text-sm font-medium text-white">#{driver.number}</span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-white">{driver.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm ${getTeamColor(driver.team)}`}>{driver.team}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-white">{driver.points}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-400">{driver.wins}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-400">{driver.podiums}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-400">{driver.fastestLaps}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{driver.averageFinish.toFixed(1)}</td>
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
