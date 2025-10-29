import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, MapPin, Trophy, Flag, Zap } from 'lucide-react';
import { F123DataService, F123DriverResult } from '../services/F123DataService';

interface RaceDetailProps {
  raceId: string;
  onBack: () => void;
  onDriverSelect: (driverId: string, raceId: string) => void;
}

export const RaceDetail: React.FC<RaceDetailProps> = ({ raceId, onBack, onDriverSelect }) => {
  const [activeSession, setActiveSession] = useState<'qualifying' | 'race'>('race');
  const [raceData, setRaceData] = useState<any>(null);
  const [drivers, setDrivers] = useState<F123DriverResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRaceData();
  }, [raceId]);

  const fetchRaceData = async () => {
    try {
      setLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      
      // Fetch race data
      const raceResponse = await fetch(`${apiUrl}/api/races/${raceId}`);
      if (raceResponse.ok) {
        const raceDataResult = await raceResponse.json();
        setRaceData(raceDataResult.race);
      }
      
      // Fetch race results
      const resultsResponse = await fetch(`${apiUrl}/api/races/${raceId}/results`);
      if (resultsResponse.ok) {
        const resultsData = await resultsResponse.json();
        setDrivers(resultsData.results || []);
      }
      
    } catch (error) {
      console.error('Error fetching race data:', error);
      setError('Failed to load race data');
    } finally {
      setLoading(false);
    }
  };

  const getTeamColor = (team: string) => F123DataService.getTeamColor(team);

  const getPositionColor = (position: number) => F123DataService.getPositionColor(position);

  const handleDriverClick = (driver: F123DriverResult) => {
    onDriverSelect(driver.id, raceId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading race data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (!raceData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">No race data found</div>
      </div>
    );
  }

  // Find fastest sectors for qualifying
  const fastestS1 = Math.min(...drivers.map(d => d.qualifyingSector1Time || Infinity));
  const fastestS2 = Math.min(...drivers.map(d => d.qualifyingSector2Time || Infinity));
  const fastestS3 = Math.min(...drivers.map(d => d.qualifyingSector3Time || Infinity));

  return (
    <div className="max-w-[2048px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={onBack} 
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center space-x-2"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{raceData.name}</h1>
        <div className="w-10"></div>
      </div>

      {/* Race Info */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-red-600 rounded-lg flex items-center justify-center">
              <Flag className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{raceData.name}</h2>
              <div className="flex items-center space-x-2 mt-1">
                <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className="text-gray-500 dark:text-gray-400">{raceData.track}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
              <Calendar className="w-4 h-4" />
              <span>{raceData.date}</span>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {raceData.circuitLength} • {raceData.laps} laps
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${raceData.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{raceData.status}</span>
          </div>
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-500 dark:text-gray-400">{raceData.country}</span>
          </div>
        </div>
      </div>

      {/* Session Toggle */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveSession('qualifying')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeSession === 'qualifying'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Qualifying
          </button>
          <button
            onClick={() => setActiveSession('race')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeSession === 'race'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Race
          </button>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pos</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Driver</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Team</th>
                {activeSession === 'qualifying' ? (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Gap</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">S1</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">S2</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">S3</th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Points</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {drivers.map((driver) => (
                <tr 
                  key={driver.id} 
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  onClick={() => handleDriverClick(driver)}
                >
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getPositionColor(activeSession === 'qualifying' ? driver.qualifyingPosition : driver.racePosition)}`}>
                      {activeSession === 'qualifying' ? driver.qualifyingPosition : driver.racePosition}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-sm font-bold text-gray-700 dark:text-gray-300 mr-3">
                        {driver.number}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{driver.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2 ${getTeamColor(driver.team)}`}></div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{driver.team}</span>
                    </div>
                  </td>
                  {activeSession === 'qualifying' ? (
                    <>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {driver.qualifyingTime ? F123DataService.formatTimeFromMs(driver.qualifyingTime) : 'N/A'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {driver.qualifyingGap ? `+${F123DataService.formatTimeFromMs(driver.qualifyingGap)}` : 'Pole'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {driver.qualifyingSector1Time ? (
                          <span className={driver.qualifyingSector1Time === fastestS1 ? 'text-purple-600 font-bold' : ''}>
                            {F123DataService.formatTimeFromMs(driver.qualifyingSector1Time)}
                          </span>
                        ) : 'N/A'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {driver.qualifyingSector2Time ? (
                          <span className={driver.qualifyingSector2Time === fastestS2 ? 'text-purple-600 font-bold' : ''}>
                            {F123DataService.formatTimeFromMs(driver.qualifyingSector2Time)}
                          </span>
                        ) : 'N/A'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {driver.qualifyingSector3Time ? (
                          <span className={driver.qualifyingSector3Time === fastestS3 ? 'text-purple-600 font-bold' : ''}>
                            {F123DataService.formatTimeFromMs(driver.qualifyingSector3Time)}
                          </span>
                        ) : 'N/A'}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {driver.raceTime || 'N/A'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        <div className="flex items-center space-x-1">
                          <span>{driver.points}</span>
                          {driver.fastestLap && <Zap className="w-4 h-4 text-purple-600" />}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          driver.status === 'finished' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          driver.status === 'dnf' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}>
                          {driver.status}
                        </span>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};