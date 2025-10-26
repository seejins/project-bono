import React from 'react';
import { Fuel, Thermometer, Zap, Activity } from 'lucide-react';
import { TelemetryData } from '../types';

interface TelemetryDashboardProps {
  telemetry: TelemetryData | null;
}

export const TelemetryDashboard: React.FC<TelemetryDashboardProps> = ({ telemetry }) => {
  if (!telemetry) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Activity className="w-16 h-16 mx-auto mb-4 text-gray-500 animate-pulse" />
          <p className="text-xl text-gray-400">Waiting for telemetry data...</p>
          <p className="text-sm text-gray-500 mt-2">Make sure F1 game is running and telemetry is enabled</p>
        </div>
      </div>
    );
  }

  const speedKmh = Math.round(telemetry.speed * 3.6);
  const fuelPercentage = Math.round((telemetry.fuelLevel / telemetry.fuelCapacity) * 100);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Speed Gauge */}
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Speed</h3>
            <Activity className="w-6 h-6 text-blue-400" />
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-400 mb-2">
              {speedKmh}
            </div>
            <div className="text-sm text-gray-400">km/h</div>
          </div>
        </div>

        {/* Fuel Level */}
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Fuel</h3>
            <Fuel className="w-6 h-6 text-green-400" />
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-green-400 mb-2">
              {fuelPercentage}%
            </div>
            <div className="text-sm text-gray-400">
              {telemetry.fuelLevel.toFixed(1)}L / {telemetry.fuelCapacity.toFixed(1)}L
            </div>
          </div>
        </div>

        {/* Engine Temperature */}
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Engine</h3>
            <Thermometer className="w-6 h-6 text-red-400" />
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-red-400 mb-2">
              {Math.round(telemetry.engineTemperature)}°
            </div>
            <div className="text-sm text-gray-400">Temperature</div>
          </div>
        </div>

        {/* Energy Store */}
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">ERS</h3>
            <Zap className="w-6 h-6 text-yellow-400" />
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-yellow-400 mb-2">
              {Math.round(telemetry.energyStore)}%
            </div>
            <div className="text-sm text-gray-400">Energy Store</div>
          </div>
        </div>
      </div>

      {/* Tire Status */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-6">Tire Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(telemetry.tireWear).map(([position, wear]: [string, number]) => (
            <div key={position} className="text-center">
              <div className="text-sm text-gray-400 mb-2 capitalize">
                {position.replace(/([A-Z])/g, ' $1').trim()}
              </div>
              <div className="text-2xl font-bold mb-1">
                {Math.round(wear * 100)}%
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    wear > 0.8 ? 'bg-red-500' : 
                    wear > 0.6 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${wear * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lap Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 rounded-lg p-6">
          <h4 className="text-lg font-semibold mb-4">Current Lap</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Lap Time:</span>
              <span className="font-mono">{telemetry.currentLapTime.toFixed(3)}s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Best Lap:</span>
              <span className="font-mono text-green-400">{telemetry.bestLapTime.toFixed(3)}s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Lap Number:</span>
              <span className="font-mono">{telemetry.lapNumber}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h4 className="text-lg font-semibold mb-4">Sector Times</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Sector 1:</span>
              <span className="font-mono">{telemetry.sector1Time.toFixed(3)}s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Sector 2:</span>
              <span className="font-mono">{telemetry.sector2Time.toFixed(3)}s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Sector 3:</span>
              <span className="font-mono">{telemetry.sector3Time.toFixed(3)}s</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h4 className="text-lg font-semibold mb-4">Race Info</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Position:</span>
              <span className="font-mono">{telemetry.carPosition}/{telemetry.numCars}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Session:</span>
              <span className="font-mono">{telemetry.sessionType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">DRS:</span>
              <span className={`font-mono ${telemetry.drsEnabled ? 'text-green-400' : 'text-red-400'}`}>
                {telemetry.drsEnabled ? 'ON' : 'OFF'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
