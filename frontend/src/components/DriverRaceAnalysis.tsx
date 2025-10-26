import React from 'react';
import { ArrowLeft, Clock, MapPin, Zap, TrendingUp, TrendingDown, Circle } from 'lucide-react';
import { F123DriverResult, F123DataService } from '../services/F123DataService';

interface LapData {
  lapNumber: number;
  s1Time: number; // in milliseconds
  s2Time: number; // in milliseconds
  s3Time: number; // in milliseconds
  lapTime: number; // in milliseconds
  tireCompound: 'soft' | 'medium' | 'hard' | 'intermediate' | 'wet' | 'unknown';
  position: number;
  gapToLeader: number; // in milliseconds, 0 if leading
  isPersonalBest: boolean;
  isFastestS1: boolean;
  isFastestS2: boolean;
  isFastestS3: boolean;
}

interface DriverRaceAnalysisProps {
  driverId: string;
  raceId: string;
  onBack: () => void;
}

export const DriverRaceAnalysis: React.FC<DriverRaceAnalysisProps> = ({ driverId, raceId: _raceId, onBack }) => {
  const getTeamColor = (team: string) => F123DataService.getTeamColor(team);
  const getTireCompoundColor = (compound?: string) => F123DataService.getTireCompoundColor(compound);
  const getTireCompoundText = (compound?: string) => F123DataService.getTireCompoundText(compound);

  // Mock driver data - in real app, this would be fetched based on driverId
  const driver: F123DriverResult = {
    id: driverId,
    name: 'Lewis Hamilton',
    team: 'Mercedes',
    number: 44,
    racePosition: 1,
    raceTime: '1:31:15.123',
    fastestLapTime: 92456,
    fastestLap: true,
    pitStops: 2,
    tireCompound: 'medium',
    status: 'finished',
    gridPosition: 1,
    points: 25,
    penalties: 0,
    warnings: 0,
    dnf: false,
    dataSource: 'UDP'
  };

  // Mock race data - in real app, this would be fetched based on raceId
  const raceData = {
    name: 'Bahrain Grand Prix',
    track: 'Bahrain International Circuit',
    date: 'March 5, 2023',
    laps: 57
  };

  // Generate mock lap data for demonstration
  const generateLapData = (): LapData[] => {
    const laps: LapData[] = [];
    const baseLapTime = 92000; // 1:32.000 base time
    const baseS1 = 30000; // 30.000
    const baseS2 = 32000; // 32.000
    const baseS3 = 30000; // 30.000
    
    let currentPosition = driver.gridPosition || 1;
    let currentGap = 0;
    
    for (let lap = 1; lap <= raceData.laps; lap++) {
      // Add some variation to lap times (rounded to whole milliseconds)
      const variation = Math.round((Math.random() - 0.5) * 2000); // ±1 second variation
      const lapTime = baseLapTime + variation;
      
      // Sector variations (rounded to whole milliseconds)
      const s1Variation = Math.round((Math.random() - 0.5) * 1000);
      const s2Variation = Math.round((Math.random() - 0.5) * 1000);
      const s3Variation = Math.round((Math.random() - 0.5) * 1000);
      
      const s1Time = baseS1 + s1Variation;
      const s2Time = baseS2 + s2Variation;
      const s3Time = baseS3 + s3Variation;
      
      // Position changes (simulate some overtakes)
      if (lap > 10 && Math.random() < 0.1) {
        currentPosition = Math.max(1, currentPosition - 1);
      }
      if (lap > 20 && Math.random() < 0.05) {
        currentPosition = Math.min(20, currentPosition + 1);
      }
      
      // Gap to leader (if not leading)
      if (currentPosition > 1) {
        currentGap = Math.max(0, Math.round(currentGap + (Math.random() - 0.5) * 1000));
      } else {
        currentGap = 0;
      }
      
      // Tire compound changes (simulate pit stops)
      let tireCompound: 'soft' | 'medium' | 'hard' | 'intermediate' | 'wet' | 'unknown' = 'medium';
      if (lap === 1) tireCompound = 'soft';
      if (lap > 15 && lap <= 20) tireCompound = 'medium';
      if (lap > 35) tireCompound = 'hard';
      
      laps.push({
        lapNumber: lap,
        s1Time,
        s2Time,
        s3Time,
        lapTime,
        tireCompound,
        position: currentPosition,
        gapToLeader: currentGap,
        isPersonalBest: lap === 25, // Mock personal best on lap 25
        isFastestS1: lap === 12, // Mock fastest S1 on lap 12
        isFastestS2: lap === 8, // Mock fastest S2 on lap 8
        isFastestS3: lap === 30, // Mock fastest S3 on lap 30
      });
    }
    
    return laps;
  };

  const lapData = generateLapData();
  
  // Find fastest sectors across all laps
  const fastestS1 = Math.min(...lapData.map(lap => lap.s1Time));
  const fastestS2 = Math.min(...lapData.map(lap => lap.s2Time));
  const fastestS3 = Math.min(...lapData.map(lap => lap.s3Time));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button 
                onClick={onBack} 
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                  <span className="text-lg font-bold text-gray-700 dark:text-gray-300">
                    {driver.number}
                  </span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{driver.name}</h1>
                  <p className={`text-lg ${getTeamColor(driver.team)}`}>{driver.team}</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{raceData.name}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{raceData.track} • {raceData.date}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Race Summary */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <Circle className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Final Position</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">P{driver.racePosition}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Race Time</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{driver.raceTime}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Best Lap</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {driver.fastestLapTime ? F123DataService.formatTimeFromMs(driver.fastestLapTime) : 'N/A'}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pit Stops</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{driver.pitStops || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Lap-by-Lap Analysis */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Lap-by-Lap Analysis</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Purple highlights indicate fastest sectors. Green/red arrows show position changes.
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Lap</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pos</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Gap</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">S1</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">S2</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">S3</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Lap Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tire</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {lapData.map((lap, index) => {
                  const prevLap = index > 0 ? lapData[index - 1] : null;
                  const positionChange = prevLap ? prevLap.position - lap.position : 0;
                  
                  return (
                    <tr key={lap.lapNumber} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                        {lap.lapNumber}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        <div className="flex items-center space-x-1">
                          <span>P{lap.position}</span>
                          {positionChange > 0 && (
                            <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                          )}
                          {positionChange < 0 && (
                            <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {lap.gapToLeader > 0 ? F123DataService.formatGapFromMs(lap.gapToLeader) : ''}
                      </td>
                      <td className={`px-4 py-3 text-sm font-mono ${
                        lap.s1Time === fastestS1 ? 'text-purple-600 dark:text-purple-400 font-bold' : 'text-gray-900 dark:text-white'
                      }`}>
                        {F123DataService.formatTimeThousandths(lap.s1Time)}
                      </td>
                      <td className={`px-4 py-3 text-sm font-mono ${
                        lap.s2Time === fastestS2 ? 'text-purple-600 dark:text-purple-400 font-bold' : 'text-gray-900 dark:text-white'
                      }`}>
                        {F123DataService.formatTimeThousandths(lap.s2Time)}
                      </td>
                      <td className={`px-4 py-3 text-sm font-mono ${
                        lap.s3Time === fastestS3 ? 'text-purple-600 dark:text-purple-400 font-bold' : 'text-gray-900 dark:text-white'
                      }`}>
                        {F123DataService.formatTimeThousandths(lap.s3Time)}
                      </td>
                      <td className={`px-4 py-3 text-sm font-mono ${
                        lap.isPersonalBest ? 'text-purple-600 dark:text-purple-400 font-bold' : 'text-gray-900 dark:text-white'
                      }`}>
                        {lap.isPersonalBest && <Zap className="w-3 h-3 inline mr-1" />}
                        {F123DataService.formatTimeThousandths(lap.lapTime)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`font-bold ${getTireCompoundColor(lap.tireCompound)}`}>
                          {getTireCompoundText(lap.tireCompound)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
