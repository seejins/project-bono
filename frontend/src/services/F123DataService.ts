// F1 23 Data Service for frontend
export interface F123SessionData {
  sessionType: number;
  sessionTypeName: string;
  sessionStartTime: Date | null;
  sessionEndTime: Date;
  trackName: string;
  drivers: F123DriverResult[];
}

export interface F123DriverResult {
  id: string;
  name: string;
  team: string;
  number: number;
  
  // Qualifying data
  qualifyingPosition?: number;
  qualifyingTime?: number; // in milliseconds
  qualifyingGap?: number; // calculated gap in milliseconds
  qualifyingSector1Time?: number;
  qualifyingSector2Time?: number;
  qualifyingSector3Time?: number;
  qualifyingBestLapTime?: number;
  
  // Race data
  racePosition?: number;
  raceTime?: string; // formatted time or gap
  raceGap?: number | null; // gap to leader in milliseconds (null for leader)
  raceLapTime?: number; // in milliseconds
  raceSector1Time?: number;
  raceSector2Time?: number;
  raceSector3Time?: number;
  raceBestLapTime?: number;
  
  // New fields for enhanced race data
  status?: 'finished' | 'dnf' | 'dsq' | 'dns' | 'dnq';
  gridPosition?: number; // starting position
  positionGain?: number | null; // positions gained/lost from grid (positive = gained, negative = lost, null = no data)
  pitStops?: number; // number of pit stops
  tireCompound?: 'soft' | 'medium' | 'hard' | 'intermediate' | 'wet' | 'unknown';
  
  // Points and achievements
  points: number;
  fastestLap: boolean;
  fastestLapTime?: number; // in milliseconds
  
  // Penalties and DNF
  penalties: number;
  penaltyReason?: string | null; // Reason for penalty(s)
  warnings: number;
  dnf: boolean;
  dnfReason?: string;
  
  // Data source
  dataSource: 'UDP' | 'MANUAL' | 'FILE_UPLOAD';
}

