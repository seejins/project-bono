import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, CheckCircle, AlertCircle, X, Trophy, ArrowLeft, Settings, Flag } from 'lucide-react';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';
import logger from '../utils/logger';
import { useSeason } from '../contexts/SeasonContext';
import { SeasonDetail } from './SeasonDetail';

type SeasonStatus = 'draft' | 'active' | 'completed';

interface Season {
  id: string;
  name: string;
  year: number;
  startDate: string;
  endDate?: string;
  isActive: number;
  status: SeasonStatus;
  createdAt: string;
  updatedAt: string;
}

interface Event {
  id: string;
  season_id: string;
  track_id: string;
  track_name: string;
  race_date?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  session_type?: number;
  session_duration?: number;
  weather_air_temp?: number;
  weather_track_temp?: number;
  weather_rain_percentage?: number;
  created_at: string;
  updated_at: string;
}

interface Track {
  id: string;
  name: string;
  country: string;
  length_km: number;
}

interface SeasonsManagementProps {
  // No props needed for now
}

export const SeasonsManagement: React.FC<SeasonsManagementProps> = () => {
  const { refreshSeasons } = useSeason();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [selectedSeasonDetail, setSelectedSeasonDetail] = useState<Season | null>(null);
  const [newSeason, setNewSeason] = useState<{ name: string; year: number; setAsCurrent: boolean }>({ 
    name: '', 
    year: new Date().getFullYear(),
    setAsCurrent: false
  });
  const [newEvent, setNewEvent] = useState({ 
    track_id: '',
    track_name: '',
    status: 'scheduled' as 'scheduled' | 'completed' | 'cancelled',
    session_type: 10, // Default to race
    session_duration: 0,
    weather_air_temp: 20,
    weather_track_temp: 25,
    weather_rain_percentage: 0
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [formErrors, setFormErrors] = useState<{name?: string, year?: string}>({});
  const [editFormErrors, setEditFormErrors] = useState<{name?: string, year?: string}>({});

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  // Load events when a season is selected
  useEffect(() => {
    if (selectedSeason) {
      loadEvents(selectedSeason.id);
    }
  }, [selectedSeason]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load seasons and tracks in parallel
      const [seasonsRes, tracksRes] = await Promise.all([
        apiGet('/api/seasons'),
        apiGet('/api/tracks')
      ]);

      if (seasonsRes.ok) {
        const seasonsData = await seasonsRes.json();
        const fetchedSeasons: Season[] = seasonsData.seasons || [];
        setSeasons(fetchedSeasons);

        if (selectedSeason) {
          const refreshed = fetchedSeasons.find((s) => s.id === selectedSeason.id);
          if (refreshed) {
            setSelectedSeason(refreshed);
          }
        }

        if (selectedSeasonDetail) {
          const refreshedDetail = fetchedSeasons.find((s) => s.id === selectedSeasonDetail.id);
          if (refreshedDetail) {
            setSelectedSeasonDetail(refreshedDetail);
          }
        }

        if (editingSeason) {
          const refreshedEditing = fetchedSeasons.find((s) => s.id === editingSeason.id);
          if (refreshedEditing) {
            setEditingSeason(refreshedEditing);
          }
        }
      }

      if (tracksRes.ok) {
        const tracksData = await tracksRes.json();
        setTracks(tracksData.tracks || []);
      }

    } catch (error) {
      logger.error('Error loading data:', error);
      setStatus('error');
      setStatusMessage('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async (seasonId: string) => {
    try {
      const response = await apiGet(`/api/seasons/${seasonId}/events`);
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      logger.error('Error loading events:', error);
    }
  };

  const getSessionTypeName = (sessionType: number) => {
    const types = {
      0: 'Unknown',
      1: 'Practice 1',
      2: 'Practice 2', 
      3: 'Practice 3',
      4: 'Short Practice',
      5: 'Qualifying 1',
      6: 'Qualifying 2',
      7: 'Qualifying 3',
      8: 'Short Qualifying',
      9: 'OSQ',
      10: 'Race',
      11: 'Race 2',
      12: 'Time Trial'
    };
    return types[sessionType as keyof typeof types] || 'Unknown';
  };

  const getStatusColor = (status: SeasonStatus) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getEventStatusColor = (eventStatus: Event['status']) => {
    switch (eventStatus) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'scheduled':
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    }
  };

  const getStatusText = (status: SeasonStatus) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'completed':
        return 'Completed';
      default:
        return 'Draft';
    }
  };

  const handleAddSeason = async () => {
    const errors: {name?: string, year?: string} = {};
    
    if (!newSeason.name.trim()) {
      errors.name = 'Season name is required';
    }

    if (newSeason.year < 2020 || newSeason.year > 2030) {
      errors.year = 'Year must be between 2020 and 2030';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});

    try {
      setStatus('loading');
      setStatusMessage('Creating season...');

      const response = await apiPost('/api/seasons', {
        name: newSeason.name.trim(),
        year: newSeason.year,
        startDate: new Date().toISOString().split('T')[0], // Today's date
        status: newSeason.setAsCurrent ? 'active' : 'draft',
        setAsCurrent: newSeason.setAsCurrent,
      });

      if (response.ok) {
        setStatus('success');
        setStatusMessage('Season created successfully');
        setNewSeason({ 
          name: '', 
          year: new Date().getFullYear(),
          setAsCurrent: false
        });
        setFormErrors({});
        setShowAddModal(false);
        loadData(); // Reload the list
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create season');
      }
    } catch (error) {
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Failed to create season');
    }
  };

  const handleSeasonClick = (season: Season) => {
    setSelectedSeasonDetail(season);
  };

  const handleBackFromDetail = () => {
    setSelectedSeasonDetail(null);
    loadData();
  };

  const handleSeasonDetailUpdated = (updatedSeason: Season) => {
    setSeasons((prevSeasons) =>
      prevSeasons.map((season) => (season.id === updatedSeason.id ? { ...season, ...updatedSeason } : season)),
    );

    setSelectedSeason((prev) =>
      prev && prev.id === updatedSeason.id ? { ...prev, ...updatedSeason } : prev,
    );

    setSelectedSeasonDetail((prev) =>
      prev && prev.id === updatedSeason.id ? { ...prev, ...updatedSeason } : prev,
    );

    setEditingSeason((prev) =>
      prev && prev.id === updatedSeason.id ? { ...prev, ...updatedSeason } : prev,
    );
  };

  const handleUpdateSeason = async () => {
    if (!editingSeason) return;

    if (!editingSeason.name.trim()) {
      setStatus('error');
      setStatusMessage('Season name is required');
      return;
    }

    if (editingSeason.year < 2020 || editingSeason.year > 2030) {
      setStatus('error');
      setStatusMessage('Year must be between 2020 and 2030');
      return;
    }

    try {
      setStatus('loading');
      setStatusMessage('Updating season...');

      const payload: Record<string, any> = {
        name: editingSeason.name.trim(),
        year: editingSeason.year,
      };

      if (editingSeason.status === 'draft' || editingSeason.status === 'completed') {
        payload.status = editingSeason.status;
      }

      const response = await apiPut(`/api/seasons/${editingSeason.id}`, payload);

      if (response.ok) {
        setStatus('success');
        setStatusMessage('Season updated successfully');
        setShowEditModal(false);
        setEditingSeason(null);
        loadData(); // Reload the list
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update season');
      }
    } catch (error) {
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Failed to update season');
    }
  };

  const handleDeleteSeason = async (seasonId: string) => {
    if (!confirm('Are you sure you want to delete this season? This will also delete all associated races, drivers, and results. This action cannot be undone.')) {
      return;
    }

    try {
      setStatus('loading');
      setStatusMessage('Deleting season...');

      const response = await apiDelete(`/api/seasons/${seasonId}`);

      if (response.ok) {
        setStatus('success');
        setStatusMessage('Season deleted successfully');
        loadData(); // Reload the list
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete season');
      }
    } catch (error) {
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Failed to delete season');
    }
  };

  const handleSetCurrentSeason = async (seasonId: string) => {
    try {
      setStatus('loading');
      setStatusMessage('Setting current season...');

      const response = await apiPost(`/api/seasons/${seasonId}/activate`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to activate season');
      }

      const data = await response.json();
      const updatedSeason = data.season as Season | undefined;

      setStatus('success');
      setStatusMessage(`${updatedSeason?.name || 'Season'} is now the current season`);

      if (updatedSeason) {
        handleSeasonDetailUpdated(updatedSeason);
      }

      // Refresh SeasonContext to sync with database state
      await refreshSeasons();

      await loadData();
    } catch (error) {
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Failed to activate season');
    }
  };

  const handleEditStatusChange = (value: SeasonStatus) => {
    if (!editingSeason) {
      return;
    }

    if (value === 'active') {
      handleSetCurrentSeason(editingSeason.id);
      return;
    }

    setEditingSeason({ ...editingSeason, status: value });
  };

  const handleAddEvent = async () => {
    if (!selectedSeason) return;

    if (!newEvent.track_id) {
      setStatus('error');
      setStatusMessage('Please select a track');
      return;
    }

    try {
      setStatus('loading');
      setStatusMessage('Creating event...');

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          season_id: selectedSeason.id,
          track_id: newEvent.track_id,
          track_name: newEvent.track_name,
          status: newEvent.status,
          session_type: newEvent.session_type,
          session_duration: newEvent.session_duration,
          weather_air_temp: newEvent.weather_air_temp,
          weather_track_temp: newEvent.weather_track_temp,
          weather_rain_percentage: newEvent.weather_rain_percentage,
        }),
      });

      if (response.ok) {
        setStatus('success');
        setStatusMessage('Event created successfully');
        setNewEvent({ 
          track_id: '',
          track_name: '',
          status: 'scheduled',
          session_type: 10,
          session_duration: 0,
          weather_air_temp: 20,
          weather_track_temp: 25,
          weather_rain_percentage: 0
        });
        setShowAddEventModal(false);
        loadEvents(selectedSeason.id); // Reload events
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create event');
      }
    } catch (error) {
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Failed to create event');
    }
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setShowEditEventModal(true);
  };

  const handleUpdateEvent = async () => {
    if (!editingEvent) return;

    if (!editingEvent.track_id) {
      setStatus('error');
      setStatusMessage('Please select a track');
      return;
    }

    try {
      setStatus('loading');
      setStatusMessage('Updating event...');

      const response = await fetch(`/api/events/${editingEvent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          track_id: editingEvent.track_id,
          track_name: editingEvent.track_name,
          status: editingEvent.status,
          session_type: editingEvent.session_type,
          session_duration: editingEvent.session_duration,
          weather_air_temp: editingEvent.weather_air_temp,
          weather_track_temp: editingEvent.weather_track_temp,
          weather_rain_percentage: editingEvent.weather_rain_percentage,
        }),
      });

      if (response.ok) {
        setStatus('success');
        setStatusMessage('Event updated successfully');
        setShowEditEventModal(false);
        setEditingEvent(null);
        if (selectedSeason) {
          loadEvents(selectedSeason.id); // Reload events
        }
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update event');
      }
    } catch (error) {
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Failed to update event');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }

    try {
      setStatus('loading');
      setStatusMessage('Deleting event...');

      const response = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setStatus('success');
        setStatusMessage('Event deleted successfully');
        if (selectedSeason) {
          loadEvents(selectedSeason.id); // Reload events
        }
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete event');
      }
    } catch (error) {
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Failed to delete event');
    }
  };

  const clearStatus = () => {
    setStatus('idle');
    setStatusMessage('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading seasons...</span>
      </div>
    );
  }

  // If a season detail is selected, show season management page
  if (selectedSeasonDetail) {
    return (
      <SeasonDetail 
        season={selectedSeasonDetail} 
        onBack={handleBackFromDetail}
        onSeasonUpdated={handleSeasonDetailUpdated}
      />
    );
  }

  // If a season is selected, show events management
  if (selectedSeason) {
    return (
      <div className="space-y-6">
        {/* Header with back button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setSelectedSeason(null)}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedSeason.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Events Management</p>
            </div>
          </div>
          <button 
            onClick={() => setShowAddEventModal(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Event</span>
          </button>
        </div>


        {/* Status Message */}
        {status !== 'idle' && (
          <div className={`p-4 rounded-lg flex items-center justify-between ${
            status === 'success' ? 'bg-green-500/20 text-green-400' :
            status === 'error' ? 'bg-red-500/20 text-red-400' :
            'bg-blue-500/20 text-blue-400'
          }`}>
            <div className="flex items-center space-x-2">
              {status === 'success' && <CheckCircle className="w-5 h-5" />}
              {status === 'error' && <AlertCircle className="w-5 h-5" />}
              {status === 'loading' && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>}
              <span>{statusMessage}</span>
            </div>
            <button onClick={clearStatus} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Events List */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
          {events.length > 0 ? (
            <div className="flex flex-col gap-3">
              {events.map((event) => {
                const track = tracks.find(t => t.id === event.track_id);
                
                return (
                <div 
                  key={event.id} 
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                    onClick={() => handleEditEvent(event)}
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white">
                        <Flag className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-gray-900 dark:text-white font-medium">
                          {track?.name || event.track_name}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                          <span>Type: {getSessionTypeName(Number(event.session_type) || 0)}</span>
                          <span className={`px-2 py-1 rounded-full text-xs ${getEventStatusColor(event.status)}`}>
                            {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => handleDeleteEvent(event.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded text-sm flex items-center space-x-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No events created yet</p>
              <p className="text-sm">Add your first event to get started</p>
            </div>
          )}
        </div>

        {/* Add Event Modal */}
        {showAddEventModal && (
          <div 
            className="modal-overlay"
            onClick={() => setShowAddEventModal(false)}
          >
            <div 
              className="modal-panel max-w-2xl p-6 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Add Event to {selectedSeason.name}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Track *
                  </label>
                  <select
                    value={newEvent.track_id}
                    onChange={(e) => {
                      const selectedTrack = tracks.find(t => t.id === e.target.value);
                      setNewEvent({ 
                        ...newEvent, 
                        track_id: e.target.value,
                        track_name: selectedTrack?.name || ''
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Select a track...</option>
                    {tracks.map((track) => (
                      <option key={track.id} value={track.id}>
                        {track.eventName ? `${track.eventName} (${track.name})` : track.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Session Type
                  </label>
                  <select
                    value={newEvent.session_type}
                    onChange={(e) => setNewEvent({ ...newEvent, session_type: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value={1}>Practice 1</option>
                    <option value={2}>Practice 2</option>
                    <option value={3}>Practice 3</option>
                    <option value={4}>Short Practice</option>
                    <option value={5}>Qualifying 1</option>
                    <option value={6}>Qualifying 2</option>
                    <option value={7}>Qualifying 3</option>
                    <option value={8}>Short Qualifying</option>
                    <option value={9}>OSQ</option>
                    <option value={10}>Race</option>
                    <option value={11}>Race 2</option>
                    <option value={12}>Time Trial</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    value={newEvent.status}
                    onChange={(e) => setNewEvent({ ...newEvent, status: e.target.value as 'scheduled' | 'completed' | 'cancelled' })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Session Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={newEvent.session_duration}
                    onChange={(e) => setNewEvent({ ...newEvent, session_duration: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Air Temperature (°C)
                  </label>
                  <input
                    type="number"
                    value={newEvent.weather_air_temp}
                    onChange={(e) => setNewEvent({ ...newEvent, weather_air_temp: parseInt(e.target.value) || 20 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    min="-10"
                    max="50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Track Temperature (°C)
                  </label>
                  <input
                    type="number"
                    value={newEvent.weather_track_temp}
                    onChange={(e) => setNewEvent({ ...newEvent, weather_track_temp: parseInt(e.target.value) || 25 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    min="-10"
                    max="60"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Rain Percentage (%)
                  </label>
                  <input
                    type="number"
                    value={newEvent.weather_rain_percentage}
                    onChange={(e) => setNewEvent({ ...newEvent, weather_rain_percentage: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    min="0"
                    max="100"
                  />
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddEventModal(false);
                    setNewEvent({ 
                      track_id: '',
                      track_name: '',
                      status: 'scheduled',
                      session_type: 10,
                      session_duration: 0,
                      weather_air_temp: 20,
                      weather_track_temp: 25,
                      weather_rain_percentage: 0
                    });
                    clearStatus();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddEvent}
                  disabled={status === 'loading'}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                >
                  {status === 'loading' ? 'Creating...' : 'Create Event'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Event Modal */}
        {showEditEventModal && editingEvent && (
          <div 
            className="modal-overlay"
            onClick={() => setShowEditEventModal(false)}
          >
            <div 
              className="modal-panel max-w-2xl p-6 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Edit Event</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Track *
                  </label>
                  <select
                    value={editingEvent.track_id}
                    onChange={(e) => {
                      const selectedTrack = tracks.find(t => t.id === e.target.value);
                      setEditingEvent({ 
                        ...editingEvent, 
                        track_id: e.target.value,
                        track_name: selectedTrack?.name || ''
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Select a track...</option>
                    {tracks.map((track) => (
                      <option key={track.id} value={track.id}>
                        {track.eventName ? `${track.eventName} (${track.name})` : track.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Session Type
                  </label>
                  <select
                    value={editingEvent.session_type || 10}
                    onChange={(e) => setEditingEvent({ ...editingEvent, session_type: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value={1}>Practice 1</option>
                    <option value={2}>Practice 2</option>
                    <option value={3}>Practice 3</option>
                    <option value={4}>Short Practice</option>
                    <option value={5}>Qualifying 1</option>
                    <option value={6}>Qualifying 2</option>
                    <option value={7}>Qualifying 3</option>
                    <option value={8}>Short Qualifying</option>
                    <option value={9}>OSQ</option>
                    <option value={10}>Race</option>
                    <option value={11}>Race 2</option>
                    <option value={12}>Time Trial</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    value={editingEvent.status}
                    onChange={(e) => setEditingEvent({ ...editingEvent, status: e.target.value as 'scheduled' | 'completed' | 'cancelled' })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Session Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={editingEvent.session_duration || 0}
                    onChange={(e) => setEditingEvent({ ...editingEvent, session_duration: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Air Temperature (°C)
                  </label>
                  <input
                    type="number"
                    value={editingEvent.weather_air_temp || 20}
                    onChange={(e) => setEditingEvent({ ...editingEvent, weather_air_temp: parseInt(e.target.value) || 20 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    min="-10"
                    max="50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Track Temperature (°C)
                  </label>
                  <input
                    type="number"
                    value={editingEvent.weather_track_temp || 25}
                    onChange={(e) => setEditingEvent({ ...editingEvent, weather_track_temp: parseInt(e.target.value) || 25 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    min="-10"
                    max="60"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Rain Percentage (%)
                  </label>
                  <input
                    type="number"
                    value={editingEvent.weather_rain_percentage || 0}
                    onChange={(e) => setEditingEvent({ ...editingEvent, weather_rain_percentage: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    min="0"
                    max="100"
                  />
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditEventModal(false);
                    setEditingEvent(null);
                    clearStatus();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateEvent}
                  disabled={status === 'loading'}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                >
                  {status === 'loading' ? 'Updating...' : 'Update Event'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Default view - seasons list
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Seasons</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage your F1 league seasons</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Season</span>
        </button>
      </div>


      {/* Status Message */}
      {status !== 'idle' && (
        <div className={`p-4 rounded-lg flex items-center justify-between ${
          status === 'success' ? 'bg-green-500/20 text-green-400' :
          status === 'error' ? 'bg-red-500/20 text-red-400' :
          'bg-blue-500/20 text-blue-400'
        }`}>
          <div className="flex items-center space-x-2">
            {status === 'success' && <CheckCircle className="w-5 h-5" />}
            {status === 'error' && <AlertCircle className="w-5 h-5" />}
            {status === 'loading' && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>}
            <span>{statusMessage}</span>
          </div>
          <button onClick={clearStatus} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Seasons List */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
        {seasons.length > 0 ? (
          <div className="flex flex-col gap-3">
            {seasons.map((season) => (
              <div key={season.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer" onClick={() => handleSeasonClick(season)}>
                <div className="flex items-center space-x-4 flex-1">
                  <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-gray-900 dark:text-white font-medium">{season.name}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                      <span>Year: {season.year}</span>
                      <span>Started: {new Date(season.startDate).toLocaleDateString()}</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(season.status)}`}>
                        {getStatusText(season.status)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                  {season.status !== 'active' && (
                    <button
                      onClick={() => handleSetCurrentSeason(season.id)}
                      className="text-green-600 hover:text-green-700 transition-colors px-2 py-1 rounded text-sm flex items-center space-x-1"
                    >
                      <CheckCircle className="w-3 h-3" />
                      <span>Set Current</span>
                    </button>
                  )}
                  <button 
                    onClick={() => handleDeleteSeason(season.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded text-sm flex items-center space-x-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No seasons created yet</p>
            <p className="text-sm">Create your first season to get started</p>
          </div>
        )}
      </div>

      {/* Add Season Modal */}
      {showAddModal && (
        <div 
          className="modal-overlay"
          onClick={() => setShowAddModal(false)}
        >
          <div 
            className="modal-panel max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Add Season</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Season Name *
                </label>
                <input
                  type="text"
                  value={newSeason.name}
                  onChange={(e) => {
                    setNewSeason({ ...newSeason, name: e.target.value });
                    if (formErrors.name) {
                      setFormErrors({ ...formErrors, name: undefined });
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${
                    formErrors.name 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 dark:border-gray-600 focus:ring-red-500'
                  }`}
                  placeholder="e.g., F1 League 2024"
                />
                {formErrors.name && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.name}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Year *
                </label>
                <input
                  type="number"
                  value={newSeason.year}
                  onChange={(e) => {
                    setNewSeason({ ...newSeason, year: parseInt(e.target.value) || new Date().getFullYear() });
                    if (formErrors.year) {
                      setFormErrors({ ...formErrors, year: undefined });
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${
                    formErrors.year 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 dark:border-gray-600 focus:ring-red-500'
                  }`}
                  min="2020"
                  max="2030"
                />
                {formErrors.year && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.year}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Current Season
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    id="new-season-current"
                    type="checkbox"
                    checked={newSeason.setAsCurrent}
                    onChange={(e) => setNewSeason({ ...newSeason, setAsCurrent: e.target.checked })}
                    className="h-4 w-4 text-red-600 border-gray-300 dark:border-gray-600 rounded focus:ring-red-500"
                  />
                  <label htmlFor="new-season-current" className="text-sm text-gray-600 dark:text-gray-300">
                    Set this season as the current season after creation
                  </label>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewSeason({ 
                    name: '', 
                    year: new Date().getFullYear(),
                    setAsCurrent: false
                  });
                  clearStatus();
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSeason}
                disabled={status === 'loading'}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                {status === 'loading' ? 'Creating...' : 'Create Season'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Season Modal */}
      {showEditModal && editingSeason && (
        <div 
          className="modal-overlay"
          onClick={() => setShowEditModal(false)}
        >
          <div 
            className="modal-panel max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Edit Season</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Season Name *
                </label>
                <input
                  type="text"
                  value={editingSeason.name}
                  onChange={(e) => setEditingSeason({ ...editingSeason, name: e.target.value })}
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
                  value={editingSeason.year}
                  onChange={(e) => setEditingSeason({ ...editingSeason, year: parseInt(e.target.value) || editingSeason.year })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  min="2020"
                  max="2030"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={editingSeason.status ?? 'draft'}
                  onChange={(e) => handleEditStatusChange(e.target.value as SeasonStatus)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="draft">Draft</option>
                  <option value="completed">Completed</option>
                  <option value="active">Active (make current)</option>
                </select>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingSeason(null);
                  clearStatus();
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateSeason}
                disabled={status === 'loading'}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                {status === 'loading' ? 'Updating...' : 'Update Season'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
