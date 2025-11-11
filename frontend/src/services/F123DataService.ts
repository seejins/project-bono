// F1 23 Data Service for frontend
import softTyreIcon from '../assets/tires/soft_tyre.svg';
import mediumTyreIcon from '../assets/tires/medium_tyre.svg';
import hardTyreIcon from '../assets/tires/hard_tyre.svg';
import intermediateTyreIcon from '../assets/tires/intermediate_tyre.svg';
import wetTyreIcon from '../assets/tires/wet_tyre.svg';
import { STATUS_COLORS } from '../theme/colors';
import { findTeamByName, F123Team } from '../data/f123Teams';
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
   * Resolve canonical team information from known aliases.
   */
  static getTeamInfo(team?: string | null): F123Team | null {
    return findTeamByName(team);
  }

  /**
   * Ensure the displayed team name matches the canonical team label.
   */
  static getTeamDisplayName(team?: string | null): string {
    if (!team) {
      return 'Unknown Team';
    }

    const match = this.getTeamInfo(team);
    return match?.name ?? team;
  }

  /**
   * Get team color class (Tailwind classes)
   */
  static getTeamColor(team: string): string {
    return this.getTeamInfo(team)?.textClass ?? 'text-gray-400';
  }

  /**
   * Get team color as hex value (for inline styles)
   * Uses official F1 team colors
   * Handles case-insensitive matching and common team name variations
   */
  static getTeamColorHex(team: string): string {
    if (!team || team === 'Unknown Team') {
      return STATUS_COLORS.neutral; // Default gray
    }

    return this.getTeamInfo(team)?.color ?? STATUS_COLORS.neutral;
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
    if (!compound) return 'text-gray-500 dark:text-gray-400';
    
    const normalized = compound.toLowerCase().trim();
    
    // Handle various formats
    if (normalized === 's' || normalized === 'soft' || normalized.includes('soft') || normalized.startsWith('c5')) {
      return 'text-red-600 dark:text-red-400';
    }
    if (normalized === 'm' || normalized === 'medium' || normalized.includes('medium') || normalized.startsWith('c4')) {
      return 'text-yellow-600 dark:text-yellow-400';
    }
    if (normalized === 'h' || normalized === 'hard' || normalized.includes('hard') || normalized.startsWith('c3')) {
      return 'text-gray-600 dark:text-gray-400';
    }
    if (normalized === 'i' || normalized === 'intermediate' || normalized.includes('intermediate') || normalized.includes('inter')) {
      return 'text-green-600 dark:text-green-400';
    }
    if (normalized === 'w' || normalized === 'wet' || normalized.includes('wet')) {
      return 'text-blue-600 dark:text-blue-400';
    }
    
    return 'text-gray-500 dark:text-gray-400';
  }

  private static readonly TIRE_ICON_MAP: Record<string, string> = {
    S: softTyreIcon,
    SOFT: softTyreIcon,
    M: mediumTyreIcon,
    MEDIUM: mediumTyreIcon,
    H: hardTyreIcon,
    HARD: hardTyreIcon,
    I: intermediateTyreIcon,
    INTERMEDIATE: intermediateTyreIcon,
    W: wetTyreIcon,
    WET: wetTyreIcon,
  };

  /**
   * Get tire compound display text
   */
  static getTireCompoundText(compound?: string): string {
    if (!compound) return '?';
    
    const normalized = compound.toLowerCase().trim();
    
    // Handle various formats
    if (normalized === 's' || normalized === 'soft' || normalized.includes('soft')) return 'S';
    if (normalized === 'm' || normalized === 'medium' || normalized.includes('medium')) return 'M';
    if (normalized === 'h' || normalized === 'hard' || normalized.includes('hard')) return 'H';
    if (normalized === 'i' || normalized === 'intermediate' || normalized.includes('intermediate') || normalized.includes('inter')) return 'I';
    if (normalized === 'w' || normalized === 'wet' || normalized.includes('wet')) return 'W';
    
    // Handle C3, C4, C5 format (F1 tire compounds)
    if (normalized.startsWith('c3') || normalized === 'hard') return 'H';
    if (normalized.startsWith('c4') || normalized === 'medium') return 'M';
    if (normalized.startsWith('c5') || normalized === 'soft') return 'S';
    
    return compound; // Return original if we can't match
  }

  /**
   * Get the SVG icon path for a tire compound
   */
  static getTireCompoundIcon(compound?: string): string | null {
    if (!compound) return null;
    const text = this.getTireCompoundText(compound);
    if (!text) return null;
    const normalized = text.toUpperCase();
    return this.TIRE_ICON_MAP[normalized] || null;
  }

  /**
   * Get the human-friendly tire compound name
   */
  static getTireCompoundFullName(compound?: string): string {
    const text = this.getTireCompoundText(compound);
    const normalized = text ? text.toUpperCase() : null;
    switch (normalized) {
      case 'S':
        return 'Soft';
      case 'M':
        return 'Medium';
      case 'H':
        return 'Hard';
      case 'I':
        return 'Intermediate';
      case 'W':
        return 'Wet';
      default:
        return text || 'Unknown';
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
