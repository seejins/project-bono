import { useState, useEffect, useRef, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { ArrowUp, ArrowDown, Minus, AlertCircle } from 'lucide-react';
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
  hasPenalty?: boolean; // For penalty indicator
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
  const previousLapNumbers = useRef<Map<string, number>>(new Map());
  const [currentSessionUid, setCurrentSessionUid] = useState<number | null>(null);
  const [currentSessionType, setCurrentSessionType] = useState<number | null>(null);
  
  // Header notification state
  const [headerNotification, setHeaderNotification] = useState<{
    type: 'redFlag' | 'safetyCar' | 'vsc' | 'sessionStart' | 'sessionEnd' | 'chequered' | 'startLights' | 'lightsOut' | null;
    message: string;
    timestamp: number;
  } | null>(null);
  
  const [temporaryNotifications, setTemporaryNotifications] = useState<Array<{
    id: string;
    type: string;
    message: string;
    timestamp: number;
  }>>([]);
  
  const [startLightsCount, setStartLightsCount] = useState<number | null>(null);
  const previousSessionTimeLeft = useRef<number | null>(null);
  const sessionRef = useRef<any>(null);
  const lastUpdateLogRef = useRef<number>(0);
  const previousSectors = useRef<Map<number, number>>(new Map());
  const lastDriversUpdateRef = useRef<number>(0);
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

    // Listen for initial data response
    newSocket.on('initialData', (data: any) => {
      if (data && Array.isArray(data) && data.length > 0) {
        processSessionData(data);
      }
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
      setTemporaryNotifications([]);
      setStartLightsCount(null);
    });

    // Listen for session restarts
    newSocket.on('sessionRestarted', (data: any) => {
      // Clear all state (same as session change)
      setDrivers([]);
      setPreviousDrivers([]);
      previousLapNumbers.current.clear();
      duplicateWarningRef.current.clear(); // Clear duplicate warnings on session restart
      setCurrentSessionUid(data.sessionUid);
      setCurrentSessionType(data.sessionType);
      // Clear notifications on session restart
      setHeaderNotification(null);
      setTemporaryNotifications([]);
      setStartLightsCount(null);
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
      } else if (data.status === 0) {
        // Clear SC/VSC notification when status returns to 0
        setHeaderNotification(prev => 
          (prev?.type === 'safetyCar' || prev?.type === 'vsc') ? null : prev
        );
      }
    });
    
    // Temporary notifications (3 seconds)
    const addTemporaryNotification = (type: string, message: string) => {
      const id = `${type}-${Date.now()}`;
      setTemporaryNotifications(prev => [...prev, {
        id,
        type,
        message,
        timestamp: Date.now()
      }]);
      setTimeout(() => {
        setTemporaryNotifications(prev => prev.filter(n => n.id !== id));
      }, 3000);
    };
    
    newSocket.on('event:sessionStarted', () => {
      addTemporaryNotification('sessionStart', 'Session Started');
    });
    
    newSocket.on('event:sessionEnded', () => {
      addTemporaryNotification('sessionEnd', 'Session Ended');
    });
    
    newSocket.on('event:fastestLap', (data: any) => {
      const lapTimeStr = formatLapTime(data.lapTime || 0);
      addTemporaryNotification('fastestLap', `⚡ Fastest Lap - ${data.driverName} ${lapTimeStr}`);
    });
    
    newSocket.on('event:retirement', (data: any) => {
      addTemporaryNotification('retirement', `${data.driverName} has retired`);
    });
    
    newSocket.on('event:penaltyIssued', (data: any) => {
      addTemporaryNotification('penalty', `${data.driverName} - Penalty`);
    });
    
    newSocket.on('event:raceWinner', (data: any) => {
      addTemporaryNotification('raceWinner', `🏆 Race Winner - ${data.driverName}`);
    });
    
    newSocket.on('event:chequeredFlag', () => {
      setHeaderNotification({
        type: 'chequered',
        message: 'CHEQUERED FLAG',
        timestamp: Date.now()
      });
      setTimeout(() => {
        setHeaderNotification(prev => 
          prev?.type === 'chequered' ? null : prev
        );
      }, 3000);
    });
    
    newSocket.on('event:startLights', (data: any) => {
      setHeaderNotification({
        type: 'startLights',
        message: '',
        timestamp: Date.now()
      });
      const numLights = data.numLights || 5;
      setStartLightsCount(numLights);
      
      // Countdown lights
      let count = numLights;
      const countdown = setInterval(() => {
        count--;
        setStartLightsCount(count);
        if (count <= 0) {
          clearInterval(countdown);
        }
      }, 1000);
    });
    
    newSocket.on('event:lightsOut', () => {
      setHeaderNotification({
        type: 'lightsOut',
        message: '',
        timestamp: Date.now()
      });
      setTimeout(() => {
        setHeaderNotification(prev => 
          prev?.type === 'lightsOut' ? null : prev
        );
      }, 3000);
    });

    setSocket(newSocket);

    return () => {
      newSocket.off('telemetry');
      newSocket.off('initialData');
      newSocket.off('session');
      newSocket.off('sessionCompleted');
      newSocket.off('sessionChanged');
      newSocket.off('sessionRestarted');
      newSocket.off('event:redFlag');
      newSocket.off('safetyCarStatusChanged');
      newSocket.off('event:sessionStarted');
      newSocket.off('event:sessionEnded');
      newSocket.off('event:fastestLap');
      newSocket.off('event:retirement');
      newSocket.off('event:penaltyIssued');
      newSocket.off('event:raceWinner');
      newSocket.off('event:chequeredFlag');
      newSocket.off('event:startLights');
      newSocket.off('event:lightsOut');
      newSocket.off('connect');
      newSocket.off('disconnect');
      newSocket.off('reconnect_attempt');
      newSocket.off('reconnect');
      newSocket.close();
    };
  }, []); // Only run once on mount/unmount

  const processSessionData = (data: any) => {
    // Process F1 23 UDP data and update session/driver states
    // If data is an array, extract session info from first driver
    const firstDriver = Array.isArray(data) && data.length > 0 ? data[0] : data;
    
    const sessionType = firstDriver.sessionType || firstDriver.lapData?.sessionType || 10;
    const sessionUid = firstDriver.sessionUid || firstDriver.header?.sessionUid || 0; // sessionUid now included in telemetry data
    const sessionTimeLeft = firstDriver.sessionTimeLeft || 0;
    
    // Detect session change (by session UID or session type)
    if ((currentSessionUid !== null && currentSessionUid !== sessionUid) ||
        (currentSessionType !== null && currentSessionType !== sessionType)) {
      setDrivers([]);
      setPreviousDrivers([]);
      previousLapNumbers.current.clear();
      duplicateWarningRef.current.clear(); // Clear duplicate warnings on session change
    }
    
    // Detect session restart (same UID and type, but session time suddenly increased)
    if (currentSessionUid === sessionUid && 
        currentSessionType === sessionType &&
        previousSessionTimeLeft.current !== null &&
        sessionTimeLeft > previousSessionTimeLeft.current + 30) { // 30 second threshold
      setDrivers([]);
      setPreviousDrivers([]);
      previousLapNumbers.current.clear();
      duplicateWarningRef.current.clear(); // Clear duplicate warnings on session restart
    }
    
    setCurrentSessionUid(sessionUid);
    setCurrentSessionType(sessionType);
    previousSessionTimeLeft.current = sessionTimeLeft;
    
    // Use shared utilities for session type helpers
    const sessionTypeName = getSessionTypeName(sessionType);
    const sessionCategory = getSessionCategory(sessionType);
    
    // Extract session information from first driver data
    const trackName = firstDriver.trackName || 'Unknown Track';
    const currentLap = firstDriver.lapNumber || firstDriver.lapData?.currentLapNum || 0;
    const totalLaps = firstDriver.sessionData?.totalLaps || 0;
    
    // Monitor safetyCarStatus from telemetry for header notifications
    if (firstDriver.sessionData?.safetyCarStatus !== undefined) {
      const status = firstDriver.sessionData.safetyCarStatus;
      if (status === 1) { // Full Safety Car
        setHeaderNotification(prev => prev?.type === 'safetyCar' ? prev : {
          type: 'safetyCar',
          message: 'SAFETY CAR',
          timestamp: Date.now()
        });
      } else if (status === 2) { // VSC
        setHeaderNotification(prev => prev?.type === 'vsc' ? prev : {
          type: 'vsc',
          message: 'VIRTUAL SAFETY CAR',
          timestamp: Date.now()
        });
      } else if (status === 0) {
        // Clear SC/VSC notification when status returns to 0
        setHeaderNotification(prev => 
          (prev?.type === 'safetyCar' || prev?.type === 'vsc') ? null : prev
        );
      }
    }
    
    // Monitor red flag from telemetry
    if (firstDriver.sessionData?.isRedFlag) {
      setHeaderNotification(prev => prev?.type === 'redFlag' ? prev : {
        type: 'redFlag',
        message: 'RED FLAG',
        timestamp: Date.now()
      });
    }
    
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
      let updateReasons: string[] = [];

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
          updateReasons.push(`Car ${carIndex}: Position ${prevPos} → ${currentPosition}`);
          // console.log(`[pos-change] car=${carNumber} ${prevPos} → ${currentPosition}`);
        }
        prevPositionMap.current.set(carNumber, currentPosition);

        // Lap completion - backend now handles all persistence
        const currentLapNum = lapData.currentLapNum || 0;
        const previousLapNum = previousLapNumbers.current.get(carNumber) || 0;
        if (currentLapNum > previousLapNum && previousLapNum > 0) {
          hasUpdates = true;
          updateReasons.push(`Car ${carIndex}: Lap ${previousLapNum} → ${currentLapNum}`);
        }
        previousLapNumbers.current.set(carNumber, currentLapNum);

        // Sector completion tracking for update detection only
        // Backend handles persistence and sends persisted values in telemetry
        const currentSector = lapData.sector ?? 0;
        const prevSector = previousSectors.current.get(carNumber) ?? currentSector;
        const driverStatusStr = mapDriverStatus(lapData.driverStatus ?? 0);
        if (driverStatusStr === 'RUNNING' && currentSector > prevSector) {
          hasUpdates = true;
          updateReasons.push(`Car ${carIndex}: Sector ${prevSector} → ${currentSector}`);
        }
        previousSectors.current.set(carNumber, currentSector);

        // Best lap time changes (compare milliseconds directly)
        const currentBestLap = lapData.bestLapTimeInMS || 0;
        const previousBestLap = prevBestLapMap.current.get(carNumber) ?? 0;
        if (currentBestLap > 0 && currentBestLap !== previousBestLap) {
          hasUpdates = true;
          updateReasons.push(`Car ${carIndex}: New best lap ${(currentBestLap / 1000).toFixed(3)}s`);
        }
        if (currentBestLap > 0) {
          prevBestLapMap.current.set(carNumber, currentBestLap);
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
        }
      } else {
        // No meaningful changes detected - skip update (event-based updates only)
        return;
      }
      
      // Prepare pruned map for lap numbers and best lap times (reuse seenCarIndices Set)
      // Use carIndex for map keys (always unique), but still track by carNumber for backward compatibility
      const newDriverIds = new Set(Array.from(seenCarIndices).map(ci => String(ci)));
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

      // Convert all drivers and update state - React will handle change detection
      // Backend now handles all persistence of personalBest sector times
      // Use uniqueData (already filtered for duplicates) instead of raw data
      const newDrivers: DriverData[] = uniqueData
        .map((d: any) => {
          const converted = convertToLiveTimingsFormat(d, leaderBestLapTime);
          // Backend sends persisted values directly - no frontend persistence needed
          
          return converted;
        })
        .sort((a, b) => a.position - b.position);

      // Trim previousDrivers to current session drivers only
      const newDriverIdsByStringId = new Set(newDrivers.map(d => d.id));
      const trimmedPreviousDrivers = previousDrivers.filter(d => newDriverIdsByStringId.has(d.id));
      setPreviousDrivers(trimmedPreviousDrivers);

      setDrivers(newDrivers);
      lastDriversUpdateRef.current = Date.now();
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
        headerNotification?.type === 'safetyCar' || headerNotification?.type === 'vsc' ? 'bg-yellow-600' :
        'bg-gray-800'
      } border-b border-gray-700 relative`}>
        <div className="flex items-center justify-between">
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

          {/* Center: Header Notification (persistent) */}
          <div className="flex-1 flex justify-center items-center">
            {headerNotification && (
              <div className="text-center">
                {/* Start Lights */}
                {headerNotification.type === 'startLights' && startLightsCount !== null && (
                  <div className="flex items-center space-x-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`w-4 h-4 rounded-full transition-colors ${
                          i <= startLightsCount ? 'bg-red-500' : 'bg-gray-400'
                        }`}
                      />
                    ))}
                  </div>
                )}
                {/* Lights Out */}
                {headerNotification.type === 'lightsOut' && (
                  <div className="flex items-center space-x-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="w-4 h-4 rounded-full bg-green-500" />
                    ))}
                  </div>
                )}
                {/* Other notifications */}
                {headerNotification && headerNotification.type && !['startLights', 'lightsOut'].includes(headerNotification.type) && (
                  <span className="text-lg font-semibold">{headerNotification.message}</span>
                )}
              </div>
            )}
          </div>

          {/* Right: Connection Status */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm">📡 {isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
        </div>
        
        {/* Temporary notifications (3 seconds) - positioned below header */}
        {temporaryNotifications.length > 0 && (
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 space-y-2 z-50">
            {temporaryNotifications.map(notif => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-gray-900 px-4 py-2 rounded-lg shadow-lg border border-gray-700"
              >
                <span className="text-sm">{notif.message}</span>
              </motion.div>
            ))}
          </div>
        )}
      </div>

       {/* Main Content - Constrained Width for 1440p Optimization */}
       <div className="max-w-[2048px] mx-auto px-6 py-6">
         <div className="w-full bg-gray-800 rounded-lg overflow-hidden relative">
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

  // Memoize fastest sectors calculation (recomputes only when drivers array changes)
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
    
    // Pre-index by driver for personal best lookup (using best lap sectors, not LS values)
    const sectorBestMap: Record<string, {s1: number, s2: number, s3: number}> = {};
    drivers.forEach(d => {
      sectorBestMap[d.id] = {
        s1: parseSectorTimeString(d.sector1Time || '0'),
        s2: parseSectorTimeString(d.sector2Time || '0'),
        s3: parseSectorTimeString(d.sector3Time || '0')
      };
    });
    
    return { fastestS1, fastestS2, fastestS3, sectorBestMap };
  }, [drivers, parseSectorTimeString]); // Only recalculates when drivers array reference changes

  // Memoize color computation function (stable reference, but uses latest fastestSectors)
  const getCurrentSectorColor = useMemo(() => {
    return (driver: DriverData, sector: 's1' | 's2' | 's3'): string => {
      const currentTimeStr = sector === 's1' ? driver.LS1 || '0' : sector === 's2' ? driver.LS2 || '0' : driver.LS3 || '0';
      const currentTime = parseSectorTimeString(currentTimeStr);
      if (!currentTime) return '';
      
      // Allow color coding for RUNNING and IN_LAP statuses (not retired)
      // Use driverStatus (from getDriverStatus) - simpler, direct UDP status mapping
      const driverStatus = driver.driverStatus || '';
      const isActiveStatus = driverStatus === 'RUNNING' || driverStatus === 'IN_LAP';
      if (isDriverRetired(driver.status) || !isActiveStatus) return '';
      
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
                    className="grid grid-cols-13 gap-1 p-3 border-b border-gray-700 hover:bg-gray-800 flex items-center"
                  style={{gridTemplateColumns: '64px 116px 116px 96px 80px 80px 80px 1fr 116px 96px 80px 80px 80px'}}
                >
                  {/* Penalty Indicator */}
                  {driver.hasPenalty && (
                    <div className="w-8 h-8 rounded flex items-center justify-center bg-red-600 flex-shrink-0 mr-1">
                      <AlertCircle className="w-5 h-5 text-black" />
                    </div>
                  )}
                  
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
                <span className="font-semibold text-sm">{driver.driverAbbreviation}</span>
              </div>
            </div>
            
            {/* Lap Time - justify left for time, right for tire - with fastest lap color coding */}
            <div className={`px-2 border-r border-gray-500 flex items-center justify-between ${
              isDriverRetired(driver.status) ? 'opacity-40 text-gray-400' : ''
            } ${driver.isFastestLap ? 'text-purple-400 font-semibold' : ''}`}>
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
            <div className={`px-2 border-r border-gray-500 text-base text-center font-mono tabular-nums tracking-tighter ${
              isDriverRetired(driver.status) ? 'opacity-40 text-gray-400' : ''
            } ${fastestSectors.fastestS1 !== Infinity && Math.abs(parseSectorTimeString(driver.sector1Time || '0') - fastestSectors.fastestS1) < 0.001 ? 'text-purple-400 font-semibold' : ''}`}>
              {driver.sector1Time || '--:--'}
            </div>
            
            {/* S2 (Best Lap) - Purple for fastest overall */}
            <div className={`px-2 border-r border-gray-500 text-base text-center font-mono tabular-nums tracking-tighter ${
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
            <div className={`px-2 border-r border-gray-500 flex justify-center items-center ${
              isDriverRetired(driver.status) ? 'opacity-40' : ''
            }`}>
              <div className="flex justify-center space-x-1 overflow-hidden w-full">
                {/* Always show 24 micro-sectors (grey squares that color in as boundaries are crossed) */}
                {(driver.microSectors && driver.microSectors.length === 24 
                  ? driver.microSectors 
                  : Array(24).fill('grey')
                ).map((sector, index) => {
                  // Add spacing between main sectors (every 8 micro-sectors)
                  const isMainSectorEnd = (index + 1) % 8 === 0 && index < 23;
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
                <div className={`px-2 border-r border-gray-500 text-base text-center font-mono tabular-nums tracking-tighter ${
                 isDriverRetired(driver.status) ? 'opacity-40 text-gray-400' : getCurrentSectorColor(driver, 's1')
                }`}>
                 {driver.LS1 || '--:--'}
                </div>
            
              {/* S2 (Current) - Color coding: purple = best overall, green = personal best */}
              <div className={`px-2 border-r border-gray-500 text-base text-center font-mono tabular-nums tracking-tighter ${
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
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <div className="grid grid-cols-12 gap-1 p-3 bg-gray-800 text-sm font-semibold border-b border-gray-500" style={{gridTemplateColumns: '64px 116px 80px 96px 116px 116px 1fr 116px 96px 80px 80px 80px'}}>
          <div className="px-2 border-r border-gray-500 text-center">POS</div>
          <div className="px-2 border-r border-gray-500 text-center">DRIVER</div>
          <div className="px-2 border-r border-gray-500 text-center">GAP</div>
          <div className="px-2 border-r border-gray-500 text-center">INTERVAL</div>
          <div className="px-2 border-r border-gray-500 text-center">BEST LAP</div>
          <div className="px-2 border-r border-gray-500 text-center">LAST LAP</div>
          <div className="px-2 border-r border-gray-500 text-center">STINT GRAPH</div>
          <div className="px-2 border-r border-gray-500 text-center">DRIVER</div>
          <div className="px-2 border-r border-gray-500 text-center">STATUS</div>
          <div className="px-2 border-r border-gray-500 text-center">S1</div>
          <div className="px-2 border-r border-gray-500 text-center">S2</div>
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
                  className="grid grid-cols-12 gap-1 p-3 border-b border-gray-700 hover:bg-gray-800 flex items-center"
                  style={{gridTemplateColumns: '64px 116px 80px 96px 116px 116px 1fr 116px 96px 80px 80px 80px'}}
                >
                  {/* Penalty Indicator */}
                  {driver.hasPenalty && (
                    <div className="w-8 h-8 rounded flex items-center justify-center bg-red-600 flex-shrink-0 mr-1">
                      <AlertCircle className="w-5 h-5 text-black" />
                    </div>
                  )}
                  
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
                <span className="font-semibold text-sm">{driver.driverAbbreviation}</span>
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
            }`}>
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
            <div className={`px-2 border-r border-gray-500 text-base text-center font-mono tabular-nums tracking-tighter ${
              isDriverRetired(driver.status) ? 'opacity-40 text-gray-400' : getCurrentSectorColor(driver, 's1')
            }`}>
              {driver.LS1 || '--:--'}
            </div>
            
            {/* S2 (Current) - Color coding: purple = best overall, green = personal best (shared with practice/qualifying) */}
            <div className={`px-2 border-r border-gray-500 text-base text-center font-mono tabular-nums tracking-tighter ${
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

