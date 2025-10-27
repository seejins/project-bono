import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, X, Calendar, Clock, MapPin, Users, Settings } from 'lucide-react';
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

interface Member {
  id: string;
  name: string;
  isActive: boolean;
}

interface DriverMapping {
  id: string;
  seasonId: string;
  f123DriverId: number;
  f123DriverName: string;
  f123DriverNumber?: number;
  f123TeamName?: string;
  memberId?: string;
  isHuman: boolean;
  isActive: boolean;
}

interface F123Driver {
  id: number;
  name: string;
  number: number;
  team: string;
}

interface Driver {
  id: string;
  name: string;
  team: string;
  number: number;
}

interface SeasonDetailProps {
  season: Season;
  onBack: () => void;
  onUpdate: (updatedSeason: Season) => void;
}

export const SeasonDetail: React.FC<SeasonDetailProps> = ({ season, onBack, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'events' | 'drivers' | 'mapping'>('events');
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [showEditParticipant, setShowEditParticipant] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Driver | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [participants, setParticipants] = useState<Driver[]>([]);
  const [driverMappings, setDriverMappings] = useState<DriverMapping[]>([]);
  const [f123Drivers, setF123Drivers] = useState<F123Driver[]>([]);
  const [newEvent, setNewEvent] = useState<Partial<SeasonEvent>>({
    trackId: '',
    date: '',
    time: '15:00',
    includePractice: true,
    includeQualifying: true,
    includeRace: true
  });
  const [selectedMember, setSelectedMember] = useState<string>('');

  // Load data on component mount
  useEffect(() => {
    loadMembers();
    loadParticipants();
    loadDriverMappings();
    loadF123Drivers();
  }, [season.id]);

  const loadMembers = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/members`);
      const data = await response.json();
      if (data.success) {
        setMembers(data.members);
      } else {
        console.warn('Failed to load members, using empty array');
        setMembers([]);
      }
    } catch (error) {
      console.error('Failed to load members:', error);
      // Use mock data as fallback
      setMembers([
        { id: '1', name: 'John Smith', isActive: true },
        { id: '2', name: 'Jane Doe', isActive: true },
        { id: '3', name: 'Mike Johnson', isActive: true }
      ]);
    }
  };

  const loadParticipants = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/seasons/${season.id}/participants`);
      const data = await response.json();
      if (data.success) {
        setParticipants(data.participants.map((p: any) => ({
          id: p.id,
          name: p.name,
          team: p.team || 'TBD',
          number: p.number || 0
        })));
      } else {
        console.warn('Failed to load participants, using empty array');
        setParticipants([]);
      }
    } catch (error) {
      console.error('Failed to load participants:', error);
      setParticipants([]);
    }
  };

  const loadDriverMappings = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/upload/mappings/${season.id}`);
      const data = await response.json();
      if (data.mappings) {
        setDriverMappings(data.mappings);
      } else {
        console.warn('No driver mappings found, using empty array');
        setDriverMappings([]);
      }
    } catch (error) {
      console.error('Failed to load driver mappings:', error);
      // Use empty array as fallback
      setDriverMappings([]);
    }
  };

  const loadF123Drivers = () => {
    // Mock F1 23 drivers - in real implementation, this would come from UDP data
    const mockF123Drivers: F123Driver[] = [
      { id: 1, name: 'Lewis Hamilton', number: 44, team: 'Mercedes' },
      { id: 2, name: 'Max Verstappen', number: 1, team: 'Red Bull Racing' },
      { id: 3, name: 'Charles Leclerc', number: 16, team: 'Ferrari' },
      { id: 4, name: 'Lando Norris', number: 4, team: 'McLaren' },
      { id: 5, name: 'George Russell', number: 63, team: 'Mercedes' },
      { id: 6, name: 'Carlos Sainz', number: 55, team: 'Ferrari' },
      { id: 7, name: 'Sergio Perez', number: 11, team: 'Red Bull Racing' },
      { id: 8, name: 'Oscar Piastri', number: 81, team: 'McLaren' },
      { id: 9, name: 'Fernando Alonso', number: 14, team: 'Aston Martin' },
      { id: 10, name: 'Pierre Gasly', number: 10, team: 'Alpine' },
      { id: 11, name: 'Esteban Ocon', number: 31, team: 'Alpine' },
      { id: 12, name: 'Lance Stroll', number: 18, team: 'Aston Martin' },
      { id: 13, name: 'Yuki Tsunoda', number: 22, team: 'AlphaTauri' },
      { id: 14, name: 'Daniel Ricciardo', number: 3, team: 'AlphaTauri' },
      { id: 15, name: 'Valtteri Bottas', number: 77, team: 'Alfa Romeo' },
      { id: 16, name: 'Zhou Guanyu', number: 24, team: 'Alfa Romeo' },
      { id: 17, name: 'Kevin Magnussen', number: 20, team: 'Haas' },
      { id: 18, name: 'Nico Hulkenberg', number: 27, team: 'Haas' },
      { id: 19, name: 'Alex Albon', number: 23, team: 'Williams' },
      { id: 20, name: 'Logan Sargeant', number: 2, team: 'Williams' }
    ];
    setF123Drivers(mockF123Drivers);
  };

  const createDriverMapping = async (f123Driver: F123Driver, memberId: string) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/upload/mappings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          seasonId: season.id,
          f123DriverName: f123Driver.name,
          f123DriverNumber: f123Driver.number,
          yourDriverId: memberId
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        loadDriverMappings(); // Reload mappings
      } else {
        console.error('Failed to create driver mapping:', data.error);
        alert('Failed to create driver mapping: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to create driver mapping:', error);
      alert('Failed to create driver mapping. Please try again.');
    }
  };

  const addDriverToSeason = async () => {
    if (!selectedMember) {
      alert('Please select a member');
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/seasons/${season.id}/participants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberId: selectedMember
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        // Reload participants instead of updating season prop
        await loadParticipants();
        setSelectedMember('');
        setShowAddDriver(false);
      } else {
        console.error('Failed to add driver to season:', data.error);
        alert('Failed to add driver to season: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to add driver to season:', error);
      alert('Failed to add driver to season. Please try again.');
    }
  };

  const handleEditParticipant = (participant: Driver) => {
    setEditingParticipant(participant);
    setShowEditParticipant(true);
  };

  const handleUpdateParticipant = async () => {
    if (!editingParticipant) return;
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/seasons/${season.id}/participants/${editingParticipant.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          team: editingParticipant.team,
          number: editingParticipant.number
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        const updatedSeason = { ...season };
        updatedSeason.drivers = season.drivers.map(driver => 
          driver.id === editingParticipant.id ? editingParticipant : driver
        );
        onUpdate(updatedSeason);
        setShowEditParticipant(false);
        setEditingParticipant(null);
      } else {
        console.error('Failed to update participant:', data.error);
        alert('Failed to update participant: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to update participant:', error);
      alert('Failed to update participant. Please try again.');
    }
  };

  const handleRemoveParticipant = async (participantId: string) => {
    if (!confirm('Are you sure you want to remove this participant from the season?')) {
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/seasons/${season.id}/participants/${participantId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      if (data.success) {
        // Reload participants instead of updating season prop
        await loadParticipants();
      } else {
        console.error('Failed to remove participant:', data.error);
        alert('Failed to remove participant: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to remove participant:', error);
      alert('Failed to remove participant. Please try again.');
    }
  };

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
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{participants.length}</div>
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

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('events')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'events'
                  ? 'border-red-500 text-red-600 dark:text-red-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Calendar className="w-4 h-4 inline mr-2" />
              Events
            </button>
            <button
              onClick={() => setActiveTab('drivers')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'drivers'
                  ? 'border-red-500 text-red-600 dark:text-red-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Drivers
            </button>
            <button
              onClick={() => setActiveTab('mapping')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'mapping'
                  ? 'border-red-500 text-red-600 dark:text-red-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              Driver Mapping
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Events Tab */}
          {activeTab === 'events' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
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
          )}

          {/* Drivers Tab */}
          {activeTab === 'drivers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Season Participants</h2>
                <button
                  onClick={() => setShowAddDriver(true)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Driver</span>
                </button>
              </div>

              {participants.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No drivers added yet. Click "Add Driver" to add participants to this season.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {participants.map((driver) => (
                    <div key={driver.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                          <span className="text-red-600 dark:text-red-400 font-semibold">{driver.number}</span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{driver.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{driver.team}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => handleEditParticipant(driver)}
                          className="text-blue-600 hover:text-blue-700 transition-colors px-2 py-1 rounded text-sm"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleRemoveParticipant(driver.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Driver Mapping Tab */}
          {activeTab === 'mapping' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Driver Mapping</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Map F1 23 game drivers to your league members
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>How it works:</strong> When you upload session data from F1 23, the system needs to know which in-game drivers correspond to your league members. 
                  Map each F1 23 driver to a league member, or leave unmapped for AI drivers.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* F1 23 Drivers */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">F1 23 Drivers</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {f123Drivers.map((driver) => {
                      const mapping = driverMappings.find(m => m.f123DriverId === driver.id);
                      return (
                        <div key={driver.id} className={`p-3 rounded-lg border ${
                          mapping 
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                            : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                                <span className="text-red-600 dark:text-red-400 font-semibold text-sm">{driver.number}</span>
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">{driver.name}</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">{driver.team}</div>
                              </div>
                            </div>
                            {mapping ? (
                              <div className="text-sm text-green-600 dark:text-green-400">
                                ✓ Mapped to {members.find(m => m.id === mapping.memberId)?.name || 'Unknown'}
                              </div>
                            ) : (
                              <select
                                onChange={(e) => {
                                  if (e.target.value) {
                                    createDriverMapping(driver, e.target.value);
                                  }
                                }}
                                className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                defaultValue=""
                              >
                                <option value="">Map to...</option>
                                {members.filter(member => 
                                  participants.some(p => p.id === member.id)
                                ).map(member => (
                                  <option key={member.id} value={member.id}>{member.name}</option>
                                ))}
                              </select>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* League Members */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">League Members</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {members.map((member) => {
                      const mappingCount = driverMappings.filter(m => m.memberId === member.id).length;
                      return (
                        <div key={member.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">{member.name}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {mappingCount > 0 ? `${mappingCount} mapping${mappingCount > 1 ? 's' : ''}` : 'Not mapped'}
                              </div>
                            </div>
                            <div className={`w-3 h-3 rounded-full ${member.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Driver Modal */}
      {showAddDriver && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Add Driver to Season</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Member
                </label>
                <select
                  value={selectedMember}
                  onChange={(e) => setSelectedMember(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Select a member...</option>
                  {members.filter(member => !season.drivers.find(d => d.id === member.id)).map(member => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
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
                onClick={addDriverToSeason}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Add Driver
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Participant Modal */}
      {showEditParticipant && editingParticipant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Edit Participant</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Participant Name
                </label>
                <input
                  type="text"
                  value={editingParticipant.name}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Name cannot be changed (managed in Members section)</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Team
                </label>
                <input
                  type="text"
                  value={editingParticipant.team}
                  onChange={(e) => setEditingParticipant({ ...editingParticipant, team: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="e.g., Mercedes"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Car Number
                </label>
                <input
                  type="number"
                  value={editingParticipant.number}
                  onChange={(e) => setEditingParticipant({ ...editingParticipant, number: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="e.g., 44"
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEditParticipant(false);
                  setEditingParticipant(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateParticipant}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Update Participant
              </button>
            </div>
          </div>
        </div>
      )}

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
