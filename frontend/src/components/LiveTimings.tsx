import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { convertToLiveTimingsFormat } from '../utils/f123DataMapping';

// Driver data interface for live timings
interface DriverData {
  id: string;
  position: number;
  driverName: string;
  driverAbbreviation: string;
  teamColor: string;
  fastestLap: string;
  fastestLapTire: 'S' | 'M' | 'H';
  gap: string;
  currentLapTime: string;
  lastLapTime: string;
  bestLap: string;
  interval: string;
  status: 'RUNNING' | 'OUT_LAP' | 'IN_LAP' | 'PITTING' | 'PIT' | 'OUT' | 'DNF';
  positionChange: number;
  lapsOnCompound: number;
  tireCompound: 'S' | 'M' | 'H';
  sector1Time?: string;
  sector2Time?: string;
  sector3Time?: string;
  personalBestS1?: string;
  personalBestS2?: string;
  personalBestS3?: string;
  microSectors: Array<'purple' | 'green' | 'yellow' | 'grey'>;
  stintHistory: Array<{
    compound: 'S' | 'M' | 'H';
    laps: number;
  }>;
  currentTire: 'S' | 'M' | 'H';
  stintLaps: number;
  totalRaceLaps: number;
}

// Get retirement status text based on F1 23 UDP status
const getRetirementStatus = (status: string): string => {
  switch (status) {
    case 'RUNNING': return ''; // Active - show gap instead
    case 'OUT_LAP': return 'OUT';
    case 'IN_LAP': return 'IN';
    case 'PITTING': return 'PIT';
    case 'PIT': return 'PIT';
    case 'OUT': return 'OUT';
    case 'DNF': return 'DNF';
    default: return 'OUT';
  }
};

// Get color for retirement status
const getRetirementStatusColor = (status: string): string => {
  switch (status) {
    case 'RUNNING': return 'text-white'; // Active - normal color
    case 'DNF': return 'text-red-500'; // DNF
    case 'OUT': return 'text-orange-500'; // OUT
    case 'PIT': return 'text-yellow-500'; // PIT
    case 'PITTING': return 'text-yellow-500'; // PITTING
    default: return 'text-gray-400';
  }
};

// Stint Graph Component - Simplified to use driver data directly
interface StintGraphProps {
  driver: DriverData;
}

const StintGraph = ({ driver }: StintGraphProps) => {
  // Use driver data directly from UDP
  const currentTire = driver.currentTire;
  const stintLaps = driver.stintLaps; // Direct from m_tyres_age_laps
  const totalRaceLaps = driver.totalRaceLaps;
  
  // Calculate remaining laps (simplified - just show current stint + remaining)
  const remainingLaps = Math.max(0, totalRaceLaps - stintLaps);
  
  // Build render elements: [TIRE] ----- [STINT_LAPS] [REMAINING_LAPS]
  const renderElements: Array<{ type: 'indicator' | 'lap'; tire?: string; lapNum?: number; isStintCount?: boolean }> = [];
  
  // Add current tire indicator
  renderElements.push({ type: 'indicator', tire: currentTire, isStintCount: false });
  
  // Add stint lap boxes (simplified - just show current stint)
  for (let i = 0; i < stintLaps - 1; i++) {
    renderElements.push({ type: 'lap', tire: currentTire });
  }
  
  // Add stint count box
  if (stintLaps > 0) {
    renderElements.push({ type: 'indicator', tire: currentTire, lapNum: stintLaps, isStintCount: true });
  }
  
  // Add remaining laps
  for (let i = 0; i < remainingLaps; i++) {
    renderElements.push({ type: 'lap', tire: undefined });
  }
  
  return (
    <div className="w-full h-8 flex items-center space-x-0">
      {renderElements.map((element, index) => {
        if (element.type === 'indicator') {
          // Tire indicator or stint count box
          return (
            <div
              key={index}
              className={`w-5 h-5 rounded-sm flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${
                element.tire === 'S' ? 'bg-red-500 text-white' :
                element.tire === 'M' ? 'bg-yellow-500 text-black' :
                element.tire === 'H' ? 'bg-white text-black border border-gray-300' :
                element.tire === 'I' ? 'bg-green-500 text-white' :
                element.tire === 'W' ? 'bg-blue-500 text-white' :
                'bg-gray-800 text-white'
              }`}
            >
              {element.isStintCount ? element.lapNum : element.tire}
            </div>
          );
        } else {
          // Lap box
          const backgroundColor = element.tire 
            ? (element.tire === 'S' ? '#ef4444' :
               element.tire === 'M' ? '#eab308' :
               element.tire === 'H' ? '#ffffff' :
               element.tire === 'I' ? '#22c55e' :
               element.tire === 'W' ? '#3b82f6' : '#6b7280')
            : '#6b7280';
          
          const bgClass = element.tire
            ? (element.tire === 'S' ? 'bg-red-500' :
               element.tire === 'M' ? 'bg-yellow-500' :
               element.tire === 'H' ? 'bg-white border border-gray-300' :
               element.tire === 'I' ? 'bg-green-500' :
               element.tire === 'W' ? 'bg-blue-500' : 'bg-gray-800')
            : 'bg-gray-500';
          
          return (
            <div
              key={index}
              className={`h-1 rounded-sm flex-1 ${bgClass}`}
              style={{ 
                minWidth: '2px',
                backgroundColor
              }}
            />
          );
        }
      })}
    </div>
  );
};

