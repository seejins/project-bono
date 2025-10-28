// Utility functions for mapping F1 23 UDP data to display format

// Driver Status Mapping
export const getDriverStatus = (status: number): string => {
  switch (status) {
    case 0: return 'IN_GARAGE';
    case 1: return 'FLYING_LAP';
    case 2: return 'IN_LAP';
    case 3: return 'OUT_LAP';
    case 4: return 'ON_TRACK';
    default: return 'UNKNOWN';
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

// Gap Formatting
export const formatGap = (gapMs: number): string => {
  if (gapMs === 0) return 'LEADER';
  const seconds = gapMs / 1000;
  if (seconds < 60) {
    return seconds.toFixed(3);
  } else {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = (seconds % 60).toFixed(3);
    return `${minutes}:${remainingSeconds}`;
  }
};

// Lap Time Formatting
export const formatLapTime = (timeInMs: number): string => {
  if (timeInMs === 0) return '--:--.---';
  const totalSeconds = timeInMs / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = (totalSeconds % 60).toFixed(3);
  return `${minutes}:${seconds}`;
};

// Sector Time Formatting
export const formatSectorTime = (timeInMs: number, minutes: number = 0): string => {
  if (timeInMs === 0) return '--.---';
  const totalSeconds = timeInMs / 1000;
  const totalMinutes = minutes + Math.floor(totalSeconds / 60);
  const remainingSeconds = (totalSeconds % 60).toFixed(3);
  
  if (totalMinutes > 0) {
    return `${totalMinutes}:${remainingSeconds}`;
  } else {
    return remainingSeconds;
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

// Convert F1 23 UDP data to LiveTimings format
export const convertToLiveTimingsFormat = (udpData: any): any => {
  const lapData = udpData.lapData;
  const carStatus = udpData.carStatus;
  const stintHistory = udpData.stintHistory || [];
  
  return {
    id: udpData.carNumber?.toString() || '0',
    position: lapData.carPosition || 0,
    driverName: udpData.driverName || 'Unknown Driver',
    driverAbbreviation: getDriverAbbreviation(udpData.driverName),
    teamColor: getTeamColor(udpData.teamName),
    
    // Timing data
    fastestLap: formatLapTime(lapData.bestLapTimeInMS || lapData.lastLapTimeInMS || 0),
    currentLapTime: formatLapTime(lapData.currentLapTimeInMS || 0),
    lastLapTime: formatLapTime(lapData.lastLapTimeInMS || 0),
    bestLap: formatLapTime(lapData.bestLapTimeInMS || lapData.lastLapTimeInMS || 0),
    
    // Gap and interval - DIRECT FROM UDP!
    gap: lapData.deltaToRaceLeaderInMS ? formatGap(lapData.deltaToRaceLeaderInMS) : 'LEADER',
    interval: lapData.deltaToCarInFrontInMS ? `+${formatGap(lapData.deltaToCarInFrontInMS)}` : '',
    
    // Position changes
    positionChange: calculatePositionChange(lapData.gridPosition || 0, lapData.carPosition || 0),
    
    // Sector times
    sector1Time: formatSectorTime(lapData.sector1TimeInMS || 0, lapData.sector1TimeMinutes || 0),
    sector2Time: formatSectorTime(lapData.sector2TimeInMS || 0, lapData.sector2TimeMinutes || 0),
    sector3Time: formatSectorTime(lapData.sector3TimeInMS || 0, lapData.sector3TimeMinutes || 0),
    
    // Status
    status: getDriverStatus(lapData.driverStatus || 0),
    
    // Tire data
    tireCompound: getTireCompound(carStatus.actualTyreCompound || 0),
    lapsOnCompound: carStatus.tyresAgeLaps || 0,
    
    // Stint tracking data - simplified to use UDP directly
    currentTire: getTireCompound(carStatus.actualTyreCompound || 0),
    stintLaps: carStatus.tyresAgeLaps || 0, // Direct from UDP
    totalRaceLaps: udpData.sessionData?.totalLaps || 52, // Use dynamic session data
    lapNumber: lapData.currentLapNum || 0,
    
    // F1 23 UDP status fields
    resultStatus: lapData.resultStatus || 2, // Default to active
    driverStatus: lapData.driverStatus || 4, // Default to on track
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
