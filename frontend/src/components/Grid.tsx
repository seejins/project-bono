import React, { useState, useEffect } from 'react';
import { Users, Trophy, Award, ChevronRight } from 'lucide-react';
import { useSeason } from '../contexts/SeasonContext';
import { F123DataService } from '../services/F123DataService';

interface Driver {
  id: string;
  name: string;
  team: string;
  teamColorClass: string;
  teamColorHex: string;
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

export const Grid: React.FC<DriverListProps> = ({ onDriverSelect }) => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'position' | 'points' | 'wins' | 'name'>('position');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list'); // Changed default to list
  const { currentSeason } = useSeason();

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
      const response = await fetch(`${apiUrl}/api/seasons/${currentSeason.id}/participants`);
      const data = await response.json();
      
      if (data.success && data.participants) {
        // Transform participants to Driver format with real stats from API
        const driversWithStats = await Promise.all(data.participants.map(async (participant: any, index: number) => {
          // Fetch real stats for this driver
          const statsResponse = await fetch(`${apiUrl}/api/drivers/${participant.id}/seasons/${currentSeason.id}/stats`);
          let stats = {
            points: 0,
            wins: 0,
            podiums: 0,
            fastestLaps: 0,
            dnf: 0,
            averageFinish: 0,
            consistency: 0
          };

          if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            stats = statsData.stats || stats;
          } else if (statsResponse.status !== 404) {
            console.warn(`Failed to load stats for driver ${participant.id}:`, statsResponse.statusText);
          }
          
          const teamSource = participant.team && participant.team !== 'TBD' ? participant.team : undefined;
          const canonicalTeam = teamSource
            ? F123DataService.getTeamDisplayName(teamSource)
            : 'TBD';
          const teamColorClass = teamSource
            ? F123DataService.getTeamColor(teamSource)
            : 'text-gray-500 dark:text-gray-400';
          const teamColorHex = teamSource
            ? F123DataService.getTeamColorHex(teamSource)
            : '#9CA3AF';

          return {
            id: participant.id,
            name: participant.name,
            team: canonicalTeam,
            teamColorClass,
            teamColorHex,
            number: participant.number || (index + 1),
            seasonId: currentSeason.id,
            points: stats.points,
            wins: stats.wins,
            podiums: stats.podiums,
            fastestLaps: stats.fastestLaps,
            position: index + 1,
            dnf: stats.dnf,
            averageFinish: stats.averageFinish,
            consistency: stats.consistency
          };
        }));
        
        // Sort by points to get correct championship order
        const sortedDrivers = driversWithStats.sort((a: any, b: any) => b.points - a.points);
        
        // Update positions based on sorted order
        const finalDrivers = sortedDrivers.map((driver: any, index: number) => ({
          ...driver,
          position: index + 1
        }));
        
        setDrivers(finalDrivers);
      } else {
        console.warn('No participants found for season');
        setDrivers([]);
      }
    } catch (error) {
      console.error('Failed to load season drivers:', error);
      // Fallback to empty array
      setDrivers([]);
    } finally {
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
    <div className="max-w-[2048px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Grid</h1>
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

          {/* View Mode Toggle - List first, Grid second */}
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                viewMode === 'list' ? 'bg-red-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                viewMode === 'grid' ? 'bg-red-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Grid
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
                    <p className={`text-sm ${driver.teamColorClass}`}>{driver.team}</p>
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
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${driver.teamColorClass}`}>
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