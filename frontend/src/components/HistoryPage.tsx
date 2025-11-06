import React, { useState, useEffect } from 'react';
import { Trophy, Users, Calendar, Flag, Zap, TrendingUp, ChevronRight, Loader2 } from 'lucide-react';
import { HistoricInsights, SeasonSummary, MemberCareerProfile } from '../types';
import { apiGet } from '../utils/api';

interface HistoryPageProps {
  onSeasonSelect?: (seasonId: string) => void;
  onDriverSelect?: (driverId: string) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ onSeasonSelect, onDriverSelect }) => {
  const [insights, setInsights] = useState<HistoricInsights | null>(null);
  const [seasons, setSeasons] = useState<SeasonSummary[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHistoryData();
  }, []);

  const fetchHistoryData = async () => {
    try {
      setLoading(true);
      setError(null);

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

      // Fetch historic insights
      const insightsResponse = await fetch(`${apiUrl}/api/seasons/history/insights`);
      if (insightsResponse.ok) {
        const insightsData = await insightsResponse.json();
        setInsights(insightsData.insights);
      }

      // Fetch seasons history
      const seasonsResponse = await fetch(`${apiUrl}/api/seasons/history`);
      if (seasonsResponse.ok) {
        const seasonsData = await seasonsResponse.json();
        setSeasons(seasonsData.seasons || []);
      }

      // Fetch drivers (we'll need to create a career stats endpoint for drivers)
      // For now, just fetch all drivers
      const driversResponse = await fetch(`${apiUrl}/api/drivers`);
      if (driversResponse.ok) {
        const driversData = await driversResponse.json();
        setDrivers(driversData.drivers || []);
      }

    } catch (error) {
      console.error('Error fetching history data:', error);
      setError('Failed to load history data');
    } finally {
      setLoading(false);
    }
  };

  const handleSeasonClick = (seasonId: string) => {
    if (onSeasonSelect) {
      onSeasonSelect(seasonId);
    }
  };

  const handleDriverClick = (driverId: string) => {
    if (onDriverSelect) {
      onDriverSelect(driverId);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-16 h-16 mx-auto mb-4 text-purple-500 animate-spin" />
          <p className="text-xl text-gray-400">Loading history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 text-xl">{error}</p>
        <button 
          onClick={fetchHistoryData}
          className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-100 dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">History</h1>

        {/* Historic Insights */}
        {insights && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Historic Insights</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Races</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{(insights.totalRaces || 0).toLocaleString()}</p>
                  </div>
                  <Flag className="w-8 h-8 text-red-500" />
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Podiums</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{(insights.totalPodiums || 0).toLocaleString()}</p>
                  </div>
                  <Trophy className="w-8 h-8 text-yellow-500" />
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Wins</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{(insights.totalWins || 0).toLocaleString()}</p>
                  </div>
                  <Trophy className="w-8 h-8 text-green-500" />
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Seasons</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{(insights.totalSeasons || 0).toLocaleString()}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-blue-500" />
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Drivers</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{(insights.totalDrivers || 0).toLocaleString()}</p>
                  </div>
                  <Users className="w-8 h-8 text-purple-500" />
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Champions</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{(insights.totalChampionships || 0).toLocaleString()}</p>
                  </div>
                  <Trophy className="w-8 h-8 text-indigo-500" />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Previous Seasons */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Previous Seasons</h2>
            </div>
            <div className="p-6 max-h-[32rem] overflow-y-auto">
              {seasons.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">No seasons available</p>
              ) : (
                <div className="space-y-4">
                  {seasons.map((season) => (
                    <div
                      key={season.id}
                      onClick={() => handleSeasonClick(season.id)}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{season.name}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Champion: {season.champion} • {season.totalRaces} races • {season.totalDrivers} drivers
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {season.status === 'active' && (
                            <span className="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full dark:bg-green-900 dark:text-green-200">
                              Active
                            </span>
                          )}
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* All Members */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">All Drivers</h2>
            </div>
            <div className="p-6 max-h-[32rem] overflow-y-auto">
              {drivers.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">No drivers available</p>
              ) : (
                <div className="space-y-4">
                  {drivers.map((driver) => (
                    <div
                      key={driver.id}
                      onClick={() => handleDriverClick(driver.id)}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{driver.name}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {driver.team || 'No team'} • {driver.number ? `#${driver.number}` : 'No number'}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {driver.isActive && (
                            <span className="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full dark:bg-green-900 dark:text-green-200">
                              Active
                            </span>
                          )}
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
