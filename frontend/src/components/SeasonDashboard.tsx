import React, { useState, useEffect } from 'react';
import { Trophy, Calendar, Users, Award, Clock } from 'lucide-react';

interface SeasonData {
  id: string;
  name: string;
  year: number;
  status: string;
  startDate: string;
  endDate?: string;
}

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
  status: string;
  winner?: string;
  fastestLap?: string;
}

interface SeasonStats {
  totalRaces: number;
  completedRaces: number;
  totalDrivers: number;
  currentLeader: string;
  mostWins: string;
  fastestLapHolder: string;
}

export const SeasonDashboard: React.FC = () => {
  const [season, setSeason] = useState<SeasonData | null>(null);
  const [standings, setStandings] = useState<Driver[]>([]);
  const [recentRaces, setRecentRaces] = useState<Race[]>([]);
  const [stats, setStats] = useState<SeasonStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSeasonData();
  }, []);

  const fetchSeasonData = async () => {
    try {
      // TODO: Replace with actual API calls
      // For now, using mock data
      const mockSeason: SeasonData = {
        id: '1',
        name: 'F1 Season 2024',
        year: 2024,
        status: 'active',
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      };

      const mockStandings: Driver[] = [
        { id: '1', name: 'Lewis Hamilton', team: 'Mercedes', number: 44, points: 95, wins: 3, podiums: 8, fastestLaps: 2, position: 1 },
        { id: '2', name: 'Max Verstappen', team: 'Red Bull', number: 1, points: 87, wins: 2, podiums: 7, fastestLaps: 3, position: 2 },
        { id: '3', name: 'Charles Leclerc', team: 'Ferrari', number: 16, points: 78, wins: 1, podiums: 6, fastestLaps: 1, position: 3 },
        { id: '4', name: 'Lando Norris', team: 'McLaren', number: 4, points: 65, wins: 1, podiums: 4, fastestLaps: 1, position: 4 },
        { id: '5', name: 'Carlos Sainz', team: 'Ferrari', number: 55, points: 58, wins: 0, podiums: 3, fastestLaps: 0, position: 5 }
      ];

      const mockRecentRaces: Race[] = [
        { id: '1', trackName: 'Monaco', date: '2024-05-26', status: 'completed', winner: 'Lewis Hamilton', fastestLap: 'Max Verstappen' },
        { id: '2', trackName: 'Silverstone', date: '2024-07-07', status: 'completed', winner: 'Max Verstappen', fastestLap: 'Lewis Hamilton' },
        { id: '3', trackName: 'Spa-Francorchamps', date: '2024-07-28', status: 'completed', winner: 'Charles Leclerc', fastestLap: 'Lando Norris' }
      ];

      const mockStats: SeasonStats = {
        totalRaces: 12,
        completedRaces: 8,
        totalDrivers: 5,
        currentLeader: 'Lewis Hamilton',
        mostWins: 'Lewis Hamilton',
        fastestLapHolder: 'Max Verstappen'
      };

      setSeason(mockSeason);
      setStandings(mockStandings);
      setRecentRaces(mockRecentRaces);
      setStats(mockStats);
    } catch (error) {
      console.error('Error fetching season data:', error);
    } finally {
      setLoading(false);
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
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{season?.name}</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Season {season?.year}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-2 text-green-500">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium">Active</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {stats?.completedRaces} of {stats?.totalRaces} races completed
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Current Leader</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{stats?.currentLeader}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
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

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Fastest Lap</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{stats?.fastestLapHolder}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Drivers</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{stats?.totalDrivers}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Championship Standings */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
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
                <div key={driver.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
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

        {/* Recent Races */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Races</h2>
            </div>
          </div>
          
          <div className="p-6">
            <div className="space-y-3">
              {recentRaces.map((race) => (
                <div key={race.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{race.trackName}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(race.date).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-green-600 dark:text-green-400">Winner: {race.winner}</p>
                      <p className="text-sm text-purple-600 dark:text-purple-400">FL: {race.fastestLap}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
