import React, { useState } from 'react';
import { ArrowLeft, Plus, X, Calendar, Clock, MapPin } from 'lucide-react';
import { Season } from './SeasonManagement';
import { F123_TRACKS } from '../data/f123Tracks';

interface SeasonEvent {
  id: string;
  trackId: string;
  trackName: string;
  date: string;
  time: string;
  type: 'practice' | 'qualifying' | 'race' | 'full_event';
  includePractice?: boolean;
  includeQualifying?: boolean;
  includeRace?: boolean;
}

interface SeasonDetailProps {
  season: Season;
  onBack: () => void;
  onUpdate: (updatedSeason: Season) => void;
}

export const SeasonDetail: React.FC<SeasonDetailProps> = ({ season, onBack, onUpdate }) => {
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<SeasonEvent>>({
    trackId: '',
    date: '',
    time: '15:00',
    includePractice: true,
    includeQualifying: true,
    includeRace: true
  });

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const handleAddEvent = () => {
    if (!newEvent.trackId) {
      alert('Please select a track');
      return;
    }

    const track = F123_TRACKS.find(t => t.id === newEvent.trackId);
    const eventId = Date.now().toString();
    
    // Determine if this is a combined event (multiple sessions) or single session
    const sessionCount = 
      (newEvent.includePractice ? 1 : 0) + 
      (newEvent.includeQualifying ? 1 : 0) + 
      (newEvent.includeRace ? 1 : 0);
    
    // If multiple sessions, create a single combined event
    if (sessionCount > 1) {
      const event: SeasonEvent = {
        id: eventId,
        trackId: newEvent.trackId!,
        trackName: track?.name || 'Unknown Track',
        date: newEvent.date || '',
        time: newEvent.time || '15:00',
        type: 'full_event',
        includePractice: newEvent.includePractice,
        includeQualifying: newEvent.includeQualifying,
        includeRace: newEvent.includeRace
      };

      const updatedSeason = {
        ...season,
        races: [...season.races, event as any],
        tracks: Array.from(new Set([...season.tracks.map(t => t.id), event.trackId]))
          .map(id => season.tracks.find(t => t.id === id) || F123_TRACKS.find(t => t.id === id))
          .filter(Boolean) as any
      };

      onUpdate(updatedSeason as Season);
    } else {
      // Single session event - create individual race
      let type: 'practice' | 'qualifying' | 'race' = 'race';
      if (newEvent.includePractice) type = 'practice';
      else if (newEvent.includeQualifying) type = 'qualifying';
      
      const race = {
        id: eventId,
        trackId: newEvent.trackId!,
        trackName: track?.name || 'Unknown Track',
        date: newEvent.date || '',
        time: newEvent.time || '15:00',
        status: 'scheduled' as const,
        type: type
      };

      const updatedSeason = {
        ...season,
        races: [...season.races, race as any],
        tracks: Array.from(new Set([...season.tracks.map(t => t.id), race.trackId]))
          .map(id => season.tracks.find(t => t.id === id) || F123_TRACKS.find(t => t.id === id))
          .filter(Boolean) as any
      };

      onUpdate(updatedSeason as Season);
    }

    setNewEvent({
      trackId: '',
      date: '',
      time: '15:00',
      includePractice: true,
      includeQualifying: true,
      includeRace: true
    });
    setShowAddEvent(false);
  };

  const handleRemoveEvent = (raceId: string) => {
    const updatedSeason = {
      ...season,
      races: season.races.filter(r => r.id !== raceId)
    };
    onUpdate(updatedSeason);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{season.name}</h1>
          <p className="text-gray-500 dark:text-gray-400">
            {season.startDate && season.endDate && formatDate(season.startDate) !== 'Not set' && formatDate(season.endDate) !== 'Not set'
              ? `${formatDate(season.startDate)} - ${formatDate(season.endDate)}`
              : `Season ${season.year}`
            }
          </p>
        </div>
      </div>

      {/* Season Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{season.drivers.length}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Drivers</div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{season.tracks.length}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Tracks</div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{season.races.length}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Total Sessions</div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {season.races.filter(r => r.status === 'completed').length}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Completed</div>
        </div>
      </div>

      {/* Events Section */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Season Events</h2>
          <button
            onClick={() => setShowAddEvent(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Event</span>
          </button>
        </div>

        {season.races.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No events scheduled yet. Click "Add Event" to schedule your first race weekend.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {season.races.map((race) => (
              <div key={race.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-4 flex-1">
                  <div className={`w-2 h-2 rounded-full ${
                    race.status === 'completed' ? 'bg-green-500' :
                    race.status === 'scheduled' ? 'bg-blue-500' : 'bg-gray-400'
                  }`}></div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">{race.trackName}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center space-x-3 mt-1">
                      {race.date && (
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(race.date)}</span>
                        </span>
                      )}
                      {race.time && (
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatTime(race.time)}</span>
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                        {(race as any).includePractice || (race as any).includeQualifying || (race as any).includeRace
                          ? [
                              (race as any).includePractice && 'Practice',
                              (race as any).includeQualifying && 'Qualifying',
                              (race as any).includeRace && 'Race'
                            ].filter(Boolean).join(' + ')
                          : race.type
                        }
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveEvent(race.id)}
                  className="text-red-600 hover:text-red-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Event Modal */}
      {showAddEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Add Event</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Track *
                </label>
                <select
                  value={newEvent.trackId}
                  onChange={(e) => setNewEvent({ ...newEvent, trackId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Select a track...</option>
                  {F123_TRACKS.map(track => (
                    <option key={track.id} value={track.id}>
                      {track.name} ({track.country})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date (optional)
                  </label>
                  <input
                    type="date"
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Time (optional)
                  </label>
                  <input
                    type="time"
                    value={newEvent.time}
                    onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sessions to Include
                </label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="include-practice"
                      checked={newEvent.includePractice}
                      onChange={(e) => setNewEvent({ ...newEvent, includePractice: e.target.checked })}
                      className="w-4 h-4 text-red-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-red-500"
                    />
                    <label htmlFor="include-practice" className="text-sm text-gray-700 dark:text-gray-300">
                      Practice
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="include-qualifying"
                      checked={newEvent.includeQualifying}
                      onChange={(e) => setNewEvent({ ...newEvent, includeQualifying: e.target.checked })}
                      className="w-4 h-4 text-red-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-red-500"
                    />
                    <label htmlFor="include-qualifying" className="text-sm text-gray-700 dark:text-gray-300">
                      Qualifying
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="include-race"
                      checked={newEvent.includeRace}
                      onChange={(e) => setNewEvent({ ...newEvent, includeRace: e.target.checked })}
                      className="w-4 h-4 text-red-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-red-500"
                    />
                    <label htmlFor="include-race" className="text-sm text-gray-700 dark:text-gray-300">
                      Race
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowAddEvent(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddEvent}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Add Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
