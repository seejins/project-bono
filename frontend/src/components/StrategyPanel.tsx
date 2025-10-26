import React from 'react';
import { Target, Clock, Fuel, AlertTriangle, CheckCircle } from 'lucide-react';
import { RaceStrategy, TelemetryData } from '../types';

interface StrategyPanelProps {
  strategy: RaceStrategy | null;
  telemetry: TelemetryData | null;
}

export const StrategyPanel: React.FC<StrategyPanelProps> = ({ strategy, telemetry }) => {
  if (!strategy) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Target className="w-16 h-16 mx-auto mb-4 text-gray-500 animate-pulse" />
          <p className="text-xl text-gray-400">Analyzing race strategy...</p>
          <p className="text-sm text-gray-500 mt-2">Strategy recommendations will appear here</p>
        </div>
      </div>
    );
  }

  const getStrategyColor = (strategyType: string) => {
    switch (strategyType) {
      case 'aggressive': return 'text-red-400';
      case 'conservative': return 'text-blue-400';
      case 'balanced': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const getTireColor = (compound: string) => {
    switch (compound) {
      case 'soft': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'hard': return 'text-white';
      case 'intermediate': return 'text-blue-400';
      case 'wet': return 'text-cyan-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Strategy Card */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Race Strategy</h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-400">Confidence:</span>
            <div className="w-20 bg-gray-700 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${strategy.confidence * 100}%` }}
              />
            </div>
            <span className="text-sm text-gray-400">{Math.round(strategy.confidence * 100)}%</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pit Stop Recommendation */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Pit Stop Strategy
            </h3>
            
            <div className={`p-4 rounded-lg ${strategy.recommendedPitStop ? 'bg-red-900/20 border border-red-500' : 'bg-green-900/20 border border-green-500'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">
                  {strategy.recommendedPitStop ? 'PIT STOP REQUIRED' : 'Continue Current Strategy'}
                </span>
                {strategy.recommendedPitStop ? (
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                )}
              </div>
              
              {strategy.recommendedPitStop && (
                <div className="text-sm text-gray-300">
                  <p>Recommended Lap: <span className="font-mono font-bold">{strategy.pitStopLap}</span></p>
                </div>
              )}
            </div>
          </div>

          {/* Tire Strategy */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <Target className="w-5 h-5 mr-2" />
              Tire Strategy
            </h3>
            
            <div className="p-4 bg-gray-700 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Recommended Compound:</span>
                <span className={`font-bold ${getTireColor(strategy.tireCompound)}`}>
                  {strategy.tireCompound.toUpperCase()}
                </span>
              </div>
              
              <div className="text-sm text-gray-300">
                <p>Switch to {strategy.tireCompound} tires for optimal performance</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Strategy Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Fuel Strategy */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Fuel className="w-5 h-5 mr-2" />
            Fuel Strategy
          </h3>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Strategy Type:</span>
              <span className={`font-semibold ${getStrategyColor(strategy.strategy)}`}>
                {strategy.strategy.toUpperCase()}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-400">Fuel to Add:</span>
              <span className="font-mono">{strategy.fuelToAdd}L</span>
            </div>
            
            {telemetry && (
              <div className="flex justify-between">
                <span className="text-gray-400">Current Fuel:</span>
                <span className="font-mono">{telemetry.fuelLevel.toFixed(1)}L</span>
              </div>
            )}
          </div>
        </div>

        {/* Race Analysis */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Race Analysis</h3>
          
          <div className="space-y-3">
            <div className="text-sm text-gray-300">
              <p className="mb-2 font-semibold">Strategy Reasoning:</p>
              <p className="text-gray-400">{strategy.reasoning}</p>
            </div>
            
            {telemetry && (
              <div className="pt-3 border-t border-gray-700">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Current Position:</span>
                  <span className="font-mono">{telemetry.carPosition}/{telemetry.numCars}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Lap Number:</span>
                  <span className="font-mono">{telemetry.lapNumber}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
            Box Box
          </button>
          <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors">
            Stay Out
          </button>
          <button className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors">
            Push Mode
          </button>
          <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors">
            Save Fuel
          </button>
        </div>
      </div>
    </div>
  );
};
