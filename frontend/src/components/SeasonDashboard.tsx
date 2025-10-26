import React, { useState, useEffect } from 'react';
import { Trophy, Calendar, Award, Star, Zap } from 'lucide-react';
import { useSeason } from '../contexts/SeasonContext';

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
}

interface Race {
  id: string;
  trackName: string;
  date: string;
  time?: string;
  status: string;
  winner?: string;
  fastestLap?: string;
}

interface Achievement {
  id: string;
  driverName: string;
  driverTeam: string;
  achievement: string;
  raceName: string;
  date: string;
  type: 'first_win' | 'first_podium' | 'first_pole' | 'fastest_lap' | 'championship_lead' | 'milestone';
}

interface SeasonStats {
  totalRaces: number;
  completedRaces: number;
  totalDrivers: number;
  currentLeader: string;
  mostWins: string;
  fastestLapHolder: string;
  driverOfTheDay: string;
}

interface SeasonDashboardProps {
  onRaceSelect?: (raceId: string) => void;
  onDriverSelect?: (driverId: string) => void;
  onScheduleView?: () => void;
}

export const SeasonDashboard: React.FC<SeasonDashboardProps> = ({ onRaceSelect, onDriverSelect, onScheduleView }) => {
  const { currentSeason } = useSeason();
  const [standings, setStandings] = useState<Driver[]>([]);
  const [nextRace, setNextRace] = useState<Race | null>(null);
  const [previousRace, setPreviousRace] = useState<Race | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<SeasonStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentSeason) {
      fetchSeasonData();
    }
  }, [currentSeason]);

  const fetchSeasonData = async () => {
    try {
      if (!currentSeason) return;
      
      // TODO: Replace with actual API calls
      // For now, using mock data that changes based on season
      
      // Different mock data based on season year
      let mockStandings: Driver[] = [];
      let mockNextRace: Race | null = null;
      let mockPreviousRace: Race | null = null;
      let mockAchievements: Achievement[] = [];
      let mockStats: SeasonStats | null = null;

      if (currentSeason.year === 2024) {
        mockStandings = [
          { id: '1', name: 'Lewis Hamilton', team: 'Mercedes', number: 44, points: 95, wins: 3, podiums: 8, fastestLaps: 2, position: 1 },
          { id: '2', name: 'Max Verstappen', team: 'Red Bull', number: 1, points: 87, wins: 2, podiums: 7, fastestLaps: 3, position: 2 },
          { id: '3', name: 'Charles Leclerc', team: 'Ferrari', number: 16, points: 78, wins: 1, podiums: 6, fastestLaps: 1, position: 3 },
          { id: '4', name: 'Lando Norris', team: 'McLaren', number: 4, points: 65, wins: 1, podiums: 4, fastestLaps: 1, position: 4 },
          { id: '5', name: 'Carlos Sainz', team: 'Ferrari', number: 55, points: 58, wins: 0, podiums: 3, fastestLaps: 0, position: 5 }
        ];

        mockNextRace = {
          id: '4',
          trackName: 'Monza',
          date: '2024-09-01',
          time: '15:00',
          status: 'scheduled'
        };

        mockPreviousRace = {
          id: '3',
          trackName: 'Spa-Francorchamps',
          date: '2024-07-28',
          status: 'completed',
          winner: 'Charles Leclerc',
          fastestLap: 'Lando Norris'
        };

        mockAchievements = [
          {
            id: '1',
            driverName: 'Lando Norris',
            driverTeam: 'McLaren',
            achievement: 'First Career Win',
            raceName: 'Spa-Francorchamps',
            date: '2024-07-28',
            type: 'first_win'
          },
          {
            id: '2',
            driverName: 'Carlos Sainz',
            driverTeam: 'Ferrari',
            achievement: 'First Pole Position',
            raceName: 'Silverstone',
            date: '2024-07-07',
            type: 'first_pole'
          },
          {
            id: '3',
            driverName: 'Max Verstappen',
            driverTeam: 'Red Bull',
            achievement: 'Championship Lead',
            raceName: 'Monaco',
            date: '2024-05-26',
            type: 'championship_lead'
          }
        ];

        mockStats = {
          totalRaces: 12,
          completedRaces: 8,
          totalDrivers: 5,
          currentLeader: 'Lewis Hamilton',
          mostWins: 'Lewis Hamilton',
          fastestLapHolder: 'Max Verstappen',
          driverOfTheDay: 'Lando Norris'
        };
      } else if (currentSeason.year === 2023) {
        mockStandings = [
          { id: '1', name: 'Max Verstappen', team: 'Red Bull', number: 1, points: 575, wins: 19, podiums: 21, fastestLaps: 9, position: 1 },
          { id: '2', name: 'Sergio Perez', team: 'Red Bull', number: 11, points: 285, wins: 2, podiums: 9, fastestLaps: 2, position: 2 },
          { id: '3', name: 'Lewis Hamilton', team: 'Mercedes', number: 44, points: 234, wins: 0, podiums: 6, fastestLaps: 1, position: 3 },
          { id: '4', name: 'Fernando Alonso', team: 'Aston Martin', number: 14, points: 206, wins: 0, podiums: 8, fastestLaps: 0, position: 4 },
          { id: '5', name: 'Carlos Sainz', team: 'Ferrari', number: 55, points: 200, wins: 1, podiums: 3, fastestLaps: 1, position: 5 }
        ];

        mockNextRace = null; // Season completed

        mockPreviousRace = {
          id: '22',
          trackName: 'Abu Dhabi',
          date: '2023-11-26',
          status: 'completed',
          winner: 'Max Verstappen',
          fastestLap: 'Max Verstappen'
        };

        mockAchievements = [
          {
            id: '1',
            driverName: 'Max Verstappen',
            driverTeam: 'Red Bull',
            achievement: 'Championship Victory',
            raceName: 'Abu Dhabi',
            date: '2023-11-26',
            type: 'championship_lead'
          },
          {
            id: '2',
            driverName: 'Carlos Sainz',
            driverTeam: 'Ferrari',
            achievement: 'First Career Win',
            raceName: 'Singapore',
            date: '2023-09-17',
            type: 'first_win'
          }
        ];

        mockStats = {
          totalRaces: 22,
          completedRaces: 22,
          totalDrivers: 5,
          currentLeader: 'Max Verstappen',
          mostWins: 'Max Verstappen',
          fastestLapHolder: 'Max Verstappen',
          driverOfTheDay: 'Max Verstappen'
        };
      } else if (currentSeason.year === 2025) {
        mockStandings = [
          { id: '1', name: 'Lewis Hamilton', team: 'Ferrari', number: 44, points: 0, wins: 0, podiums: 0, fastestLaps: 0, position: 1 },
          { id: '2', name: 'Max Verstappen', team: 'Red Bull', number: 1, points: 0, wins: 0, podiums: 0, fastestLaps: 0, position: 2 },
          { id: '3', name: 'Charles Leclerc', team: 'Ferrari', number: 16, points: 0, wins: 0, podiums: 0, fastestLaps: 0, position: 3 },
          { id: '4', name: 'Lando Norris', team: 'McLaren', number: 4, points: 0, wins: 0, podiums: 0, fastestLaps: 0, position: 4 },
          { id: '5', name: 'George Russell', team: 'Mercedes', number: 63, points: 0, wins: 0, podiums: 0, fastestLaps: 0, position: 5 }
        ];

        mockNextRace = {
          id: '1',
          trackName: 'Bahrain',
          date: '2025-03-02',
          status: 'scheduled'
        };

        mockPreviousRace = null; // Season hasn't started

        mockAchievements = []; // No achievements yet

        mockStats = {
          totalRaces: 24,
          completedRaces: 0,
          totalDrivers: 5,
          currentLeader: 'Lewis Hamilton',
          mostWins: 'Lewis Hamilton',
          fastestLapHolder: 'Lewis Hamilton',
          driverOfTheDay: 'Lewis Hamilton'
        };
      }

      setStandings(mockStandings);
      setNextRace(mockNextRace);
      setPreviousRace(mockPreviousRace);
      setAchievements(mockAchievements);
      setStats(mockStats);
    } catch (error) {
      console.error('Error fetching season data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAchievementIcon = (type: string) => {
    switch (type) {
      case 'first_win': return <Trophy className="w-4 h-4" />;
      case 'first_podium': return <Award className="w-4 h-4" />;
      case 'first_pole': return <Star className="w-4 h-4" />;
      case 'fastest_lap': return <Zap className="w-4 h-4" />;
      case 'championship_lead': return <Trophy className="w-4 h-4" />;
      default: return <Award className="w-4 h-4" />;
    }
  };

  const getAchievementColor = (type: string) => {
    switch (type) {
      case 'first_win': return 'text-yellow-600 dark:text-yellow-400';
      case 'first_podium': return 'text-gray-400 dark:text-gray-300';
      case 'first_pole': return 'text-purple-600 dark:text-purple-400';
      case 'fastest_lap': return 'text-green-600 dark:text-green-400';
      case 'championship_lead': return 'text-red-600 dark:text-red-400';
      default: return 'text-blue-600 dark:text-blue-400';
    }
  };

  const handlePreviousRaceClick = () => {
    if (previousRace && onRaceSelect) {
      onRaceSelect(previousRace.id);
    }
  };

  const handleNextRaceClick = () => {
    if (nextRace && onRaceSelect) {
      onRaceSelect(nextRace.id);
    }
  };

  const handleMostWinsClick = () => {
    if (stats?.mostWins && onDriverSelect) {
      // Find driver ID by name
      const driver = standings.find(d => d.name === stats.mostWins);
      if (driver) {
        onDriverSelect(driver.id);
      }
    }
  };

  const handleDriverOfTheDayClick = () => {
    if (stats?.driverOfTheDay && onDriverSelect) {
      // Find driver ID by name
      const driver = standings.find(d => d.name === stats.driverOfTheDay);
      if (driver) {
        onDriverSelect(driver.id);
      }
    }
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
      {/* Season Header */}
      <div 
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        onClick={onScheduleView}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{currentSeason?.name}</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Season {currentSeason?.year}</p>
          </div>
          <div className="text-right">
            <div className={`flex items-center space-x-2 ${
              currentSeason?.status === 'active' ? 'text-green-500' :
              currentSeason?.status === 'completed' ? 'text-blue-500' :
              'text-gray-500'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                currentSeason?.status === 'active' ? 'bg-green-500' :
                currentSeason?.status === 'completed' ? 'bg-blue-500' :
                'bg-gray-500'
              }`}></div>
              <span className="text-sm font-medium capitalize">{currentSeason?.status}</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {stats?.completedRaces} of {stats?.totalRaces} races completed
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div 
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          onClick={handleMostWinsClick}
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
              <Award className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Most Wins</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{stats?.mostWins}</p>
            </div>
          </div>
        </div>

        <div 
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          onClick={handleDriverOfTheDayClick}
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
              <Star className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Driver of the Day</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{stats?.driverOfTheDay || 'TBD'}</p>
            </div>
          </div>
        </div>

        <div 
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          onClick={handleNextRaceClick}
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Next Race</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{nextRace?.trackName || 'TBD'}</p>
              {nextRace?.date && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(nextRace.date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  })}
                  {nextRace.time && ` at ${new Date(`2000-01-01T${nextRace.time}`).toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: false
                  })}`}
                </p>
              )}
            </div>
          </div>
        </div>

        <div 
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          onClick={handlePreviousRaceClick}
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Previous Race</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{previousRace?.trackName || 'TBD'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Championship Standings - Main Display */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                <Trophy className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Championship Standings</h2>
            </div>
          </div>
          
          <div className="p-6">
            <div className="space-y-3">
              {standings.map((driver) => (
                <div 
                  key={driver.id} 
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  onClick={() => onDriverSelect?.(driver.id)}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      driver.position === 1 ? 'position-1' :
                      driver.position === 2 ? 'position-2' :
                      driver.position === 3 ? 'position-3' :
                      'bg-gray-600 text-white'
                    }`}>
                      {driver.position}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{driver.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{driver.team}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{driver.points} pts</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{driver.wins}W {driver.podiums}P</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* New Achievements - Right Sidebar */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                <Star className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">New Achievements</h2>
            </div>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              {achievements.map((achievement) => (
                <div key={achievement.id} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${getAchievementColor(achievement.type)} bg-gray-100 dark:bg-gray-600`}>
                    {getAchievementIcon(achievement.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{achievement.achievement}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {achievement.driverName} ({achievement.driverTeam})
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {achievement.raceName} • {new Date(achievement.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              {achievements.length === 0 && (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No new achievements this season</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
