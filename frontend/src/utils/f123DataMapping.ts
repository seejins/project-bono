// Utility functions for mapping F1 23 UDP data to display format

// Driver Status Mapping
export const getDriverStatus = (status: number): string => {
  switch (status) {
    case 0: return 'IN_GARAGE';
    case 1: return 'RUNNING';  // FLYING_LAP -> RUNNING
    case 2: return 'IN_LAP';
    case 3: return 'OUT_LAP';
    case 4: return 'RUNNING';  // ON_TRACK -> RUNNING
    default: return 'RUNNING';
  }
};

// Result Status Mapping (for retirements)
export const getResultStatus = (resultStatus: number): string => {
  switch (resultStatus) {
    case 0: return 'INVALID';
    case 1: return 'INACTIVE';
    case 2: return 'RUNNING';  // ACTIVE
    case 3: return 'FINISHED';
    case 4: return 'DNF';      // DID NOT FINISH
    case 5: return 'DSQ';     // DISQUALIFIED
    case 6: return 'NCL';     // NOT CLASSIFIED
    case 7: return 'RET';     // RETIRED
    default: return 'RUNNING';
  }
};

// Tire Compound Mapping - Simplified to S, M, H, I, W
export const getTireCompound = (compound: number): 'S' | 'M' | 'H' | 'I' | 'W' => {
  switch (compound) {
    case 16: return 'S'; // C5 (softest)
    case 17: return 'S'; // C4
    case 18: return 'M'; // C3
    case 19: return 'H'; // C2
    case 20: return 'H'; // C1
    case 21: return 'H'; // C0 (treat as hard)
    case 7: return 'I';  // Intermediate
    case 8: return 'W';  // Wet
    default: return 'M';
  }
};

// Visual Tire Compound Mapping - Uses different values (16=soft, 17=medium, 18=hard)
export const getVisualTireCompound = (compound: number): 'S' | 'M' | 'H' | 'I' | 'W' => {
  switch (compound) {
    case 16: return 'S'; // Soft
    case 17: return 'M'; // Medium
    case 18: return 'H'; // Hard
    case 7: return 'I';  // Intermediate
    case 8: return 'W';  // Wet
    default: return 'M'; // Default to Medium if unknown
  }
};

// Gap Formatting - Add + prefix
// Format: +SSS.mmm (if < 60s) or +M:ss.mmm (if < 10min) or +MM:ss.mmm (if >= 10min)
export const formatGap = (gapMs: number): string => {
  if (gapMs === 0) return '0.000'; // Show 0.000 instead of LEADER for consistency
  const seconds = gapMs / 1000;
  if (seconds < 60) {
    return `+${seconds.toFixed(3)}`; // +SSS.mmm
  } else {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const minutesStr = minutes >= 10 ? minutes.toString().padStart(2, '0') : minutes.toString(); // M or MM
    const secondsParts = remainingSeconds.toFixed(3).split('.');
    const secondsFormatted = `${secondsParts[0].padStart(2, '0')}.${secondsParts[1]}`; // ss.mmm (always two digits)
    return `+${minutesStr}:${secondsFormatted}`; // +M:ss.mmm or +MM:ss.mmm
  }
};

// Lap Time Formatting - Fixed width (9 chars: MM:SS.mmm)
export const formatLapTime = (timeInMs: number): string => {
  if (timeInMs === 0) return '--:--.---'; // 9 chars: --:--.---
  const totalSeconds = timeInMs / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = (totalSeconds % 60);
  
  // Always format as MM:SS.mmm for fixed width (9 chars)
  const minutesStr = minutes.toString().padStart(2, '0');
  const secondsStr = seconds.toFixed(3);
  const secondsParts = secondsStr.split('.');
  const secondsFormatted = `${secondsParts[0].padStart(2, '0')}.${secondsParts[1]}`;
  return `${minutesStr}:${secondsFormatted}`;
};

