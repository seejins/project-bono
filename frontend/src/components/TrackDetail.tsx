import React, { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, Trophy, Clock, Calendar, BarChart, Award } from 'lucide-react';
import logger from '../utils/logger';
import { getApiUrl } from '../utils/api';

interface TrackDetailProps {
  trackId: string;
  onBack: () => void;
}

interface TrackData {
  id: string;
  name: string;
  country: string;
  length: number;
  races: Race[];
  statistics: {
    totalRaces: number;
    uniqueWinners: number;
    mostWins: string;
    mostPoles: string;
    bestLapHolder: string;
    averageGap: string;
  };
}

interface Race {
  id: string;
  date: string;
  winner: string;
  polePosition: string;
  fastestLap: string;
  fastestTime: string;
  winningMargin: string;
  laps: number;
}

export const TrackDetail: React.FC<TrackDetailProps> = ({ trackId, onBack }) => {
  const [track, setTrack] = useState<TrackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const abortController = new AbortController();
    const signal = abortController.signal;

    const fetchTrackDetails = async () => {
      try {
        setLoading(true);
        const apiUrl = getApiUrl();
        const fetchOptions = { signal };
        
        // Parallel fetch: track data, races, and statistics simultaneously
        const [trackResponse, racesResponse, statsResponse] = await Promise.all([
          fetch(`${apiUrl}/api/tracks/${trackId}`, fetchOptions),
          fetch(`${apiUrl}/api/tracks/${trackId}/races`, fetchOptions),
          fetch(`${apiUrl}/api/tracks/${trackId}/statistics`, fetchOptions),
        ]);
        
        if (signal.aborted) return;
        
        if (trackResponse.ok) {
          const trackDataResult = await trackResponse.json();
          if (!signal.aborted) setTrack(trackDataResult.track);
        }
        
        if (racesResponse.ok) {
          const racesData = await racesResponse.json();
          if (!signal.aborted) {
            setTrack(prev => prev ? { ...prev, races: racesData.races || [] } : null);
          }
        }
        
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          if (!signal.aborted) {
            setTrack(prev => prev ? { ...prev, statistics: statsData.statistics } : null);
          }
        }
        
      } catch (error: any) {
        if (signal.aborted || error.name === 'AbortError') return;
        
        logger.error('Error fetching track details:', error);
        if (!signal.aborted) {
          setError('Failed to load track details');
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchTrackDetails();

    return () => {
      abortController.abort();
    };
  }, [trackId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <MapPin className="w-16 h-16 mx-auto mb-4 text-gray-400 animate-pulse" />
          <p className="text-xl text-gray-400">Loading track details...</p>
        </div>
      </div>
    );
  }

  if (!track) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <MapPin className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-xl text-gray-400">Track not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={onBack} 
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center space-x-2"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{track.name}</h1>
        <div className="w-10"></div> {/* Spacer */}
      </div>

      {/* Track Overview */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
        <div className="flex items-center space-x-6">
          <div className="w-24 h-24 bg-green-600 rounded-lg flex items-center justify-center">
            <MapPin className="w-12 h-12 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{track.name}</h2>
            <p className="text-lg text-gray-500 dark:text-gray-400">{track.country}</p>
            <p className="text-gray-600 dark:text-gray-300">Length: {track.length}km</p>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <BarChart className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Statistics</h2>
          </div>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="w-8 h-8 bg-blue-500/20 text-blue-500 rounded-lg flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Races</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{track.statistics.totalRaces}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="w-8 h-8 bg-green-500/20 text-green-500 rounded-lg flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Unique Winners</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{track.statistics.uniqueWinners}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="w-8 h-8 bg-yellow-500/20 text-yellow-500 rounded-lg flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Best Lap Holder</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{track.statistics.bestLapHolder}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Race History */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Race History</h2>
          </div>
        </div>
        <div className="p-6 overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Winner</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pole</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fastest Lap</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fastest Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Margin</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Laps</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {track.races.map((race) => (
                <tr key={race.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">{new Date(race.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      <span className="font-semibold text-gray-900 dark:text-white">{race.winner}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">{race.polePosition}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">{race.fastestLap}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-purple-500" />
                      <span className="text-purple-600 dark:text-purple-400 font-semibold">{race.fastestTime}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">{race.winningMargin}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">{race.laps}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
