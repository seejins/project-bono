import React, { useState, useEffect, useRef, useMemo, Fragment } from 'react';
import { io, Socket } from 'socket.io-client';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { convertToLiveTimingsFormat, getSessionTypeName, getSessionCategory } from '../utils/f123DataMapping';
import { F123DataService } from '../services/F123DataService';
import logger from '../utils/logger';

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
  isFastestLap?: boolean; // Kept for backward compatibility - not used in LiveTimings (uses event-based fastestLapCarIndex instead)
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
      return 'text-gray-900 dark:text-white'; // Active - normal color
    case 'DNF': return 'text-red-500'; // DNF
    case 'RET': return 'text-red-500'; // RETIRED
    case 'DSQ': return 'text-red-500'; // DISQUALIFIED
    case 'NCL': return 'text-gray-500 dark:text-white/50'; // NOT CLASSIFIED
    case 'OUT': return 'text-orange-500'; // OUT
    default: return 'text-gray-900 dark:text-white';
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
  // Memoize render elements calculation to avoid recalculating on every render
  const renderElements = useMemo(() => {
  // Use driver data directly from UDP
  const currentTire = driver.currentTire;
    const stintLaps = driver.stintLaps; // Direct from m_tyres_age_laps (0-indexed: laps completed)
  const totalRaceLaps = driver.totalRaceLaps;
    const stintHistory = driver.stintHistory || [];
    
    // Separate completed stints from current stint
    // endLap = 255 means current tire, otherwise it's the lap number (1-indexed) where stint ended
    const completedStints = stintHistory.filter(stint => stint.laps !== 255 && stint.laps > 0);
    
    // Process completed stints to calculate laps per stint
    // endLap is 1-indexed (lap where stint ended), so we calculate laps from previous endLap
    let previousStintEndLap = 0;
    const processedStints: Array<{ compound: 'S' | 'M' | 'H' | 'I' | 'W'; laps: number }> = [];
    
    for (const stint of completedStints) {
      const endLap = stint.laps; // 1-indexed lap where this stint ended
      const stintLapCount = endLap - previousStintEndLap; // Laps in this stint
      
      processedStints.push({
        compound: stint.compound,
        laps: stintLapCount
      });
      
      previousStintEndLap = endLap;
    }
    
    // Build render elements: [previous_stints] [current_stint] [remaining_laps]
    const elements: Array<{ type: 'indicator' | 'lap'; tire?: string; lapNum?: number; isStintCount?: boolean }> = [];
    
    // Add all previous completed stints
    for (let stintIndex = 0; stintIndex < processedStints.length; stintIndex++) {
      const stint = processedStints[stintIndex];
      const isFirstStint = stintIndex === 0;
      
      // Add tire indicator for this stint
      elements.push({ type: 'indicator', tire: stint.compound, isStintCount: false });
      
      // Add lap boxes for this stint
      // First stint: tire indicator + stint.laps boxes
      // Subsequent stints: tire indicator + (stint.laps - 1) boxes (to fix off-by-one)
      const lapBoxesToRender = isFirstStint ? stint.laps : stint.laps - 1;
      for (let i = 0; i < lapBoxesToRender; i++) {
        elements.push({ type: 'lap', tire: stint.compound });
      }
      
      // No counter box for previous stints - replaced with colored lap box above
    }
    
    // Add current stint
    // Current tire indicator
    elements.push({ type: 'indicator', tire: currentTire, isStintCount: false });
    
    // Current stint lap boxes
  for (let i = 0; i < stintLaps - 1; i++) {
      elements.push({ type: 'lap', tire: currentTire });
  }
  
    // Current stint count box
  if (stintLaps > 0) {
      elements.push({ type: 'indicator', tire: currentTire, lapNum: stintLaps, isStintCount: true });
    }
    
    // Calculate remaining laps - total boxes must equal totalRaceLaps
    // Boxes used = all previous stints + current stint
    const boxesUsedForPreviousStints = processedStints.reduce((sum, stint, index) => {
      const isFirstStint = index === 0;
      const lapBoxes = isFirstStint ? stint.laps : stint.laps - 1;
      return sum + 1 + lapBoxes; // tire + lap boxes (adjusted for subsequent stints)
    }, 0);
    
    const boxesUsedForCurrentStint = stintLaps > 0 
      ? 1 + (stintLaps - 1) + 1  // tire + completed + counter
      : 1;                        // tire only
    
    const totalBoxesUsed = boxesUsedForPreviousStints + boxesUsedForCurrentStint;
    const remainingLaps = Math.max(0, totalRaceLaps - totalBoxesUsed);
    
    // Add remaining laps (adjusted to keep total = totalRaceLaps)
  for (let i = 0; i < remainingLaps; i++) {
      elements.push({ type: 'lap', tire: undefined });
  }
    
    return elements;
  }, [driver.currentTire, driver.stintLaps, driver.totalRaceLaps, driver.stintHistory]);
  
  return (
    <div className="w-full h-5 overflow-hidden flex items-center space-x-0">
      {renderElements.map((element, index) => {
        if (element.type === 'indicator') {
          // Tire indicator or stint count box
          const icon = element.tire ? F123DataService.getTireCompoundIcon(element.tire) : null;
          const fullName = element.tire ? F123DataService.getTireCompoundFullName(element.tire) : null;
          return (
            <div
              key={index}
              className={`h-5 rounded-sm flex items-center justify-center text-[9px] font-bold flex-1 ${
                element.tire === 'S' ? 'bg-red-500 text-white' :
                element.tire === 'M' ? 'bg-yellow-500 text-black' :
                element.tire === 'H' ? 'bg-white text-black' :
                element.tire === 'I' ? 'bg-green-500 text-white' :
                element.tire === 'W' ? 'bg-blue-500 text-white' :
                'bg-white/15 text-white'
              }`}
              style={{ 
                minWidth: '2px'
              }}
            >
              {element.isStintCount ? (
                element.lapNum
              ) : icon ? (
                <img src={icon} alt={`${fullName} tire`} className="h-4 w-4" />
              ) : (
                element.tire
              )}
            </div>
          );
        } else {
          // Lap box - use bgClass only (backgroundColor was redundant, Tailwind handles it)
          const bgClass = element.tire
            ? (element.tire === 'S' ? 'bg-red-500' :
               element.tire === 'M' ? 'bg-yellow-500' :
               element.tire === 'H' ? 'bg-white' :
               element.tire === 'I' ? 'bg-green-500' :
               element.tire === 'W' ? 'bg-blue-500' : 'bg-white/15')
            : 'bg-white/10';
          
          return (
            <div
              key={index}
              className={`h-1 rounded-sm flex-1 ${bgClass}`}
              style={{ 
                minWidth: '2px'
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
  
  // Track fastest lap carIndex from FTLP event packet (authoritative source)
  const [fastestLapCarIndex, setFastestLapCarIndex] = useState<string | null>(null);
  
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
      setFastestLapCarIndex(null); // Clear fastest lap tracking on session change
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
    
    // Listen for fastest lap event (FTLP packet)
    newSocket.on('event:fastestLap', (data: any) => {
      // carIndex from event - convert to string to match driver.id format
      if (data.carIndex !== undefined && data.carIndex !== null) {
        setFastestLapCarIndex(data.carIndex.toString());
      }
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
      newSocket.off('event:fastestLap');
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
            logger.warn(`⚠️ Duplicate carIndex ${carIndex} detected - skipping duplicate entry`);
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
      // Only check fields that are displayed in the current session type
      const driversChanged = newDrivers.length !== drivers.length || 
        newDrivers.some((d, i) => {
          const prevDriver = drivers[i];
          if (!prevDriver || d.id !== prevDriver.id) return true;
          
          // Fields used in both race and practice/qualifying
          if (d.position !== prevDriver.position ||
              d.gap !== prevDriver.gap ||
              d.interval !== prevDriver.interval ||
              d.bestLap !== prevDriver.bestLap ||
              d.lastLapTime !== prevDriver.lastLapTime ||
              d.status !== prevDriver.status) {
            return true;
          }
          
          // For race: check LS1/LS2/LS3 (current live sectors displayed on right)
          // For practice/qualifying: check sector1Time/sector2Time/sector3Time (best lap sectors on left)
          if (isRace) {
            // Race table shows LS1, LS2, LS3 (current live sectors) - check those
            if (d.LS1 !== prevDriver.LS1 ||
                d.LS2 !== prevDriver.LS2 ||
                d.LS3 !== prevDriver.LS3) {
              return true;
            }
          } else {
            // Practice/Qualifying table shows sector1Time/sector2Time/sector3Time (best lap) on left
            if (d.sector1Time !== prevDriver.sector1Time ||
                d.sector2Time !== prevDriver.sector2Time ||
                d.sector3Time !== prevDriver.sector3Time) {
              return true;
            }
            // Also check LS1/LS2/LS3 for right side columns (current live sectors)
            if (d.LS1 !== prevDriver.LS1 ||
                d.LS2 !== prevDriver.LS2 ||
                d.LS3 !== prevDriver.LS3) {
              return true;
            }
          }
          
          return false;
        });
      
      if (driversChanged) {
        setDrivers(newDrivers);
      }
    }
  };

  // Memoize session display to avoid recalculating on every render
  const sessionDisplay = useMemo(() => {
    if (!sessionData) return 'No Session';
    
    if (sessionData.sessionType === 'RACE') {
      return `LAP ${sessionData.currentLap || 0} / ${sessionData.totalLaps || 0}`;
    } else {
      const totalSeconds = Math.max(0, sessionData.timeRemaining || 0);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
      return `${minutes}:${seconds}`;
    }
  }, [sessionData?.sessionType, sessionData?.currentLap, sessionData?.totalLaps, sessionData?.timeRemaining]);

  if (!sessionData) {
    return (
      <div className="-mt-24 -ml-[calc(50vw-50%)] -mr-[calc(50vw-50%)] w-screen min-h-[calc(100vh+96px)] overflow-hidden bg-gray-50 dark:bg-[#060b1d] text-gray-900 dark:text-slate-100 relative">
        <div className="pointer-events-none absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(252,70,107,0.08),transparent_62%),radial-gradient(circle_at_bottom,_rgba(63,94,251,0.05),transparent_52%)]" />
          <div className="absolute inset-x-0 -top-[480px] h-[960px] bg-[radial-gradient(circle_at_top,_rgba(248,113,113,0.22),transparent_76%)] blur-[120px]" />
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-gray-50 dark:from-[#060b1d] via-transparent to-transparent" />
        </div>

        <div className="relative z-10 mx-auto flex min-h-[calc(100vh+96px)] max-w-[1600px] items-center justify-center px-6 pt-24">
          <div className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-10 py-12 text-center backdrop-blur-md shadow-[0_35px_90px_-45px_rgba(6,11,29,0.85)]">
            <div className="text-6xl mb-4">🏁</div>
            <h1 className="text-3xl font-extrabold uppercase tracking-[0.35em] text-gray-900 dark:text-white">Live Timings</h1>
            <p className="mt-3 text-sm uppercase tracking-[0.25em] text-gray-600 dark:text-white/60">Awaiting Connection</p>
            <p className="mt-6 text-base text-gray-700 dark:text-white/50">
              Enable telemetry in F1® 23 and keep this page open to follow every split in real time.
            </p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="-mt-24 -ml-[calc(50vw-50%)] -mr-[calc(50vw-50%)] w-screen min-h-[calc(100vh+96px)] overflow-hidden bg-gray-50 dark:bg-[#060b1d] text-gray-900 dark:text-slate-100 relative">
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(252,70,107,0.08),transparent_62%),radial-gradient(circle_at_bottom,_rgba(63,94,251,0.05),transparent_52%)]" />
        <div className="absolute inset-x-0 -top-[480px] h-[960px] bg-[radial-gradient(circle_at_top,_rgba(248,113,113,0.22),transparent_76%)] blur-[120px]" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-gray-50 dark:from-[#060b1d] via-transparent to-transparent" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1600px] px-6 pt-24 pb-12">
        {/* Header with Notification System */}
        <div
          className={`relative border-b border-gray-200 dark:border-white/10 px-6 py-6 backdrop-blur-sm transition-colors duration-300 ${
            headerNotification?.type === 'redFlag'
              ? 'bg-red-500/20 text-red-100'
              : headerNotification?.type === 'safetyCar' || headerNotification?.type === 'vsc' || headerNotification?.type === 'formation'
                ? 'bg-amber-400/20 text-amber-100'
                : 'bg-white dark:bg-white/5 text-gray-900 dark:text-slate-100'
          }`}
        >
        <div className="relative flex items-center justify-between">
          {/* Left: Track/Session Info */}
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-6">
            <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.3em] text-gray-800 dark:text-white/80">
              <span className="inline-flex items-center gap-2 rounded-full border border-gray-300 dark:border-white/20 bg-gray-100 dark:bg-white/10 px-4 py-1.5 text-xs font-bold tracking-[0.4em] text-gray-900 dark:text-white">
                Live
              </span>
              <span className="hidden md:inline-block text-gray-500 dark:text-white/60">•</span>
              <span className="text-gray-700 dark:text-white/70">{sessionData.trackName}</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-base font-medium tracking-[0.12em] text-gray-900 dark:text-white">
              <span className="flex items-center gap-2">
                🏁 <span className="uppercase">{sessionData.sessionTypeName || sessionData.sessionType}</span>
              </span>
              <span className="flex items-center gap-2">
                ⏱️{' '}
                {sessionData.sessionType === 'RACE' ? (
                  sessionDisplay
                ) : (
                  <SessionTimer
                    sessionTimeLeft={sessionData.timeRemaining || 0}
                    isRunning={isConnected && sessionData.timeRemaining > 0}
                  />
                )}
              </span>
              {sessionData.sessionType === 'RACE' && (
                <span className="flex items-center gap-2 text-gray-600 dark:text-white/60">
                  Laps {sessionData.currentLap || 0}/{sessionData.totalLaps || 0}
                </span>
              )}
            </div>
          </div>

          {/* Center: Header Notification (persistent) - Absolutely positioned for true centering */}
          {headerNotification && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <span className="rounded-full border border-gray-300 dark:border-white/20 bg-gray-100 dark:bg-white/10 px-5 py-1 text-base font-semibold uppercase tracking-[0.3em] text-gray-900 dark:text-white">
                {headerNotification.message}
              </span>
            </div>
          )}

          {/* Right: Connection Status */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-gray-300 dark:border-white/15 bg-gray-100 dark:bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-gray-700 dark:text-white/70">
              <span className={`block h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]' : 'bg-rose-400 shadow-[0_0_8px_rgba(244,114,182,0.7)]'}`} />
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
          </div>
        </div>
      </div>

        {/* Main Content - Constrained Width for 1440p Optimization */}
        <div className="mx-auto max-w-[2048px] px-6 py-10">
          <div className="relative overflow-hidden rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-[0_25px_80px_-45px_rgba(8,10,25,0.95)] backdrop-blur-md">
              {/* Loading state overlay - show when session exists but no drivers loaded yet */}
              {sessionData && drivers.length === 0 && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-50/90 dark:bg-[#060b1d]/75 backdrop-blur-lg">
                  <div className="mb-4 h-12 w-12 animate-spin rounded-full border-2 border-gray-400 dark:border-white/40 border-b-transparent"></div>
                  <p className="text-lg font-medium tracking-[0.18em] uppercase text-gray-800 dark:text-white/80">Loading driver data…</p>
                  <p className="mt-2 text-sm text-gray-600 dark:text-white/60">Waiting for participants packet</p>
                </div>
              )}
              
              {/* Always show table - empty if no data */}
            {sessionData.sessionType === 'RACE' ? (
               <RaceTimingTable 
                 drivers={drivers} 
                 previousDrivers={previousDrivers}
                 getCurrentSectorColor={getCurrentSectorColor}
                 fastestLapCarIndex={fastestLapCarIndex}
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
      
      return 'text-gray-900 dark:text-white';
    };
  }, [fastestSectors, parseSectorTimeString]); // Only recreates when fastestSectors changes

  return { parseSectorTimeString, fastestSectors, getCurrentSectorColor };
};

// Extended driver type with sector fastest flags
type DriverDataWithFlags = DriverData & {
  isFastestS1: boolean;
  isFastestS2: boolean;
  isFastestS3: boolean;
};

// Pre-calculate sector fastest flags for practice/qualifying
const useSectorFastestFlags = (drivers: DriverData[], fastestSectors: any, parseSectorTimeString: (timeStr: string) => number): DriverDataWithFlags[] => {
  return useMemo(() => {
    return drivers.map(driver => {
      const sector1Parsed = parseSectorTimeString(driver.sector1Time || '0');
      const sector2Parsed = parseSectorTimeString(driver.sector2Time || '0');
      const sector3Parsed = parseSectorTimeString(driver.sector3Time || '0');
      
      return {
        ...driver,
        isFastestS1: fastestSectors.fastestS1 !== Infinity && Math.abs(sector1Parsed - fastestSectors.fastestS1) < 0.001,
        isFastestS2: fastestSectors.fastestS2 !== Infinity && Math.abs(sector2Parsed - fastestSectors.fastestS2) < 0.001,
        isFastestS3: fastestSectors.fastestS3 !== Infinity && Math.abs(sector3Parsed - fastestSectors.fastestS3) < 0.001,
      } as DriverDataWithFlags;
    });
  }, [drivers, fastestSectors, parseSectorTimeString]);
};

// Memoized Practice/Qualifying Driver Row Component
const PracticeDriverRow = React.memo(({ 
  driver,
  getCurrentSectorColor,
  isFastestS1,
  isFastestS2,
  isFastestS3
}: {
  driver: DriverData;
  getCurrentSectorColor: (driver: DriverData, sector: 's1' | 's2' | 's3') => string;
  isFastestS1: boolean;
  isFastestS2: boolean;
  isFastestS3: boolean;
}) => {
              return (
    <div className="relative transition-all duration-150 ease-out">
      <div
        className="grid grid-cols-13 gap-0 items-center border-b border-gray-200 dark:border-white/10 p-3 hover:bg-gray-50 dark:hover:bg-white/10"
        style={{gridTemplateColumns: '64px 116px 116px 96px 80px 80px 80px 1fr 116px 96px 80px 80px 80px'}}
      >
        {/* POS */}
            <div className="px-2 border-r border-gray-200 dark:border-white/10 flex items-center justify-center">
              <div className={`w-5 h-5 rounded text-xs font-bold flex items-center justify-center position-indicator ${
                driver.position === 1 ? 'bg-red-500 text-white shadow-[0_0_12px_rgba(248,113,113,0.75)]' : 'bg-gray-200 dark:bg-white/15 text-gray-700 dark:text-white/80'
              }`}>
                {driver.position}
              </div>
            </div>
            
        {/* Driver */}
        <div className={`px-3 border-r border-white/10 flex items-center ${
          isDriverRetired(driver.status) ? 'opacity-40 text-gray-500 dark:text-white/40' : ''
            }`}>
              <div className="flex items-center space-x-2">
                <div 
                  className="w-1 h-6 rounded"
                  style={{ backgroundColor: driver.teamColor }}
                ></div>
            <span className="font-semibold text-sm text-gray-900 dark:text-white">{driver.driverAbbreviation}</span>
              </div>
            </div>
            
        {/* Lap Time */}
        <div className={`px-[11px] border-r border-white/10 flex items-center justify-between ${
          isDriverRetired(driver.status) ? 'opacity-40 text-gray-500 dark:text-white/45' : ''
        }`}>
          <span className="text-base font-mono tabular-nums tracking-tighter text-gray-900 dark:text-white">{driver.fastestLap}</span>
          {driver.fastestLapTire && (() => {
            const icon = F123DataService.getTireCompoundIcon(driver.fastestLapTire);
            const fullName = F123DataService.getTireCompoundFullName(driver.fastestLapTire);
            if (!icon) {
              return (
                <span className="text-xs font-semibold text-gray-600 dark:text-white/70">
                  {driver.fastestLapTire}
                </span>
              );
            }
            return (
              <img
                src={icon}
                alt={`${fullName} tire`}
                className="h-5 w-5 ml-2"
        />
            );
          })()}
            </div>
            
        {/* Gap */}
        <div className={`px-2 border-r border-gray-200 dark:border-white/10 text-base text-center font-mono tabular-nums tracking-tighter ${
          isDriverRetired(driver.status) ? 'opacity-40 text-gray-500 dark:text-white/45' : ''
        } ${getRetirementStatusColor(driver.status)}`}>
          {isDriverRetired(driver.status) ? getRetirementStatus(driver.status) : driver.gap}
            </div>
            
        {/* S1 (Best Lap) */}
        <div className={`px-2 text-base text-center font-mono tabular-nums tracking-tighter ${
          isDriverRetired(driver.status) ? 'opacity-40 text-gray-500 dark:text-white/45' : 'text-gray-700 dark:text-white/80'
        } ${isFastestS1 ? 'text-fuchsia-300 font-semibold drop-shadow-[0_0_8px_rgba(217,70,239,0.45)]' : ''}`}>
          {driver.sector1Time || '--:--'}
            </div>
            
        {/* S2 (Best Lap) */}
        <div className={`px-2 text-base text-center font-mono tabular-nums tracking-tighter ${
          isDriverRetired(driver.status) ? 'opacity-40 text-gray-500 dark:text-white/45' : 'text-gray-700 dark:text-white/80'
        } ${isFastestS2 ? 'text-fuchsia-300 font-semibold drop-shadow-[0_0_8px_rgba(217,70,239,0.45)]' : ''}`}>
          {driver.sector2Time || '--:--'}
        </div>
        
        {/* S3 (Best Lap) */}
        <div className={`px-2 border-r border-gray-200 dark:border-white/10 text-base text-center font-mono tabular-nums tracking-tighter ${
          isDriverRetired(driver.status) ? 'opacity-40 text-gray-500 dark:text-white/45' : 'text-gray-700 dark:text-white/80'
        } ${isFastestS3 ? 'text-fuchsia-300 font-semibold drop-shadow-[0_0_8px_rgba(217,70,239,0.45)]' : ''}`}>
          {driver.sector3Time || '--:--'}
        </div>
        
        {/* Micro-sectors */}
        <div className={`px-8 border-r border-gray-200 dark:border-white/10 flex justify-center items-center ${
          isDriverRetired(driver.status) ? 'opacity-40' : ''
        }`}>
          <div className="flex items-center gap-x-0.5 w-full">
            {(driver.microSectors && driver.microSectors.length === 24 
              ? driver.microSectors 
              : Array(24).fill('grey')
            ).map((sector, index) => {
              const isMainSectorEnd = (index + 1) % 8 === 0 && index < 23;
                  return (
                <Fragment key={index}>
                      <div
                    className={`flex-1 h-4 min-w-0 rounded-sm ${
                          sector === 'purple' ? 'bg-purple-500' :
                          sector === 'green' ? 'bg-green-500' :
                          sector === 'yellow' ? 'bg-amber-300' :
                          'bg-gray-300 dark:bg-white/20'
                        }`}
                      ></div>
                  {isMainSectorEnd && <div className="w-1.5 flex-shrink-0"></div>}
                </Fragment>
                  );
                })}
              </div>
            </div>
            
            {/* Driver Last Name */}
        <div className={`px-2 border-r border-white/10 text-sm text-left ${
          isDriverRetired(driver.status) ? 'opacity-40 text-gray-500 dark:text-white/45' : 'text-gray-700 dark:text-white/80'
            }`}>
              {driver.driverName.split(' ').pop()}
            </div>
            
        {/* Status */}
        <div className={`px-2 border-r border-white/10 text-sm text-center ${getStatusColor(driver.status || '')} ${
          isDriverRetired(driver.status) ? 'opacity-40 text-gray-500 dark:text-white/45' : ''
        }`}>
          {driver.status || ''}
    </div>
        
        {/* S1 (Current) */}
        <div className={`px-2 text-base text-center font-mono tabular-nums tracking-tighter ${
          isDriverRetired(driver.status) ? 'opacity-40 text-gray-500 dark:text-white/45' : getCurrentSectorColor(driver, 's1') || 'text-gray-600 dark:text-white/70'
        }`}>
          {driver.LS1 || '--:--'}
        </div>
        
        {/* S2 (Current) */}
        <div className={`px-2 text-base text-center font-mono tabular-nums tracking-tighter ${
          isDriverRetired(driver.status) ? 'opacity-40 text-gray-500 dark:text-white/45' : getCurrentSectorColor(driver, 's2') || 'text-gray-600 dark:text-white/70'
        }`}>
          {driver.LS2 || '--:--'}
        </div>
        
        {/* S3 (Current) */}
        <div className={`px-2 text-base text-center font-mono tabular-nums tracking-tighter ${
          isDriverRetired(driver.status) ? 'opacity-40 text-gray-500 dark:text-white/45' : getCurrentSectorColor(driver, 's3') || 'text-gray-600 dark:text-white/70'
        }`}>
          {driver.LS3 || '--:--'}
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if these specific props changed
  return (
    prevProps.driver.id === nextProps.driver.id &&
    prevProps.driver.position === nextProps.driver.position &&
    prevProps.driver.fastestLap === nextProps.driver.fastestLap &&
    prevProps.driver.fastestLapTire === nextProps.driver.fastestLapTire &&
    prevProps.driver.gap === nextProps.driver.gap &&
    prevProps.driver.status === nextProps.driver.status &&
    prevProps.driver.sector1Time === nextProps.driver.sector1Time &&
    prevProps.driver.sector2Time === nextProps.driver.sector2Time &&
    prevProps.driver.sector3Time === nextProps.driver.sector3Time &&
    prevProps.driver.LS1 === nextProps.driver.LS1 &&
    prevProps.driver.LS2 === nextProps.driver.LS2 &&
    prevProps.driver.LS3 === nextProps.driver.LS3 &&
    prevProps.driver.microSectors === nextProps.driver.microSectors &&
    prevProps.isFastestS1 === nextProps.isFastestS1 &&
    prevProps.isFastestS2 === nextProps.isFastestS2 &&
    prevProps.isFastestS3 === nextProps.isFastestS3
  );
});

// Memoized Race Driver Row Component
const RaceDriverRow = React.memo(({ 
  driver,
  getCurrentSectorColor,
  fastestLapCarIndex,
  StintGraph
}: {
  driver: DriverData;
  getCurrentSectorColor: (driver: DriverData, sector: 's1' | 's2' | 's3') => string;
  fastestLapCarIndex: string | null;
  StintGraph: React.FC<{ driver: DriverData }>;
}) => {
              return (
    <div className="relative transition-all duration-150 ease-out">
      <div
        className="grid grid-cols-12 gap-0 items-center border-b border-white/10 p-3 hover:bg-white/10"
        style={{gridTemplateColumns: '64px 111px 80px 96px 116px 116px 1fr 116px 96px 80px 80px 80px'}}
      >
        {/* POS */}
            <div className="px-2 border-r border-gray-200 dark:border-white/10 flex items-center justify-center">
              <div className={`w-5 h-5 rounded text-xs font-bold flex items-center justify-center position-indicator ${
                driver.position === 1 ? 'bg-red-500 text-white shadow-[0_0_12px_rgba(248,113,113,0.75)]' : 'bg-gray-200 dark:bg-white/15 text-gray-700 dark:text-white/80'
              }`}>
                {driver.position}
              </div>
            </div>
            
        {/* Driver with position change */}
        <div className="px-[11px] border-r border-white/10 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-1 h-6 rounded"
                  style={{ backgroundColor: driver.teamColor }}
                ></div>
            <span className="font-semibold text-sm text-gray-900 dark:text-white">{driver.driverAbbreviation}</span>
              </div>
          <div className="flex items-center justify-end space-x-1 w-14">
                {driver.positionChange > 0 ? (
                  <>
                <ArrowUp className="w-4 h-4 text-emerald-400 position-change" />
                <span className="text-sm text-emerald-300 font-semibold position-change tabular-nums">{driver.positionChange}</span>
                  </>
                ) : driver.positionChange < 0 ? (
                  <>
                <ArrowDown className="w-4 h-4 text-rose-400 position-change" />
                <span className="text-sm text-rose-300 font-semibold position-change tabular-nums">{Math.abs(driver.positionChange)}</span>
                  </>
                ) : (
                  <>
                    <Minus className="w-3 h-3 text-gray-400 dark:text-white/30" />
                    <span className="text-xs text-gray-500 dark:text-white/40">0</span>
                  </>
                )}
              </div>
            </div>
            
        {/* Gap */}
        <div className={`px-2 border-r border-gray-200 dark:border-white/10 text-base text-center font-mono tabular-nums tracking-tighter ${
          isDriverRetired(driver.status) ? 'opacity-40 text-gray-500 dark:text-white/45' : ''
        } ${getRetirementStatusColor(driver.status)}`}>
          {isDriverRetired(driver.status) ? getRetirementStatus(driver.status) : driver.gap}
            </div>
            
            {/* Interval */}
        <div className={`px-2 border-r border-gray-200 dark:border-white/10 text-base text-center font-mono tabular-nums tracking-tighter ${
          isDriverRetired(driver.status) ? 'opacity-40 text-gray-500 dark:text-white/45' : 'text-gray-700 dark:text-white/80'
            }`}>
              {driver.interval}
            </div>
            
            {/* Best Lap */}
        <div className={`px-2 border-r border-gray-200 dark:border-white/10 text-base text-center font-mono tabular-nums tracking-tighter ${
          isDriverRetired(driver.status) ? 'opacity-40 text-gray-500 dark:text-white/45' : 'text-gray-700 dark:text-white/80'
        } ${driver.id === fastestLapCarIndex ? 'text-fuchsia-300 font-semibold drop-shadow-[0_0_8px_rgba(217,70,239,0.45)]' : ''}`}>
              {driver.bestLap}
            </div>
            
            {/* Last Lap */}
        <div className={`px-2 border-r border-gray-200 dark:border-white/10 text-base text-center font-mono tabular-nums tracking-tighter ${
          isDriverRetired(driver.status) ? 'opacity-40 text-gray-500 dark:text-white/45' : 'text-gray-700 dark:text-white/80'
            }`}>
              {driver.lastLapTime}
            </div>
            
        {/* Stint Graph */}
            <div className={`px-2 border-r border-white/10 flex justify-center items-center ${
          isDriverRetired(driver.status) ? 'opacity-40' : ''
            }`}>
              <div className="flex justify-center items-center space-x-1 overflow-hidden w-full">
                <StintGraph driver={driver} />
              </div>
            </div>
            
            {/* Driver Last Name */}
        <div className={`px-2 border-r border-white/10 text-sm text-left ${
          isDriverRetired(driver.status) ? 'opacity-40 text-gray-500 dark:text-white/45' : 'text-gray-700 dark:text-white/80'
            }`}>
              {driver.driverName.split(' ').pop()}
            </div>
            
        {/* Status */}
        <div className={`px-2 border-r border-white/10 text-sm text-center ${getStatusColor(driver.status || '')} ${
          isDriverRetired(driver.status) ? 'opacity-40 text-gray-500 dark:text-white/45' : ''
        }`}>
          {driver.status || ''}
        </div>
        
        {/* S1 (Current) */}
        <div className={`px-2 text-base text-center font-mono tabular-nums tracking-tighter ${
          isDriverRetired(driver.status) ? 'opacity-40 text-gray-500 dark:text-white/45' : getCurrentSectorColor(driver, 's1') || 'text-gray-600 dark:text-white/70'
        }`}>
          {driver.LS1 || '--:--'}
        </div>
        
        {/* S2 (Current) */}
        <div className={`px-2 text-base text-center font-mono tabular-nums tracking-tighter ${
          isDriverRetired(driver.status) ? 'opacity-40 text-gray-500 dark:text-white/45' : getCurrentSectorColor(driver, 's2') || 'text-gray-600 dark:text-white/70'
        }`}>
          {driver.LS2 || '--:--'}
        </div>
        
        {/* S3 (Current) */}
        <div className={`px-2 text-base text-center font-mono tabular-nums tracking-tighter ${
          isDriverRetired(driver.status) ? 'opacity-40 text-gray-500 dark:text-white/45' : getCurrentSectorColor(driver, 's3') || 'text-gray-600 dark:text-white/70'
        }`}>
          {driver.LS3 || '--:--'}
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if these specific props changed
  return (
    prevProps.driver.id === nextProps.driver.id &&
    prevProps.driver.position === nextProps.driver.position &&
    prevProps.driver.positionChange === nextProps.driver.positionChange &&
    prevProps.driver.gap === nextProps.driver.gap &&
    prevProps.driver.interval === nextProps.driver.interval &&
    prevProps.driver.bestLap === nextProps.driver.bestLap &&
    prevProps.driver.lastLapTime === nextProps.driver.lastLapTime &&
    prevProps.driver.status === nextProps.driver.status &&
    prevProps.driver.LS1 === nextProps.driver.LS1 &&
    prevProps.driver.LS2 === nextProps.driver.LS2 &&
    prevProps.driver.LS3 === nextProps.driver.LS3 &&
    prevProps.driver.stintHistory === nextProps.driver.stintHistory &&
    prevProps.driver.stintLaps === nextProps.driver.stintLaps &&
    prevProps.fastestLapCarIndex === nextProps.fastestLapCarIndex
  );
});

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
  // Pre-calculate sector fastest flags for all drivers
  const driversWithFlags = useSectorFastestFlags(drivers, fastestSectors, parseSectorTimeString);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
      <div className="grid grid-cols-13 gap-0 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/10 px-3 py-4 text-xs font-semibold uppercase tracking-[0.3em] text-gray-600 dark:text-white/60" style={{gridTemplateColumns: '64px 116px 116px 96px 80px 80px 80px 1fr 116px 96px 80px 80px 80px'}}>
          <div className="px-2 text-center">Pos</div>
          <div className="px-2 text-center">Driver</div>
          <div className="px-[7px] text-center">Lap Time</div>
          <div className="px-2 text-center">Gap</div>
          <div className="px-2 text-center">S1</div>
          <div className="px-2 text-center">S2</div>
          <div className="px-2 text-center">S3</div>
          <div className="px-8 text-center">Micro</div>
          <div className="px-2 text-center">Driver</div>
          <div className="px-2 text-center">Status</div>
          <div className="px-2 text-center">S1</div>
          <div className="px-2 text-center">S2</div>
          <div className="px-2 text-center">S3</div>
        </div>
        
        <div>
          {driversWithFlags.map((driverWithFlags) => (
            <PracticeDriverRow
              key={driverWithFlags.id}
              driver={driverWithFlags}
              getCurrentSectorColor={getCurrentSectorColor}
              isFastestS1={driverWithFlags.isFastestS1}
              isFastestS2={driverWithFlags.isFastestS2}
              isFastestS3={driverWithFlags.isFastestS3}
            />
          ))}
        </div>
    </div>
  );
};

// Race Timing Table Component
const RaceTimingTable = ({ 
  drivers, 
  previousDrivers,
  getCurrentSectorColor,
  fastestLapCarIndex
}: { 
  drivers: DriverData[], 
  previousDrivers: DriverData[],
  getCurrentSectorColor: (driver: DriverData, sector: 's1' | 's2' | 's3') => string,
  fastestLapCarIndex: string | null
}) => {
  // Use shared logic from parent (no local calculations)

  return (
    <div className="relative overflow-hidden rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
      <div className="grid grid-cols-12 gap-0 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/10 px-3 py-4 text-xs font-semibold uppercase tracking-[0.3em] text-gray-600 dark:text-white/60" style={{gridTemplateColumns: '64px 111px 80px 96px 116px 116px 1fr 116px 96px 80px 80px 80px'}}>
          <div className="px-2 text-center">Pos</div>
          <div className="px-2 text-center">Driver</div>
          <div className="px-2 text-center">Gap</div>
          <div className="px-2 text-center">Interval</div>
          <div className="px-2 text-center">Best Lap</div>
          <div className="px-2 text-center">Last Lap</div>
          <div className="px-2 text-center">Stints</div>
          <div className="px-2 text-center">Driver</div>
          <div className="px-2 text-center">Status</div>
          <div className="px-2 text-center">S1</div>
          <div className="px-2 text-center">S2</div>
          <div className="px-2 text-center">S3</div>
        </div>
        
        <div>
          {drivers.map((driver) => (
            <RaceDriverRow
              key={driver.id}
              driver={driver}
              getCurrentSectorColor={getCurrentSectorColor}
              fastestLapCarIndex={fastestLapCarIndex}
              StintGraph={StintGraph}
            />
          ))}
        </div>
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
    default: return 'text-white/50';
  }
};

