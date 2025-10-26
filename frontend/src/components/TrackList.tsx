import React, { useState, useEffect } from 'react';
import { MapPin, Trophy, Clock, Calendar, ChevronRight } from 'lucide-react';

interface Track {
  id: string;
  name: string;
  country: string;
  length: number;
  races: number;
  lastRaced: string;
  winners: string[];
  fastestLap: string;
  fastestTime: string;
}

interface TrackListProps {
  onTrackSelect?: (trackId: string) => void;
}

export const TrackList: React.FC<TrackListProps> = ({ onTrackSelect }) => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'name' | 'races' | 'country'>('name');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterBy, setFilterBy] = useState<string>('all');

  useEffect(() => {
    fetchTracks();
  }, []);

  const fetchTracks = async () => {
    try {
      // TODO: Replace with actual API call
      // For now, using mock data
      const mockTracks: Track[] = [
        {
          id: 'track-1',
          name: 'Bahrain International Circuit',
          country: 'Bahrain',
          length: 5.412,
          races: 3,
          lastRaced: '2024-03-02',
          winners: ['Lewis Hamilton', 'Max Verstappen', 'Charles Leclerc'],
          fastestLap: 'Max Verstappen',
          fastestTime: '1:32.874'
        },
        {
          id: 'track-2',
          name: 'Silverstone Circuit',
          country: 'United Kingdom',
          length: 5.891,
          races: 2,
          lastRaced: '2024-07-07',
          winners: ['Lando Norris', 'Lewis Hamilton'],
          fastestLap: 'Lewis Hamilton',
          fastestTime: '1:27.097'
        },
        {
          id: 'track-3',
          name: 'Spa-Francorchamps',
          country: 'Belgium',
          length: 7.004,
          races: 2,
          lastRaced: '2024-08-28',
          winners: ['Max Verstappen', 'Lewis Hamilton'],
          fastestLap: 'Max Verstappen',
          fastestTime: '1:46.286'
        },
        {
          id: 'track-4',
          name: 'Circuit de Monaco',
          country: 'Monaco',
          length: 3.337,
          races: 1,
          lastRaced: '2024-05-26',
          winners: ['Charles Leclerc'],
          fastestLap: 'Charles Leclerc',
          fastestTime: '1:12.909'
        },
        {
          id: 'track-5',
          name: 'Circuit de Barcelona-Catalunya',
          country: 'Spain',
          length: 4.655,
          races: 2,
          lastRaced: '2024-06-23',
          winners: ['Carlos Sainz', 'Lewis Hamilton'],
          fastestLap: 'Lewis Hamilton',
          fastestTime: '1:18.149'
        },
        {
          id: 'track-6',
          name: 'Autodromo Nazionale Monza',
          country: 'Italy',
          length: 5.793,
          races: 1,
          lastRaced: '2024-09-01',
          winners: ['Max Verstappen'],
          fastestLap: 'Max Verstappen',
          fastestTime: '1:21.046'
        }
      ];
      
      setTracks(mockTracks);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching tracks:', error);
      setLoading(false);
    }
  };

  const sortedTracks = [...tracks].sort((a, b) => {
    switch (sortBy) {
      case 'races':
        return b.races - a.races;
      case 'country':
        return a.country.localeCompare(b.country);
      case 'name':
      default:
        return a.name.localeCompare(b.name);
    }
  });

  const filteredTracks = filterBy === 'all' 
    ? sortedTracks 
    : sortedTracks.filter(t => t.country.toLowerCase() === filterBy.toLowerCase());

  const uniqueCountries = [...new Set(tracks.map(t => t.country))].sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <MapPin className="w-16 h-16 mx-auto mb-4 text-gray-400 animate-pulse" />
          <p className="text-xl text-gray-400">Loading tracks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
            <MapPin className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tracks</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Filter */}
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="all">All Countries</option>
            {uniqueCountries.map(country => (
              <option key={country} value={country}>{country}</option>
            ))}
          </select>

          {/* Sort Options */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="name">Name</option>
            <option value="races">Most Races</option>
            <option value="country">Country</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                viewMode === 'grid' ? 'bg-red-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                viewMode === 'list' ? 'bg-red-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Tracks Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTracks.map((track) => (
            <div
              key={track.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm cursor-pointer hover:shadow-lg transition-all"
              onClick={() => onTrackSelect?.(track.id)}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-green-600/20 text-green-600 rounded-lg flex items-center justify-center">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{track.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{track.country}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                    <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                      <Trophy className="w-4 h-4" />
                      <span className="text-sm font-semibold">{track.races} races</span>
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                    <div className="flex items-center space-x-2 text-purple-600 dark:text-purple-400">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm font-semibold">{track.length}km</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-500 dark:text-gray-400">Last Raced</span>
                    <span className="text-gray-900 dark:text-white">{new Date(track.lastRaced).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-500 dark:text-gray-400">Most Wins</span>
                    <span className="text-gray-900 dark:text-white">
                      {track.winners.filter(w => w === track.winners[0]).length > 1 
                        ? `${track.winners[0]} (${track.winners.filter(w => w === track.winners[0]).length})`
                        : track.winners[0]
                      }
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Fastest Lap</span>
                    <span className="text-purple-600 dark:text-purple-400 font-semibold">{track.fastestLap}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Track</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Country</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Length</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Races</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fastest Lap</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Raced</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredTracks.map((track) => (
                  <tr
                    key={track.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => onTrackSelect?.(track.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">{track.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">{track.country}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">{track.length}km</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">{track.races}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-purple-600 dark:text-purple-400 font-semibold">{track.fastestLap}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{track.fastestTime}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">{new Date(track.lastRaced).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