export class F123DataService {
  /**
   * Format time from milliseconds to readable format
   * Returns formats: --:--.--- (invalid), -:--.--- (single digit minutes), or MM:SS.mmm (double digit minutes)
   * Supports single-digit minutes for times under 1 hour
   */
  static formatTimeFromMs(milliseconds: number): string {
    if (milliseconds <= 0) return '--:--.---';
    
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    const millisecondsPart = milliseconds % 1000;
    
    // Use single digit minutes format (-:--.---) for times under 1 hour
    if (minutes < 10) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}.${millisecondsPart.toString().padStart(3, '0')}`;
    }
    
    // Use double digit minutes format (MM:SS.mmm) for times 1 hour and above
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${millisecondsPart.toString().padStart(3, '0')}`;
  }
  
  /**
   * Format gap time from milliseconds (for gaps, use sector time format)
   * Returns formats: --.--- (invalid or >= 10 seconds), -.--- (< 10 seconds)
   * For gaps >= 1 minute, shows as minutes:seconds.milliseconds
   */
  static formatGapTimeFromMs(milliseconds: number): string {
    if (milliseconds <= 0) return '--.---';
    
    const totalSeconds = Math.floor(milliseconds / 1000);
    const ms = milliseconds % 1000;
    
    // If gap is less than 1 minute, use sector time format
    if (totalSeconds < 60) {
      if (totalSeconds < 10) {
        // Format as -.--- (5 characters) for gaps under 10 seconds
        return `${totalSeconds}.${ms.toString().padStart(3, '0')}`;
      } else {
        // Format as --.--- (6 characters) for gaps 10-59 seconds
        return `${totalSeconds.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
      }
    }
    
    // For gaps >= 1 minute, use minutes:seconds.milliseconds format
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    if (minutes < 10) {
      // Single digit minutes: -:--.---
      return `${minutes}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    } else {
      // Double digit minutes: MM:SS.mmm
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    }
  }

  /**
   * Format sector time from milliseconds
   * Returns --.--- format (6 characters) for times >= 10 seconds
   * Returns -.--- format (5 characters) for times < 10 seconds
   * Both formats are right-aligned within the same width container
   */
  static formatSectorTimeFromMs(milliseconds: number): string {
    if (milliseconds <= 0) return '--.---';
    
    const seconds = Math.floor(milliseconds / 1000);
    const ms = milliseconds % 1000;
    
    if (seconds < 10) {
      // Format as -.--- (5 characters) for times under 10 seconds
      return `${seconds}.${ms.toString().padStart(3, '0')}`;
    }
    
    // Format as --.--- (6 characters) for times 10 seconds and above
    return `${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }

  /**
   * Format time from milliseconds to SS.mmm format (thousandths only)
   * Always shows MM:SS.mmm format with thousandth precision
   */
  static formatTimeThousandths(milliseconds: number): string {
    if (milliseconds <= 0) return '00:00.000';
    
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    const ms = milliseconds % 1000;
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }

  /**
   * Format gap from milliseconds to readable format
   */
  static formatGapFromMs(gapMs: number): string {
    if (gapMs === 0) return '';
    if (gapMs < 0) return `-${Math.abs(gapMs / 1000).toFixed(3)}`;
    return `+${(gapMs / 1000).toFixed(3)}`;
  }

  /**
   * Get session type name from number
   */
  static getSessionTypeName(sessionType: number): string {
    const sessionTypes = [
      'Unknown', 'Practice 1', 'Practice 2', 'Practice 3',
      'Short Practice', 'Q1', 'Q2', 'Q3', 'Short Qualifying',
      'One Shot Qualifying', 'Race', 'Race 2', 'Time Trial'
    ];
    return sessionTypes[sessionType] || 'Unknown';
  }

  /**
   * Get team color class (Tailwind classes)
   */
  static getTeamColor(team: string): string {
    const colors: { [key: string]: string } = {
      'Mercedes': 'text-cyan-400',
      'Red Bull Racing': 'text-blue-400',
      'Ferrari': 'text-red-400',
      'McLaren': 'text-orange-400',
      'Aston Martin': 'text-green-400',
      'Alpine': 'text-pink-400',
      'RB': 'text-yellow-400',
      'Sauber': 'text-gray-400',
      'Haas': 'text-white',
      'Williams': 'text-blue-300'
    };
    return colors[team] || 'text-gray-400';
  }

  /**
   * Get team color as hex value (for inline styles)
   * Uses official F1 team colors
   * Handles case-insensitive matching and common team name variations
   */
  static getTeamColorHex(team: string): string {
    if (!team || team === 'Unknown Team') {
      return '#9ca3af'; // Default gray
    }
    
    // Normalize team name for matching (trim, lowercase)
    const normalizedTeam = team.trim().toLowerCase();
    
    const colorMap: { [key: string]: string } = {
      // Mercedes variations
      'mercedes': '#00D2BE',
      'mercedes-amg': '#00D2BE',
      'mercedes amg': '#00D2BE',
      
      // Red Bull variations
      'red bull racing': '#1E41FF',
      'red bull': '#1E41FF',
      'redbull': '#1E41FF',
      'redbull racing': '#1E41FF',
      
      // Ferrari
      'ferrari': '#DC143C',
      
      // McLaren
      'mclaren': '#FF8700',
      
      // Aston Martin variations
      'aston martin': '#006F62',
      'aston-martin': '#006F62',
      
      // Alpine
      'alpine': '#0090FF',
      'alpine f1': '#0090FF',
      
      // RB variations
      'rb': '#469BFF',
      'rb f1': '#469BFF',
      'racing bulls': '#469BFF',
      
      // Sauber variations
      'sauber': '#9B0000',
      'stake f1': '#9B0000',
      'stake f1 team': '#9B0000',
      
      // Haas
      'haas': '#FFFFFF',
      'haas f1': '#FFFFFF',
      
      // Williams
      'williams': '#005AFF',
      'williams f1': '#005AFF',
      
      // Alfa Romeo - maroon color
      'alfa romeo': '#900C3F',
      'alfa-romeo': '#900C3F',
      'alfa romeo f1': '#900C3F',
      'alfa romeo racing': '#900C3F',
      'alfaromeo': '#900C3F',
      
      // AlphaTauri - navy color
      'alphatauri': '#0A1E2E',
      'alpha tauri': '#0A1E2E',
      'alpha-tauri': '#0A1E2E',
      'alphatauri f1': '#0A1E2E',
      'scuderia alphatauri': '#0A1E2E'
    };
    
    return colorMap[normalizedTeam] || '#9ca3af'; // Default gray if not found
  }

  /**
   * Get position color class
   */
  static getPositionColor(position: number): string {
    if (position === 1) return 'text-yellow-500'; // Gold for 1st
    if (position <= 3) return 'text-gray-300'; // Silver/Bronze for podium
    if (position <= 10) return 'text-gray-400'; // Points positions
    return 'text-gray-500'; // Outside points
  }

  /**
   * Get data source icon
   */
  static getDataSourceIcon(dataSource: 'UDP' | 'MANUAL' | 'FILE_UPLOAD'): string {
    switch (dataSource) {
      case 'UDP': return '📡 Live Data';
      case 'MANUAL': return '✏️ Manual Entry';
      case 'FILE_UPLOAD': return '📁 File Upload';
      default: return '❓ Unknown';
    }
  }

  /**
   * Get status color class
   */
  static getStatusColor(status?: string): string {
    switch (status) {
      case 'finished': return 'text-green-600 dark:text-green-400';
      case 'dnf': return 'text-red-600 dark:text-red-400';
      case 'dsq': return 'text-red-600 dark:text-red-400';
      case 'dns': return 'text-gray-500 dark:text-gray-400';
      case 'dnq': return 'text-gray-500 dark:text-gray-400';
      default: return 'text-gray-500 dark:text-gray-400';
    }
  }

  /**
   * Get status display text
   */
  static getStatusText(status?: string): string {
    switch (status) {
      case 'finished': return 'Finished';
      case 'dnf': return 'DNF';
      case 'dsq': return 'DSQ';
      case 'dns': return 'DNS';
      case 'dnq': return 'DNQ';
      default: return 'Finished';
    }
  }

  /**
   * Get tire compound color class
   */
  static getTireCompoundColor(compound?: string): string {
    switch (compound) {
      case 'soft': return 'text-red-600 dark:text-red-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'hard': return 'text-gray-600 dark:text-gray-400';
      case 'intermediate': return 'text-green-600 dark:text-green-400';
      case 'wet': return 'text-blue-600 dark:text-blue-400';
      default: return 'text-gray-500 dark:text-gray-400';
    }
  }

  /**
   * Get tire compound display text
   */
  static getTireCompoundText(compound?: string): string {
    switch (compound) {
      case 'soft': return 'S';
      case 'medium': return 'M';
      case 'hard': return 'H';
      case 'intermediate': return 'I';
      case 'wet': return 'W';
      default: return '?';
    }
  }

  /**
   * Calculate points based on position
   */
  static calculatePoints(position: number, fastestLap: boolean = false): number {
    const points = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
    const basePoints = position <= 10 ? points[position - 1] : 0;
    const fastestLapBonus = fastestLap && position <= 10 ? 1 : 0;
    return basePoints + fastestLapBonus;
  }

  /**
   * Format race time (either total time or gap)
   */
  static formatRaceTime(position: number, totalTime?: number, gap?: number): string {
    if (position === 1 && totalTime) {
      return F123DataService.formatTimeFromMs(totalTime);
    }
    if (gap !== undefined) {
      return F123DataService.formatGapFromMs(gap);
    }
    return '--:--.---';
  }

  /**
   * Sort drivers by position for qualifying
   */
  static sortDriversByQualifyingPosition(drivers: F123DriverResult[]): F123DriverResult[] {
    return [...drivers].sort((a, b) => {
      const aPos = a.qualifyingPosition || 999;
      const bPos = b.qualifyingPosition || 999;
      return aPos - bPos;
    });
  }

  /**
   * Sort drivers by position for race
   */
  static sortDriversByRacePosition(drivers: F123DriverResult[]): F123DriverResult[] {
    return [...drivers].sort((a, b) => {
      const aPos = a.racePosition || 999;
      const bPos = b.racePosition || 999;
      return aPos - bPos;
    });
  }

  /**
   * Get session statistics
   */
  static getSessionStatistics(drivers: F123DriverResult[], sessionType: 'qualifying' | 'race') {
    const validTimes = drivers
      .map(d => sessionType === 'qualifying' ? d.qualifyingTime : d.raceLapTime)
      .filter(time => time && time > 0) as number[];

    if (validTimes.length === 0) {
      return {
        fastestTime: 0,
        slowestTime: 0,
        averageTime: 0,
        poleTime: 0,
        totalDrivers: drivers.length,
        finishedDrivers: 0
      };
    }

    const fastestTime = Math.min(...validTimes);
    const slowestTime = Math.max(...validTimes);
    const averageTime = validTimes.reduce((sum, time) => sum + time, 0) / validTimes.length;
    const poleTime = sessionType === 'qualifying' ? fastestTime : 0;

    return {
      fastestTime,
      slowestTime,
      averageTime,
      poleTime,
      totalDrivers: drivers.length,
      finishedDrivers: validTimes.length
    };
  }
}
