import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Users, Calendar, MapPin, Trash2, Edit, ChevronDown, ChevronRight, Flag } from 'lucide-react';
import { apiGet, apiPost, apiCall } from '../utils/api';
import { useSeason } from '../contexts/SeasonContext';
import { SeasonDetail } from './SeasonDetail';
import { F123_TEAMS } from '../data/f123Teams';

interface Season {
  id: string;
  name: string;
  year: number;
  status: 'active' | 'completed' | 'draft';
  start_date: string;
  end_date?: string;
}

interface Driver {
  id: string;
  name: string;
  team: string;
  number: number;
  createdAt: string;
  updatedAt: string;
}

interface Track {
  id: string;
  name: string;
  country: string;
  location: string;
  length: number;
  laps: number;
  createdAt: string;
  updatedAt: string;
}

interface Event {
  id: string;
  trackId: string;
  track: Track;
  date?: string;
  sessionTypes: string[];
  status: 'scheduled' | 'completed' | 'cancelled';
  createdAt: string;
}

interface ManageSeasonsProps {
  onSeasonSelect?: (seasonId: string) => void;
  selectedSeasonId?: string;
}

export const ManageSeasons: React.FC<ManageSeasonsProps> = ({ onSeasonSelect, selectedSeasonId }) => {
  const { seasons: globalSeasons, refreshSeasons } = useSeason();
  // State management
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  
  // Modal states
  const [showCreateSeason, setShowCreateSeason] = useState(false);
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  
  // Form states
  const [newSeason, setNewSeason] = useState({
    name: '',
    year: new Date().getFullYear(),
    start_date: '',
    end_date: ''
  });
  
  const [newDriver, setNewDriver] = useState({
    name: '',
    team: '',
    number: ''
  });
  
  const [newEvent, setNewEvent] = useState({
    trackId: '',
    date: '',
    practice: false,
    qualifying: false,
    race: false
  });

  // Load initial data
  useEffect(() => {
    loadSeasons();
    loadTracks();
  }, []);

  // Sync local seasons with global seasons
  useEffect(() => {
    if (globalSeasons.length > 0) {
      setSeasons(globalSeasons);
    }
  }, [globalSeasons]);

  // Load selected season when selectedSeasonId changes
  useEffect(() => {
    if (selectedSeasonId) {
      const season = seasons.find(s => s.id === selectedSeasonId);
      if (season) {
        setSelectedSeason(season);
        loadSeasonData(season.id);
      } else {
        // Season not found yet, might be a newly created one
        // Try to find it in the next render cycle
        console.log('Season not found in current seasons list:', selectedSeasonId);
      }
    } else {
      setSelectedSeason(null);
    }
  }, [selectedSeasonId, seasons]);

  const loadSeasons = async () => {
    try {
      // Use global seasons from SeasonContext instead of local API call
      if (globalSeasons.length > 0) {
        setSeasons(globalSeasons);
      } else {
        // Fallback to API call if global seasons not loaded yet
        const response = await apiGet('/api/seasons');
        const data = await response.json();
        if (data.success) {
          setSeasons(data.seasons);
        }
      }
    } catch (error) {
      console.error('Failed to load seasons:', error);
    }
  };

  const loadTracks = async () => {
    // Mock tracks for now - in real implementation, this would come from API
    setTracks([
      { id: '1', name: 'Bahrain International Circuit', country: 'Bahrain', location: 'Sakhir', length: 5.412, laps: 57, createdAt: '', updatedAt: '' },
      { id: '2', name: 'Silverstone Circuit', country: 'United Kingdom', location: 'Silverstone', length: 5.891, laps: 52, createdAt: '', updatedAt: '' },
      { id: '3', name: 'Circuit de Monaco', country: 'Monaco', location: 'Monte Carlo', length: 3.337, laps: 78, createdAt: '', updatedAt: '' },
      { id: '4', name: 'Spa-Francorchamps', country: 'Belgium', location: 'Spa', length: 7.004, laps: 44, createdAt: '', updatedAt: '' },
      { id: '5', name: 'Monza Circuit', country: 'Italy', location: 'Monza', length: 5.793, laps: 53, createdAt: '', updatedAt: '' }
    ]);
  };

  const loadSeasonData = async (seasonId: string) => {
    try {
      // Load drivers for this season
      const driversResponse = await apiGet(`/api/seasons/${seasonId}/drivers`);
      const driversData = await driversResponse.json();
      if (driversData.success) {
        setDrivers(driversData.drivers);
      }

      // Load events for this season
      const eventsResponse = await apiGet(`/api/seasons/${seasonId}/races`);
      const eventsData = await eventsResponse.json();
      if (eventsData.success) {
        // Transform races to events format
        const transformedEvents = eventsData.races.map((race: any) => ({
          id: race.id,
          trackId: race.trackId,
          track: tracks.find(t => t.id === race.trackId) || { id: race.trackId, name: 'Unknown Track', country: '', location: '', length: 0, laps: 0, createdAt: '', updatedAt: '' },
          date: race.raceDate,
          sessionTypes: race.sessionTypes ? race.sessionTypes.split(',') : ['race'],
          status: race.status,
          createdAt: race.createdAt
        }));
        setEvents(transformedEvents);
      }
    } catch (error) {
      console.error('Failed to load season data:', error);
    }
  };

  const handleCreateSeason = async () => {
    if (!newSeason.name || !newSeason.year) {
      alert('Please fill in season name and year');
      return;
    }

    try {
      const response = await apiPost('/api/seasons', {
        name: newSeason.name,
        year: newSeason.year,
        startDate: newSeason.start_date || undefined,
        endDate: newSeason.end_date || undefined
      });

      const data = await response.json();
      if (data.success) {
        // Handle both cases: full season object or just ID
        const seasonId = typeof data.season === 'string' ? data.season : data.season.id;
        const seasonObject = typeof data.season === 'string' ? 
          { id: data.season, name: newSeason.name, year: newSeason.year, status: 'upcoming' } : 
          data.season;
        
        const updatedSeasons = [...seasons, seasonObject];
        setSeasons(updatedSeasons);
        setNewSeason({ name: '', year: new Date().getFullYear(), start_date: '', end_date: '' });
        setShowCreateSeason(false);
        
        // Refresh global seasons list
        await refreshSeasons();
        
        // Auto-select the new season
        if (onSeasonSelect) {
          onSeasonSelect(seasonId);
        }
      } else {
        alert('Failed to create season: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to create season:', error);
      alert('Failed to create season');
    }
  };

  const handleAddDriver = async () => {
    const driverName = (newDriver.name || '').trim();
    const driverTeam = (newDriver.team || '').trim();

    if (!driverName || !driverTeam || !selectedSeason) {
      alert('Please enter driver name, team, and select a season');
      return;
    }

    try {
      const parsedNumber = parseInt(newDriver.number, 10);

      const response = await apiPost(`/api/seasons/${selectedSeason.id}/drivers`, {
        name: driverName,
        team: driverTeam,
        number: Number.isNaN(parsedNumber) ? 0 : parsedNumber
      });

      const data = await response.json();
      if (data.success) {
        setDrivers([...drivers, data.driver]);
        setNewDriver({ name: '', team: '', number: '' });
        setShowAddDriver(false);
      } else {
        alert('Failed to add driver: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to add driver:', error);
      alert('Failed to add driver');
    }
  };

  const handleAddEvent = async () => {
    if (!newEvent.trackId || !selectedSeason) {
      alert('Please select a track');
      return;
    }

    const sessionTypes = [];
    if (newEvent.practice) sessionTypes.push('practice');
    if (newEvent.qualifying) sessionTypes.push('qualifying');
    if (newEvent.race) sessionTypes.push('race');

    if (sessionTypes.length === 0) {
      alert('Please select at least one session type');
      return;
    }

    try {
      const response = await apiPost(`/api/seasons/${selectedSeason.id}/races`, {
        trackId: newEvent.trackId,
        date: newEvent.date || undefined,
        time: '14:00', // Default time
        sessionTypes: sessionTypes // Send as array
      });

      const data = await response.json();
      if (data.success) {
        // Reload events
        await loadSeasonData(selectedSeason.id);
        setNewEvent({ trackId: '', date: '', practice: false, qualifying: false, race: false });
        setShowAddEvent(false);
      } else {
        alert('Failed to add event: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to add event:', error);
      alert('Failed to add event');
    }
  };

  const isAddDriverFormValid =
    (newDriver.name || '').trim().length > 0 &&
    (newDriver.team || '').trim().length > 0;

  const teamOptions = useMemo(() => F123_TEAMS, []);

  const handleRemoveDriver = async (driverId: string) => {
    if (!confirm('Are you sure you want to remove this driver?')) return;

    try {
      const response = await apiCall(`/api/seasons/${selectedSeason?.id}/drivers/${driverId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setDrivers(drivers.filter(d => d.id !== driverId));
      } else {
        alert('Failed to remove driver');
      }
    } catch (error) {
      console.error('Failed to remove driver:', error);
      alert('Failed to remove driver');
    }
  };

  const handleRemoveEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to remove this event? This action cannot be undone.')) return;

    try {
      const response = await apiCall(`/api/seasons/${selectedSeason?.id}/races/${eventId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setEvents(events.filter(e => e.id !== eventId));
      } else {
        alert('Failed to remove event');
      }
    } catch (error) {
      console.error('Failed to remove event:', error);
      alert('Failed to remove event');
    }
  };

  const selectSeason = (season: Season) => {
    if (onSeasonSelect) {
      onSeasonSelect(season.id);
    }
  };

  const formatSessionTypes = (sessionTypes: string[]) => {
    return sessionTypes.map(type => {
      switch (type) {
        case 'practice': return 'Practice';
        case 'qualifying': return 'Qualifying';
        case 'race': return 'Race';
        default: return type;
      }
    }).join(' + ');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {selectedSeason ? `${selectedSeason.name} Management` : 'Manage Seasons'}
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            {selectedSeason ? `Manage drivers and events for ${selectedSeason.name}` : 'Create and manage your F1 league seasons'}
          </p>
        </div>
        {!selectedSeason && (
          <button
            onClick={() => setShowCreateSeason(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Season</span>
          </button>
        )}
        {selectedSeason && (
          <button
            onClick={() => onSeasonSelect && onSeasonSelect('')}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
          >
            <span>← Back to Seasons</span>
          </button>
        )}
      </div>

      {/* Show seasons list or season management */}
      {!selectedSeason ? (
        <SeasonsList seasons={seasons} onSeasonSelect={selectSeason} onCreateSeason={() => setShowCreateSeason(true)} />
      ) : (
        <SeasonDetail 
          season={{
            id: selectedSeason.id,
            name: selectedSeason.name,
            year: selectedSeason.year,
            startDate: selectedSeason.start_date || '',
            endDate: selectedSeason.end_date || '',
            isActive: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }}
          onBack={() => onSeasonSelect && onSeasonSelect('')}
        />
      )}

      {/* Create Season Modal */}
      {showCreateSeason && (
        <div className="modal-overlay">
          <div className="modal-panel max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Create New Season</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Season Name *
                </label>
                <input
                  type="text"
                  value={newSeason.name}
                  onChange={(e) => setNewSeason({ ...newSeason, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="e.g., F1 League 2024"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Year *
                </label>
                <input
                  type="number"
                  value={newSeason.year}
                  onChange={(e) => setNewSeason({ ...newSeason, year: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  min="2020"
                  max="2030"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={newSeason.start_date}
                  onChange={(e) => setNewSeason({ ...newSeason, start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={newSeason.end_date}
                  onChange={(e) => setNewSeason({ ...newSeason, end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowCreateSeason(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSeason}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Create Season
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Driver Modal */}
      {showAddDriver && (
        <div className="modal-overlay">
          <div className="modal-panel max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Add Driver</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Driver Name *
                </label>
                <input
                  type="text"
                  value={newDriver.name}
                  onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="e.g., John Smith"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Team *
                </label>
                <select
                  value={newDriver.team}
                  onChange={(e) => setNewDriver({ ...newDriver, team: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                >
                  <option value="">Select a team</option>
                  {teamOptions.map((team) => (
                    <option key={team.id} value={team.name}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Car Number
                </label>
                <input
                  type="number"
                  value={newDriver.number}
                  onChange={(e) => setNewDriver({ ...newDriver, number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="e.g., 44"
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowAddDriver(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddDriver}
                disabled={!isAddDriverFormValid}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                  isAddDriverFormValid
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-red-300 text-white cursor-not-allowed opacity-70'
                }`}
              >
                Add Driver
              </button>
            </div>
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
                  <option value="">Select a track</option>
                  {tracks.map((track) => (
                    <option key={track.id} value={track.id}>
                      {track.name} ({track.country})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date
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
                  Session Types *
                </label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={newEvent.practice}
                      onChange={(e) => setNewEvent({ ...newEvent, practice: e.target.checked })}
                      className="w-4 h-4 text-red-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-red-500"
                    />
                    <span className="text-gray-700 dark:text-gray-300">Practice</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={newEvent.qualifying}
                      onChange={(e) => setNewEvent({ ...newEvent, qualifying: e.target.checked })}
                      className="w-4 h-4 text-red-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-red-500"
                    />
                    <span className="text-gray-700 dark:text-gray-300">Qualifying</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={newEvent.race}
                      onChange={(e) => setNewEvent({ ...newEvent, race: e.target.checked })}
                      className="w-4 h-4 text-red-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-red-500"
                    />
                    <span className="text-gray-700 dark:text-gray-300">Race</span>
                  </label>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Select multiple session types to create a combined event
                </p>
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

// Seasons List Component
interface SeasonsListProps {
  seasons: Season[];
  onSeasonSelect: (season: Season) => void;
  onCreateSeason: () => void;
}

const SeasonsList: React.FC<SeasonsListProps> = ({ seasons, onSeasonSelect, onCreateSeason }) => {
  return (
    <div className="space-y-4">
      {seasons.length > 0 ? (
        seasons.map((season) => (
          <div key={season.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
            <div 
              className="p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              onClick={() => onSeasonSelect(season)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Flag className="w-8 h-8 text-red-600 dark:text-blue-400" />
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{season.name}</h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      {season.year} • {season.status.charAt(0).toUpperCase() + season.status.slice(1)}
                    </p>
                    {season.start_date && season.end_date && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(season.start_date).toLocaleDateString()} - {new Date(season.end_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Click to manage</div>
                  <ChevronRight className="w-6 h-6 text-gray-400" />
                </div>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-12">
          <Flag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Seasons Yet</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Create your first season to get started</p>
          <button
            onClick={onCreateSeason}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Create Season
          </button>
        </div>
      )}
    </div>
  );
};

// Season Management Component
interface SeasonManagementProps {
  season: Season;
  drivers: Driver[];
  events: Event[];
  tracks: Track[];
  onAddDriver: () => void;
  onAddEvent: () => void;
  onRemoveDriver: (driverId: string) => void;
  onRemoveEvent: (eventId: string) => void;
}

const SeasonManagement: React.FC<SeasonManagementProps> = ({ 
  season, 
  drivers, 
  events, 
  tracks, 
  onAddDriver, 
  onAddEvent, 
  onRemoveDriver, 
  onRemoveEvent 
}) => {
  const [activeTab, setActiveTab] = useState<'drivers' | 'events'>('events');

  const formatSessionTypes = (sessionTypes: string[]) => {
    return sessionTypes.map(type => {
      switch (type) {
        case 'practice': return 'Practice';
        case 'qualifying': return 'Qualifying';
        case 'race': return 'Race';
        default: return type;
      }
    }).join(' + ');
  };

  return (
    <div className="space-y-6">
      {/* Season Info */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="flex items-center space-x-4">
          <Flag className="w-8 h-8 text-red-600 dark:text-blue-400" />
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{season.name}</h3>
            <p className="text-gray-500 dark:text-gray-400">
              {season.year} • {season.status.charAt(0).toUpperCase() + season.status.slice(1)}
            </p>
            {season.start_date && season.end_date && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {new Date(season.start_date).toLocaleDateString()} - {new Date(season.end_date).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex flex-col gap-3 px-6 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
            <button
              onClick={() => setActiveTab('events')}
              className={`w-full border-b-2 py-3 px-1 text-left text-sm font-medium transition-colors sm:w-auto sm:py-4 sm:text-center ${
                activeTab === 'events'
                  ? 'border-red-600 text-red-600 dark:text-blue-400 dark:border-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>Events ({events.length})</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('drivers')}
              className={`w-full border-b-2 py-3 px-1 text-left text-sm font-medium transition-colors sm:w-auto sm:py-4 sm:text-center ${
                activeTab === 'drivers'
                  ? 'border-red-600 text-red-600 dark:text-blue-400 dark:border-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span>Drivers ({drivers.length})</span>
              </div>
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Drivers Tab */}
          {activeTab === 'drivers' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Season Drivers</h4>
                <button
                  onClick={onAddDriver}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Driver</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {drivers.map((driver) => (
                  <div key={driver.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white font-bold">
                        {driver.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-gray-900 dark:text-white font-medium">{driver.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{driver.team} • #{driver.number || 'N/A'}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onRemoveDriver(driver.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Events Tab */}
          {activeTab === 'events' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Scheduled Events</h4>
                <button
                  onClick={onAddEvent}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Event</span>
                </button>
              </div>

              <div className="space-y-4">
                {events.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <MapPin className="w-6 h-6 text-red-600 dark:text-blue-400" />
                      <div>
                        <p className="text-gray-900 dark:text-white font-medium text-lg">{event.track.name}</p>
                        <p className="text-gray-500 dark:text-gray-400">
                          {event.date ? new Date(event.date).toLocaleDateString() : 'TBD'} • {formatSessionTypes(event.sessionTypes)}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{event.track.country}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onRemoveEvent(event.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
