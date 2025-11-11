import React, { useState } from 'react';
import { ArrowLeft, Plus, X, Calendar, Save } from 'lucide-react';
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

interface CreateSeasonProps {
  onBack: () => void;
  onSave: (season: any) => void;
}

export const CreateSeason: React.FC<CreateSeasonProps> = ({ onBack, onSave }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [seasonName, setSeasonName] = useState('');
  const [seasonYear, setSeasonYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [pointsSystem, setPointsSystem] = useState<'f1_standard' | 'custom'>('f1_standard');
  const [fastestLapPoint, setFastestLapPoint] = useState(true);
  const [events, setEvents] = useState<SeasonEvent[]>([]);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<SeasonEvent>>({
    trackId: '',
    date: '',
    time: '15:00',
    includePractice: true,
    includeQualifying: true,
    includeRace: true
  });

  const handleAddEvent = () => {
    if (!newEvent.trackId) {
      alert('Please select a track');
      return;
    }

    const track = F123_TRACKS.find(t => t.id === newEvent.trackId);
    const event: SeasonEvent = {
      id: Date.now().toString(),
      trackId: newEvent.trackId!,
      trackName: track?.name || 'Unknown Track',
      date: newEvent.date || '',
      time: newEvent.time || '15:00',
      type: 'full_event',
      includePractice: newEvent.includePractice,
      includeQualifying: newEvent.includeQualifying,
      includeRace: newEvent.includeRace
    };

    setEvents([...events, event]);
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

  const handleRemoveEvent = (eventId: string) => {
    setEvents(events.filter(e => e.id !== eventId));
  };

  const handleSave = () => {
    if (!seasonName) {
      alert('Please enter a season name');
      return;
    }

    const season = {
      id: Date.now().toString(),
      name: seasonName,
      year: seasonYear,
      startDate: startDate || new Date().toISOString().split('T')[0],
      endDate: endDate || new Date().toISOString().split('T')[0],
      pointsSystem,
      fastestLapPoint,
      status: 'draft' as const,
      drivers: [],
      tracks: Array.from(new Set(events.map(e => e.trackId))),
      races: events.map(event => {
        // Check if multiple sessions are selected
        const sessionCount = 
          (event.includePractice ? 1 : 0) + 
          (event.includeQualifying ? 1 : 0) + 
          (event.includeRace ? 1 : 0);
        
        // If multiple sessions, return combined event
        if (sessionCount > 1) {
          return {
            ...event,
            status: 'scheduled'
          };
        } else {
          // Single session - return as individual race
          let type: 'practice' | 'qualifying' | 'race' = 'race';
          if (event.includePractice) type = 'practice';
          else if (event.includeQualifying) type = 'qualifying';
          
          return {
            id: event.id,
            trackId: event.trackId,
            trackName: event.trackName,
            date: event.date,
            time: event.time,
            status: 'scheduled',
            type: type
          };
        }
      })
    };

    onSave(season);
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create New Season</h1>
      </div>

      {/* Steps */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setStep(1)}
          className={`px-4 py-2 rounded-lg transition-colors ${
            step === 1
              ? 'bg-red-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
          }`}
        >
          Season Details
        </button>
        <button
          onClick={() => setStep(2)}
          className={`px-4 py-2 rounded-lg transition-colors ${
            step === 2
              ? 'bg-red-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
          }`}
        >
          Add Events
        </button>
      </div>

      {/* Step 1: Season Details */}
      {step === 1 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Season Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Season Name *
              </label>
              <input
                type="text"
                value={seasonName}
                onChange={(e) => setSeasonName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="e.g., F1 Championship 2024"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Year *
              </label>
              <input
                type="number"
                value={seasonYear}
                onChange={(e) => setSeasonYear(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date (optional)
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Date (optional)
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Points System
              </label>
              <select
                value={pointsSystem}
                onChange={(e) => setPointsSystem(e.target.value as 'f1_standard' | 'custom')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="f1_standard">F1 Standard (25-18-15-12-10-8-6-4-2-1)</option>
                <option value="custom">Custom Points System</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="fastest-lap"
                checked={fastestLapPoint}
                onChange={(e) => setFastestLapPoint(e.target.checked)}
                className="w-4 h-4 text-red-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-red-500"
              />
              <label htmlFor="fastest-lap" className="text-sm text-gray-700 dark:text-gray-300">
                Award point for fastest lap
              </label>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors"
            >
              Continue to Add Events
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Add Events */}
      {step === 2 && (
        <div className="space-y-6">
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

            {events.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No events added yet. Click "Add Event" to get started.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {events.map((event) => {
                  const track = F123_TRACKS.find(t => t.id === event.trackId);
                  return (
                    <div key={event.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 dark:text-white">{event.trackName}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(event.date).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })} at {event.time}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          {event.includePractice && (
                            <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-0.5 rounded">
                              Practice
                            </span>
                          )}
                          {event.includeQualifying && (
                            <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded">
                              Qualifying
                            </span>
                          )}
                          {event.includeRace && (
                            <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-0.5 rounded">
                              Race
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveEvent(event.id)}
                        className="text-red-600 hover:text-red-700 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Create Season</span>
            </button>
          </div>
        </div>
      )}

      {/* Add Event Modal */}
      {showAddEvent && (
        <div className="modal-overlay">
          <div className="modal-panel max-w-md p-6">
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
