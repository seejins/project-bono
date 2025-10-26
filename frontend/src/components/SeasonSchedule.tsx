import React, { useState } from 'react';
import { Calendar, Clock, MapPin, Flag, ChevronLeft, ChevronRight, Plus, Edit, Trash2 } from 'lucide-react';

interface Race {
  id: string;
  trackId: string;
  trackName: string;
  country: string;
  date: string;
  time: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  type: 'race' | 'qualifying' | 'practice' | 'sprint';
  winner?: string;
  fastestLap?: string;
}

interface Season {
  id: string;
  name: string;
  year: number;
  races: Race[];
}

interface SeasonScheduleProps {
  season: Season;
  onBack: () => void;
  onRaceSelect?: (raceId: string) => void;
}

export const SeasonSchedule: React.FC<SeasonScheduleProps> = ({ season, onBack, onRaceSelect }) => {
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
      case 'scheduled': return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
      case 'cancelled': return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
      default: return 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✓';
      case 'scheduled': return '⏰';
      case 'cancelled': return '✗';
      default: return '?';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'race': return 'text-red-600 dark:text-red-400';
      case 'qualifying': return 'text-blue-600 dark:text-blue-400';
      case 'practice': return 'text-green-600 dark:text-green-400';
      case 'sprint': return 'text-purple-600 dark:text-purple-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getMonthName = (monthIndex: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthIndex];
  };

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const getRacesForMonth = (month: number, year: number) => {
    return season.races.filter(race => {
      const raceDate = new Date(race.date);
      return raceDate.getMonth() === month && raceDate.getFullYear() === year;
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    } else {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    }
  };

  const renderCalendarView = () => {
    const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
    const firstDay = getFirstDayOfMonth(selectedMonth, selectedYear);
    const racesForMonth = getRacesForMonth(selectedMonth, selectedYear);
    
    const days = [];
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24"></div>);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayRaces = racesForMonth.filter(race => 
        new Date(race.date).getDate() === day
      );
      
      days.push(
        <div key={day} className="h-24 border border-gray-200 dark:border-gray-700 p-1">
          <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">{day}</div>
          <div className="space-y-1">
            {dayRaces.map(race => (
              <div
                key={race.id}
                onClick={() => onRaceSelect?.(race.id)}
                className={`text-xs p-1 rounded cursor-pointer hover:opacity-80 transition-opacity ${getStatusColor(race.status)}`}
                title={`${race.trackName} - ${race.type}`}
              >
                <div className="font-medium truncate">{race.trackName}</div>
                <div className="flex items-center space-x-1">
                  <span className={getTypeColor(race.type)}>{race.type}</span>
                  <span>{getStatusIcon(race.status)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {getMonthName(selectedMonth)} {selectedYear}
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 py-2">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {days}
        </div>
      </div>
    );
  };

  const renderListView = () => {
    const sortedRaces = [...season.races].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return (
      <div className="space-y-4">
        {sortedRaces.map(race => (
          <div
            key={race.id}
            onClick={() => onRaceSelect?.(race.id)}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold ${getStatusColor(race.status)}`}>
                  {new Date(race.date).getDate()}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{race.trackName}</h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-4 h-4" />
                      <span>{race.country}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(race.date)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{formatTime(race.time)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(race.status)}`}>
                  {race.status}
                </div>
                <div className={`text-sm font-medium ${getTypeColor(race.type)}`}>
                  {race.type}
                </div>
                {race.winner && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Winner: {race.winner}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{season.name}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Season Schedule</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-3 py-2 rounded-lg transition-colors ${
              viewMode === 'calendar'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Calendar
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-2 rounded-lg transition-colors ${
              viewMode === 'list'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            List
          </button>
        </div>
      </div>

      {/* Season Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{season.races.length}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Total Races</div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {season.races.filter(r => r.status === 'completed').length}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Completed</div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {season.races.filter(r => r.status === 'scheduled').length}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Scheduled</div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {season.races.filter(r => r.status === 'cancelled').length}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Cancelled</div>
        </div>
      </div>

      {/* View Content */}
      {viewMode === 'calendar' ? renderCalendarView() : renderListView()}
    </div>
  );
};
