import React, { useState } from 'react';
import { ArrowLeft, Calendar, MapPin, Trophy, Flag, Zap } from 'lucide-react';
import { F123DataService, F123DriverResult } from '../services/F123DataService';

interface RaceDetailProps {
  raceId: string;
  onBack: () => void;
  onDriverSelect: (driverId: string, raceId: string) => void;
}

export const RaceDetail: React.FC<RaceDetailProps> = ({ raceId: _raceId, onBack, onDriverSelect }) => {
  const [activeSession, setActiveSession] = useState<'qualifying' | 'race'>('race');

  // Mock data for Bahrain Grand Prix
  const raceData = {
    id: 'race-1',
    name: 'Bahrain Grand Prix',
    track: 'Bahrain International Circuit',
    date: '2024-03-02',
    country: 'Bahrain',
    circuitLength: '5.412 km',
    laps: 57,
    status: 'completed'
  };

  const drivers: F123DriverResult[] = [
    {
      id: '1',
      name: 'Lewis Hamilton',
      team: 'Mercedes',
      number: 44,
      
      // Qualifying data
      qualifyingPosition: 1,
      qualifyingTime: 89708, // 1:29.708 in milliseconds
      qualifyingGap: 0, // Pole position
      qualifyingSector1Time: 28500,
      qualifyingSector2Time: 31200,
      qualifyingSector3Time: 30008,
      qualifyingBestLapTime: 89708,
      
      // Race data
      racePosition: 1,
      raceTime: '1:31:15.123',
      raceLapTime: 9115123, // Race time in milliseconds
      raceSector1Time: 29000,
      raceSector2Time: 32000,
      raceSector3Time: 30123,
      raceBestLapTime: 9115123,
      
      // New fields
      status: 'finished',
      gridPosition: 1,
      pitStops: 2,
      tireCompound: 'medium',
      
      // Points and achievements
      points: 25,
      fastestLap: false,
      fastestLapTime: 92456, // 1:32.456 in milliseconds
      
      // Penalties and DNF
      penalties: 0,
      warnings: 0,
      dnf: false,
      
      // Data source
      dataSource: 'UDP'
    },
    {
      id: '2',
      name: 'Max Verstappen',
      team: 'Red Bull Racing',
      number: 1,
      
      // Qualifying data
      qualifyingPosition: 2,
      qualifyingTime: 89856, // 1:29.856 in milliseconds
      qualifyingGap: 148, // +0.148 seconds behind pole
      qualifyingSector1Time: 28600,
      qualifyingSector2Time: 31300,
      qualifyingSector3Time: 29956,
      qualifyingBestLapTime: 89856,
      
      // Race data
      racePosition: 2,
      raceTime: '+2.456',
      raceLapTime: 9115123 + 2456, // Race time + gap
      raceSector1Time: 29100,
      raceSector2Time: 32100,
      raceSector3Time: 29956,
      raceBestLapTime: 89856,
      
      // New fields
      status: 'finished',
      gridPosition: 2,
      pitStops: 2,
      tireCompound: 'soft',
      
      // Points and achievements
      points: 19,
      fastestLap: true,
      fastestLapTime: 92123, // 1:32.123 in milliseconds
      
      // Penalties and DNF
      penalties: 0,
      warnings: 0,
      dnf: false,
      
      // Data source
      dataSource: 'UDP'
    },
    {
      id: '3',
      name: 'Charles Leclerc',
      team: 'Ferrari',
      number: 16,
      
      // Qualifying data
      qualifyingPosition: 3,
      qualifyingTime: 90123, // 1:30.123 in milliseconds
      qualifyingGap: 415, // +0.415 seconds behind pole
      qualifyingSector1Time: 28800,
      qualifyingSector2Time: 31500,
      qualifyingSector3Time: 29823,
      qualifyingBestLapTime: 90123,
      
      // Race data
      racePosition: 3,
      raceTime: '+8.234',
      raceLapTime: 9115123 + 8234, // Race time + gap
      raceSector1Time: 29200,
      raceSector2Time: 32300,
      raceSector3Time: 29623,
      raceBestLapTime: 90123,
      
      // New fields
      status: 'finished',
      gridPosition: 3,
      pitStops: 1,
      tireCompound: 'hard',
      
      // Points and achievements
      points: 15,
      fastestLap: false,
      fastestLapTime: 92789, // 1:32.789 in milliseconds
      
      // Penalties and DNF
      penalties: 0,
      warnings: 0,
      dnf: false,
      
      // Data source
      dataSource: 'UDP'
    }
  ];

  const getTeamColor = (team: string) => F123DataService.getTeamColor(team);

  const getPositionColor = (position: number) => F123DataService.getPositionColor(position);

  const handleDriverClick = (driver: F123DriverResult) => {
    onDriverSelect(driver.id, _raceId);
  };

  // Find fastest sectors for qualifying
  const fastestS1 = Math.min(...drivers.map(d => d.qualifyingSector1Time || Infinity));
  const fastestS2 = Math.min(...drivers.map(d => d.qualifyingSector2Time || Infinity));
  const fastestS3 = Math.min(...drivers.map(d => d.qualifyingSector3Time || Infinity));

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
            <div className="flex items-center space-x-2 text-green-600 dark:text-green-400 mb-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium">Completed</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {new Date(raceData.date).toLocaleDateString()}
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
              <Calendar className="w-5 h-5" />
              <span className="font-medium">Circuit Length</span>
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">{raceData.circuitLength}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-purple-600 dark:text-purple-400">
              <Flag className="w-5 h-5" />
              <span className="font-medium">Total Laps</span>
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">{raceData.laps}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
              <Trophy className="w-5 h-5" />
              <span className="font-medium">Winner</span>
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">Lewis Hamilton</p>
          </div>
        </div>
      </div>

      {/* Session Toggle */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        <button
          onClick={() => setActiveSession('qualifying')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeSession === 'qualifying'
              ? 'bg-red-600 text-white'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Qualifying
        </button>
        <button
          onClick={() => setActiveSession('race')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeSession === 'race'
              ? 'bg-red-600 text-white'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Race Results
        </button>
      </div>

      {/* Results Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">
                  Pos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Driver</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Team</th>
                {activeSession === 'race' && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Grid</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Best Lap</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Stops</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tire</th>
                  </>
                )}
                {activeSession === 'qualifying' && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">S1</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">S2</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">S3</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Gap</th>
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
                  <td className="px-6 py-4 whitespace-nowrap w-24">
                    <span className={`text-lg font-bold ${getPositionColor(
                      activeSession === 'qualifying' ? driver.qualifyingPosition! : driver.racePosition!
                    )}`}>
                      {activeSession === 'qualifying' ? driver.qualifyingPosition : driver.racePosition}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center mr-3">
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                          {driver.number}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{driver.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {F123DataService.getDataSourceIcon(driver.dataSource)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${getTeamColor(driver.team)}`}>
                    {driver.team}
                  </td>
                  {activeSession === 'race' && (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`font-medium ${F123DataService.getStatusColor(driver.status)}`}>
                          {F123DataService.getStatusText(driver.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        P{driver.gridPosition || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {driver.fastestLapTime ? (
                          <div className="flex items-center space-x-1">
                            {driver.fastestLap && (
                              <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            )}
                            <span className={driver.fastestLap ? 'text-purple-600 dark:text-purple-400 font-bold' : 'text-gray-600 dark:text-gray-400'}>
                              {F123DataService.formatTimeFromMs(driver.fastestLapTime)}
                            </span>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {driver.raceTime || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {driver.pitStops || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`font-bold ${F123DataService.getTireCompoundColor(driver.tireCompound)}`}>
                          {F123DataService.getTireCompoundText(driver.tireCompound)}
                        </span>
                      </td>
                    </>
                  )}
                  {activeSession === 'qualifying' && (
                    <>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-mono ${
                        driver.qualifyingSector1Time === fastestS1 ? 'text-purple-600 dark:text-purple-400 font-bold' : 'text-gray-900 dark:text-white'
                      }`}>
                        {driver.qualifyingSector1Time ? F123DataService.formatTimeThousandths(driver.qualifyingSector1Time) : '-'}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-mono ${
                        driver.qualifyingSector2Time === fastestS2 ? 'text-purple-600 dark:text-purple-400 font-bold' : 'text-gray-900 dark:text-white'
                      }`}>
                        {driver.qualifyingSector2Time ? F123DataService.formatTimeThousandths(driver.qualifyingSector2Time) : '-'}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-mono ${
                        driver.qualifyingSector3Time === fastestS3 ? 'text-purple-600 dark:text-purple-400 font-bold' : 'text-gray-900 dark:text-white'
                      }`}>
                        {driver.qualifyingSector3Time ? F123DataService.formatTimeThousandths(driver.qualifyingSector3Time) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                        {driver.qualifyingTime ? F123DataService.formatTimeThousandths(driver.qualifyingTime) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {driver.qualifyingGap !== undefined ? F123DataService.formatGapFromMs(driver.qualifyingGap) : '-'}
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
