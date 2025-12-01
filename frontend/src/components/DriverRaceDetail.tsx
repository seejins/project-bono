import React from 'react';
import { X, Clock, MapPin, Zap, Flag, Award, TrendingUp, Car } from 'lucide-react';
import { F123DriverResult, F123DataService } from '../services/F123DataService';

interface DriverRaceDetailProps {
  driver: F123DriverResult;
  raceData: {
    name: string;
    track: string;
    date: string;
    laps: number;
  };
  onClose: () => void;
}

export const DriverRaceDetail: React.FC<DriverRaceDetailProps> = ({ driver, raceData, onClose }) => {

  return (
    <div className="modal-overlay">
      <div className="modal-panel max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
              <span className="text-lg font-bold text-gray-700 dark:text-gray-300">
                {driver.number}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{driver.name}</h2>
              <p className={`text-lg ${F123DataService.getTeamColor(driver.team)}`}>{F123DataService.getTeamDisplayName(driver.team)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Race Info */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{raceData.name}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">{raceData.track}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">{raceData.date}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Flag className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">{raceData.laps} laps</span>
            </div>
            <div className="flex items-center space-x-2">
              <Car className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">#{driver.number}</span>
            </div>
          </div>
        </div>

        {/* Race Results */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Race Performance */}
            <div className="space-y-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Race Performance</h4>
              
              {/* Final Position */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                      <span className={`text-lg font-bold ${F123DataService.getPositionColor(driver.racePosition!)}`}>
                        {driver.racePosition}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Final Position</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {driver.racePosition === 1 ? 'Winner' : 
                         driver.racePosition === 2 ? 'Second Place' :
                         driver.racePosition === 3 ? 'Third Place' :
                         `P${driver.racePosition}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Points</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{driver.points}</p>
                  </div>
                </div>
              </div>

              {/* Grid Position */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Starting Position</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">P{driver.gridPosition}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Position Change</p>
                    <p className={`text-lg font-semibold ${
                      (driver.gridPosition || 0) > (driver.racePosition || 0) ? 'text-green-600 dark:text-green-400' :
                      (driver.gridPosition || 0) < (driver.racePosition || 0) ? 'text-red-600 dark:text-red-400' :
                      'text-gray-600 dark:text-gray-400'
                    }`}>
                      {(driver.gridPosition || 0) > (driver.racePosition || 0) ? '+' : ''}
                      {(driver.gridPosition || 0) - (driver.racePosition || 0)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Race Time */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Race Time</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{driver.raceTime}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                    <p className={`text-lg font-semibold ${F123DataService.getStatusColor(driver.status)}`}>
                      {F123DataService.getStatusText(driver.status)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Lap Analysis */}
            <div className="space-y-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Lap Analysis</h4>
              
              {/* Fastest Lap */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {driver.fastestLap && (
                      <Zap className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    )}
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Fastest Lap</p>
                      <p className={`text-lg font-semibold ${driver.fastestLap ? 'text-purple-600 dark:text-purple-400' : 'text-gray-900 dark:text-white'}`}>
                        {driver.fastestLapTime ? F123DataService.formatTimeFromMs(driver.fastestLapTime) : 'N/A'}
                      </p>
                    </div>
                  </div>
                  {driver.fastestLap && (
                    <div className="bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-400 px-3 py-1 rounded-full text-sm font-medium">
                      Race FL
                    </div>
                  )}
                </div>
              </div>

              {/* Sector Times */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Best Sector Times</h5>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Sector 1:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {driver.raceSector1Time ? F123DataService.formatTimeFromMs(driver.raceSector1Time) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Sector 2:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {driver.raceSector2Time ? F123DataService.formatTimeFromMs(driver.raceSector2Time) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Sector 3:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {driver.raceSector3Time ? F123DataService.formatTimeFromMs(driver.raceSector3Time) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Strategy */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Race Strategy</h5>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Pit Stops:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{driver.pitStops || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Tire Compound:</span>
                    <span className={`text-sm font-bold ${F123DataService.getTireCompoundColor(driver.tireCompound)}`}>
                      {F123DataService.getTireCompoundText(driver.tireCompound)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Qualifying Performance */}
          <div className="mt-8">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Qualifying Performance</h4>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Qualifying Position</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">P{driver.qualifyingPosition}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Qualifying Time</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {driver.qualifyingTime ? F123DataService.formatTimeFromMs(driver.qualifyingTime) : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Gap to Pole</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {driver.qualifyingGap !== undefined ? F123DataService.formatGapFromMs(driver.qualifyingGap) : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Data Source */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Data Source</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {F123DataService.getDataSourceIcon(driver.dataSource)}
                </p>
              </div>
              {driver.penalties > 0 && (
                <div className="text-right">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Penalties</p>
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">{driver.penalties}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