// Sector Time Formatting - Fixed width (6 chars: SS.mmm, or M:SS.mmm if minutes)
export const formatSectorTime = (timeInMs: number, minutes: number = 0): string => {
  if (timeInMs === 0) return '--.---'; // 6 chars: --.---
  const totalSeconds = timeInMs / 1000;
  const totalMinutes = minutes + Math.floor(totalSeconds / 60);
  const remainingSeconds = (totalSeconds % 60);
  
  if (totalMinutes > 0) {
    // Format as M:SS.mmm for fixed width
    const minutesStr = totalMinutes.toString().padStart(1, '0');
    const secondsStr = remainingSeconds.toFixed(3).padStart(6, '0');
    return `${minutesStr}:${secondsStr}`;
  } else {
    // Format as SS.mmm for fixed width (6 chars)
    return remainingSeconds.toFixed(3).padStart(6, '0');
  }
};

// Position Change Calculation
export const calculatePositionChange = (gridPosition: number, currentPosition: number): number => {
  return gridPosition - currentPosition; // +2 = gained 2 positions, -1 = lost 1 position
};

// Team Color Mapping
export const getTeamColor = (teamName: string): string => {
  const teamColors: { [key: string]: string } = {
    'Mercedes': '#00D2BE',
    'Ferrari': '#DC143C',
    'Red Bull Racing': '#0600EF',
    'Williams': '#005AFF',
    'Aston Martin': '#006F62',
    'Alpine': '#0090FF',
    'Alpha Tauri': '#2B4562',
    'Haas': '#FFFFFF',
    'McLaren': '#FF8700',
    'Alfa Romeo': '#900000',
  };
  return teamColors[teamName] || '#FFFFFF';
};

// Driver Abbreviation
export const getDriverAbbreviation = (driverName: string): string => {
  if (!driverName) return 'UNK';
  const parts = driverName.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0] + parts[1][1]).toUpperCase();
  }
  return driverName.substring(0, 3).toUpperCase();
};

// Helper to map status text for STATUS column (include all statuses; keep PITTING/PIT)
const getDriverStatusDisplay = (udpData: any): string => {
  const lapData = udpData?.lapData || {};
  const resultStatus = lapData.resultStatus ?? 2; // 0 INVALID, 1 INACTIVE, 2 ACTIVE, 3 FINISHED, 4 DNF, 5 DSQ, 6 NCL, 7 RET
  const pitStatus = lapData.pitStatus ?? 0;       // 0 none, 1 pitting, 2 in pit area
  const driverStatus = lapData.driverStatus ?? 0; // 0 in garage, 1 flying, 2 in lap, 3 out lap, 4 on track

  // FINISHED takes priority over everything (including pit status)
  if (resultStatus === 3) return 'FINISHED';

  // Show all other result statuses when present
  switch (resultStatus) {
    case 5: return 'DSQ';
    case 7: return 'RET';
    case 4: return 'DNF';
    case 6: return 'NCL';
    case 1: return 'INACTIVE';
    case 0: return 'INVALID';
    // 2 ACTIVE: fall through to live/pit statuses below
  }

  // Pit statuses (map both to PIT)
  if (pitStatus === 1) return 'PIT';
  if (pitStatus === 2) return 'PIT';

  // Driver live statuses
  if (driverStatus === 0) return 'PIT';      // in garage
  if (driverStatus === 3) return 'OUT LAP';
  if (driverStatus === 2) return 'IN LAP';
  if (driverStatus === 1 || driverStatus === 4) return 'RUNNING';

  return 'RUNNING';
};

