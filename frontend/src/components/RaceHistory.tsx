import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Flag, Trophy, Zap, Clock, CheckCircle, Circle } from 'lucide-react';
import { useSeason } from '../contexts/SeasonContext';
import logger from '../utils/logger';
import { getApiUrl } from '../utils/api';
import { formatDate } from '../utils/dateUtils';

interface RaceEvent {
  id: string;
  name: string;
  track: string;
  date: string;
  country: string;
  seasonId: string;
  sessions: {
    qualifying: {
      completed: boolean;
      poleSitter: string | null;
      fastestTime: string | null;
    };
    race: {
      completed: boolean;
      winner: string | null;
      fastestLap: string | null;
      totalLaps: number;
    };
  };
  status: 'scheduled' | 'completed' | 'cancelled';
}

export const RaceHistory: React.FC = () => {
  const { currentSeason } = useSeason();
  const [raceEvents, setRaceEvents] = useState<RaceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentSeason) return;
    
    const abortController = new AbortController();
    const signal = abortController.signal;

    const fetchRaceEvents = async () => {
    try {
      setLoading(true);
        const apiUrl = getApiUrl();
      
      // Fetch race events for the current season
        const response = await fetch(`${apiUrl}/api/seasons/${currentSeason.id}/events`, { signal });
        if (signal.aborted) return;
        
      if (response.ok) {
        const data = await response.json();
          if (!signal.aborted) {
        setRaceEvents(data.events || []);
      }
        }
        
      } catch (error: any) {
        if (signal.aborted || error.name === 'AbortError') return;
      
        logger.error('Error fetching race events:', error);
        if (!signal.aborted) {
      setError('Failed to load race events');
      setRaceEvents([]);
        }
    } finally {
        if (!signal.aborted) {
      setLoading(false);
    }
      }
    };

    fetchRaceEvents();

    return () => {
      abortController.abort();
    };
  }, [currentSeason]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'scheduled':
        return <Circle className="w-4 h-4" />;
      case 'cancelled':
        return <Circle className="w-4 h-4" />;
      default:
        return <Circle className="w-4 h-4" />;
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading race history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (!currentSeason) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">No season selected</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Race History</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{currentSeason.name}</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <Calendar className="w-4 h-4" />
            <span>{raceEvents.length} races</span>
          </div>
        </div>
      </div>

      {/* Race Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {raceEvents.map((event) => (
          <div key={event.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
            {/* Event Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{event.name}</h3>
                <div className="flex items-center space-x-2 mt-1">
                  <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">{event.track}</span>
                </div>
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(event.status)}`}>
                {getStatusIcon(event.status)}
                <span className="capitalize">{event.status}</span>
              </div>
            </div>

            {/* Event Details */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(event.date)}</span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                <Flag className="w-4 h-4" />
                <span>{event.country}</span>
              </div>

              {/* Qualifying Results */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Qualifying</h4>
                {event.sessions.qualifying.completed ? (
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-sm">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      <span className="text-gray-900 dark:text-white">{event.sessions.qualifying.poleSitter}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span>{event.sessions.qualifying.fastestTime}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400">Not completed</div>
                )}
              </div>

              {/* Race Results */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Race</h4>
                {event.sessions.race.completed ? (
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-sm">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      <span className="text-gray-900 dark:text-white">{event.sessions.race.winner}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                      <Zap className="w-4 h-4" />
                      <span>{event.sessions.race.fastestLap}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span>{event.sessions.race.totalLaps} laps</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400">Not completed</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {raceEvents.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No events found</h3>
          <p className="text-gray-500 dark:text-gray-400">No events have been scheduled for this season yet.</p>
        </div>
      )}
    </div>
  );
};