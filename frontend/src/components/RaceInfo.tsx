import React from 'react';
import { Trophy, Clock, MapPin, Cloud, Thermometer } from 'lucide-react';
import { TelemetryData, RaceStrategy } from '../../shared/types';

interface RaceInfoProps {
  telemetry: TelemetryData | null;
  strategy: RaceStrategy | null;
}

export const RaceInfo: React.FC<RaceInfoProps> = ({ telemetry, strategy }) => {
  if (!telemetry) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-500 animate-pulse" />
          <p className="text-xl text-gray-400">Waiting for race data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Race Overview */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-6">Race Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <Trophy className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
            <div className="text-3xl font-bold text-yellow-400">
              P{telemetry.carPosition}
            </div>
            <div className="text-sm text-gray-400">
              Position ({telemetry.carPosition}/{telemetry.numCars})
            </div>
          </div>
          
          <div className="text-center">
            <Clock className="w-8 h-8 mx-auto mb-2 text-blue-400" />
            <div className="text-3xl font-bold text-blue-400">
              {telemetry.lapNumber}
            </div>
            <div className="text-sm text-gray-400">Current Lap</div>
          </div>
          
          <div className="text-center">
            <MapPin className="w-8 h-8 mx-auto mb-2 text-green-400" />
            <div className="text-3xl font-bold text-green-400">
              {telemetry.sessionType}
            </div>
            <div className="text-sm text-gray-400">Session Type</div>
          </div>
        </div>
      </div>

      {/* Driver & Team Info */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Driver & Team</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-sm text-gray-400 mb-1">Driver</div>
            <div className="text-xl font-bold">{telemetry.driverName}</div>
          </div>
          
          <div>
            <div className="text-sm text-gray-400 mb-1">Team</div>
            <div className="text-xl font-bold">{telemetry.teamName}</div>
          </div>
        </div>
      </div>

      {/* Weather Conditions */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Cloud className="w-5 h-5 mr-2" />
          Weather Conditions
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <Thermometer className="w-6 h-6 mx-auto mb-2 text-blue-400" />
            <div className="text-2xl font-bold text-blue-400">
              {Math.round(telemetry.airTemperature)}°
            </div>
            <div className="text-sm text-gray-400">Air Temp</div>
          </div>
          
          <div className="text-center">
            <Thermometer className="w-6 h-6 mx-auto mb-2 text-red-400" />
            <div className="text-2xl font-bold text-red-400">
              {Math.round(telemetry.trackTemperature)}°
            </div>
            <div className="text-sm text-gray-400">Track Temp</div>
          </div>
          
          <div className="text-center">
            <Cloud className="w-6 h-6 mx-auto mb-2 text-gray-400" />
            <div className="text-2xl font-bold text-gray-400">
              {Math.round(telemetry.rainPercentage)}%
            </div>
            <div className="text-sm text-gray-400">Rain</div>
          </div>
          
          <div className="text-center">
            <div className="w-6 h-6 mx-auto mb-2 bg-gray-600 rounded-full" />
            <div className="text-2xl font-bold text-white">
              {telemetry.rainPercentage > 30 ? 'Wet' : 'Dry'}
            </div>
            <div className="text-sm text-gray-400">Conditions</div>
          </div>
        </div>
      </div>

      {/* Session Timing */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Session Timing</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-sm text-gray-400 mb-1">Session Time</div>
            <div className="text-xl font-mono">
              {Math.floor(telemetry.sessionTime / 60)}:{(telemetry.sessionTime % 60).toFixed(0).padStart(2, '0')}
            </div>
          </div>
          
          <div>
            <div className="text-sm text-gray-400 mb-1">Time Remaining</div>
            <div className="text-xl font-mono">
              {Math.floor(telemetry.sessionTimeLeft / 60)}:{(telemetry.sessionTimeLeft % 60).toFixed(0).padStart(2, '0')}
            </div>
          </div>
          
          <div>
            <div className="text-sm text-gray-400 mb-1">Current Lap Time</div>
            <div className="text-xl font-mono">
              {telemetry.currentLapTime.toFixed(3)}s
            </div>
          </div>
        </div>
      </div>

      {/* Strategy Summary */}
      {strategy && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Current Strategy</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-sm text-gray-400 mb-1">Strategy Type</div>
              <div className={`text-xl font-bold ${
                strategy.strategy === 'aggressive' ? 'text-red-400' :
                strategy.strategy === 'conservative' ? 'text-blue-400' : 'text-green-400'
              }`}>
                {strategy.strategy.toUpperCase()}
              </div>
            </div>
            
            <div>
              <div className="text-sm text-gray-400 mb-1">Pit Stop</div>
              <div className={`text-xl font-bold ${
                strategy.recommendedPitStop ? 'text-red-400' : 'text-green-400'
              }`}>
                {strategy.recommendedPitStop ? 'REQUIRED' : 'NOT NEEDED'}
              </div>
            </div>
          </div>
          
          {strategy.recommendedPitStop && (
            <div className="mt-4 p-4 bg-gray-700 rounded-lg">
              <div className="text-sm text-gray-400 mb-1">Recommended Lap</div>
              <div className="text-2xl font-bold text-red-400">
                Lap {strategy.pitStopLap}
              </div>
              <div className="text-sm text-gray-300 mt-2">
                {strategy.reasoning}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