// Convert F1 23 UDP data to LiveTimings format
export const convertToLiveTimingsFormat = (udpData: any, leaderBestLapTime?: number, leaderLapNum?: number, isRace?: boolean, frontCarLapNum?: number): any => {
  const lapData = udpData.lapData;
  const carStatus = udpData.carStatus;
  const stintHistory = udpData.stintHistory || [];
  
  return {
    id: udpData.carIndex?.toString() ?? udpData.carNumber?.toString() ?? '0', // Use carIndex (always unique) instead of carNumber for React keys
    position: lapData.carPosition || 0,
    isFastestLap: udpData.isFastestLap || false, // For Best Lap column color coding (isolated from sectors)
    driverName: udpData.driverName || 'Unknown Driver',
    driverAbbreviation: getDriverAbbreviation(udpData.driverName),
    teamColor: getTeamColor(udpData.teamName),
    
    // Timing data
    fastestLap: formatLapTime(lapData.bestLapTimeInMS || lapData.lastLapTimeInMS || 0),
    fastestLapTire: (lapData.bestLapTimeInMS || lapData.lastLapTimeInMS) > 0 
      ? getTireCompound(carStatus.actualTyreCompound || 0) 
      : undefined, // Only set if there's a valid lap time
    status: getDriverStatusDisplay(udpData),
    lastLapTime: formatLapTime(lapData.lastLapTimeInMS || 0),
    bestLap: formatLapTime(lapData.bestLapTimeInMS || lapData.lastLapTimeInMS || 0),
    bestLapTire: getTireCompound(carStatus.actualTyreCompound || 0), // Use current tire as approximation
    
    // Gap and interval - show terminal status when applicable, else gap to leader
    gap: (() => {
      const result = lapData.resultStatus || 0;
      if (result === 5) return 'DSQ';
      if (result === 7) return 'RET';
      if (result === 4) return 'DNF';
      if (lapData.carPosition === 1) return '--'; // Leader - use placeholder
      
      // For race sessions, use deltaToRaceLeaderInMS directly (UDP provides correct values)
      if (isRace && lapData.deltaToRaceLeaderInMS !== undefined) {
        // If delta is 0 and lap numbers differ, calculate laps down
        if (lapData.deltaToRaceLeaderInMS === 0 && leaderLapNum && lapData.currentLapNum && lapData.currentLapNum !== leaderLapNum) {
          const lapsDown = leaderLapNum - lapData.currentLapNum;
          return `+${lapsDown} Lap${lapsDown > 1 ? 's' : ''}`;
        }
        
        // Normal time delta (non-zero)
        if (lapData.deltaToRaceLeaderInMS > 0) {
          return formatGap(lapData.deltaToRaceLeaderInMS);
        }
        
        // Leader case (delta 0, same lap number)
        return '--';
      }
      
      // For practice/qualifying, use best lap time comparison
      const driverBestLap = lapData.bestLapTimeInMS || lapData.lastLapTimeInMS || 0;
      if (!leaderBestLapTime || leaderBestLapTime === 0 || driverBestLap === 0) {
        return '--';
      }
      
      const gapToLeaderBest = driverBestLap - leaderBestLapTime;
      return formatGap(gapToLeaderBest);
    })(),
    interval: (() => {
      // For leader, show placeholder
      if (lapData.carPosition === 1) {
        return '--';
      }
      
      // For race sessions, handle delta === 0 case (lapped by car in front)
      if (isRace && lapData.deltaToCarInFrontInMS !== undefined) {
        // If delta is 0 and lap numbers differ, calculate laps down
        if (lapData.deltaToCarInFrontInMS === 0 && frontCarLapNum && lapData.currentLapNum && lapData.currentLapNum !== frontCarLapNum) {
          const lapsDown = frontCarLapNum - lapData.currentLapNum;
          return `+${lapsDown} Lap${lapsDown > 1 ? 's' : ''}`;
        }
        
        // Normal time delta (non-zero)
        if (lapData.deltaToCarInFrontInMS > 0) {
          return formatGap(lapData.deltaToCarInFrontInMS);
        }
        
        // Same lap, very close (delta 0, same lap number)
        return '--';
      }
      
      // For practice/qualifying or non-race, use delta directly
      if (lapData.deltaToCarInFrontInMS !== undefined && lapData.deltaToCarInFrontInMS > 0) {
        return formatGap(lapData.deltaToCarInFrontInMS);
      }
      return '--';
    })(),
    
    // Position changes
    positionChange: calculatePositionChange(lapData.gridPosition || 0, lapData.carPosition || 0),
    
    // Sector times - use best lap sector times for practice/qualifying tables
    sector1Time: formatSectorTime((udpData.bestLapSector1Time || 0) * 1000, 0), // Convert back to ms for formatting
    sector2Time: formatSectorTime((udpData.bestLapSector2Time || 0) * 1000, 0), // Convert back to ms for formatting
    sector3Time: formatSectorTime((udpData.bestLapSector3Time || 0) * 1000, 0), // Convert back to ms for formatting
    
    // Status fields
    driverStatus: getDriverStatus(lapData.driverStatus || 0),
    
    // Tire data
    tireCompound: getTireCompound(carStatus.actualTyreCompound || 0),
    lapsOnCompound: carStatus.tyresAgeLaps || 0,
    
    // Stint tracking data - simplified to use UDP directly
    // Use only visual compound for stint graph (matches what user sees in-game)
    currentTire: getVisualTireCompound(carStatus.visualTyreCompound || 0),
    stintLaps: carStatus.tyresAgeLaps || 0, // Direct from UDP
    totalRaceLaps: udpData.sessionData?.totalLaps || 52, // Use dynamic session data
    lapNumber: lapData.currentLapNum || 0,
    
    
    // Micro-sectors - use backend-provided array (progressive coloring as segments complete)
    microSectors: udpData.microSectors || [],
    
    // Last completed sector times (right-side columns) - updated on sector completion by backend
    LS1: (() => {
      // Backend sends LS1 in milliseconds, with separate minutes field
      const s1Ms = udpData.LS1 || 0;
      const s1Min = udpData.LS1Minutes || 0;
      return s1Ms > 0 ? formatSectorTime(s1Ms, s1Min) : '--.---';
    })(),
    LS2: (() => {
      // Backend sends LS2 in milliseconds, with separate minutes field
      const s2Ms = udpData.LS2 || 0;
      const s2Min = udpData.LS2Minutes || 0;
      return s2Ms > 0 ? formatSectorTime(s2Ms, s2Min) : '--.---';
    })(),
    LS3: (() => {
      // Backend sends LS3 in seconds (already calculated)
      const s3Seconds = udpData.LS3 || 0;
      return s3Seconds > 0 ? formatSectorTime(s3Seconds * 1000, 0) : '--.---';
    })(),
    
    // Stint history
    stintHistory: stintHistory.map((stint: any) => ({
      compound: getTireCompound(stint.tyreActualCompound || stint.tyreVisualCompound || 18),
      laps: stint.endLap || 0
    })),
  };
};

