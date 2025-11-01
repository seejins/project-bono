import { useState, useEffect, useRef, useMemo, Fragment } from 'react';
import { io, Socket } from 'socket.io-client';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { convertToLiveTimingsFormat, getSessionTypeName, getSessionCategory, formatSectorTime, formatLapTime } from '../utils/f123DataMapping';

// Driver data interface for live timings
interface DriverData {
  id: string;
  position: number;
  driverName: string;
  driverAbbreviation: string;
  teamColor: string;
  fastestLap: string;
  fastestLapTire?: 'S' | 'M' | 'H' | 'I' | 'W'; // Only set when there's a valid lap time
  gap: string;
  currentLapTime: string;
  lastLapTime: string;
  bestLap: string;
  bestLapTire?: 'S' | 'M' | 'H' | 'I' | 'W';
  interval: string;
  status: 'RUNNING' | 'OUT_LAP' | 'IN_LAP' | 'IN LAP' | 'OUT LAP' | 'PITTING' | 'PIT' | 'OUT' | 'DNF' | 'DSQ' | 'RET' | 'NCL' | 'FINISHED';
  driverStatus: 'RUNNING' | 'OUT_LAP' | 'IN_LAP' | 'IN_GARAGE';
  positionChange: number;
  lapsOnCompound: number;
  tireCompound: 'S' | 'M' | 'H';
  sector1Time?: string;
  sector2Time?: string;
  sector3Time?: string;
  LS1?: string;
  LS2?: string;
  LS3?: string;
  microSectors: Array<'purple' | 'green' | 'yellow' | 'grey'>;
  isFastestLap?: boolean; // For Best Lap column color coding (isolated from sectors)
  stintHistory: Array<{
    compound: 'S' | 'M' | 'H';
    laps: number;
  }>;
  currentTire: 'S' | 'M' | 'H';
  stintLaps: number;
  totalRaceLaps: number;
}

