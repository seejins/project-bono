import { useState, useEffect, useRef, useMemo } from 'react';
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
  status: 'RUNNING' | 'OUT_LAP' | 'IN_LAP' | 'PITTING' | 'PIT' | 'OUT' | 'DNF' | 'DSQ' | 'RET' | 'NCL' | 'FINISHED';
  driverStatus: 'RUNNING' | 'OUT_LAP' | 'IN_LAP' | 'IN_GARAGE';
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

// Interface for persisted sector times

// Session Timer Component - Pure JavaScript animation (no React re-renders)
const SessionTimer = ({ sessionTimeLeft, isRunning }: { sessionTimeLeft: number; isRunning: boolean }) => {
  const displayRef = useRef<HTMLSpanElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const initialTimeRef = useRef<number>(sessionTimeLeft);
  
  useEffect(() => {
    if (isRunning && displayRef.current) {
      console.log(`⏰ SessionTimer started: ${sessionTimeLeft}s remaining`);
      startTimeRef.current = Date.now();
      initialTimeRef.current = sessionTimeLeft;
      
      timerRef.current = setInterval(() => {
        if (displayRef.current) {
          const elapsed = (Date.now() - startTimeRef.current) / 1000;
          const remaining = Math.max(0, initialTimeRef.current - elapsed);
          const minutes = Math.floor(remaining / 60);
          const seconds = (remaining % 60).toFixed(0).padStart(2, '0');
          displayRef.current.textContent = `${minutes}:${seconds}`;
          
          // Log timer updates every 5 seconds to track frequency
          if (Math.floor(elapsed) % 5 === 0 && Math.floor(elapsed) > 0) {
            console.log(`⏰ Timer update: ${minutes}:${seconds} remaining (elapsed: ${elapsed.toFixed(1)}s)`);
          }
        }
      }, 100); // Update every 100ms for smooth countdown
    } else {
      if (timerRef.current) {
        console.log(`⏰ SessionTimer stopped`);
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning]);
  
  // Sync with game data when it changes (no re-render)
  useEffect(() => {
    startTimeRef.current = Date.now();
    initialTimeRef.current = sessionTimeLeft;
  }, [sessionTimeLeft]);
  
  return <span ref={displayRef} className="font-mono">{Math.floor(sessionTimeLeft / 60)}:{(sessionTimeLeft % 60).toFixed(0).padStart(2, '0')}</span>;
};

// Get retirement status text based on F1 23 UDP status
const getRetirementStatus = (status: string): string => {
  switch (status) {
    case 'RUNNING': 
    case 'OUT_LAP': 
    case 'IN_LAP': 
    case 'PITTING': 
    case 'PIT': 
    case 'FINISHED':
      return ''; // These are active statuses, show gap instead
    case 'DNF': return 'DNF';
    case 'RET': return 'RET';
    case 'DSQ': return 'DSQ';
    case 'NCL': return 'NCL';
    case 'OUT': return 'OUT';
    default: return '';
  }
};

// Get color for retirement status
const getRetirementStatusColor = (status: string): string => {
  switch (status) {
    case 'RUNNING': 
    case 'OUT_LAP': 
    case 'IN_LAP': 
    case 'PITTING': 
    case 'PIT': 
    case 'FINISHED':
      return 'text-white'; // Active - normal color
    case 'DNF': return 'text-red-500'; // DNF
    case 'RET': return 'text-red-500'; // RETIRED
    case 'DSQ': return 'text-red-500'; // DISQUALIFIED
    case 'NCL': return 'text-gray-400'; // NOT CLASSIFIED
    case 'OUT': return 'text-orange-500'; // OUT
    default: return 'text-white';
  }
};

// Helper function to determine if driver row should be dimmed
const isDriverRetired = (status: string): boolean => {
  return status === 'DNF' || status === 'RET' || status === 'DSQ' || status === 'NCL' || status === 'OUT';
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
  const [renderCount, setRenderCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [updateDelta, setUpdateDelta] = useState<number | null>(null);
  const previousS1Times = useRef<Map<string, number>>(new Map());
  const previousLapNumbers = useRef<Map<string, number>>(new Map());
  const [currentSessionUid, setCurrentSessionUid] = useState<number | null>(null);
  const [currentSessionType, setCurrentSessionType] = useState<number | null>(null);
  const previousSessionTimeLeft = useRef<number | null>(null);
  const sessionRef = useRef<any>(null);
  const lastUpdateLogRef = useRef<number>(0);
  const previousSectors = useRef<Map<number, number>>(new Map());
  const lastDriversUpdateRef = useRef<number>(0);
  const prevStatusMap = useRef<Map<number, string>>(new Map());
  const prevPositionMap = useRef<Map<number, number>>(new Map());

  useEffect(() => {
    // Initialize socket connection
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const newSocket = io(apiUrl);

    newSocket.on('connect', () => {
      console.log('Connected to Live Timings backend');
      setIsConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[socket] Disconnected:', reason);
    });
    newSocket.on('reconnect_attempt', (attempt) => {
      console.log('[socket] Reconnect attempt', attempt);
    });
    newSocket.on('reconnect', (attempt) => {
      console.log('[socket] Reconnected on attempt', attempt);
    });

    // Listen for telemetry data
    newSocket.on('telemetry', (data: any) => {
      const now = new Date();
      setUpdateDelta(lastUpdate ? now.getTime() - lastUpdate.getTime() : null);
      setLastUpdate(now);
      processSessionData(data);
    });

    // Listen for session data
    newSocket.on('session', (data: any) => {
      processSessionData(data);
    });

    // Listen for session completion
    newSocket.on('sessionCompleted', (data: any) => {
      console.log('Session completed:', data);
      // Handle session completion
    });

    // Listen for session changes
    newSocket.on('sessionChanged', (data: any) => {
      console.log('🔄 Session changed, clearing live timings data...');
      // Clear all state
      setDrivers([]);
      setPreviousDrivers([]);
      previousS1Times.current.clear();
      previousLapNumbers.current.clear();
      setCurrentSessionUid(data.sessionUid);
      setCurrentSessionType(data.newSessionType);
    });

    // Listen for session restarts
    newSocket.on('sessionRestarted', (data: any) => {
      console.log('🔄 Session restarted, clearing live timings data...');
      // Clear all state (same as session change)
      setDrivers([]);
      setPreviousDrivers([]);
      previousS1Times.current.clear();
      previousLapNumbers.current.clear();
      setCurrentSessionUid(data.sessionUid);
      setCurrentSessionType(data.sessionType);
    });

    setSocket(newSocket);

    return () => {
      newSocket.off('telemetry');
      newSocket.off('session');
      newSocket.off('sessionCompleted');
      newSocket.off('sessionChanged');
      newSocket.off('sessionRestarted');
      newSocket.off('connect');
      newSocket.off('disconnect');
      newSocket.off('reconnect_attempt');
      newSocket.off('reconnect');
      newSocket.close();
    };
  }, []); // Only run once on mount/unmount

  const processSessionData = (data: any) => {
    // Create mapping of previous drivers by carNumber
    const prevDriversMap = new Map();
    previousDrivers.forEach((driver: any) => {
      prevDriversMap.set(String(driver.carNumber), driver);
    });

    // Process F1 23 UDP data and update session/driver states
    // If data is an array, extract session info from first driver
    const firstDriver = Array.isArray(data) && data.length > 0 ? data[0] : data;
    
    const sessionType = firstDriver.sessionType || firstDriver.lapData?.sessionType || 10;
    const sessionUid = firstDriver.header?.sessionUid || firstDriver.sessionUid || 0;
    const sessionTimeLeft = firstDriver.sessionTimeLeft || 0;
    
    // Detect session change (by session UID or session type)
    if ((currentSessionUid !== null && currentSessionUid !== sessionUid) ||
        (currentSessionType !== null && currentSessionType !== sessionType)) {
      console.log('🔄 New session detected in frontend, clearing state...');
      setDrivers([]);
      setPreviousDrivers([]);
      previousS1Times.current.clear();
      previousLapNumbers.current.clear();
    }
    
    // Detect session restart (same UID and type, but session time suddenly increased)
    if (currentSessionUid === sessionUid && 
        currentSessionType === sessionType &&
        previousSessionTimeLeft.current !== null &&
        sessionTimeLeft > previousSessionTimeLeft.current + 30) { // 30 second threshold
      console.log('🔄 Session restart detected in frontend (same session, time reset), clearing state...');
      setDrivers([]);
      setPreviousDrivers([]);
      previousS1Times.current.clear();
      previousLapNumbers.current.clear();
    }
    
    setCurrentSessionUid(sessionUid);
    setCurrentSessionType(sessionType);
    previousSessionTimeLeft.current = sessionTimeLeft;
    
    const getSessionTypeName = (sessionTypeNum: number): string => {
      const sessionTypes = [
        'Unknown', 'Practice 1', 'Practice 2', 'Practice 3',
        'Short Practice', 'Q1', 'Q2', 'Q3', 'Short Qualifying',
        'One Shot Qualifying', 'Race', 'Race 2', 'Time Trial'
      ];
      return sessionTypes[sessionTypeNum] || 'Unknown';
    };

    const getSessionCategory = (sessionTypeNum: number): 'PRACTICE' | 'QUALIFYING' | 'RACE' => {
      // Practice sessions (1-4)
      if (sessionTypeNum >= 1 && sessionTypeNum <= 4) {
        return 'PRACTICE';
      }
      // Qualifying sessions (5-9)
      if (sessionTypeNum >= 5 && sessionTypeNum <= 9) {
        return 'QUALIFYING';
      }
      // Race sessions (10-11)
      if (sessionTypeNum >= 10 && sessionTypeNum <= 11) {
        return 'RACE';
      }
      // Default to PRACTICE for unknown/other types
      return 'PRACTICE';
    };
    const sessionTypeName = getSessionTypeName(sessionType);
    const sessionCategory = getSessionCategory(sessionType);
    
    // Extract session information from first driver data
    const trackName = firstDriver.trackName || 'Unknown Track';
    const currentLap = firstDriver.lapNumber || firstDriver.lapData?.currentLapNum || 0;
    const totalLaps = firstDriver.sessionData?.totalLaps || 0;
    
    const nextSession = {
      sessionType: sessionCategory,
      sessionTypeName: sessionTypeName,
      trackName: trackName,
      timeRemaining: sessionTimeLeft,
      currentLap: currentLap,
      totalLaps: totalLaps,
      isConnected: true
    };

    const prev = sessionRef.current;
    const timeChangedMeaningfully =
      !prev || Math.abs((prev?.timeRemaining ?? 0) - (nextSession.timeRemaining ?? 0)) >= 1;

    const metaChanged =
      !prev ||
      prev.sessionType !== nextSession.sessionType ||
      prev.sessionTypeName !== nextSession.sessionTypeName ||
      prev.trackName !== nextSession.trackName ||
      prev.currentLap !== nextSession.currentLap ||
      prev.totalLaps !== nextSession.totalLaps;

    if (metaChanged || timeChangedMeaningfully) {
      sessionRef.current = nextSession;
      setSessionData(nextSession);
    }

    // Convert F1 23 UDP data to our format
    if (data && Array.isArray(data)) {
      // Find the leader's best lap time (position 1 driver's best lap)
      const leader = data.find((driver: any) => driver.lapData?.carPosition === 1);
      const leaderBestLapTime = leader?.lapData?.bestLapTimeInMS || leader?.lapData?.lastLapTimeInMS || 0;
      
      // Helper to map numeric driver status to string to match UI format
      const mapDriverStatus = (status: number): string => {
        switch (status) {
          case 0: return 'IN_GARAGE';
          case 1: return 'RUNNING';
          case 2: return 'IN_LAP';
          case 3: return 'OUT_LAP';
          case 4: return 'RUNNING';
          default: return 'RUNNING';
        }
      };

      // Check for specific triggers that should cause updates (reduced noise)
      let hasUpdates = false;
      let updateReasons: string[] = [];

      data.forEach((driver: any, index: number) => {
        const carIndex = index;
        const lapData = driver.lapData;
        if (!lapData) return;

        const carNumber = driver.carNumber;
        const prevUI = prevDriversMap.get(String(carNumber));

        // Position changes via ref map (no render-lag dependency)
        const currentPosition = lapData.carPosition || 0;
        const prevPos = prevPositionMap.current.get(carNumber) ?? currentPosition;
        if (currentPosition !== prevPos) {
          hasUpdates = true;
          updateReasons.push(`Car ${carIndex}: Position ${prevPos} → ${currentPosition}`);
          // console.log(`[pos-change] car=${carNumber} ${prevPos} → ${currentPosition}`);
        }
        prevPositionMap.current.set(carNumber, currentPosition);

        // Lap completion
        const currentLapNum = lapData.currentLapNum || 0;
        const previousLapNum = previousLapNumbers.current.get(carNumber) || 0;
        if (currentLapNum > previousLapNum && previousLapNum > 0) {
          hasUpdates = true;
          updateReasons.push(`Car ${carIndex}: Lap ${previousLapNum} → ${currentLapNum}`);
        }
        previousLapNumbers.current.set(carNumber, currentLapNum);

        // Sector completion (only when driver is RUNNING): S0->1 or 1->2
        const currentSector = lapData.sector ?? 0;
        const prevSector = previousSectors.current.get(carNumber) ?? currentSector;
        if (prevUI && prevUI.driverStatus === 'RUNNING' && currentSector > prevSector) {
          hasUpdates = true;
          updateReasons.push(`Car ${carIndex}: Sector ${prevSector} → ${currentSector}`);
        }
        previousSectors.current.set(carNumber, currentSector);

        // Best lap time changes
        const currentBestLap = lapData.bestLapTimeInMS || 0;
        const previousBestLapStr = prevUI?.bestLap || '0';
        const previousBestLap = parseFloat(previousBestLapStr.replace(':', '.')) || 0;
        if (prevUI && currentBestLap > 0 && currentBestLap !== previousBestLap) {
          hasUpdates = true;
          updateReasons.push(`Car ${carIndex}: New best lap ${(currentBestLap / 1000).toFixed(3)}s`);
        }

        // Driver status changes via ref map (no render-lag dependency)
        const currentDriverStatusStr = mapDriverStatus(lapData.driverStatus ?? 0);
        const prevStatus = prevStatusMap.current.get(carNumber) ?? currentDriverStatusStr;
        if (currentDriverStatusStr !== prevStatus) {
          hasUpdates = true;
          updateReasons.push(`Car ${carIndex}: Driver status ${prevStatus} → ${currentDriverStatusStr}`);
          // console.log(`[status-change] car=${carNumber} ${prevStatus} → ${currentDriverStatusStr}`);
        }
        prevStatusMap.current.set(carNumber, currentDriverStatusStr);
      });

      // First packet: allow render without logging
      if (previousDrivers.length === 0) {
        hasUpdates = true;
        updateReasons = [];
      }

      // Throttled, capped logging
      if (hasUpdates) {
        const now = Date.now();
        if (now - lastUpdateLogRef.current >= 1000 && updateReasons.length > 0) {
          lastUpdateLogRef.current = now;
          const shown = updateReasons.slice(0, 10);
          console.log('🎯 UPDATE TRIGGERS DETECTED:', shown.join(', '), updateReasons.length > 10 ? `(+${updateReasons.length - 10} more)` : '');
        }
      } else {
        // Heartbeat fallback: refresh at least every 33ms to avoid stale UI (was 400ms; now ~30Hz for smooth F1 UDP live data)
        const now = Date.now();
        if (now - (lastDriversUpdateRef.current || 0) < 33) {
          return; // Skip if recently refreshed and no triggers
        }
        // console.log('[heartbeat-refresh] Forcing refresh due to inactivity');
      }
      
      // Prepare hash map for previous drivers for O(1) lookup
      // const prevDriversMap = new Map(previousDrivers.map(d => [d.id, d])); // This line is now redundant
      // Prepare pruned map for lap numbers
      const newDriverIds = new Set(data.map((d: any) => String(d.carNumber)));
      // Prune previousLapNumbers to only include current drivers
      for (const key of previousLapNumbers.current.keys()) {
        if (!newDriverIds.has(key)) {
          previousLapNumbers.current.delete(key);
        }
      }

      // Convert all drivers and update state - React will handle change detection
      const newDrivers: DriverData[] = data
        .map((d: any) => convertToLiveTimingsFormat(d, leaderBestLapTime))
        .sort((a, b) => a.position - b.position);

      // Trim previousDrivers to current session drivers only
      const nextDriverIdsSet = new Set(newDrivers.map(d => d.id));
      const trimmedPreviousDrivers = previousDrivers.filter(d => nextDriverIdsSet.has(d.id));
      setPreviousDrivers(trimmedPreviousDrivers);

      setDrivers(newDrivers);
      lastDriversUpdateRef.current = Date.now();
      setRenderCount(prev => prev + 1);
      // (removed processStartTime/processTime log block)
    }
    // (removed left-over console logs)
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
      const totalSeconds = Math.max(0, sessionData.timeRemaining || 0);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
      return `${minutes}:${seconds}`;
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
              <span className="text-lg">🏁 {sessionData.sessionTypeName || sessionData.sessionType}</span>
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
        <div className="w-full bg-gray-800 rounded-lg overflow-hidden relative">
          {sessionData.sessionType === 'RACE' ? (
            <RaceTimingTable drivers={drivers} previousDrivers={previousDrivers} />
            ) : (
                <PracticeQualifyingTimingTable 
                  drivers={drivers} 
                  previousDrivers={previousDrivers} 
                />
            )}
        </div>
      </div>
    </div>
  );
};

// Practice/Qualifying Timing Table Component
const PracticeQualifyingTimingTable = ({ 
  drivers, 
  previousDrivers
}: { 
  drivers: DriverData[], 
  previousDrivers: DriverData[]
}) => {
  // Memoize parse for sector times
  const parseSectorTimeString = useMemo(() => (timeStr: string): number => {
    if (!timeStr || timeStr === '--:--' || timeStr === '--.---') return 0;
    if (timeStr.includes(':')) {
      const parts = timeStr.split(':');
      const minutes = parseFloat(parts[0]) || 0;
      const seconds = parseFloat(parts[1]) || 0;
      return minutes * 60 + seconds;
    }
    return parseFloat(timeStr) || 0;
  }, []);

  // Memoize fastest sectors only when drivers change
  const fastestSectors = useMemo(() => {
    // Sector times on best lap, for overall purple sector highlighting
    const validS1Times = drivers
      .filter(d => d.sector1Time && d.sector1Time !== '--.---')
      .map(d => parseSectorTimeString(d.sector1Time || '0'))
      .filter(t => t > 0);
    const fastestS1 = validS1Times.length > 0 ? Math.min(...validS1Times) : Infinity;
    const validS2Times = drivers
      .filter(d => d.sector2Time && d.sector2Time !== '--.---')
      .map(d => parseSectorTimeString(d.sector2Time || '0'))
      .filter(t => t > 0);
    const fastestS2 = validS2Times.length > 0 ? Math.min(...validS2Times) : Infinity;
    const validS3Times = drivers
      .filter(d => d.sector3Time && d.sector3Time !== '--.---')
      .map(d => parseSectorTimeString(d.sector3Time || '0'))
      .filter(t => t > 0);
    const fastestS3 = validS3Times.length > 0 ? Math.min(...validS3Times) : Infinity;
    // Pre-index by driver for personal best lookup
    const sectorBestMap: Record<string, {s1: number, s2: number, s3: number}> = {};
    drivers.forEach(d => {
      sectorBestMap[d.id] = {
        s1: parseSectorTimeString(d.sector1Time || '0'),
        s2: parseSectorTimeString(d.sector2Time || '0'),
        s3: parseSectorTimeString(d.sector3Time || '0')
      };
    });
    return { fastestS1, fastestS2, fastestS3, sectorBestMap };
  }, [drivers, parseSectorTimeString]);

  // Memoize cell class computation for current/personal/purple/green sector coloring
  const getCurrentSectorColor = useMemo(() => (driver: DriverData, sector: 's1' | 's2' | 's3') => {
    const currentTimeStr = sector === 's1' ? driver.personalBestS1 || '0' : sector === 's2' ? driver.personalBestS2 || '0' : driver.personalBestS3 || '0';
    const currentTime = parseSectorTimeString(currentTimeStr);
    if (!currentTime || isDriverRetired(driver.status)) return '';
    const fastest = sector === 's1' ? fastestSectors.fastestS1 : sector === 's2' ? fastestSectors.fastestS2 : fastestSectors.fastestS3;
    if (fastest === Infinity || fastest === 0) return '';
    if (currentTime < fastest) {
      return 'text-purple-400 font-semibold';
    }
    // Use memoized best time
    const best = fastestSectors.sectorBestMap[driver.id]?.[sector] || 0;
    if (best > 0 && currentTime < best) {
      return 'text-green-400';
    }
    return 'text-white';
  }, [fastestSectors, parseSectorTimeString]);

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <div className="grid grid-cols-13 gap-1 p-3 bg-gray-800 text-sm font-semibold border-b border-gray-500" style={{gridTemplateColumns: '64px 116px 116px 96px 80px 80px 80px 1fr 116px 96px 80px 80px 80px'}}>
          <div className="px-2 border-r border-gray-500 text-center">POS</div>
          <div className="px-2 border-r border-gray-500 text-center">DRIVER</div>
          <div className="px-2 border-r border-gray-500 text-center">LAP TIME</div>
          <div className="px-2 border-r border-gray-500 text-center">GAP</div>
          <div className="px-2 border-r border-gray-500 text-center">S1</div>
          <div className="px-2 border-r border-gray-500 text-center">S2</div>
          <div className="px-2 border-r border-gray-500 text-center">S3</div>
          <div className="px-2 border-r border-gray-500 text-center">MICRO-SECTORS</div>
          <div className="px-2 border-r border-gray-500 text-center">DRIVER</div>
          <div className="px-2 border-r border-gray-500 text-center">STATUS</div>
          <div className="px-2 border-r border-gray-500 text-center">S1</div>
          <div className="px-2 border-r border-gray-500 text-center">S2</div>
          <div className="px-2 text-center">S3</div>
        </div>
        
        <AnimatePresence mode="popLayout">
          {drivers
            .map((driver, index) => {
              const previousIndex = previousDrivers.findIndex(d => d.id === driver.id);
              const isMoving = previousIndex !== -1 && previousIndex !== index;
              
              return (
                <motion.div
                  key={driver.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0
                  }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ 
                    duration: 0.2,
                    type: "spring",
                    stiffness: 300,
                    damping: 30
                  }}
                    className="grid grid-cols-13 gap-1 p-3 border-b border-gray-700 hover:bg-gray-800"
                  style={{gridTemplateColumns: '64px 116px 116px 96px 80px 80px 80px 1fr 116px 96px 80px 80px 80px'}}
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
              isDriverRetired(driver.status) ? 'opacity-40 text-gray-400' : ''
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
              isDriverRetired(driver.status) ? 'opacity-40 text-gray-400' : ''
            }`}>
              <span className="text-sm">{driver.fastestLap}</span>
              <span className={`text-xs tire-indicator ${getTireColor(driver.fastestLapTire)}`}>
                {driver.fastestLapTire}
              </span>
            </div>
            
            {/* Gap or Retirement Status */}
            <div className={`px-2 border-r border-gray-500 text-sm text-center ${
              isDriverRetired(driver.status) ? 'opacity-40 text-gray-400' : ''
            } ${getRetirementStatusColor(driver.status)}`}>
              {isDriverRetired(driver.status) ? getRetirementStatus(driver.status) : driver.gap}
            </div>
            
            {/* S1 (Best Lap) - Purple for fastest overall */}
            <div className={`px-2 border-r border-gray-500 text-sm text-center ${
              isDriverRetired(driver.status) ? 'opacity-40 text-gray-400' : ''
            } ${fastestSectors.fastestS1 !== Infinity && Math.abs(parseSectorTimeString(driver.sector1Time || '0') - fastestSectors.fastestS1) < 0.001 ? 'text-purple-400 font-semibold' : ''}`}>
              {driver.sector1Time || '--:--'}
            </div>
            
            {/* S2 (Best Lap) - Purple for fastest overall */}
            <div className={`px-2 border-r border-gray-500 text-sm text-center ${
              isDriverRetired(driver.status) ? 'opacity-40 text-gray-400' : ''
            } ${fastestSectors.fastestS2 !== Infinity && Math.abs(parseSectorTimeString(driver.sector2Time || '0') - fastestSectors.fastestS2) < 0.001 ? 'text-purple-400 font-semibold' : ''}`}>
              {driver.sector2Time || '--:--'}
            </div>
            
            {/* S3 (Best Lap) - Purple for fastest overall */}
            <div className={`px-2 border-r border-gray-500 text-sm text-center ${
              isDriverRetired(driver.status) ? 'opacity-40 text-gray-400' : ''
            } ${fastestSectors.fastestS3 !== Infinity && Math.abs(parseSectorTimeString(driver.sector3Time || '0') - fastestSectors.fastestS3) < 0.001 ? 'text-purple-400 font-semibold' : ''}`}>
              {driver.sector3Time || '--:--'}
            </div>
            
            {/* Micro-sectors as boxes (flexible width to fill remaining space) */}
            <div className={`px-2 border-r border-gray-500 flex justify-center items-center ${
              isDriverRetired(driver.status) ? 'opacity-40' : ''
            }`}>
              <div className="flex justify-center space-x-1 overflow-hidden w-full">
                {(driver.microSectors || []).map((sector, index) => {
                  // Add spacing between main sectors (every 8 micro-sectors)
                  const isMainSectorEnd = (index + 1) % 8 === 0 && index < (driver.microSectors || []).length - 1;
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
              isDriverRetired(driver.status) ? 'opacity-40 text-gray-400' : ''
            }`}>
              {driver.driverName.split(' ').pop()}
            </div>
            
            {/* Status */}
            <div className={`px-2 border-r border-gray-500 text-sm text-center ${
              isDriverRetired(driver.status) ? 'opacity-40 text-gray-400' : ''
            }`}>
              {driver.status || ''}
            </div>
            
                {/* S1 (Current) - Color coding: purple = best overall, green = personal best */}
                <div className={`px-2 border-r border-gray-500 text-sm text-center ${
                 isDriverRetired(driver.status) ? 'opacity-40 text-gray-400' : getCurrentSectorColor(driver, 's1')
                }`}>
                 {driver.personalBestS1 || '--:--'}
                </div>
            
              {/* S2 (Current) - Color coding: purple = best overall, green = personal best */}
              <div className={`px-2 border-r border-gray-500 text-sm text-center ${
                isDriverRetired(driver.status) ? 'opacity-40 text-gray-400' : getCurrentSectorColor(driver, 's2')
              }`}>
                {driver.personalBestS2 || '--:--'}
              </div>
            
              {/* S3 (Current) - Color coding: purple = best overall, green = personal best */}
              <div className={`px-2 text-sm text-center ${
                isDriverRetired(driver.status) ? 'opacity-40 text-gray-400' : getCurrentSectorColor(driver, 's3')
              }`}>
                {driver.personalBestS3 || '--:--'}
              </div>
                </motion.div>
              );
            })}
        </AnimatePresence>
    </div>
  );
};

