import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, Award, Calendar } from 'lucide-react';

interface SeasonStats {
  season: string;
  wins: number;
  poles: number;
  points: number;
  position: number;
  podiums: number;
  fastestLaps: number;
  consistency: number;
}

interface RaceResult {
  id: string;
  trackName: string;
  date: string;
  position: number;
  season: string;
}

interface MemberProfileProps {
  driverId: string;
  onBack: () => void;
  onRaceSelect?: (raceId: string) => void;
}

export const MemberProfile: React.FC<MemberProfileProps> = ({ driverId, onBack, onRaceSelect }) => {
  const [activeTab, setActiveTab] = useState<string>('Career Stats'); // Default to Career Stats
  const [careerStats, setCareerStats] = useState<any>(null);
  const [seasonStats, setSeasonStats] = useState<SeasonStats[]>([]);
  const [raceHistory, setRaceHistory] = useState<RaceResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDriverData();
  }, [driverId]);

  const fetchDriverData = async () => {
    try {
      setLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      
      // Fetch member career stats
      const careerResponse = await fetch(`${apiUrl}/api/members/${memberId}/career-stats`);
      if (careerResponse.ok) {
        const careerData = await careerResponse.json();
        setCareerStats(careerData.stats || {
          totalWins: 0,
          totalPoles: 0,
          totalPoints: 0,
          totalPodiums: 0,
          totalFastestLaps: 0,
          championships: 0,
          seasonsActive: 0,
          bestFinish: 0,
          consistency: 0
        });
      }
      
      // Fetch member season stats
      const seasonResponse = await fetch(`${apiUrl}/api/members/${memberId}/season-stats`);
      if (seasonResponse.ok) {
        const seasonData = await seasonResponse.json();
        setSeasonStats(seasonData.stats || []);
      }
      
      // Fetch member race history
      const historyResponse = await fetch(`${apiUrl}/api/members/${memberId}/race-history`);
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        setRaceHistory(historyData.history || []);
      }
      
    } catch (error) {
      console.error('Error fetching member data:', error);
      // Set empty data on error
      setCareerStats({
        totalWins: 0,
        totalPoles: 0,
        totalPoints: 0,
        totalPodiums: 0,
        totalFastestLaps: 0,
        championships: 0,
        seasonsActive: 0,
        bestFinish: 0,
        consistency: 0
      });
      setSeasonStats([]);
      setRaceHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const getTrophyDisplay = (championships: number) => {
    if (championships > 0) {
      return '🏆'.repeat(Math.min(championships, 3));
    }
    return '';
  };

  const getPositionText = (position: number) => {
    if (position === 1) return '1st';
    if (position === 2) return '2nd';
    if (position === 3) return '3rd';
    return `${position}th`;
  };

  const getStatsForTab = (tab: string) => {
    if (tab === 'Career Stats') {
      return careerStats;
    } else {
      return seasonStats.find(s => s.season === tab);
    }
  };

  const getRaceHistoryForTab = (tab: string) => {
    if (tab === 'Career Stats') {
      return raceHistory;
    } else {
      return raceHistory.filter(r => r.season === tab);
    }
  };

  const availableTabs = ['Career Stats', ...seasonStats.map(s => s.season)];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Award className="w-16 h-16 mx-auto mb-4 text-gray-400 animate-pulse" />
          <p className="text-xl text-gray-400">Loading driver profile...</p>
        </div>
      </div>
    );
  }

  const currentStats = getStatsForTab(activeTab);
  const currentRaceHistory = getRaceHistoryForTab(activeTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Career</span>
        </button>
      </div>

      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
          <Award className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            Lewis Hamilton {careerStats?.championships > 0 && getTrophyDisplay(careerStats.championships)}
          </h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {availableTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab
                  ? 'border-purple-600 text-purple-600 dark:text-purple-400 dark:border-purple-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Stats Section */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {activeTab === 'Career Stats' ? 'All-Time Career Statistics' : `${activeTab} Season Statistics`}
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-green-600 dark:text-green-400 mb-1">
              <Trophy className="w-4 h-4" />
              <span className="text-sm font-semibold">Wins</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {currentStats?.wins || currentStats?.totalWins}
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 mb-1">
              <Award className="w-4 h-4" />
              <span className="text-sm font-semibold">Poles</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {currentStats?.poles || currentStats?.totalPoles}
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-purple-600 dark:text-purple-400 mb-1">
              <Calendar className="w-4 h-4" />
              <span className="text-sm font-semibold">Points</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {(currentStats?.points || currentStats?.totalPoints)?.toLocaleString()}
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-orange-600 dark:text-orange-400 mb-1">
              <Trophy className="w-4 h-4" />
              <span className="text-sm font-semibold">Podiums</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {currentStats?.podiums || currentStats?.totalPodiums}
            </div>
          </div>
        </div>

        {activeTab === 'Career Stats' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">Championships</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {currentStats?.championships} {getTrophyDisplay(currentStats?.championships)}
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">Seasons Active</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {currentStats?.seasonsActive}
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">Best Finish</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {getPositionText(currentStats?.bestFinish)}
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">Consistency</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {currentStats?.consistency}%
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Race History Section */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {activeTab === 'Career Stats' ? 'Complete Race History' : `${activeTab} Season Races`}
        </h2>
        
        <div className="space-y-3">
          {currentRaceHistory.map((race, index) => (
            <div
              key={race.id}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition-colors"
              onClick={() => onRaceSelect?.(race.id)}
            >
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                    {race.position}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    🏁 {race.trackName}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(race.date).toLocaleDateString()}
                    {activeTab === 'Career Stats' && (
                      <span className="ml-2 text-xs bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded">
                        {race.season}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  P{race.position}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
