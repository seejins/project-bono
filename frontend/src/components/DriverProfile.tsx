import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, Award, Clock, TrendingUp, Target, Users, Calendar } from 'lucide-react';
import logger from '../utils/logger';
import { getApiUrl } from '../utils/api';

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
  consistency: number;
  careerPoints: number;
  careerWins: number;
  careerPodiums: number;
  bestFinish: number;
  worstFinish: number;
}

interface RaceResult {
  id: string;
  trackName: string;
  date: string;
  position: number;
  points: number;
  fastestLap: boolean;
  polePosition: boolean;
  dnf: boolean;
  dnfReason?: string;
}

interface Achievement {
  id: string;
  type: string;
  name: string;
  description: string;
  dateEarned: string;
  raceId: string;
  raceName: string;
}

interface DriverProfileProps {
  driverId: string;
  onBack: () => void;
  onRaceSelect: (raceId: string) => void;
}

export const DriverProfile: React.FC<DriverProfileProps> = ({ driverId, onBack, onRaceSelect }) => {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [raceResults, setRaceResults] = useState<RaceResult[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'results' | 'achievements' | 'comparison'>('overview');

  useEffect(() => {
    const abortController = new AbortController();
    const signal = abortController.signal;

    const fetchDriverData = async () => {
      try {
        setLoading(true);
        
        // Fetch real driver data from API
        const apiUrl = getApiUrl();
        const fetchOptions = { signal };
        
        // Parallel fetch: driver profile, race results, and achievements simultaneously
        const [driverResponse, resultsResponse, achievementsResponse] = await Promise.all([
          fetch(`${apiUrl}/api/members/${driverId}`, fetchOptions),
          fetch(`${apiUrl}/api/members/${driverId}/race-results`, fetchOptions),
          fetch(`${apiUrl}/api/members/${driverId}/achievements`, fetchOptions),
        ]);
        
        if (signal.aborted) return;
        
        if (driverResponse.ok) {
          const driverData = await driverResponse.json();
          if (!signal.aborted) setDriver(driverData.member || null);
        }
        
        if (resultsResponse.ok) {
          const resultsData = await resultsResponse.json();
          if (!signal.aborted) setRaceResults(resultsData.results || []);
        }
        
        if (achievementsResponse.ok) {
          const achievementsData = await achievementsResponse.json();
          if (!signal.aborted) setAchievements(achievementsData.achievements || []);
        }
        
      } catch (error: any) {
        if (signal.aborted || error.name === 'AbortError') return;
        
        logger.error('Error fetching driver data:', error);
        // Set empty data on error
        if (!signal.aborted) {
          setDriver(null);
          setRaceResults([]);
          setAchievements([]);
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchDriverData();

    return () => {
      abortController.abort();
    };
  }, [driverId]);

  const getPositionColor = (position: number) => {
    if (position === 1) return 'text-yellow-400 bg-yellow-500/20';
    if (position === 2) return 'text-gray-300 bg-gray-400/20';
    if (position === 3) return 'text-amber-600 bg-amber-600/20';
    if (position <= 10) return 'text-green-400 bg-green-500/20';
    return 'text-red-400 bg-red-500/20';
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

  if (!driver) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-white mb-4">Driver Not Found</h2>
        <button
          onClick={onBack}
          className="text-blue-400 hover:text-blue-300"
        >
          ← Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
      </div>

      {/* Driver Header */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-white">#{driver.number}</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">{driver.name}</h1>
              <p className={`text-lg ${getTeamColor(driver.team)}`}>{driver.team}</p>
              <p className="text-gray-400">Championship Position: #{driver.position}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-white">{driver.points} pts</div>
            <div className="text-sm text-gray-400">Current Season</div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <span className="text-sm text-gray-400">Wins</span>
          </div>
          <div className="text-2xl font-bold text-white">{driver.wins}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Award className="w-5 h-5 text-green-400" />
            <span className="text-sm text-gray-400">Podiums</span>
          </div>
          <div className="text-2xl font-bold text-white">{driver.podiums}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Clock className="w-5 h-5 text-purple-400" />
            <span className="text-sm text-gray-400">Fastest Laps</span>
          </div>
          <div className="text-2xl font-bold text-white">{driver.fastestLaps}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <span className="text-sm text-gray-400">Avg Finish</span>
          </div>
          <div className="text-2xl font-bold text-white">{driver.averageFinish.toFixed(1)}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-800 rounded-lg p-1">
        {[
          { id: 'overview', label: 'Overview', icon: Target },
          { id: 'results', label: 'Results', icon: Calendar },
          { id: 'achievements', label: 'Achievements', icon: Trophy },
          { id: 'comparison', label: 'Comparison', icon: Users }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Season Performance */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Season Performance</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-400">Points</span>
                <span className="text-white font-semibold">{driver.points}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Wins</span>
                <span className="text-yellow-400 font-semibold">{driver.wins}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Podiums</span>
                <span className="text-green-400 font-semibold">{driver.podiums}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Fastest Laps</span>
                <span className="text-purple-400 font-semibold">{driver.fastestLaps}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Average Finish</span>
                <span className="text-white font-semibold">{driver.averageFinish.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Consistency</span>
                <span className="text-blue-400 font-semibold">{driver.consistency}%</span>
              </div>
            </div>
          </div>

          {/* Career Stats */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Career Statistics</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-400">Career Points</span>
                <span className="text-white font-semibold">{driver.careerPoints}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Career Wins</span>
                <span className="text-yellow-400 font-semibold">{driver.careerWins}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Career Podiums</span>
                <span className="text-green-400 font-semibold">{driver.careerPodiums}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Best Finish</span>
                <span className="text-yellow-400 font-semibold">P{driver.bestFinish}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Worst Finish</span>
                <span className="text-red-400 font-semibold">P{driver.worstFinish}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'results' && (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white">Race Results</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Race</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Position</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Points</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Flags</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {raceResults.map((result) => (
                  <tr 
                    key={result.id} 
                    className="hover:bg-gray-700 cursor-pointer transition-colors"
                    onClick={() => onRaceSelect(result.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-white font-medium">{result.trackName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-400">{new Date(result.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-sm font-semibold ${getPositionColor(result.position)}`}>
                        P{result.position}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-white font-semibold">{result.points}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-1">
                        {result.polePosition && <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded">Pole</span>}
                        {result.fastestLap && <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded">FL</span>}
                        {result.dnf && <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">DNF</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'achievements' && (
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Achievements ({achievements.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {achievements.map((achievement) => (
                <div key={achievement.id} className="bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <Trophy className="w-6 h-6 text-yellow-400" />
                    <div>
                      <h4 className="text-white font-semibold">{achievement.name}</h4>
                      <p className="text-sm text-gray-400">{achievement.description}</p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    Earned: {new Date(achievement.dateEarned).toLocaleDateString()} at {achievement.raceName}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'comparison' && (
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold text-white mb-4">Driver Comparison</h3>
          <p className="text-gray-400">Compare with other drivers coming soon...</p>
        </div>
      )}
    </div>
  );
};