// Race Timing Table Component
const RaceTimingTable = ({ drivers, previousDrivers }: { drivers: DriverData[], previousDrivers: DriverData[] }) => {
  // Memoize fastest overall sector times and per-driver personal bests
  const {
    fastestS1, fastestS2, fastestS3, driverBestMap
  } = useMemo(() => {
    const sectorParse = (v?: string) => (v ? parseFloat(v) || Infinity : Infinity);
    const s1s = drivers.map(d => sectorParse(d.sector1Time)).filter(t => t !== Infinity);
    const s2s = drivers.map(d => sectorParse(d.sector2Time)).filter(t => t !== Infinity);
    const s3s = drivers.map(d => sectorParse(d.sector3Time)).filter(t => t !== Infinity);
    const fastestS1 = s1s.length ? Math.min(...s1s) : Infinity;
    const fastestS2 = s2s.length ? Math.min(...s2s) : Infinity;
    const fastestS3 = s3s.length ? Math.min(...s3s) : Infinity;
    // Pre-index for personal best
    const bestMap: Record<string, { s1: number; s2: number; s3: number }> = {};
    drivers.forEach(d => {
      bestMap[d.id] = {
        s1: sectorParse(d.personalBestS1),
        s2: sectorParse(d.personalBestS2),
        s3: sectorParse(d.personalBestS3)
      };
    });
    return { fastestS1, fastestS2, fastestS3, driverBestMap: bestMap };
  }, [drivers]);

  const getSectorColor = useMemo(() => (driver: DriverData, sector: 's1' | 's2' | 's3') => {
    if (!driver.status || driver.status !== 'RUNNING') return '';
    const val = sector === 's1' ? driver.personalBestS1 : sector === 's2' ? driver.personalBestS2 : driver.personalBestS3;
    const time = val ? parseFloat(val) || Infinity : Infinity;
    const fastest = sector === 's1' ? fastestS1 : sector === 's2' ? fastestS2 : fastestS3;
    const best = driverBestMap[driver.id]?.[sector] ?? Infinity;
    if (time < fastest) return 'text-purple-400 font-semibold';
    if (time < best) return 'text-green-400';
    return '';
  }, [fastestS1, fastestS2, fastestS3, driverBestMap]);

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
          {drivers.map((driver, index) => {
              const previousIndex = previousDrivers.findIndex(d => d.id === driver.id);
              const isMoving = previousIndex !== -1 && previousIndex !== index;
              
              return (
                <motion.div
                  key={driver.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0
                  }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ 
                    duration: 0.2,
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
              isDriverRetired(driver.status) ? 'opacity-40 text-gray-400' : ''
            } ${getRetirementStatusColor(driver.status)}`}>
              {isDriverRetired(driver.status) ? getRetirementStatus(driver.status) : driver.gap}
            </div>
            
            {/* Interval */}
            <div className={`px-2 border-r border-gray-500 text-sm text-center ${
              isDriverRetired(driver.status) ? 'opacity-40 text-gray-400' : ''
            }`}>
              {driver.interval}
            </div>
            
            {/* Best Lap */}
            <div className={`px-2 border-r border-gray-500 text-sm text-center ${
              isDriverRetired(driver.status) ? 'opacity-40 text-gray-400' : ''
            } ${
              driver.status !== 'RUNNING' ? 'opacity-25 text-gray-400' : (
                driver.bestLap === '1:27.146' ? 'text-purple-400' : ''
              )
            }`}>
              {driver.bestLap}
            </div>
            
            {/* Last Lap */}
            <div className={`px-2 border-r border-gray-500 text-sm text-center ${
              isDriverRetired(driver.status) ? 'opacity-40 text-gray-400' : ''
            } ${
              driver.status !== 'RUNNING' ? 'opacity-25 text-gray-400' : (
                driver.lastLapTime === '1:27.146' ? 'text-purple-400' : ''
              )
            }`}>
              {driver.lastLapTime}
            </div>
            
            {/* Stint Graph (flexible width to fill remaining space) */}
            <div className={`px-2 border-r border-gray-500 flex justify-center items-center ${
              isDriverRetired(driver.status) ? 'opacity-40' : ''
            }`}>
              <div className="flex justify-center items-center space-x-1 overflow-hidden w-full">
                <StintGraph driver={driver} />
              </div>
            </div>
            
            {/* Driver Last Name */}
            <div className={`px-2 border-r border-gray-500 text-sm text-center ${
              isDriverRetired(driver.status) ? 'opacity-40 text-gray-400' : ''
            }`}>
              {driver.driverName.split(' ').pop()}
            </div>
            
            {/* Sector Times with color coding */}
            <div className={`px-2 border-r border-gray-500 text-sm text-center ${getSectorColor(driver, 's1')}`}>{driver.personalBestS1 || '--:--'}</div>
            <div className={`px-2 border-r border-gray-500 text-sm text-center ${getSectorColor(driver, 's2')}`}>{driver.personalBestS2 || '--:--'}</div>
            <div className={`px-2 text-sm text-center ${getSectorColor(driver, 's3')}`}>{driver.personalBestS3 || '--:--'}</div>
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

