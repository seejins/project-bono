import React, { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Zap, Clock, MapPin, Calendar } from 'lucide-react';
import { F123DataService, F123DriverResult } from '../services/F123DataService';

interface DriverRaceAnalysisProps {
  driverId: string;
  raceId: string;
  onBack: () => void;
}

interface LapData {
  lapNumber: number;
  lapTime: number;
  s1Time: number;
  s2Time: number;
  s3Time: number;
  position: number;
  gap: number;
  tireCompound: string;
  isPersonalBest: boolean;
  isFastestS1: boolean;
  isFastestS2: boolean;
  isFastestS3: boolean;
  isFastestLap: boolean;
}

export const DriverRaceAnalysis: React.FC<DriverRaceAnalysisProps> = ({ driverId, raceId, onBack }) => {
  const [driver, setDriver] = useState<F123DriverResult | null>(null);
  const [raceData, setRaceData] = useState<any>(null);
  const [lapData, setLapData] = useState<LapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDriverRaceData();
  }, [driverId, raceId]);

  const fetchDriverRaceData = async () => {
    try {
      setLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      
      // Fetch driver data
      const driverResponse = await fetch(`${apiUrl}/api/members/${driverId}`);
      if (driverResponse.ok) {
        const driverData = await driverResponse.json();
        setDriver(driverData.member);
      }
      
      // Fetch race data
      const raceResponse = await fetch(`${apiUrl}/api/races/${raceId}`);
      if (raceResponse.ok) {
        const raceDataResult = await raceResponse.json();
        setRaceData(raceDataResult.race);
      }
      
      // Fetch lap data for this driver in this race
      const lapDataResponse = await fetch(`${apiUrl}/api/races/${raceId}/lap-data/${driverId}`);
      if (lapDataResponse.ok) {
        const lapDataResult = await lapDataResponse.json();
        setLapData(lapDataResult.lapData || []);
      }
      
    } catch (error) {
      console.error('Error fetching driver race data:', error);
      setError('Failed to load driver race data');
    } finally {
      setLoading(false);
    }
  };

  const getTeamColor = (team: string) => F123DataService.getTeamColor(team);
  const getTireCompoundColor = (compound?: string) => F123DataService.getTireCompoundColor(compound);
  const getTireCompoundText = (compound?: string) => F123DataService.getTireCompoundText(compound);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading driver race analysis...</div>
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

  if (!driver || !raceData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">No data found</div>
      </div>
    );
  }

  // Calculate fastest times
  const fastestLap = Math.min(...lapData.map(lap => lap.lapTime));
  const fastestS1 = Math.min(...lapData.map(lap => lap.s1Time));
  const fastestS2 = Math.min(...lapData.map(lap => lap.s2Time));
  const fastestS3 = Math.min(...lapData.map(lap => lap.s3Time));

  const getPositionChange = (currentLap: number) => {
    if (currentLap === 1) return <Minus className="w-4 h-4 text-gray-400" />;
    
    const prevLap = lapData.find(lap => lap.lapNumber === currentLap - 1);
    const currentLapData = lapData.find(lap => lap.lapNumber === currentLap);
    
    if (!prevLap || !currentLapData) return <Minus className="w-4 h-4 text-gray-400" />;
    
    if (currentLapData.position < prevLap.position) {
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    } else if (currentLapData.position > prevLap.position) {
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    } else {
      return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Driver Race Analysis</h1>
        <div className="w-10"></div>
      </div>

      {/* Driver & Race Info */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-2xl font-bold text-gray-700 dark:text-gray-300">
              {driver.number}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{driver.name}</h2>
              <div className="flex items-center space-x-2 mt-1">
                <div className={`w-3 h-3 rounded-full ${getTeamColor(driver.team)}`}></div>
                <span className="text-gray-500 dark:text-gray-400">{driver.team}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              P{driver.racePosition}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {driver.raceTime}
            </div>
          </div>
        </div>
        
        <div className="mt-4 flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-500 dark:text-gray-400">{raceData.track}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-500 dark:text-gray-400">{raceData.date}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-500 dark:text-gray-400">{raceData.laps} laps</span>
          </div>
        </div>
      </div>

      {/* Race Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">Grid Position</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{driver.gridPosition}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">Final Position</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{driver.racePosition}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">Points</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{driver.points}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">Pit Stops</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{driver.pitStops}</div>
        </div>
      </div>

      {/* Lap Times Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Lap Times</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Lap</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">S1</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">S2</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">S3</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pos</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tire</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {lapData.map((lap) => (
                <tr key={lap.lapNumber} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {lap.lapNumber}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    <div className="flex items-center space-x-1">
                      <span className={lap.isPersonalBest ? 'text-purple-600 font-bold' : ''}>
                        {F123DataService.formatTimeFromMs(lap.lapTime)}
                      </span>
                      {lap.isPersonalBest && <Zap className="w-4 h-4 text-purple-600" />}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    <span className={lap.isFastestS1 ? 'text-purple-600 font-bold' : ''}>
                      {F123DataService.formatTimeFromMs(lap.s1Time)}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    <span className={lap.isFastestS2 ? 'text-purple-600 font-bold' : ''}>
                      {F123DataService.formatTimeFromMs(lap.s2Time)}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    <span className={lap.isFastestS3 ? 'text-purple-600 font-bold' : ''}>
                      {F123DataService.formatTimeFromMs(lap.s3Time)}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    <div className="flex items-center space-x-1">
                      <span>{lap.position}</span>
                      {getPositionChange(lap.lapNumber)}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTireCompoundColor(lap.tireCompound)}`}>
                      {getTireCompoundText(lap.tireCompound)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};