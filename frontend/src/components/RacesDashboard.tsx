import React, { useState, useEffect } from 'react';
import { apiGet } from '../utils/api';
import { Grid3X3, List, Calendar, CheckCircle, Clock, XCircle, MapPin, Flag, Trophy, Edit } from 'lucide-react';

interface Event {
  id: string;
  season_id: string;
  track_id: string;
  track_name: string;
  race_date: string | null;
  status: 'scheduled' | 'completed' | 'cancelled';
  session_type: number;
  session_types: string | null;
  session_duration: number;
  weather_air_temp: number;
  weather_track_temp: number;
  weather_rain_percentage: number;
  created_at: string;
  updated_at: string;
  session_config: any;
  track: {
    id: string;
    name: string;
    country: string;
    length: number;
  };
}

interface RacesDashboardProps {
  seasonId: string;
  onRaceSelect?: (raceId: string) => void;
}

type ViewMode = 'cards' | 'list';

export const RacesDashboard: React.FC<RacesDashboardProps> = ({ seasonId, onRaceSelect }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');

  useEffect(() => {
    loadEvents();
  }, [seasonId]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      console.log('Loading events for season:', seasonId);
      const response = await apiGet(`/api/seasons/${seasonId}/events`);
      console.log('API response:', response);
      if (response.ok) {
        const data = await response.json();
        console.log('Events data:', data);
        setEvents(data.events || []);
      } else {
        throw new Error('Failed to load events');
      }
    } catch (err) {
      console.error('Error loading events:', err);
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const getEventStatus = (event: Event) => {
    switch (event.status) {
      case 'completed':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Completed</span>;
      case 'cancelled':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Cancelled</span>;
      default:
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Scheduled</span>;
    }
  };

  const getEventStatusIcon = (event: Event) => {
    switch (event.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-600" />;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'TBD';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getSessionTypes = (sessionTypes: string | null) => {
    if (!sessionTypes) return ['Race'];
    return sessionTypes.split(', ');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Schedule</h2>
          <div className="flex space-x-2">
            <div className="h-10 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
            <div className="h-10 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-[2048px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Schedule</h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {events.length} event{events.length !== 1 ? 's' : ''}
          </span>
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Events */}
      {events.length === 0 ? (
        <div className="text-center py-12">
          <Flag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No events scheduled</h3>
          <p className="text-gray-600 dark:text-gray-400">Events will appear here once they are added to the season.</p>
        </div>
      ) : (
        <>
          {viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => (
                <EventCard key={event.id} event={event} onRaceSelect={onRaceSelect} />
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <EventListHeader />
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {events.map((event) => (
                  <EventListItem key={event.id} event={event} onRaceSelect={onRaceSelect} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Event Card Component
interface EventCardProps {
  event: Event;
  onRaceSelect?: (raceId: string) => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, onRaceSelect }) => {
  const getEventStatusIcon = (event: Event) => {
    switch (event.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getEventStatus = (event: Event) => {
    switch (event.status) {
      case 'completed':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Completed</span>;
      case 'cancelled':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Cancelled</span>;
      default:
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Scheduled</span>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'TBD';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getSessionTypes = (sessionTypes: string | null) => {
    if (!sessionTypes) return ['Race'];
    return sessionTypes.split(', ');
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-2">
            <MapPin className="h-5 w-5 text-red-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {event.track.name}
            </h3>
          </div>
          {getEventStatusIcon(event)}
        </div>

        {/* Track Info */}
        <div className="mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {event.track.country} • {event.track.length}km
          </p>
        </div>

        {/* Date */}
        <div className="flex items-center space-x-2 mb-4">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {formatDate(event.race_date)}
          </span>
        </div>

        {/* Session Types */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-1">
            {getSessionTypes(event.session_types).map((sessionType, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs"
              >
                {sessionType}
              </span>
            ))}
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between">
          {getEventStatus(event)}
          {event.status === 'completed' && (
            <button 
              onClick={() => onRaceSelect?.(event.id)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              View Results
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Event List Header Component
const EventListHeader: React.FC = () => {
  return (
    <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
      <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        <div className="col-span-4">Track</div>
        <div className="col-span-2">Date</div>
        <div className="col-span-2">Sessions</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-2">Actions</div>
      </div>
    </div>
  );
};

// Event List Item Component
interface EventListItemProps {
  event: Event;
  onRaceSelect?: (raceId: string) => void;
}

const EventListItem: React.FC<EventListItemProps> = ({ event, onRaceSelect }) => {
  const getEventStatusIcon = (event: Event) => {
    switch (event.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getEventStatus = (event: Event) => {
    switch (event.status) {
      case 'completed':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Completed</span>;
      case 'cancelled':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Cancelled</span>;
      default:
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Scheduled</span>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'TBD';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getSessionTypes = (sessionTypes: string | null) => {
    if (!sessionTypes) return ['Race'];
    return sessionTypes.split(', ');
  };

  return (
    <div className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
      <div className="grid grid-cols-12 gap-4 items-center">
        {/* Track */}
        <div className="col-span-4">
          <div className="flex items-center space-x-3">
            <MapPin className="h-4 w-4 text-red-600" />
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                {event.track.name}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {event.track.country} • {event.track.length}km
              </div>
            </div>
          </div>
        </div>

        {/* Date */}
        <div className="col-span-2">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {formatDate(event.race_date)}
            </span>
          </div>
        </div>

        {/* Sessions */}
        <div className="col-span-2">
          <div className="flex flex-wrap gap-1">
            {getSessionTypes(event.session_types).map((sessionType, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs"
              >
                {sessionType}
              </span>
            ))}
          </div>
        </div>

        {/* Status */}
        <div className="col-span-2">
          <div className="flex items-center space-x-2">
            {getEventStatusIcon(event)}
            {getEventStatus(event)}
          </div>
        </div>

        {/* Actions */}
        <div className="col-span-2">
          <div className="flex items-center space-x-2">
            <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <Edit className="h-4 w-4" />
            </button>
            {event.status === 'completed' && (
              <button 
                onClick={() => onRaceSelect?.(event.id)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Results
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