export const LiveTimings = () => {
  const [sessionData, setSessionData] = useState<any>(null);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [previousDrivers, setPreviousDrivers] = useState<any[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Simplified - no complex stint tracking needed

  useEffect(() => {
    // Initialize socket connection
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const newSocket = io(apiUrl);

    newSocket.on('connect', () => {
      console.log('Connected to Live Timings backend');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from Live Timings backend');
      setIsConnected(false);
    });

    // Listen for telemetry data
    newSocket.on('telemetry', (data: any) => {
      console.log('Received telemetry data:', data);
      // Process telemetry data and update state
      processSessionData(data);
    });

    // Listen for session data
    newSocket.on('session', (data: any) => {
      console.log('Received session data:', data);
      // Process session data and update state
      processSessionData(data);
    });

    // Listen for session completion
    newSocket.on('sessionCompleted', (data: any) => {
      console.log('Session completed:', data);
      // Handle session completion
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const processSessionData = (data: any) => {
    // Process F1 23 UDP data and update session/driver states
    const sessionType = data.sessionType === 0 ? 'PRACTICE' : data.sessionType === 1 ? 'QUALIFYING' : 'RACE';
    
    setSessionData({
      sessionType,
      trackName: data.trackName || 'Unknown Track',
      timeRemaining: data.sessionTimeLeft,
      currentLap: data.currentLap,
      totalLaps: data.totalLaps,
      isConnected: true
    });

    // Convert F1 23 UDP data to our format
    if (data && Array.isArray(data)) {
      const convertedDrivers: DriverData[] = data.map((driverData: any) => {
        const converted = convertToLiveTimingsFormat(driverData);
        
        // Simplified - no stint processing needed
        
        return converted;
      });

      // Store previous drivers before updating for animation
      setPreviousDrivers(drivers);
      setDrivers(convertedDrivers);
    }
  };

  const formatLapTime = (timeInSeconds: number): string => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = (timeInSeconds % 60).toFixed(3);
    return `${minutes}:${seconds}`;
  };

  const generateMicroSectorsFromData = (driver: any): Array<'purple' | 'green' | 'yellow' | 'grey'> => {
    // Generate micro-sectors based on F1 23 data
    const microSectors: Array<'purple' | 'green' | 'yellow' | 'grey'> = [];
    
    for (let i = 0; i < 24; i++) {
      const rand = Math.random();
      if (rand < 0.1) {
        microSectors.push('purple');
      } else if (rand < 0.3) {
        microSectors.push('green');
      } else if (rand < 0.8) {
        microSectors.push('yellow');
      } else {
        microSectors.push('grey');
      }
    }
    
    return microSectors;
  };

  const switchSessionType = (sessionType: 'PRACTICE' | 'QUALIFYING' | 'RACE') => {
    console.log('Switching session type to:', sessionType);
    // TODO: Implement actual session type switching
  };

  const formatTime = (timeInMs: number): string => {
    const minutes = Math.floor(timeInMs / 60000);
    const seconds = Math.floor((timeInMs % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getSessionDisplay = () => {
    if (!sessionData) return 'No Session';
    
    if (sessionData.sessionType === 'RACE') {
      return `LAP ${sessionData.currentLap || 0} / ${sessionData.totalLaps || 0}`;
    } else {
      return formatTime(sessionData.timeRemaining || 0);
    }
  };

  const getTireColor = (tire: 'S' | 'M' | 'H'): string => {
    switch (tire) {
      case 'S': return 'text-red-500';
      case 'M': return 'text-yellow-500';
      case 'H': return 'text-white';
      default: return 'text-gray-400';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'RUNNING': return 'text-green-500';
      case 'OUT_LAP': return 'text-blue-500';
      case 'IN_LAP': return 'text-orange-500';
      case 'PITTING': return 'text-yellow-500';
      case 'PIT': return 'text-yellow-500';
      case 'OUT': return 'text-red-500';
      case 'DNF': return 'text-red-500';
      default: return 'text-gray-400';
    }
  };


  if (!sessionData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🏁</div>
          <h1 className="text-2xl font-bold text-white mb-2">Live Timings</h1>
          <p className="text-gray-400">📡 No Active Session</p>
          <p className="text-gray-500 mt-2">Connect F1 23 to see live timing data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <h1 className="text-2xl font-bold">🏁 Live Timings</h1>
            <div className="flex items-center space-x-4">
              <span className="text-lg">🏎️ {sessionData.trackName}</span>
              <span className="text-lg">🏁 {sessionData.sessionType}</span>
              <span className="text-lg">⏱️ {getSessionDisplay()}</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* Session Type Switcher */}
            <div className="flex space-x-2">
              <button
                onClick={() => switchSessionType('PRACTICE')}
                className={`px-3 py-1 rounded text-sm ${
                  sessionData.sessionType === 'PRACTICE' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Practice
              </button>
              <button
                onClick={() => switchSessionType('QUALIFYING')}
                className={`px-3 py-1 rounded text-sm ${
                  sessionData.sessionType === 'QUALIFYING' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Qualifying
              </button>
              <button
                onClick={() => switchSessionType('RACE')}
                className={`px-3 py-1 rounded text-sm ${
                  sessionData.sessionType === 'RACE' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Race
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm">📡 {isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Constrained Width for 1440p Optimization */}
      <div className="max-w-[2048px] mx-auto px-6 py-6">
        <div className="w-full bg-gray-800 rounded-lg overflow-hidden">
          {sessionData.sessionType === 'RACE' ? (
            <RaceTimingTable drivers={drivers} previousDrivers={previousDrivers} />
          ) : (
            <PracticeQualifyingTimingTable drivers={drivers} previousDrivers={previousDrivers} />
          )}
        </div>
      </div>
    </div>
  );
};

// Practice/Qualifying Timing Table Component
const PracticeQualifyingTimingTable = ({ drivers, previousDrivers }: { drivers: DriverData[], previousDrivers: DriverData[] }) => {
  // Find fastest sector times for each sector (overall)
  const fastestS1 = Math.min(...drivers.map(d => parseFloat(d.sector1Time || '0') || Infinity));
  const fastestS2 = Math.min(...drivers.map(d => parseFloat(d.sector2Time || '0') || Infinity));
  const fastestS3 = Math.min(...drivers.map(d => parseFloat(d.sector3Time || '0') || Infinity));

  // Helper function to get driver's personal best for a sector
  const getDriverPersonalBest = (driverId: string, sector: 's1' | 's2' | 's3') => {
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) return Infinity;
    
    const personalBestTime = sector === 's1' ? driver.personalBestS1 : 
                           sector === 's2' ? driver.personalBestS2 : 
                           driver.personalBestS3;
    return parseFloat(personalBestTime || '0') || Infinity;
  };

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <div className="grid grid-cols-10 gap-1 p-3 bg-gray-800 text-sm font-semibold border-b border-gray-500" style={{gridTemplateColumns: '64px 116px 116px 96px 96px 1fr 116px 80px 80px 80px'}}>
          <div className="px-2 border-r border-gray-500 text-center">POS</div>
          <div className="px-2 border-r border-gray-500 text-center">DRIVER</div>
          <div className="px-2 border-r border-gray-500 text-center">LAP TIME</div>
          <div className="px-2 border-r border-gray-500 text-center">GAP</div>
          <div className="px-2 border-r border-gray-500 text-center">CURRENT</div>
          <div className="px-2 border-r border-gray-500 text-center">MICRO-SECTORS</div>
          <div className="px-2 border-r border-gray-500 text-center">DRIVER</div>
          <div className="px-2 border-r border-gray-500 text-center">S1</div>
          <div className="px-2 border-r border-gray-500 text-center">S2</div>
          <div className="px-2 text-center">S3</div>
        </div>
        
        <AnimatePresence mode="popLayout">
          {drivers
            .sort((a, b) => {
              // Sort by position primarily
              if (a.position !== b.position) {
                return a.position - b.position;
              }
              // If positions are equal, sort by fastest lap time
              const aTime = parseFloat(a.bestLap.replace(':', '.'));
              const bTime = parseFloat(b.bestLap.replace(':', '.'));
              return aTime - bTime;
            })
            .map((driver, index) => {
              const previousIndex = previousDrivers.findIndex(d => d.id === driver.id);
              const isMoving = previousIndex !== -1 && previousIndex !== index;
              
              return (
                <motion.div
                  key={driver.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0,
                    backgroundColor: isMoving ? 'rgba(59, 130, 246, 0.1)' : 'transparent'
                  }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ 
                    duration: 0.5,
                    type: "spring",
                    stiffness: 300,
                    damping: 30
                  }}
                    className="grid grid-cols-10 gap-1 p-3 border-b border-gray-700 hover:bg-gray-800"
                  style={{gridTemplateColumns: '64px 116px 116px 96px 96px 1fr 116px 80px 80px 80px'}}
                >
            {/* POS - Fixed width with centered content */}
            <div className="px-2 border-r border-gray-500 flex items-center justify-center">
              <div className={`w-5 h-5 rounded text-xs font-bold flex items-center justify-center position-indicator ${
                driver.position === 1 ? 'bg-red-600' : 'bg-gray-500'
              }`}>
                {driver.position}
              </div>
            </div>
            
            {/* Driver (no position change indicators for practice/qualifying) */}
            <div className={`px-2 border-r border-gray-500 flex items-center ${
              driver.status !== 'RUNNING' ? 'opacity-40 text-gray-400' : ''
            }`}>
              <div className="flex items-center space-x-2">
                <div 
                  className="w-1 h-6 rounded"
                  style={{ backgroundColor: driver.teamColor }}
                ></div>
                <span className="font-medium text-sm">{driver.driverAbbreviation}</span>
              </div>
            </div>
            
            {/* Lap Time - justify left for time, right for tire */}
            <div className={`px-2 border-r border-gray-500 flex items-center justify-between ${
              driver.status !== 'RUNNING' ? 'opacity-40 text-gray-400' : ''
            }`}>
              <span className="text-sm">{driver.fastestLap}</span>
              <span className={`text-xs tire-indicator ${getTireColor(driver.fastestLapTire)}`}>
                {driver.fastestLapTire}
              </span>
            </div>
            
            {/* Gap or Retirement Status */}
            <div className={`px-2 border-r border-gray-500 text-sm text-center ${
              driver.status !== 'RUNNING' ? 'opacity-40 text-gray-400' : ''
            } ${
              driver.status !== 'RUNNING' ? 'opacity-40' : ''
            } ${getRetirementStatusColor(driver.status)}`}>
              {driver.status === 'RUNNING' ? driver.gap : getRetirementStatus(driver.status)}
            </div>
            
            {/* Current */}
            <div className={`px-2 border-r border-gray-500 text-sm text-center ${
              driver.status !== 'RUNNING' ? 'opacity-40 text-gray-400' : ''
            } ${
              driver.status !== 'RUNNING' ? 'opacity-40 text-gray-400' : ''
            }`}>
              {driver.currentLapTime}
            </div>
            
            {/* Micro-sectors as boxes (flexible width to fill remaining space) */}
            <div className={`px-2 border-r border-gray-500 flex justify-center items-center ${
              driver.status !== 'RUNNING' ? 'opacity-40' : ''
            }`}>
              <div className="flex justify-center space-x-1 overflow-hidden w-full">
                {driver.microSectors.map((sector, index) => {
                  // Add spacing between main sectors (every 8 micro-sectors)
                  const isMainSectorEnd = (index + 1) % 8 === 0 && index < driver.microSectors.length - 1;
                  return (
                    <div key={index} className="flex items-center">
                      <div
                        className={`w-3 h-3 rounded-sm ${
                          sector === 'purple' ? 'bg-purple-500' :
                          sector === 'green' ? 'bg-green-500' :
                          sector === 'yellow' ? 'bg-yellow-500' :
                          'bg-gray-500'
                        }`}
                      ></div>
                      {isMainSectorEnd && <div className="w-2"></div>}
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Driver Last Name */}
            <div className={`px-2 border-r border-gray-500 text-sm text-center ${
              driver.status !== 'RUNNING' ? 'opacity-40 text-gray-400' : ''
            }`}>
              {driver.driverName.split(' ').pop()}
            </div>
            
            {/* Sector Times with color coding */}
            <div className={`px-2 border-r border-gray-500 text-sm text-center ${
              driver.status !== 'RUNNING' ? 'opacity-40 text-gray-400' : ''
            } ${
              driver.status !== 'RUNNING' ? 'opacity-25 text-gray-400' : (
                parseFloat(driver.sector1Time || '0') === fastestS1 ? 'text-purple-400' :
                parseFloat(driver.sector1Time || '0') < getDriverPersonalBest(driver.id || '', 's1') ? 'text-green-400' :
                'text-white'
              )
            }`}>{driver.sector1Time || '--'}</div>
            <div className={`px-2 border-r border-gray-500 text-sm text-center ${
              driver.status !== 'RUNNING' ? 'opacity-40 text-gray-400' : ''
            } ${
              driver.status !== 'RUNNING' ? 'opacity-25 text-gray-400' : (
                parseFloat(driver.sector2Time || '0') === fastestS2 ? 'text-purple-400' :
                parseFloat(driver.sector2Time || '0') < getDriverPersonalBest(driver.id || '', 's2') ? 'text-green-400' :
                'text-white'
              )
            }`}>{driver.sector2Time || '--'}</div>
            <div className={`px-2 text-sm text-center ${
              driver.status !== 'RUNNING' ? 'opacity-25 text-gray-400' : (
                parseFloat(driver.sector3Time || '0') === fastestS3 ? 'text-purple-400' :
                parseFloat(driver.sector3Time || '0') < getDriverPersonalBest(driver.id || '', 's3') ? 'text-green-400' :
                'text-white'
              )
            }`}>{driver.sector3Time || '--'}</div>
                </motion.div>
              );
            })}
        </AnimatePresence>
    </div>
  );
};

// Race Timing Table Component
const RaceTimingTable = ({ drivers, previousDrivers }: { drivers: DriverData[], previousDrivers: DriverData[] }) => {
  // Find fastest sector times for each sector (overall)
  const fastestS1 = Math.min(...drivers.map(d => parseFloat(d.sector1Time || '0') || Infinity));
  const fastestS2 = Math.min(...drivers.map(d => parseFloat(d.sector2Time || '0') || Infinity));
  const fastestS3 = Math.min(...drivers.map(d => parseFloat(d.sector3Time || '0') || Infinity));

  // Helper function to get driver's personal best for a sector
  const getDriverPersonalBest = (driverId: string, sector: 's1' | 's2' | 's3') => {
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) return Infinity;
    
    const personalBestTime = sector === 's1' ? driver.personalBestS1 : 
                           sector === 's2' ? driver.personalBestS2 : 
                           driver.personalBestS3;
    return parseFloat(personalBestTime || '0') || Infinity;
  };

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <div className="grid grid-cols-11 gap-1 p-3 bg-gray-800 text-sm font-semibold border-b border-gray-500" style={{gridTemplateColumns: '64px 116px 80px 96px 116px 116px 1fr 116px 80px 80px 80px'}}>
          <div className="px-2 border-r border-gray-500 text-center">POS</div>
          <div className="px-2 border-r border-gray-500 text-center">DRIVER</div>
          <div className="px-2 border-r border-gray-500 text-center">GAP</div>
          <div className="px-2 border-r border-gray-500 text-center">INTERVAL</div>
          <div className="px-2 border-r border-gray-500 text-center">BEST LAP</div>
          <div className="px-2 border-r border-gray-500 text-center">LAST LAP</div>
          <div className="px-2 border-r border-gray-500 text-center">STINT GRAPH</div>
          <div className="px-2 border-r border-gray-500 text-center">DRIVER</div>
          <div className="px-2 border-r border-gray-500 text-center">S1</div>
          <div className="px-2 border-r border-gray-500 text-center">S2</div>
          <div className="px-2 text-center">S3</div>
        </div>
        
        <AnimatePresence mode="popLayout">
          {drivers
            .sort((a, b) => {
              // Sort by position primarily
              if (a.position !== b.position) {
                return a.position - b.position;
              }
              // If positions are equal, sort by fastest lap time
              const aTime = parseFloat(a.bestLap.replace(':', '.'));
              const bTime = parseFloat(b.bestLap.replace(':', '.'));
              return aTime - bTime;
            })
            .map((driver, index) => {
              const previousIndex = previousDrivers.findIndex(d => d.id === driver.id);
              const isMoving = previousIndex !== -1 && previousIndex !== index;
              
              return (
                <motion.div
                  key={driver.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0,
                    backgroundColor: isMoving ? 'rgba(59, 130, 246, 0.1)' : 'transparent'
                  }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ 
                    duration: 0.5,
                    type: "spring",
                    stiffness: 300,
                    damping: 30
                  }}
                    className="grid grid-cols-11 gap-1 p-3 border-b border-gray-700 hover:bg-gray-800"
                  style={{gridTemplateColumns: '64px 116px 80px 96px 116px 116px 1fr 116px 80px 80px 80px'}}
                >
            {/* POS - Fixed width with centered content */}
            <div className="px-2 border-r border-gray-500 flex items-center justify-center">
              <div className={`w-5 h-5 rounded text-xs font-bold flex items-center justify-center position-indicator ${
                driver.position === 1 ? 'bg-red-600' : 'bg-gray-500'
              }`}>
                {driver.position}
              </div>
            </div>
            
            {/* Driver with position change icons and numbers */}
            <div className="px-2 border-r border-gray-500 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-1 h-6 rounded"
                  style={{ backgroundColor: driver.teamColor }}
                ></div>
                <span className="font-medium text-sm">{driver.driverAbbreviation}</span>
              </div>
              <div className="flex items-center space-x-1">
                {driver.positionChange > 0 ? (
                  <>
                    <ArrowUp className="w-3 h-3 text-green-500 position-change" />
                    <span className="text-xs text-green-500 font-semibold position-change">{driver.positionChange}</span>
                  </>
                ) : driver.positionChange < 0 ? (
                  <>
                    <ArrowDown className="w-3 h-3 text-red-500 position-change" />
                    <span className="text-xs text-red-500 font-semibold position-change">{Math.abs(driver.positionChange)}</span>
                  </>
                ) : (
                  <>
                    <Minus className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-400">0</span>
                  </>
                )}
              </div>
            </div>
            
            {/* Gap or Retirement Status */}
            <div className={`px-2 border-r border-gray-500 text-sm text-center ${
              driver.status !== 'RUNNING' ? 'opacity-40 text-gray-400' : ''
            } ${
              driver.status !== 'RUNNING' ? 'opacity-40' : ''
            } ${getRetirementStatusColor(driver.status)}`}>
              {driver.status === 'RUNNING' ? driver.gap : getRetirementStatus(driver.status)}
            </div>
            
            {/* Interval */}
            <div className={`px-2 border-r border-gray-500 text-sm text-center ${
              driver.status !== 'RUNNING' ? 'opacity-40 text-gray-400' : ''
            } ${
              driver.status !== 'RUNNING' ? 'opacity-40 text-gray-400' : ''
            }`}>
              {driver.interval}
            </div>
            
            {/* Best Lap */}
            <div className={`px-2 border-r border-gray-500 text-sm text-center ${
              driver.status !== 'RUNNING' ? 'opacity-40 text-gray-400' : ''
            } ${
              driver.status !== 'RUNNING' ? 'opacity-25 text-gray-400' : (
                driver.bestLap === '1:27.146' ? 'text-purple-400' : ''
              )
            }`}>
              {driver.bestLap}
            </div>
            
            {/* Last Lap */}
            <div className={`px-2 border-r border-gray-500 text-sm text-center ${
              driver.status !== 'RUNNING' ? 'opacity-40 text-gray-400' : ''
            } ${
              driver.status !== 'RUNNING' ? 'opacity-25 text-gray-400' : (
                driver.lastLapTime === '1:27.146' ? 'text-purple-400' : ''
              )
            }`}>
              {driver.lastLapTime}
            </div>
            
            {/* Stint Graph (flexible width to fill remaining space) */}
            <div className={`px-2 border-r border-gray-500 flex justify-center items-center ${
              driver.status !== 'RUNNING' ? 'opacity-40' : ''
            }`}>
              <div className="flex justify-center items-center space-x-1 overflow-hidden w-full">
                <StintGraph driver={driver} />
              </div>
            </div>
            
            {/* Driver Last Name */}
            <div className={`px-2 border-r border-gray-500 text-sm text-center ${
              driver.status !== 'RUNNING' ? 'opacity-40 text-gray-400' : ''
            }`}>
              {driver.driverName.split(' ').pop()}
            </div>
            
            {/* Sector Times with color coding */}
            <div className={`px-2 border-r border-gray-500 text-sm text-center ${
              driver.status !== 'RUNNING' ? 'opacity-40 text-gray-400' : ''
            } ${
              driver.status !== 'RUNNING' ? 'opacity-25 text-gray-400' : (
                parseFloat(driver.sector1Time || '0') === fastestS1 ? 'text-purple-400' :
                parseFloat(driver.sector1Time || '0') < getDriverPersonalBest(driver.id || '', 's1') ? 'text-green-400' :
                'text-white'
              )
            }`}>{driver.sector1Time || '--'}</div>
            <div className={`px-2 border-r border-gray-500 text-sm text-center ${
              driver.status !== 'RUNNING' ? 'opacity-40 text-gray-400' : ''
            } ${
              driver.status !== 'RUNNING' ? 'opacity-25 text-gray-400' : (
                parseFloat(driver.sector2Time || '0') === fastestS2 ? 'text-purple-400' :
                parseFloat(driver.sector2Time || '0') < getDriverPersonalBest(driver.id || '', 's2') ? 'text-green-400' :
                'text-white'
              )
            }`}>{driver.sector2Time || '--'}</div>
            <div className={`px-2 text-sm text-center ${
              driver.status !== 'RUNNING' ? 'opacity-25 text-gray-400' : (
                parseFloat(driver.sector3Time || '0') === fastestS3 ? 'text-purple-400' :
                parseFloat(driver.sector3Time || '0') < getDriverPersonalBest(driver.id || '', 's3') ? 'text-green-400' :
                'text-white'
              )
            }`}>{driver.sector3Time || '--'}</div>
                </motion.div>
              );
            })}
        </AnimatePresence>
    </div>
  );
};

// Helper function for tire colors
const getTireColor = (tire: 'S' | 'M' | 'H' | 'I' | 'W'): string => {
  switch (tire) {
    case 'S': return 'text-red-500';
    case 'M': return 'text-yellow-500';
    case 'H': return 'text-white';
    case 'I': return 'text-green-500';
    case 'W': return 'text-blue-500';
    default: return 'text-gray-400';
  }
};
