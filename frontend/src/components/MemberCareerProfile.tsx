import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, Zap, TrendingUp, Calendar, Flag, Loader2 } from 'lucide-react';
import { MemberCareerProfile, MemberCareerStats, RaceHistoryEntry } from '../types';
import { apiGet } from '../utils/api';

interface MemberCareerProfileProps {
  memberId: string;
  onBack: () => void;
  onRaceSelect?: (raceId: string) => void;
}

export const MemberCareerProfileComponent: React.FC<MemberCareerProfileProps> = ({ 
  memberId, 
  onBack, 
  onRaceSelect 
}) => {
  const [careerProfile, setCareerProfile] = useState<MemberCareerProfile | null>(null);
  const [raceHistory, setRaceHistory] = useState<RaceHistoryEntry[]>([]);
  const [seasonStats, setSeasonStats] = useState<MemberCareerStats | null>(null);
  const [activeTab, setActiveTab] = useState<'career' | string>('career');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMemberCareerProfile();
  }, [memberId]);

  useEffect(() => {
    if (careerProfile) {
      fetchRaceHistory();
      if (activeTab !== 'career') {
        fetchSeasonStats(activeTab);
      } else {
        setSeasonStats(null);
      }
    }
  }, [careerProfile, activeTab]);

  const fetchMemberCareerProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/members/${memberId}/career-profile`);
      
      if (response.ok) {
        const data = await response.json();
        setCareerProfile(data.careerProfile);
      } else {
        throw new Error('Failed to fetch member career profile');
      }
    } catch (error) {
      console.error('Error fetching member career profile:', error);
      setError('Failed to load member career profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchSeasonStats = async (seasonId: string) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/members/${memberId}/seasons/${seasonId}/stats`);
      
      if (response.ok) {
        const data = await response.json();
        setSeasonStats(data.stats);
      } else {
        console.error('Failed to fetch season stats');
        setSeasonStats(null);
      }
    } catch (error) {
      console.error('Error fetching season stats:', error);
      setSeasonStats(null);
    }
  };

  const fetchRaceHistory = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const seasonId = activeTab === 'career' ? undefined : activeTab;
      const url = seasonId 
        ? `${apiUrl}/api/members/${memberId}/race-history?seasonId=${seasonId}`
        : `${apiUrl}/api/members/${memberId}/race-history`;
      
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        setRaceHistory(data.raceHistory || []);
      }
    } catch (error) {
      console.error('Error fetching race history:', error);
      setRaceHistory([]);
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

  const handleRaceClick = (raceId: string) => {
    if (onRaceSelect) {
      onRaceSelect(raceId);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-16 h-16 mx-auto mb-4 text-purple-500 animate-spin" />
          <p className="text-xl text-gray-400">Loading career profile...</p>
        </div>
      </div>
    );
  }

  if (error || !careerProfile) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 text-xl">{error || 'Member not found'}</p>
        <button 
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  const { member, careerStats, seasons } = careerProfile;

  // Determine which stats to display based on active tab
  const currentStats = activeTab === 'career' ? careerStats : seasonStats;
  const statsTitle = activeTab === 'career' 
    ? 'Career Statistics' 
    : `${seasons.find(s => s.id === activeTab)?.name || 'Season'} Statistics`;

  return (
    <div className="p-6 bg-gray-100 dark:bg-gray-900 min-h-screen">
      <div className="max-w-[2048px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center space-x-2"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to History</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{member.name} - Career Profile</h1>
          <div className="w-10"></div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('career')}
              className={`py-2 px-4 text-lg font-medium ${
                activeTab === 'career'
                  ? 'text-purple-600 border-b-2 border-purple-600 dark:text-purple-400 dark:border-purple-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              Career
            </button>
            {seasons.map((season) => (
              <button
                key={season.id}
                onClick={() => setActiveTab(season.id)}
                className={`py-2 px-4 text-lg font-medium ${
                  activeTab === season.id
                    ? 'text-purple-600 border-b-2 border-purple-600 dark:text-purple-400 dark:border-purple-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                {season.name} ({season.year})
              </button>
            ))}
          </div>
        </div>

        {/* Statistics */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{statsTitle}</h2>
          {currentStats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 text-center">
                <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Wins</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{currentStats.wins}</p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 text-center">
                <Trophy className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Podiums</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{currentStats.podiums}</p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 text-center">
                <TrendingUp className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Points</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{(currentStats.points || 0).toLocaleString()}</p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 text-center">
                <Calendar className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Races</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{currentStats.seasons}</p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 text-center">
                <Flag className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pole Positions</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{currentStats.polePositions}</p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 text-center">
                <Zap className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Fastest Laps</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{currentStats.fastestLaps}</p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 text-center">
                <TrendingUp className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Finish</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{currentStats.averageFinish.toFixed(1)}</p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 text-center">
                <Trophy className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Best Finish</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{currentStats.bestFinish || 'N/A'}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 mx-auto mb-2 text-purple-500 animate-spin" />
              <p className="text-gray-500">Loading statistics...</p>
            </div>
          )}
        </div>

        {/* Race History */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Race History</h2>
          </div>
          <div className="p-6">
            {raceHistory.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No race history available</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Track
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Season/Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Position
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Points
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        FL
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {raceHistory.map((race) => (
                      <tr 
                        key={race.id} 
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                        onClick={() => handleRaceClick(race.id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{race.trackName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500 dark:text-gray-400">{race.seasonYear}</div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">{new Date(race.date).toLocaleDateString()}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-medium ${getPositionColor(race.position)}`}>
                            {getPositionIcon(race.position)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {race.points > 0 ? race.points : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {race.fastestLap ? (
                            <Zap className="w-4 h-4 text-purple-500" />
                          ) : (
                            <Zap className="w-4 h-4 text-gray-300" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
