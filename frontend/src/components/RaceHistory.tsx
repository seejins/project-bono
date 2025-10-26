import React, { useState, useEffect } from 'react';
import { Calendar, Trophy, Clock, MapPin, ChevronRight, Flag, Users } from 'lucide-react';
import { useSeason } from '../contexts/SeasonContext';

interface RaceEvent {
  id: string;
  name: string;
  track: string;
  date: string;
  country: string;
  seasonId: string;
  sessions: {
    qualifying?: {
      completed: boolean;
      poleSitter: string;
      fastestTime: string;
    };
    race?: {
      completed: boolean;
      winner: string;
      fastestLap: string;
      totalLaps: number;
    };
  };
  status: 'completed' | 'upcoming' | 'cancelled';
}

interface RaceEventsProps {
  onRaceSelect?: (raceId: string) => void;
}

export const RaceEvents: React.FC<RaceEventsProps> = ({ onRaceSelect }) => {
  const [raceEvents, setRaceEvents] = useState<RaceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterBy, setFilterBy] = useState<'all' | 'completed' | 'upcoming'>('all');
  const { currentSeason } = useSeason();

  useEffect(() => {
    if (currentSeason) {
      fetchRaceEvents();
    }
  }, [currentSeason]);

  const fetchRaceEvents = async () => {
    if (!currentSeason) return;
    
    try {
      // Different mock data for each season
      const getSeasonEvents = (seasonId: string): RaceEvent[] => {
        switch (seasonId) {
          case 'season-2024':
            return [
              {
                id: 'race-1',
                name: 'Bahrain Grand Prix',
                track: 'Bahrain International Circuit',
                date: '2024-03-02',
                country: 'Bahrain',
                seasonId: currentSeason.id,
                sessions: {
                  qualifying: {
                    completed: true,
                    poleSitter: 'Lewis Hamilton',
                    fastestTime: '1:29.708'
                  },
                  race: {
                    completed: true,
                    winner: 'Lewis Hamilton',
                    fastestLap: 'Max Verstappen - 1:32.456',
                    totalLaps: 57
                  }
                },
                status: 'completed'
              },
              {
                id: 'race-2',
                name: 'Saudi Arabian Grand Prix',
                track: 'Jeddah Corniche Circuit',
                date: '2024-03-09',
                country: 'Saudi Arabia',
                seasonId: currentSeason.id,
                sessions: {
                  qualifying: {
                    completed: true,
                    poleSitter: 'Max Verstappen',
                    fastestTime: '1:29.456'
                  },
                  race: {
                    completed: true,
                    winner: 'Max Verstappen',
                    fastestLap: 'Lewis Hamilton - 1:30.123',
                    totalLaps: 50
                  }
                },
                status: 'completed'
              },
              {
                id: 'race-3',
                name: 'Australian Grand Prix',
                track: 'Albert Park Circuit',
                date: '2024-03-24',
                country: 'Australia',
                seasonId: currentSeason.id,
                sessions: {
                  qualifying: {
                    completed: true,
                    poleSitter: 'Charles Leclerc',
                    fastestTime: '1:28.987'
                  },
                  race: {
                    completed: false,
                    winner: '',
                    fastestLap: '',
                    totalLaps: 58
                  }
                },
                status: 'upcoming'
              }
            ];
          
          case 'season-2023':
            return [
              {
                id: 'race-1',
                name: 'Bahrain Grand Prix',
                track: 'Bahrain International Circuit',
                date: '2023-03-05',
                country: 'Bahrain',
                seasonId: currentSeason.id,
                sessions: {
                  qualifying: {
                    completed: true,
                    poleSitter: 'Max Verstappen',
                    fastestTime: '1:29.708'
                  },
                  race: {
                    completed: true,
                    winner: 'Max Verstappen',
                    fastestLap: 'Zhou Guanyu - 1:33.996',
                    totalLaps: 57
                  }
                },
                status: 'completed'
              },
              {
                id: 'race-2',
                name: 'Saudi Arabian Grand Prix',
                track: 'Jeddah Corniche Circuit',
                date: '2023-03-19',
                country: 'Saudi Arabia',
                seasonId: currentSeason.id,
                sessions: {
                  qualifying: {
                    completed: true,
                    poleSitter: 'Sergio Perez',
                    fastestTime: '1:28.265'
                  },
                  race: {
                    completed: true,
                    winner: 'Sergio Perez',
                    fastestLap: 'Max Verstappen - 1:32.217',
                    totalLaps: 50
                  }
                },
                status: 'completed'
              },
              {
                id: 'race-3',
                name: 'Australian Grand Prix',
                track: 'Albert Park Circuit',
                date: '2023-04-02',
                country: 'Australia',
                seasonId: currentSeason.id,
                sessions: {
                  qualifying: {
                    completed: true,
                    poleSitter: 'Max Verstappen',
                    fastestTime: '1:16.732'
                  },
                  race: {
                    completed: true,
                    winner: 'Max Verstappen',
                    fastestLap: 'Sergio Perez - 1:20.235',
                    totalLaps: 58
                  }
                },
                status: 'completed'
              },
              {
                id: 'race-4',
                name: 'Azerbaijan Grand Prix',
                track: 'Baku City Circuit',
                date: '2023-04-30',
                country: 'Azerbaijan',
                seasonId: currentSeason.id,
                sessions: {
                  qualifying: {
                    completed: true,
                    poleSitter: 'Charles Leclerc',
                    fastestTime: '1:40.203'
                  },
                  race: {
                    completed: true,
                    winner: 'Sergio Perez',
                    fastestLap: 'George Russell - 1:43.370',
                    totalLaps: 51
                  }
                },
                status: 'completed'
              }
            ];
          
          case 'season-2025':
            return [
              {
                id: 'race-1',
                name: 'Bahrain Grand Prix',
                track: 'Bahrain International Circuit',
                date: '2025-03-01',
                country: 'Bahrain',
                seasonId: currentSeason.id,
                sessions: {
                  qualifying: {
                    completed: false,
                    poleSitter: '',
                    fastestTime: ''
                  },
                  race: {
                    completed: false,
                    winner: '',
                    fastestLap: '',
                    totalLaps: 57
                  }
                },
                status: 'upcoming'
              }
            ];
          
          default:
            return [];
        }
      };
      
      const seasonEvents = getSeasonEvents(currentSeason.id);
      setRaceEvents(seasonEvents);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching race events:', error);
      setLoading(false);
    }
  };

  const filteredEvents = raceEvents.filter(event => {
    if (filterBy === 'all') return true;
    return event.status === filterBy;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 dark:text-green-400';
      case 'upcoming': return 'text-blue-600 dark:text-blue-400';
      case 'cancelled': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-500 dark:text-gray-400';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'upcoming': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400 animate-pulse" />
          <p className="text-xl text-gray-400">Loading race events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Race Events</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Filter */}
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="all">All Events</option>
            <option value="completed">Completed</option>
            <option value="upcoming">Upcoming</option>
          </select>
        </div>
      </div>

      {/* Race Events List */}
      <div className="space-y-4">
        {filteredEvents.map((event) => (
          <div
            key={event.id}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm cursor-pointer hover:shadow-lg transition-all"
            onClick={() => onRaceSelect?.(event.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <Flag className="w-8 h-8 text-gray-500 dark:text-gray-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{event.name}</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-gray-500 dark:text-gray-400">{event.track}</span>
                  </div>
                  <div className="flex items-center space-x-4 mt-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(event.date).toLocaleDateString()}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(event.status)}`}>
                      {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="space-y-2">
                  {/* Qualifying Results */}
                  {event.sessions.qualifying?.completed && (
                    <div className="flex items-center space-x-2 text-purple-600 dark:text-purple-400">
                      <Trophy className="w-4 h-4" />
                      <span className="text-sm font-medium">Pole: {event.sessions.qualifying.poleSitter}</span>
                    </div>
                  )}
                  
                  {/* Race Results */}
                  {event.sessions.race?.completed && (
                    <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                      <Trophy className="w-4 h-4" />
                      <span className="text-sm font-medium">Winner: {event.sessions.race.winner}</span>
                    </div>
                  )}
                  
                  {/* Session Status */}
                  <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center space-x-1">
                      <div className={`w-2 h-2 rounded-full ${event.sessions.qualifying?.completed ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      <span>Qualifying</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className={`w-2 h-2 rounded-full ${event.sessions.race?.completed ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      <span>Race</span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 ml-4 mt-2" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredEvents.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No race events found</h3>
          <p className="text-gray-500 dark:text-gray-400">
            Upload race session data to see events here.
          </p>
        </div>
      )}
    </div>
  );
};