// Generate micro-sectors from sector times
export const generateMicroSectorsFromSectors = (
  sector1Ms: number,
  sector2Ms: number,
  sector3Ms: number
): Array<'purple' | 'green' | 'yellow' | 'grey'> => {
  const microSectors: Array<'purple' | 'green' | 'yellow' | 'grey'> = [];
  
  // Split each sector into 8 micro-sectors
  const sectors = [sector1Ms, sector2Ms, sector3Ms];
  
  sectors.forEach(sectorMs => {
    if (sectorMs > 0) {
      const sectorTime = sectorMs / 8; // Split into 8 micro-sectors
      for (let i = 0; i < 8; i++) {
        microSectors.push(getMicroSectorColor(sectorTime));
      }
    } else {
      // Fill with grey if no data
      for (let i = 0; i < 8; i++) {
        microSectors.push('grey');
      }
    }
  });
  
  return microSectors;
};

// Get micro-sector color based on time
const getMicroSectorColor = (timeMs: number): 'purple' | 'green' | 'yellow' | 'grey' => {
  // This is a simplified implementation
  // In reality, you'd compare against fastest sector times
  if (timeMs < 15000) return 'purple'; // Very fast
  if (timeMs < 20000) return 'green';  // Fast
  if (timeMs < 25000) return 'yellow'; // Average
  return 'grey'; // Slow
};

// Session Type Name Helper
export const getSessionTypeName = (sessionType: number): string => {
  const sessionTypes = [
    'Unknown', 'Practice 1', 'Practice 2', 'Practice 3',
    'Short Practice', 'Q1', 'Q2', 'Q3', 'Short Qualifying',
    'One Shot Qualifying', 'Race', 'Race 2', 'Time Trial'
  ];
  return sessionTypes[sessionType] || 'Unknown';
};

// Session Category Helper
export const getSessionCategory = (sessionType: number): 'PRACTICE' | 'QUALIFYING' | 'RACE' => {
  // Practice sessions (1-4)
  if (sessionType >= 1 && sessionType <= 4) {
    return 'PRACTICE';
  }
  // Qualifying sessions (5-9)
  if (sessionType >= 5 && sessionType <= 9) {
    return 'QUALIFYING';
  }
  // Race sessions (10-11)
  if (sessionType >= 10 && sessionType <= 11) {
    return 'RACE';
  }
  // Default to PRACTICE for unknown/other types
  return 'PRACTICE';
};