// Session Timer Component - Pure JavaScript animation (no React re-renders)
const SessionTimer = ({ sessionTimeLeft, isRunning }: { sessionTimeLeft: number; isRunning: boolean }) => {
  const displayRef = useRef<HTMLSpanElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const initialTimeRef = useRef<number>(sessionTimeLeft);
  
  useEffect(() => {
    if (isRunning && displayRef.current) {
      startTimeRef.current = Date.now();
      initialTimeRef.current = sessionTimeLeft;
      
      timerRef.current = setInterval(() => {
        if (displayRef.current) {
          const elapsed = (Date.now() - startTimeRef.current) / 1000;
          const remaining = Math.max(0, initialTimeRef.current - elapsed);
          const minutes = Math.floor(remaining / 60);
          const seconds = (remaining % 60).toFixed(0).padStart(2, '0');
          displayRef.current.textContent = `${minutes}:${seconds}`;
        }
      }, 1000); // Update every 1 second
    } else {
      if (timerRef.current) {
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

// Get color for driver status
const getStatusColor = (status: string): string => {
  switch (status) {
    case 'RUNNING': return 'text-green-500';
    case 'OUT LAP': return 'text-yellow-500';
    case 'IN LAP': return 'text-yellow-500';
    case 'PIT': return 'text-red-500';
    case 'PITTING': return 'text-red-500';
    default: return '';
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
    <div className="w-full h-5 overflow-hidden flex items-center space-x-0">
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
  const previousLapNumbers = useRef<Map<string, number>>(new Map());
  const [currentSessionUid, setCurrentSessionUid] = useState<number | null>(null);
  const [currentSessionType, setCurrentSessionType] = useState<number | null>(null);
  
  // Header notification state
  const [headerNotification, setHeaderNotification] = useState<{
    type: 'redFlag' | 'safetyCar' | 'vsc' | 'formation' | null;
    message: string;
    timestamp: number;
  } | null>(null);
  
  // Temporary notifications removed - only persistent header notifications shown
  const sessionRef = useRef<any>(null);
  const previousSectors = useRef<Map<number, number>>(new Map());
  const prevStatusMap = useRef<Map<number, string>>(new Map());
  const prevPositionMap = useRef<Map<number, number>>(new Map());
  const prevBestLapMap = useRef<Map<number, number>>(new Map());
  // Backend now handles all persistence of personalBest sector times - no frontend ref needed
  const duplicateWarningRef = useRef<Set<number>>(new Set()); // Track warned carNumbers to avoid console spam
  
  // Calculate sector coloring once at parent level (shared by both tables)
  const { getCurrentSectorColor, fastestSectors, parseSectorTimeString } = useSectorColoring(drivers);

  useEffect(() => {
    // Initialize socket connection
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const newSocket = io(apiUrl);

    newSocket.on('connect', () => {
      setIsConnected(true);
      // Explicitly request initial data on connection
      // Commented out - initial data will come through telemetry after session restart/start
      // newSocket.emit('requestInitialData');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });
    newSocket.on('reconnect', () => {
      setIsConnected(true);
      // Request initial data on reconnect as well
      // Commented out - initial data will come through telemetry after session restart/start
      // newSocket.emit('requestInitialData');
    });

    // Listen for telemetry data (ongoing updates)
    newSocket.on('telemetry', (data: any) => {
      processSessionData(data);
    });

    // Listen for session data
    newSocket.on('session', (data: any) => {
      processSessionData(data);
    });

    // Listen for session completion
    newSocket.on('sessionCompleted', () => {
      // Handle session completion
    });

    // Listen for session changes
    newSocket.on('sessionChanged', (data: any) => {
      // Clear all state
      setDrivers([]);
      setPreviousDrivers([]);
      previousLapNumbers.current.clear();
      duplicateWarningRef.current.clear(); // Clear duplicate warnings on session change
      setCurrentSessionUid(data.sessionUid);
      setCurrentSessionType(data.newSessionType);
      // Clear notifications on session change
      setHeaderNotification(null);
    });

    // Event Packet handlers
    // Persistent notifications (header banner)
    newSocket.on('event:redFlag', () => {
      setHeaderNotification({
        type: 'redFlag',
        message: 'RED FLAG',
        timestamp: Date.now()
      });
    });
    
    newSocket.on('safetyCarStatusChanged', (data: any) => {
      if (data.isSC) {
        setHeaderNotification({
          type: 'safetyCar',
          message: 'SAFETY CAR',
          timestamp: Date.now()
        });
      } else if (data.isVSC) {
        setHeaderNotification({
          type: 'vsc',
          message: 'VIRTUAL SAFETY CAR',
          timestamp: Date.now()
        });
      } else if (data.status === 3) {
        // Formation Lap
        setHeaderNotification({
          type: 'formation',
          message: 'FORMATION LAP',
          timestamp: Date.now()
        });
        // Don't clear drivers - they're still on track during formation lap
        // The header notification is sufficient to indicate formation lap status
      } else if (data.status === 0) {
        // Clear SC/VSC/Formation notification when status returns to 0
        setHeaderNotification(prev => 
          (prev?.type === 'safetyCar' || prev?.type === 'vsc' || prev?.type === 'formation') ? null : prev
        );
      }
    });
    
    // Only persistent header notifications shown (Red Flag, Safety Car, VSC, Formation Lap)

    setSocket(newSocket);

    return () => {
      newSocket.off('telemetry');
      newSocket.off('session');
      newSocket.off('sessionCompleted');
      newSocket.off('sessionChanged');
      newSocket.off('event:redFlag');
      newSocket.off('safetyCarStatusChanged');
      newSocket.off('connect');
      newSocket.off('disconnect');
      newSocket.off('reconnect_attempt');
      newSocket.off('reconnect');
      newSocket.close();
      // Cleanup handled by socket disconnect
    };
  }, []); // Only run once on mount/unmount

  const processSessionData = (data: any) => {
    // Process F1 23 UDP data and update session/driver states
    // If data is an array, extract session info from first driver
    const firstDriver = Array.isArray(data) && data.length > 0 ? data[0] : data;
    
    const sessionType = firstDriver.sessionType || firstDriver.lapData?.sessionType || 10;
    const sessionUid = firstDriver.sessionUid || firstDriver.header?.sessionUid || 0; // sessionUid now included in telemetry data
    const sessionTimeLeft = firstDriver.sessionTimeLeft || 0;
    
    // Session change detection removed - backend handles this via sessionChanged event
    // The backend emits this event from processSessionPacket, and we handle it in the event listener above
    // This prevents unnecessary clearing of drivers when processing telemetry data
    // sessionUid and sessionType updates are handled by sessionChanged event (lines 299-309), not here
    
    // Use shared utilities for session type helpers
    const sessionTypeName = getSessionTypeName(sessionType);
    const sessionCategory = getSessionCategory(sessionType);
    
    // Extract session information from first driver data
    const trackName = firstDriver.trackName || 'Unknown Track';
    const currentLap = firstDriver.lapNumber || firstDriver.lapData?.currentLapNum || 0;
    const totalLaps = firstDriver.sessionData?.totalLaps || 0;
    
    // Header notifications are handled via socket events (event:redFlag, safetyCarStatusChanged)
    // No redundant monitoring needed here
    
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
      const leaderLapNum = leader?.lapData?.currentLapNum || 0;
      const isRace = sessionCategory === 'RACE';
      
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

      // Filter duplicates by carIndex early (prevents React duplicate key warnings and unnecessary processing)
      // carIndex is always unique (0-21), unlike carNumber which could have collisions
      const seenCarIndices = new Set<number>();
      const uniqueData = data.filter((d: any) => {
        const carIndex = d.carIndex ?? d.carNumber; // Fallback to carNumber if carIndex missing (backward compat)
        // Skip entries without valid identifier
        if (carIndex === undefined || carIndex === null) {
          return false;
        }
        // Filter duplicates - keep first occurrence
        if (seenCarIndices.has(carIndex)) {
          // Warn only once per carIndex per session (avoid console spam)
          if (!duplicateWarningRef.current.has(carIndex)) {
            console.warn(`⚠️ Duplicate carIndex ${carIndex} detected - skipping duplicate entry`);
            duplicateWarningRef.current.add(carIndex);
          }
          return false;
        }
        seenCarIndices.add(carIndex);
        return true;
      });

      // Clear duplicate warnings on new session (reset when session changes)
      if (seenCarIndices.size !== duplicateWarningRef.current.size) {
        const newCarIndices = new Set(seenCarIndices);
        // Only keep warnings for carIndices that still exist
        duplicateWarningRef.current = new Set(
          Array.from(duplicateWarningRef.current).filter(ci => newCarIndices.has(ci))
        );
      }

      // Use filtered unique data for all subsequent processing
      // Check for specific triggers that should cause updates (reduced noise)
      let hasUpdates = false;

      uniqueData.forEach((driver: any, index: number) => {
        const carIndex = driver.carIndex ?? driver.carNumber ?? index; // Use carIndex from data, fallback to carNumber, then array index
        const lapData = driver.lapData;
        if (!lapData) return;

        const carNumber = driver.carNumber;

        // Position changes via ref map (no render-lag dependency)
        const currentPosition = lapData.carPosition || 0;
        const prevPos = prevPositionMap.current.get(carNumber) ?? currentPosition;
        if (currentPosition !== prevPos) {
          hasUpdates = true;
        }
        prevPositionMap.current.set(carNumber, currentPosition);

        // Lap completion - backend now handles all persistence
        const currentLapNum = lapData.currentLapNum || 0;
        const previousLapNum = previousLapNumbers.current.get(carNumber) || 0;
        if (currentLapNum > previousLapNum && previousLapNum > 0) {
          hasUpdates = true;
        }
        previousLapNumbers.current.set(carNumber, currentLapNum);

        // Sector completion tracking for update detection only
        // Backend handles persistence and sends persisted values in telemetry
        const currentSector = lapData.sector ?? 0;
        const prevSector = previousSectors.current.get(carNumber) ?? currentSector;
        const driverStatusStr = mapDriverStatus(lapData.driverStatus ?? 0);
        if (driverStatusStr === 'RUNNING' && currentSector > prevSector) {
          hasUpdates = true;
        }
        previousSectors.current.set(carNumber, currentSector);

        // Best lap time changes (compare milliseconds directly)
        const currentBestLap = lapData.bestLapTimeInMS || 0;
        const previousBestLap = prevBestLapMap.current.get(carNumber) ?? 0;
        if (currentBestLap > 0 && currentBestLap !== previousBestLap) {
          hasUpdates = true;
        }
        if (currentBestLap > 0) {
          prevBestLapMap.current.set(carNumber, currentBestLap);
        }

        // Driver status changes via ref map (no render-lag dependency)
        const currentDriverStatusStr = mapDriverStatus(lapData.driverStatus ?? 0);
        const prevStatus = prevStatusMap.current.get(carNumber) ?? currentDriverStatusStr;
        if (currentDriverStatusStr !== prevStatus) {
          hasUpdates = true;
        }
        prevStatusMap.current.set(carNumber, currentDriverStatusStr);
      });

      // First packet: allow render
      if (previousDrivers.length === 0) {
        hasUpdates = true;
      }

      // No meaningful changes detected - skip update (event-based updates only)
      if (!hasUpdates) {
        return;
      }
      
      // Prepare pruned map for lap numbers and best lap times (reuse seenCarIndices Set)
      // Use carIndex for map keys (always unique), but still track by carNumber for backward compatibility
      const newCarNumbers = new Set(uniqueData.map((d: any) => d.carNumber).filter((cn: any) => cn !== undefined && cn !== null));
      
      // Prune maps to only include current drivers (use carNumber for compatibility with existing maps)
      for (const key of previousLapNumbers.current.keys()) {
        if (!newCarNumbers.has(key)) {
          previousLapNumbers.current.delete(key);
        }
      }
      for (const key of prevBestLapMap.current.keys()) {
        if (!newCarNumbers.has(String(key))) {
          prevBestLapMap.current.delete(key);
        }
      }
      // Prune previousSectors map
      for (const key of previousSectors.current.keys()) {
        if (!newCarNumbers.has(key)) {
          previousSectors.current.delete(key);
        }
      }
      // Prune prevStatusMap
      for (const key of prevStatusMap.current.keys()) {
        if (!newCarNumbers.has(key)) {
          prevStatusMap.current.delete(key);
        }
      }
      // Prune prevPositionMap
      for (const key of prevPositionMap.current.keys()) {
        if (!newCarNumbers.has(key)) {
          prevPositionMap.current.delete(key);
        }
      }

      // Convert all drivers and update state - React will handle change detection
      // Backend now handles all persistence of personalBest sector times
      // Use uniqueData (already filtered for duplicates) instead of raw data
      // Sort by position first to enable finding front car for interval calculation
      const sortedUniqueData = [...uniqueData].sort((a: any, b: any) => {
        const posA = a.lapData?.carPosition || a.position || 999;
        const posB = b.lapData?.carPosition || b.position || 999;
        return posA - posB;
      });
      
      // Build position map for O(1) lookup instead of O(n) find for each driver
      const positionToDriverMap = new Map<number, any>();
      sortedUniqueData.forEach((d: any) => {
        const pos = d.lapData?.carPosition || d.position || 999;
        positionToDriverMap.set(pos, d);
      });
      
      const newDrivers: DriverData[] = sortedUniqueData
        .map((d: any) => {
          // Find front car (position - 1) for interval calculation - O(1) lookup
          const currentPosition = d.lapData?.carPosition || d.position || 999;
          const frontCar = positionToDriverMap.get(currentPosition - 1);
          const frontCarLapNum = frontCar?.lapData?.currentLapNum || frontCar?.currentLapNum;
          
          const converted = convertToLiveTimingsFormat(d, leaderBestLapTime, leaderLapNum, isRace, frontCarLapNum);
          // Backend sends persisted values directly - no frontend persistence needed
          
          return converted;
        });
      // Removed redundant sort - already sorted by position

      // Trim previousDrivers to current session drivers only
      const newDriverIdsByStringId = new Set(newDrivers.map(d => d.id));
      const trimmedPreviousDrivers = previousDrivers.filter(d => newDriverIdsByStringId.has(d.id));
      
      // Only update previousDrivers if it changed
      const previousDriversChanged = trimmedPreviousDrivers.length !== previousDrivers.length ||
        trimmedPreviousDrivers.some((d, i) => d.id !== previousDrivers[i]?.id);
      if (previousDriversChanged) {
        setPreviousDrivers(trimmedPreviousDrivers);
      }

      // Shallow comparison - only update if drivers actually changed
      const driversChanged = newDrivers.length !== drivers.length || 
        newDrivers.some((d, i) => {
          const prevDriver = drivers[i];
          return !prevDriver || 
            d.id !== prevDriver.id ||
            d.position !== prevDriver.position ||
            d.gap !== prevDriver.gap ||
            d.interval !== prevDriver.interval ||
            d.bestLap !== prevDriver.bestLap ||
            d.lastLapTime !== prevDriver.lastLapTime ||
            d.status !== prevDriver.status ||
            d.sector1Time !== prevDriver.sector1Time ||
            d.sector2Time !== prevDriver.sector2Time ||
            d.sector3Time !== prevDriver.sector3Time;
        });
      
      if (driversChanged) {
        setDrivers(newDrivers);
      }
    }
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
      {/* Header with Notification System */}
      <div className={`px-6 py-4 transition-colors duration-300 ${
        headerNotification?.type === 'redFlag' ? 'bg-red-600' :
        headerNotification?.type === 'safetyCar' || headerNotification?.type === 'vsc' || headerNotification?.type === 'formation' ? 'bg-yellow-600' :
        'bg-gray-800'
      } border-b border-gray-700 relative`}>
        <div className="flex items-center justify-between relative">
          {/* Left: Track/Session Info */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-4">
              <span className="text-lg">🏎️ {sessionData.trackName}</span>
              <span className="text-lg">🏁 {sessionData.sessionTypeName || sessionData.sessionType}</span>
              <span className="text-lg">⏱️ {
                sessionData.sessionType === 'RACE' 
                  ? getSessionDisplay() 
                  : <SessionTimer sessionTimeLeft={sessionData.timeRemaining || 0} isRunning={isConnected && sessionData.timeRemaining > 0} />
              }</span>
            </div>
          </div>

          {/* Center: Header Notification (persistent) - Absolutely positioned for true centering */}
          {headerNotification && (
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <span className="text-lg font-semibold">{headerNotification.message}</span>
            </div>
          )}

          {/* Right: Connection Status */}
          <div className="flex items-center space-x-4">
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
            {/* Loading state overlay - show when session exists but no drivers loaded yet */}
            {sessionData && drivers.length === 0 && (
              <div className="absolute inset-0 bg-gray-800 bg-opacity-90 flex flex-col items-center justify-center z-10">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
                <p className="text-gray-400 text-lg">Loading driver data...</p>
                <p className="text-gray-500 text-sm mt-2">Waiting for Participants packet</p>
              </div>
            )}
            
            {/* Always show table - empty if no data */}
            {sessionData.sessionType === 'RACE' ? (
             <RaceTimingTable 
               drivers={drivers} 
               previousDrivers={previousDrivers}
               getCurrentSectorColor={getCurrentSectorColor}
             />
            ) : (
             <PracticeQualifyingTimingTable 
               drivers={drivers} 
               previousDrivers={previousDrivers}
               getCurrentSectorColor={getCurrentSectorColor}
               fastestSectors={fastestSectors}
               parseSectorTimeString={parseSectorTimeString}
             />
            )}
          </div>
        </div>
    </div>
  );
};

// Shared hook for sector coloring logic (used by both tables)
// Placed at component level so calculations happen once regardless of which table renders
const useSectorColoring = (drivers: DriverData[]) => {
  // Memoize parse for sector times (stable reference)
  const parseSectorTimeString = useMemo(() => (timeStr: string): number => {
    if (!timeStr || timeStr === '--:--' || timeStr === '--.---') return 0;
    if (timeStr.includes(':')) {
      const parts = timeStr.split(':');
      const minutes = parseFloat(parts[0]) || 0;
      const seconds = parseFloat(parts[1]) || 0;
      return minutes * 60 + seconds;
    }
    return parseFloat(timeStr) || 0;
  }, []); // Empty deps - function never changes

  // Memoize fastest sectors calculation (recomputes only when drivers sector times change)
  // Optimized: Parse sector times only once per driver (was parsing 3x before)
  // Create stable signature based on actual sector time values, not array reference
  const driversSectorSignature = useMemo(() => {
    return drivers.map(d => `${d.id}:${d.sector1Time}:${d.sector2Time}:${d.sector3Time}`).join('|');
  }, [drivers]);
  
  const fastestSectors = useMemo(() => {
    // Single pass: parse all sector times once per driver
    const parsedSectors = drivers.map(d => ({
      id: d.id,
      s1: parseSectorTimeString(d.sector1Time || '0'),
      s2: parseSectorTimeString(d.sector2Time || '0'),
      s3: parseSectorTimeString(d.sector3Time || '0')
    }));
    
    // Find fastest times (filter valid > 0)
    const validS1Times = parsedSectors.map(p => p.s1).filter(t => t > 0);
    const fastestS1 = validS1Times.length > 0 ? Math.min(...validS1Times) : Infinity;
    
    const validS2Times = parsedSectors.map(p => p.s2).filter(t => t > 0);
    const fastestS2 = validS2Times.length > 0 ? Math.min(...validS2Times) : Infinity;
    
    const validS3Times = parsedSectors.map(p => p.s3).filter(t => t > 0);
    const fastestS3 = validS3Times.length > 0 ? Math.min(...validS3Times) : Infinity;
    
    // Pre-index by driver for personal best lookup (reuse parsed values)
    const sectorBestMap: Record<string, {s1: number, s2: number, s3: number}> = {};
    parsedSectors.forEach(p => {
      sectorBestMap[p.id] = {
        s1: p.s1,
        s2: p.s2,
        s3: p.s3
      };
    });
    
    return { fastestS1, fastestS2, fastestS3, sectorBestMap };
  }, [driversSectorSignature, parseSectorTimeString]); // Only recalculates when sector times actually change

  // Memoize color computation function (stable reference, but uses latest fastestSectors)
  const getCurrentSectorColor = useMemo(() => {
    return (driver: DriverData, sector: 's1' | 's2' | 's3'): string => {
      const currentTimeStr = sector === 's1' ? driver.LS1 || '0' : sector === 's2' ? driver.LS2 || '0' : driver.LS3 || '0';
      const currentTime = parseSectorTimeString(currentTimeStr);
      if (!currentTime) return ''; // No time = no color coding
      
      const fastest = sector === 's1' ? fastestSectors.fastestS1 : sector === 's2' ? fastestSectors.fastestS2 : fastestSectors.fastestS3;
      if (fastest === Infinity || fastest === 0) return '';
      
      if (currentTime < fastest) {
        return 'text-purple-400 font-semibold';
      }
      
      // Compare against best lap sectors (not previous LS values)
      const best = fastestSectors.sectorBestMap[driver.id]?.[sector] || 0;
      if (best > 0 && currentTime < best) {
        return 'text-green-400';
      }
      
      return 'text-white';
    };
  }, [fastestSectors, parseSectorTimeString]); // Only recreates when fastestSectors changes

  return { parseSectorTimeString, fastestSectors, getCurrentSectorColor };
};

// Practice/Qualifying Timing Table Component
const PracticeQualifyingTimingTable = ({ 
  drivers, 
  previousDrivers,
  getCurrentSectorColor,
  fastestSectors,
  parseSectorTimeString
}: { 
  drivers: DriverData[], 
  previousDrivers: DriverData[],
  getCurrentSectorColor: (driver: DriverData, sector: 's1' | 's2' | 's3') => string,
  fastestSectors: { fastestS1: number, fastestS2: number, fastestS3: number, sectorBestMap: Record<string, {s1: number, s2: number, s3: number}> },
  parseSectorTimeString: (timeStr: string) => number
}) => {
  // Use shared logic from parent (no local calculations)

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden relative">
      <div className="grid grid-cols-13 gap-0 p-3 bg-gray-800 text-sm font-semibold border-b border-gray-500" style={{gridTemplateColumns: '64px 116px 116px 96px 80px 80px 80px 1fr 116px 96px 80px 80px 80px'}}>
          <div className="px-2 border-r border-gray-500 text-center">POS</div>
          <div className="px-2 border-r border-gray-500 text-center">DRIVER</div>
          <div className="px-[7px] border-r border-gray-500 text-center">LAP TIME</div>
          <div className="px-2 border-r border-gray-500 text-center">GAP</div>
          <div className="px-2 text-center">S1</div>
          <div className="px-2 text-center">S2</div>
          <div className="px-2 border-r border-gray-500 text-center">S3</div>
          <div className="px-8 border-r border-gray-500 text-center"></div>
          <div className="px-2 border-r border-gray-500 text-center">DRIVER</div>
          <div className="px-2 border-r border-gray-500 text-center">STATUS</div>
          <div className="px-2 text-center">S1</div>
          <div className="px-2 text-center">S2</div>
          <div className="px-2 text-center">S3</div>
        </div>
        
        <AnimatePresence mode="popLayout">
          {drivers.map((driver, index) => {
              return (
                <motion.div
                  key={driver.id}
                  layout
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
                    className="relative"
                >
                  <div
                    className="grid grid-cols-13 gap-0 p-3 border-b border-gray-700 hover:bg-gray-800 flex items-center"
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
            <div className={`px-3 border-r border-gray-500 flex items-center ${
              isDriverRetired(driver.status) ? 'opacity-40 text-gray-400' : ''
            }`}>
              <div className="flex items-center space-x-2">
                <div 
                  className="w-1 h-6 rounded"
                  style={{ backgroundColor: driver.teamColor }}
                ></div>
                <span className="font-semibold text-sm">{driver.driverAbbreviation}</span>
              </div>
            </div>
            
            {/* Lap Time - justify left for time, right for tire */}
            <div className={`px-[11px] border-r border-gray-500 flex items-center justify-between ${
              isDriverRetired(driver.status) ? 'opacity-40 text-gray-400' : ''
            }`}>
              <span className="text-base font-mono tabular-nums tracking-tighter">{driver.fastestLap}</span>
              {driver.fastestLapTire && (
                <span className={`text-xs tire-indicator ${getTireColor(driver.fastestLapTire)}`}>
                  {driver.fastestLapTire}
                </span>
              )}
            </div>
            
            {/* Gap or Retirement Status */}
            <div className={`px-2 border-r border-gray-500 text-base text-center font-mono tabular-nums tracking-tighter ${
              isDriverRetired(driver.status) ? 'opacity-40 text-gray-400' : ''
            } ${getRetirementStatusColor(driver.status)}`}>
              {isDriverRetired(driver.status) ? getRetirementStatus(driver.status) : driver.gap}
            </div>
            
            {/* S1 (Best Lap) - Purple for fastest overall */}
            <div className={`px-2 text-base text-center font-mono tabular-nums tracking-tighter ${
              isDriverRetired(driver.status) ? 'opacity-40 text-gray-400' : ''
            } ${fastestSectors.fastestS1 !== Infinity && Math.abs(parseSectorTimeString(driver.sector1Time || '0') - fastestSectors.fastestS1) < 0.001 ? 'text-purple-400 font-semibold' : ''}`}>
              {driver.sector1Time || '--:--'}
            </div>
            
            {/* S2 (Best Lap) - Purple for fastest overall */}
            <div className={`px-2 text-base text-center font-mono tabular-nums tracking-tighter ${
              isDriverRetired(driver.status) ? 'opacity-40 text-gray-400' : ''
            } ${fastestSectors.fastestS2 !== Infinity && Math.abs(parseSectorTimeString(driver.sector2Time || '0') - fastestSectors.fastestS2) < 0.001 ? 'text-purple-400 font-semibold' : ''}`}>
              {driver.sector2Time || '--:--'}
            </div>
            
            {/* S3 (Best Lap) - Purple for fastest overall */}
            <div className={`px-2 border-r border-gray-500 text-base text-center font-mono tabular-nums tracking-tighter ${
              isDriverRetired(driver.status) ? 'opacity-40 text-gray-400' : ''
            } ${fastestSectors.fastestS3 !== Infinity && Math.abs(parseSectorTimeString(driver.sector3Time || '0') - fastestSectors.fastestS3) < 0.001 ? 'text-purple-400 font-semibold' : ''}`}>
              {driver.sector3Time || '--:--'}
            </div>
            
            {/* Micro-sectors as boxes (flexible width to fill remaining space) */}
            <div className={`px-8 border-r border-gray-500 flex justify-center items-center ${
              isDriverRetired(driver.status) ? 'opacity-40' : ''
            }`}>
              <div className="flex items-center gap-x-0.5 w-full">
                {/* Always show 24 micro-sectors (grey squares that color in as boundaries are crossed) */}
                {(driver.microSectors && driver.microSectors.length === 24 
                  ? driver.microSectors 
                  : Array(24).fill('grey')
                ).map((sector, index) => {
                  // Add larger spacing between main sectors (every 8 micro-sectors)
                  const isMainSectorEnd = (index + 1) % 8 === 0 && index < 23;
                  return (
                    <Fragment key={index}>
                      <div
                        className={`flex-1 h-4 min-w-0 rounded-sm ${
                          sector === 'purple' ? 'bg-purple-500' :
                          sector === 'green' ? 'bg-green-500' :
                          sector === 'yellow' ? 'bg-yellow-500' :
                          'bg-gray-500'
                        }`}
                      ></div>
                      {isMainSectorEnd && <div className="w-1.5 flex-shrink-0"></div>}
                    </Fragment>
                  );
                })}
              </div>
            </div>
            
            {/* Driver Last Name */}
            <div className={`px-2 border-r border-gray-500 text-sm text-left ${
              isDriverRetired(driver.status) ? 'opacity-40 text-gray-400' : ''
            }`}>
              {driver.driverName.split(' ').pop()}
            </div>
            
            {/* Status */}
            <div className={`px-2 border-r border-gray-500 text-sm text-center ${getStatusColor(driver.status || '')} ${
              isDriverRetired(driver.status) ? 'opacity-40 text-gray-400' : ''
            }`}>
              {driver.status || ''}
            </div>
            
                {/* S1 (Current) - Color coding: purple = best overall, green = personal best */}
                <div className={`px-2 text-base text-center font-mono tabular-nums tracking-tighter ${
                 isDriverRetired(driver.status) ? 'opacity-40 text-gray-400' : getCurrentSectorColor(driver, 's1')
                }`}>
                 {driver.LS1 || '--:--'}
                </div>
            
              {/* S2 (Current) - Color coding: purple = best overall, green = personal best */}
              <div className={`px-2 text-base text-center font-mono tabular-nums tracking-tighter ${
                isDriverRetired(driver.status) ? 'opacity-40 text-gray-400' : getCurrentSectorColor(driver, 's2')
              }`}>
                {driver.LS2 || '--:--'}
              </div>
            
              {/* S3 (Current) - Color coding: purple = best overall, green = personal best */}
              <div className={`px-2 text-base text-center font-mono tabular-nums tracking-tighter ${
                isDriverRetired(driver.status) ? 'opacity-40 text-gray-400' : getCurrentSectorColor(driver, 's3')
              }`}>
                {driver.LS3 || '--:--'}
              </div>
                  </div>
                </motion.div>
              );
            })}
        </AnimatePresence>
    </div>
  );
};

// Race Timing Table Component
const RaceTimingTable = ({ 
  drivers, 
  previousDrivers,
  getCurrentSectorColor
}: { 
  drivers: DriverData[], 
  previousDrivers: DriverData[],
  getCurrentSectorColor: (driver: DriverData, sector: 's1' | 's2' | 's3') => string
}) => {
  // Use shared logic from parent (no local calculations)

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden relative">
      <div className="grid grid-cols-12 gap-0 p-3 bg-gray-800 text-sm font-semibold border-b border-gray-500" style={{gridTemplateColumns: '64px 111px 80px 96px 116px 116px 1fr 116px 96px 80px 80px 80px'}}>
          <div className="px-2 border-r border-gray-500 text-center">POS</div>
          <div className="px-2 border-r border-gray-500 text-center">DRIVER</div>
          <div className="px-2 border-r border-gray-500 text-center">GAP</div>
          <div className="px-2 border-r border-gray-500 text-center">INTERVAL</div>
          <div className="px-2 border-r border-gray-500 text-center">BEST LAP</div>
          <div className="px-2 border-r border-gray-500 text-center">LAST LAP</div>
          <div className="px-2 border-r border-gray-500 text-center"></div>
          <div className="px-2 border-r border-gray-500 text-center">DRIVER</div>
          <div className="px-2 border-r border-gray-500 text-center">STATUS</div>
          <div className="px-2 text-center">S1</div>
          <div className="px-2 text-center">S2</div>
          <div className="px-2 text-center">S3</div>
        </div>
        
        <AnimatePresence mode="popLayout">
          {drivers.map((driver, index) => {
              return (
                <motion.div
                  key={driver.id}
                  layout
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
                  className="relative"
                >
                  <div
                    className="grid grid-cols-12 gap-0 p-3 border-b border-gray-700 hover:bg-gray-800 flex items-center"
                    style={{gridTemplateColumns: '64px 111px 80px 96px 116px 116px 1fr 116px 96px 80px 80px 80px'}}
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
            <div className="px-[11px] border-r border-gray-500 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-1 h-6 rounded"
                  style={{ backgroundColor: driver.teamColor }}
                ></div>
                <span className="font-semibold text-sm">{driver.driverAbbreviation}</span>
              </div>
              <div className="flex items-center justify-end space-x-1 w-14">
                {driver.positionChange > 0 ? (
                  <>
                    <ArrowUp className="w-4 h-4 text-green-500 position-change" />
                    <span className="text-sm text-green-500 font-semibold position-change tabular-nums">{driver.positionChange}</span>
                  </>
                ) : driver.positionChange < 0 ? (
                  <>
                    <ArrowDown className="w-4 h-4 text-red-500 position-change" />
                    <span className="text-sm text-red-500 font-semibold position-change tabular-nums">{Math.abs(driver.positionChange)}</span>
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
            <div className={`px-2 border-r border-gray-500 text-base text-center font-mono tabular-nums tracking-tighter ${
              isDriverRetired(driver.status) ? 'opacity-40 text-gray-400' : ''
            } ${getRetirementStatusColor(driver.status)}`}>
              {isDriverRetired(driver.status) ? getRetirementStatus(driver.status) : driver.gap}
            </div>
            
            {/* Interval */}
            <div className={`px-2 border-r border-gray-500 text-base text-center font-mono tabular-nums tracking-tighter ${
              isDriverRetired(driver.status) ? 'opacity-40 text-gray-400' : ''
            }`}>
              {driver.interval}
            </div>
            
            {/* Best Lap */}
            <div className={`px-2 border-r border-gray-500 text-base text-center font-mono tabular-nums tracking-tighter ${
              isDriverRetired(driver.status) ? 'opacity-40 text-gray-400' : ''
            } ${driver.isFastestLap ? 'text-purple-400 font-semibold' : ''}`}>
              {driver.bestLap}
            </div>
            
            {/* Last Lap */}
            <div className={`px-2 border-r border-gray-500 text-base text-center font-mono tabular-nums tracking-tighter ${
              isDriverRetired(driver.status) ? 'opacity-40 text-gray-400' : ''
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
            <div className={`px-2 border-r border-gray-500 text-sm text-left ${
              isDriverRetired(driver.status) ? 'opacity-40 text-gray-400' : ''
            }`}>
              {driver.driverName.split(' ').pop()}
            </div>
            
            {/* Status */}
            <div className={`px-2 border-r border-gray-500 text-sm text-center ${getStatusColor(driver.status || '')} ${
              isDriverRetired(driver.status) ? 'opacity-40 text-gray-400' : ''
            }`}>
              {driver.status || ''}
            </div>
            
            {/* S1 (Current) - Color coding: purple = best overall, green = personal best (shared with practice/qualifying) */}
            <div className={`px-2 text-base text-center font-mono tabular-nums tracking-tighter ${
              isDriverRetired(driver.status) ? 'opacity-40 text-gray-400' : getCurrentSectorColor(driver, 's1')
            }`}>
              {driver.LS1 || '--:--'}
            </div>
            
            {/* S2 (Current) - Color coding: purple = best overall, green = personal best (shared with practice/qualifying) */}
            <div className={`px-2 text-base text-center font-mono tabular-nums tracking-tighter ${
              isDriverRetired(driver.status) ? 'opacity-40 text-gray-400' : getCurrentSectorColor(driver, 's2')
            }`}>
              {driver.LS2 || '--:--'}
            </div>
            
            {/* S3 (Current) - Color coding: purple = best overall, green = personal best (shared with practice/qualifying) */}
            <div className={`px-2 text-base text-center font-mono tabular-nums tracking-tighter ${
              isDriverRetired(driver.status) ? 'opacity-40 text-gray-400' : getCurrentSectorColor(driver, 's3')
            }`}>
              {driver.LS3 || '--:--'}
            </div>
                  </div>
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

