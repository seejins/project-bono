import React, { useState, useEffect } from 'react';
import { Award, Trophy, ChevronRight } from 'lucide-react';

interface Driver {
  id: string;
  name: string;
  wins: number;
  poles: number;
  points: number;
  seasons: number;
  bestFinish: number;
  championships: number;
}

interface CareerListProps {
  onDriverSelect?: (driverId: string) => void;
}

export const CareerList: React.FC<CareerListProps> = ({ onDriverSelect }) => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'wins' | 'poles' | 'points' | 'championships' | 'name'>('wins');

  useEffect(() => {
    fetchCareerStats();
  }, []);

  const fetchCareerStats = async () => {
    try {
      setLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/members`);
      const data = await response.json();
      
      if (data.success && data.members) {
        // Transform members to Driver format with mock career stats for now
        const careerDrivers = data.members.map((member: any) => ({
          id: member.id,
          name: member.name,
          wins: Math.floor(Math.random() * 15) + 1, // Mock wins
          poles: Math.floor(Math.random() * 10) + 1, // Mock poles
          points: Math.floor(Math.random() * 1000) + 200, // Mock points
          seasons: Math.floor(Math.random() * 3) + 1, // Mock seasons
          bestFinish: Math.floor(Math.random() * 5) + 1, // Mock best finish
          championships: Math.floor(Math.random() * 3) // Mock championships
        }));
        
        setDrivers(careerDrivers);
      } else {
        console.warn('No members found');
        setDrivers([]);
      }
    } catch (error) {
      console.error('Failed to load career stats:', error);
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
      case 'poles':
        return b.poles - a.poles;
      case 'championships':
        return b.championships - a.championships;
      case 'name':
        return a.name.localeCompare(b.name);
      case 'wins':
      default:
        return b.wins - a.wins;
    }
  });

  const getTrophyDisplay = (championships: number) => {
    if (championships > 0) {
      return '🏆'.repeat(Math.min(championships, 3)); // Max 3 trophies
    }
    return '';
  };

  const getBestFinishText = (bestFinish: number) => {
    if (bestFinish === 1) return '1st';
    if (bestFinish === 2) return '2nd';
    if (bestFinish === 3) return '3rd';
    return `${bestFinish}th`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Award className="w-16 h-16 mx-auto mb-4 text-gray-400 animate-pulse" />
          <p className="text-xl text-gray-400">Loading career statistics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
            <Award className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Career Statistics</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Sort Options */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="wins">Wins</option>
            <option value="poles">Poles</option>
            <option value="points">Points</option>
            <option value="championships">Championships</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      {/* Career Stats Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Driver</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Wins</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Poles</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Points</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Seasons</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Best</th>
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
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {driver.name}
                        </div>
                      </div>
                      {driver.championships > 0 && (
                        <span className="ml-2 text-lg">
                          {getTrophyDisplay(driver.championships)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900 dark:text-white">
                    {driver.wins}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">
                    {driver.poles}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">
                    {driver.points.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">
                    {driver.seasons}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">
                    {getBestFinishText(driver.bestFinish)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
