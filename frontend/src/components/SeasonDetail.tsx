import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Plus, Edit, Trash2, Users, Calendar, Trophy, Flag } from 'lucide-react';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';
import { F123_TRACKS, F123Track } from '../data/f123Tracks';
import { F123_TEAMS } from '../data/f123Teams';

const TEAM_OPTIONS = F123_TEAMS.map((team) => team.name);

type SeasonStatus = 'draft' | 'active' | 'completed';

interface Season {
  id: string;
  name: string;
  year: number;
  startDate: string;
  endDate?: string;
  status: SeasonStatus;
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

interface Member {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  steam_id?: string;
  team?: string;
  number?: number;
  seasonId?: string;
  isActive?: boolean;
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
  session_types?: string; // Comma-separated session types
  session_duration?: number;
  weather_air_temp?: number;
  weather_track_temp?: number;
  weather_rain_percentage?: number;
  created_at: string;
  updated_at: string;
  track?: {
    id: string;
    name: string;
    country: string;
    length: number;
  };
}

interface SeasonDetailProps {
  season: Season;
  onBack: () => void;
  onSeasonUpdated?: (season: Season) => void;
}

export const SeasonDetail: React.FC<SeasonDetailProps> = ({ season, onBack, onSeasonUpdated }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [seasonDrivers, setSeasonDrivers] = useState<Member[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [localSeasonStatus, setLocalSeasonStatus] = useState<SeasonStatus>(season.status);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'drivers' | 'events'>('drivers');
  const [showAddDriverModal, setShowAddDriverModal] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const initialParticipantForm = { memberId: '', team: '', number: '' };
  const [newParticipant, setNewParticipant] = useState(initialParticipantForm);
  const [newParticipantErrors, setNewParticipantErrors] = useState<{ memberId?: string; team?: string }>({});
  const [showEditParticipantModal, setShowEditParticipantModal] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Member | null>(null);
  const [editParticipantForm, setEditParticipantForm] = useState({ team: '', number: '' });
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [showActivationWarning, setShowActivationWarning] = useState(false);
  const [conflictingSeason, setConflictingSeason] = useState<any>(null);
const teamOptions = useMemo(() => TEAM_OPTIONS, []);
const editTeamOptions = useMemo(() => {
  if (!editingParticipant?.team) {
    return teamOptions;
  }

  const currentTeam = editingParticipant.team;
  if (teamOptions.includes(currentTeam)) {
    return teamOptions;
  }

  return [...teamOptions, currentTeam];
}, [teamOptions, editingParticipant]);

  const getMemberDisplayName = (member: Member) => {
    const parts = [member.firstName, member.lastName].filter(
      (part) => !!part && part.trim().length > 0
    ) as string[];
    if (parts.length > 0) {
      return parts.join(' ');
    }
    return member.name;
  };

  const getMemberInitials = (member: Member) => {
    const parts = [member.firstName, member.lastName].filter(
      (part) => !!part && part.trim().length > 0
    ) as string[];
    if (parts.length > 0) {
      return parts.map((part) => part.charAt(0)).join('').toUpperCase();
    }
    return member.name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const [newEvent, setNewEvent] = useState({
    track_id: '',
    session_types: {
      practice: false,
      qualifying: false,
      race: false
    }
  });

  const [editEvent, setEditEvent] = useState({
    track_id: '',
    session_types: {
      practice: false,
      qualifying: false,
      race: false
    }
  });

  useEffect(() => {
    loadData();
  }, [season.id]);

  useEffect(() => {
    setLocalSeasonStatus(season.status);
  }, [season.status]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load all drivers, season drivers, events, and seasons in parallel
      const [driversRes, seasonDriversRes, eventsRes, seasonsRes] = await Promise.all([
        apiGet('/api/drivers'),
        apiGet(`/api/seasons/${season.id}/participants`),
        apiGet(`/api/seasons/${season.id}/events`),
        apiGet('/api/seasons')
      ]);

      if (driversRes.ok) {
        const driversData = await driversRes.json();
        setMembers(driversData.drivers || []);
      }

      if (seasonDriversRes.ok) {
        const driversData = await seasonDriversRes.json();
        setSeasonDrivers(driversData.participants || []);
      }

      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setEvents(eventsData.events || []);
      }

      if (seasonsRes.ok) {
        const seasonsData = await seasonsRes.json();
        const fetchedSeasons: Season[] = seasonsData.seasons || [];
        setSeasons(fetchedSeasons);

        if (onSeasonUpdated) {
          const refreshed = fetchedSeasons.find((item) => item.id === season.id);
          if (refreshed) {
            onSeasonUpdated(refreshed);
            setLocalSeasonStatus(refreshed.status);
          }
        }
      }
    } catch (error) {
      console.error('Error loading season data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDriver = async () => {
    const errors: { memberId?: string; team?: string } = {};

    if (!newParticipant.memberId) {
      errors.memberId = 'Select a league member';
    }

    if (!newParticipant.team.trim()) {
      errors.team = 'Team is required';
    }

    if (Object.keys(errors).length > 0) {
      setNewParticipantErrors(errors);
      return;
    }

    try {
      setStatus('loading');
      setStatusMessage('Adding member to season...');
      setNewParticipantErrors({});

      const response = await apiPost(`/api/seasons/${season.id}/participants`, {
        driverId: newParticipant.memberId,
        team: newParticipant.team.trim(),
        number: newParticipant.number ? parseInt(newParticipant.number, 10) : undefined
      });

      if (response.ok) {
        setStatus('success');
      setStatusMessage('Driver added to season successfully');
        setShowAddDriverModal(false);
        setNewParticipant(initialParticipantForm);
        loadData(); // Reload the data
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add member to season');
      }
    } catch (error) {
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Failed to add member to season');
    }
  };

  const handleEditParticipant = (participant: Member) => {
    setEditingParticipant(participant);
    setEditParticipantForm({
      team: participant.team || '',
      number: participant.number != null ? String(participant.number) : ''
    });
    setShowEditParticipantModal(true);
  };

  const handleUpdateParticipant = async () => {
    if (!editingParticipant) return;

    try {
      setStatus('loading');
      setStatusMessage('Updating season member...');

      const trimmedTeam = editParticipantForm.team.trim();
      const numberValue = editParticipantForm.number.trim();

      const response = await apiPut(
        `/api/seasons/${season.id}/participants/${editingParticipant.id}`,
        {
          team: trimmedTeam,
          number: numberValue !== '' ? parseInt(numberValue, 10) : undefined
        }
      );

      if (response.ok) {
        setStatus('success');
        setStatusMessage('Season member updated successfully');
        setShowEditParticipantModal(false);
        setEditingParticipant(null);
        setEditParticipantForm({ team: '', number: '' });
        loadData();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update season member');
      }
    } catch (error) {
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Failed to update season member');
    }
  };

  const handleAddEvent = async () => {
    try {
      setStatus('loading');
      setStatusMessage('Adding event to season...');

      // Find the selected track
      const selectedTrack = F123_TRACKS.find(track => track.id === newEvent.track_id);
      if (!selectedTrack) {
        throw new Error('Please select a track');
      }

      // Create session types array based on checkboxes
      const sessionTypes = [];
      if (newEvent.session_types.practice) sessionTypes.push('Practice');
      if (newEvent.session_types.qualifying) sessionTypes.push('Qualifying');
      if (newEvent.session_types.race) sessionTypes.push('Race');

      if (sessionTypes.length === 0) {
        throw new Error('Please select at least one session type');
      }

      const response = await apiPost(`/api/seasons/${season.id}/events`, {
        track_name: selectedTrack.name,
        track_id: selectedTrack.id,
        session_types: sessionTypes.join(', '), // Store as comma-separated string
        session_type: 10 // Default to Race for now, can be enhanced later
      });

      if (response.ok) {
        setStatus('success');
        setStatusMessage('Event added to season successfully');
        setShowAddEventModal(false);
        setNewEvent({
          track_id: '',
          session_types: { practice: false, qualifying: false, race: false }
        });
        loadData(); // Reload the data
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add event to season');
      }
    } catch (error) {
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Failed to add event to season');
    }
  };

  const handleEditEvent = (event: any) => {
    // Find the track ID from F123_TRACKS based on track name
    const track = F123_TRACKS.find(t => t.name === event.track_name);
    
    // Parse session types from the comma-separated string
    const sessionTypes = event.session_types ? event.session_types.split(', ') : [];
    
    setEditEvent({
      track_id: track?.id || '',
      session_types: {
        practice: sessionTypes.includes('Practice'),
        qualifying: sessionTypes.includes('Qualifying'),
        race: sessionTypes.includes('Race')
      }
    });
    
    setEditingEvent(event);
    setShowEditEventModal(true);
  };

  const handleUpdateEvent = async () => {
    if (!editingEvent) return;

    try {
      setStatus('loading');
      setStatusMessage('Updating event...');

      // Find the selected track
      const selectedTrack = F123_TRACKS.find(track => track.id === editEvent.track_id);
      if (!selectedTrack) {
        throw new Error('Please select a track');
      }

      // Create session types array based on checkboxes
      const sessionTypes = [];
      if (editEvent.session_types.practice) sessionTypes.push('Practice');
      if (editEvent.session_types.qualifying) sessionTypes.push('Qualifying');
      if (editEvent.session_types.race) sessionTypes.push('Race');

      if (sessionTypes.length === 0) {
        throw new Error('Please select at least one session type');
      }

      const response = await apiPut(`/api/seasons/${season.id}/events/${editingEvent.id}`, {
        track_name: selectedTrack.name,
        session_types: sessionTypes.join(', '), // Store as comma-separated string
        session_type: 10 // Default to Race for now, can be enhanced later
      });

      if (response.ok) {
        setStatus('success');
        setStatusMessage('Event updated successfully');
        setShowEditEventModal(false);
        setEditingEvent(null);
        setEditEvent({
          track_id: '',
          session_types: { practice: false, qualifying: false, race: false }
        });
        loadData(); // Reload data
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
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      setStatus('loading');
      setStatusMessage('Deleting event...');

      const response = await apiDelete(`/api/seasons/${season.id}/events/${eventId}`);

      if (response.ok) {
        setStatus('success');
        setStatusMessage('Event deleted successfully');
        loadData(); // Reload data
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete event');
      }
    } catch (error) {
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Failed to delete event');
    }
  };

  const handleRemoveDriver = async (driverId: string) => {
    if (!confirm('Are you sure you want to remove this member from the season?')) {
      return;
    }

    try {
      setStatus('loading');
      setStatusMessage('Removing member from season...');

      const response = await apiDelete(`/api/seasons/${season.id}/participants/${driverId}`);

      if (response.ok) {
        setStatus('success');
      setStatusMessage('Driver removed from season successfully');
        loadData(); // Reload the data
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to remove member from season');
      }
    } catch (error) {
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Failed to remove member from season');
    }
  };

  const getSessionTypeName = (sessionType: number) => {
    const types: { [key: number]: string } = {
      0: 'Unknown',
      1: 'Practice 1',
      2: 'Practice 2',
      3: 'Practice 3',
      4: 'Short Practice',
      5: 'Qualifying 1',
      6: 'Qualifying 2',
      7: 'Qualifying 3',
      8: 'Short Qualifying',
      9: 'One Shot Qualifying',
      10: 'Race',
      11: 'Race 2',
      12: 'Time Trial'
    };
    return types[sessionType as keyof typeof types] || 'Unknown';
  };

  const handleSeasonStatusChange = async (newStatus: SeasonStatus) => {
    try {
      if (newStatus === 'active') {
        const activeSeasons = seasons.filter((s) => s.status === 'active' && s.id !== season.id);

        if (activeSeasons.length > 0) {
          setConflictingSeason(activeSeasons[0]);
          setShowActivationWarning(true);
          return;
        }

        await activateSeason();
        return;
      }

      await updateSeasonStatus(newStatus);
    } catch (error) {
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Failed to update season status');
    }
  };

  const activateSeason = async () => {
    try {
      setStatus('loading');
      setStatusMessage('Setting current season...');

      const response = await apiPost(`/api/seasons/${season.id}/activate`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update season status');
      }

      const data = await response.json();
      const updatedSeason: Season | undefined = data?.season;

      setStatus('success');
      setStatusMessage('Season status updated successfully');

      if (updatedSeason) {
        setLocalSeasonStatus(updatedSeason.status);
        onSeasonUpdated?.(updatedSeason);
      } else {
        setLocalSeasonStatus('active');
      }

      loadData();
    } catch (error) {
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Failed to update season status');
    }
  };

  const updateSeasonStatus = async (newStatus: SeasonStatus) => {
    if (newStatus === 'active') {
      return;
    }

    try {
      setStatus('loading');
      setStatusMessage('Updating season status...');

      const response = await apiPut(`/api/seasons/${season.id}`, {
        status: newStatus,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update season status');
      }

      const data = await response.json();
      const updatedSeason: Season | undefined = data?.season;

      setStatus('success');
      setStatusMessage('Season status updated successfully');

      if (updatedSeason) {
        setLocalSeasonStatus(updatedSeason.status);
        onSeasonUpdated?.(updatedSeason);
      } else {
        setLocalSeasonStatus(newStatus);
      }

      loadData();
    } catch (error) {
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Failed to update season status');
    }
  };

  const handleDismissWarning = () => {
    setShowActivationWarning(false);
    setConflictingSeason(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading season details...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <button
          onClick={onBack}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
            <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{season.name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Season {season.year}</p>
      </div>
        </div>
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-700 dark:text-gray-300">Status:</label>
          <select
            value={localSeasonStatus}
            onChange={(e) => handleSeasonStatusChange(e.target.value as SeasonStatus)}
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300 focus:ring-red-500 focus:border-red-500"
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Status Message */}
      {statusMessage && (
        <div className={`p-3 rounded-lg ${
          status === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
          status === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
          'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
        }`}>
          {statusMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('drivers')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                activeTab === 'drivers'
              ? 'bg-red-600 text-white'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
        >
          <Users className="w-4 h-4" />
          <span>Drivers ({seasonDrivers.length})</span>
            </button>
            <button
          onClick={() => setActiveTab('events')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
            activeTab === 'events'
              ? 'bg-red-600 text-white'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Events ({events.length})</span>
                </button>
              </div>

        {/* Drivers Tab */}
          {activeTab === 'drivers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Season Drivers</h3>
                <button
                  onClick={() => {
                    setNewParticipant(initialParticipantForm);
                    setNewParticipantErrors({});
                    setShowAddDriverModal(true);
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Driver</span>
                </button>
              </div>

          {seasonDrivers.length > 0 ? (
            <div className="grid gap-4">
              {seasonDrivers.map((driver) => (
                <div key={driver.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {getMemberInitials(driver)}
                        </span>
                        </div>
                        <div>
                        <p className="text-gray-900 dark:text-white font-medium">{getMemberDisplayName(driver)}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {driver.team ? `${driver.team}${driver.number ? ` • #${driver.number}` : ''}` : 'Team not set'}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          Steam ID: {driver.steam_id || 'Not set'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleEditParticipant(driver)}
                        className="text-gray-400 hover:text-blue-500 transition-colors px-2 py-1 rounded text-sm flex items-center space-x-1"
                      >
                        <Edit className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button 
                        onClick={() => handleRemoveDriver(driver.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded text-sm flex items-center space-x-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    </div>
                      </div>
                    </div>
                  ))}
                </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No drivers added to this season yet</p>
              <p className="text-sm">Add drivers to start building your season roster</p>
            </div>
          )}
            </div>
          )}

      {/* Events Tab */}
      {activeTab === 'events' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Season Events</h3>
            <button 
              onClick={() => setShowAddEventModal(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Event</span>
            </button>
              </div>

          {events.length > 0 ? (
            <div className="flex flex-col gap-3">
              {events.map((event) => (
                <div 
                  key={event.id} 
                  className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                  onClick={() => handleEditEvent(event)}
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                      <Flag className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-gray-900 dark:text-white font-medium">{event.track_name}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                        <span>Sessions: {event.session_types || getSessionTypeName(event.session_type || 0)}</span>
                        {event.track && event.track.length && (
                          <span>
                            {event.track.length}km {event.track.name ? `• ${event.track.name}` : ''}
                          </span>
                        )}
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(event.status)}`}>
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
              ))}
              </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No events added to this season yet</p>
              <p className="text-sm">Add events to schedule races and sessions</p>
            </div>
          )}
        </div>
      )}

      {/* Add Driver Modal */}
      {showAddDriverModal && (
        <div className="modal-overlay">
          <div className="modal-panel max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Add Driver to Season</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select League Member *
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700"
                  value={newParticipant.memberId}
                  onChange={(e) => {
                    setNewParticipant({ ...newParticipant, memberId: e.target.value });
                    if (newParticipantErrors.memberId) {
                      setNewParticipantErrors({ ...newParticipantErrors, memberId: undefined });
                    }
                  }}
                >
                  <option value="">Choose a league member...</option>
                  {members
                    .filter(member => !seasonDrivers.some(driver => driver.id === member.id))
                    .map((member) => (
                      <option key={member.id} value={member.id}>
                        {getMemberDisplayName(member)} {member.steam_id ? `(${member.steam_id})` : ''}
                      </option>
                  ))}
                </select>
                {newParticipantErrors.memberId && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{newParticipantErrors.memberId}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Team *
                </label>
                <select
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${
                    newParticipantErrors.team
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 dark:border-gray-600 focus:ring-red-500'
                  }`}
                  value={newParticipant.team}
                  onChange={(e) => {
                    setNewParticipant({ ...newParticipant, team: e.target.value });
                    if (newParticipantErrors.team) {
                      setNewParticipantErrors({ ...newParticipantErrors, team: undefined });
                    }
                  }}
                >
                  <option value="">Select a team</option>
                  {teamOptions.map((team) => (
                    <option key={team} value={team}>
                      {team}
                    </option>
                  ))}
                </select>
                {newParticipantErrors.team && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{newParticipantErrors.team}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Car Number
                </label>
                <input
                  type="number"
                  value={newParticipant.number}
                  onChange={(e) => setNewParticipant({ ...newParticipant, number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Optional"
                  min="0"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddDriverModal(false);
                  setNewParticipant(initialParticipantForm);
                  setNewParticipantErrors({});
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddDriver}
                disabled={status === 'loading'}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                {status === 'loading' ? 'Adding...' : 'Add Driver'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Driver Modal */}
      {showEditParticipantModal && editingParticipant && (
        <div className="modal-overlay">
          <div className="modal-panel max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Edit {getMemberDisplayName(editingParticipant)}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Team
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  value={editParticipantForm.team}
                  onChange={(e) => setEditParticipantForm({ ...editParticipantForm, team: e.target.value })}
                >
                  <option value="">Select a team</option>
                  {editTeamOptions.map((team) => (
                    <option key={team} value={team}>
                      {team}
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
                  value={editParticipantForm.number}
                  onChange={(e) => setEditParticipantForm({ ...editParticipantForm, number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Optional"
                  min="0"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEditParticipantModal(false);
                  setEditingParticipant(null);
                  setEditParticipantForm({ team: '', number: '' });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateParticipant}
                disabled={status === 'loading'}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                {status === 'loading' ? 'Updating...' : 'Update Driver'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Event Modal */}
      {showAddEventModal && (
        <div className="modal-overlay">
          <div className="modal-panel max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Add Event to {season.name}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Track
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700"
                  value={newEvent.track_id}
                  onChange={(e) => setNewEvent({ ...newEvent, track_id: e.target.value })}
                >
                  <option value="">-- Select a track --</option>
                  {F123_TRACKS.map((track) => (
                    <option key={track.id} value={track.id}>
                      {track.name} ({track.country})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Session Types
                </label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={newEvent.session_types.practice}
                      onChange={(e) => setNewEvent({
                        ...newEvent,
                        session_types: { ...newEvent.session_types, practice: e.target.checked }
                      })}
                      className="w-4 h-4 text-red-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Practice</span>
                    </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={newEvent.session_types.qualifying}
                      onChange={(e) => setNewEvent({
                        ...newEvent,
                        session_types: { ...newEvent.session_types, qualifying: e.target.checked }
                      })}
                      className="w-4 h-4 text-red-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Qualifying</span>
                    </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={newEvent.session_types.race}
                      onChange={(e) => setNewEvent({
                        ...newEvent,
                        session_types: { ...newEvent.session_types, race: e.target.checked }
                      })}
                      className="w-4 h-4 text-red-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Race</span>
                    </label>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddEventModal(false);
                  setNewEvent({
                    track_id: '',
                    session_types: { practice: false, qualifying: false, race: false }
                  });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddEvent}
                disabled={!newEvent.track_id || (!newEvent.session_types.practice && !newEvent.session_types.qualifying && !newEvent.session_types.race)}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                Add Event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {showEditEventModal && editingEvent && (
        <div className="modal-overlay">
          <div className="modal-panel max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Edit Event</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Track
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700"
                  value={editEvent.track_id}
                  onChange={(e) => setEditEvent({ ...editEvent, track_id: e.target.value })}
                >
                  <option value="">-- Select a track --</option>
                  {F123_TRACKS.map((track) => (
                    <option key={track.id} value={track.id}>
                      {track.name} ({track.country})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Session Types
                </label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={editEvent.session_types.practice}
                      onChange={(e) => setEditEvent({
                        ...editEvent,
                        session_types: { ...editEvent.session_types, practice: e.target.checked }
                      })}
                      className="w-4 h-4 text-red-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Practice</span>
                    </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={editEvent.session_types.qualifying}
                      onChange={(e) => setEditEvent({
                        ...editEvent,
                        session_types: { ...editEvent.session_types, qualifying: e.target.checked }
                      })}
                      className="w-4 h-4 text-red-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Qualifying</span>
                    </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={editEvent.session_types.race}
                      onChange={(e) => setEditEvent({
                        ...editEvent,
                        session_types: { ...editEvent.session_types, race: e.target.checked }
                      })}
                      className="w-4 h-4 text-red-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Race</span>
                    </label>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEditEventModal(false);
                  setEditingEvent(null);
                  setEditEvent({
                    track_id: '',
                    session_types: { practice: false, qualifying: false, race: false }
                  });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateEvent}
                disabled={!editEvent.track_id || (!editEvent.session_types.practice && !editEvent.session_types.qualifying && !editEvent.session_types.race)}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                Update Event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activation Warning Modal */}
      {showActivationWarning && conflictingSeason && (
        <div className="modal-overlay">
          <div className="modal-panel max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Season Already Active</h3>
            
            <div className="mb-4">
              <p className="text-gray-700 dark:text-gray-300 mb-2">
                Only one season can be active at a time. The following season is currently active:
              </p>
              <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                <p className="font-medium text-gray-900 dark:text-white">
                  {conflictingSeason.name} ({conflictingSeason.year})
                </p>
              </div>
            </div>

            <p className="text-gray-600 dark:text-gray-400 mb-6">
              To activate this season, you must first deactivate the current active season from its own page.
            </p>

            <div className="flex space-x-3">
              <button
                onClick={handleDismissWarning}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};