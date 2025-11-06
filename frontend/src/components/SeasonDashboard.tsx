import React, { useState, useEffect } from 'react';
import { Trophy, Calendar, Award, Star, Zap } from 'lucide-react';
import { useSeason } from '../contexts/SeasonContext';
import { PreviousRaceResultsComponent } from './PreviousRaceResults';

interface Driver {
  id: string;
  name: string;
  team: string;
  number: number;
  points?: number;
  wins?: number;
  podiums?: number;
  fastestLaps?: number;
  position?: number;
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
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentSeason) {
      fetchSeasonData();
    }
  }, [currentSeason]);

  const fetchSeasonData = async () => {
    try {
      if (!currentSeason) return;
      
      setLoading(true);
      
      // Fetch real season data from API
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      
      // Fetch season participants (drivers)
      const participantsResponse = await fetch(`${apiUrl}/api/seasons/${currentSeason.id}/participants`);
      if (participantsResponse.ok) {
        const participantsData = await participantsResponse.json();
        setStandings(participantsData.participants || []);
      }
      
      // Fetch season events/races
      const eventsResponse = await fetch(`${apiUrl}/api/seasons/${currentSeason.id}/events`);
      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json();
        const events = eventsData.events || [];
        setEvents(events);
        
        // Find next and previous races
        const now = new Date();
        const upcomingRaces = events.filter((event: any) => 
          event.status === 'scheduled' && 
          (!event.race_date || new Date(event.race_date) > now)
        ).sort((a: any, b: any) => 
          new Date(a.race_date || '').getTime() - new Date(b.race_date || '').getTime()
        );
        
        const completedRaces = events.filter((event: any) => 
          event.status === 'completed'
        ).sort((a: any, b: any) => 
          new Date(b.race_date || '').getTime() - new Date(a.race_date || '').getTime()
        );
        
        setNextRace(upcomingRaces[0] || null);
        setPreviousRace(completedRaces[0] || null);
      }
      
      // Fetch season statistics (endpoint doesn't exist yet, handle 404 gracefully)
      try {
        const statsResponse = await fetch(`${apiUrl}/api/seasons/${currentSeason.id}/stats`);
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData.stats || null);
        } else if (statsResponse.status !== 404) {
          // Only log non-404 errors (404 is expected if endpoint doesn't exist)
          console.warn('Failed to fetch season stats:', statsResponse.status);
        }
      } catch (error) {
        // Silently handle stats fetch errors (endpoint may not exist)
        console.warn('Season stats endpoint not available');
      }
      
      // For now, set empty achievements - will be populated from race results
      setAchievements([]);
      
    } catch (error) {
      console.error('Error fetching season data:', error);
      // Set empty data on error
      setStandings([]);
      setNextRace(null);
      setPreviousRace(null);
      setAchievements([]);
      setStats(null);
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
    <div className="max-w-[2048px] mx-auto space-y-6">
      {/* Hero Banner with F1 Grid Background */}
      <div 
        className="relative h-80 md:h-96 lg:h-[500px] overflow-hidden rounded-xl shadow-2xl cursor-pointer group"
        onClick={onScheduleView}
      >
        {/* F1 Grid Background */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat group-hover:scale-105 transition-transform duration-700"
          style={{ backgroundImage: 'url(/banner/2024-Formula1-Ferrari-SF-24-007-1440sw.jpg)' }}
        />
        
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-black bg-opacity-50" />
        
        
        {/* Content */}
        <div className="relative z-10 h-full flex flex-col justify-center items-start text-white p-8 md:p-12">
          <div className="max-w-2xl">
            <h1 className="text-5xl md:text-7xl font-black mb-4 tracking-tight text-shadow-lg">
              {currentSeason?.name}
            </h1>
            <p className="text-2xl md:text-3xl mb-8 font-light">
              Season {currentSeason?.year}
            </p>
            
            {/* Status Badge with F1 styling */}
            <div className={`inline-flex items-center px-6 py-3 rounded-full text-lg font-bold mb-8 ${
              currentSeason?.status === 'active' ? 'bg-green-500 text-white shadow-lg' :
              currentSeason?.status === 'completed' ? 'bg-blue-500 text-white shadow-lg' :
              'bg-gray-500 text-white shadow-lg'
            }`}>
              <div className={`w-3 h-3 rounded-full mr-3 ${
                currentSeason?.status === 'active' ? 'bg-white animate-pulse' :
                'bg-white'
              }`}></div>
              {currentSeason?.status?.toUpperCase()}
            </div>
            
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-red-400">{events.length}</div>
                <div className="text-sm uppercase tracking-wider font-medium">Events</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-red-400">{standings.length}</div>
                <div className="text-sm uppercase tracking-wider font-medium">Drivers</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-red-400">{events.filter(event => event.status === 'completed').length}</div>
                <div className="text-sm uppercase tracking-wider font-medium">Completed</div>
              </div>
            </div>
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
                      {driver.position || '#'}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{driver.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{driver.team}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{driver.points || 0} pts</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{driver.wins || 0}W {driver.podiums || 0}P</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Previous Race Results - Right Sidebar */}
        <div className="space-y-6">
          <PreviousRaceResultsComponent 
            seasonId={currentSeason?.id || ''} 
            onRaceSelect={onRaceSelect}
          />
          
          {/* Achievements - Below Previous Race */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                <Star className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Achievements</h2>
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
    </div>
  );
};
