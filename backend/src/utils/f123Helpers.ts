/**
 * F1 23 UDP Shared Helper Functions
 * Common utilities used across multiple services
 */

/**
 * Find pole position time (fastest lap time) from results array
 * Works with any object that has a bestLapTime property
 */
export function findPoleTime<T extends { bestLapTime?: number }>(
  results: T[]
): number | null {
  if (!results || results.length === 0) {
    return null;
  }

  const validTimes = results
    .map(r => r.bestLapTime)
    .filter((time): time is number => time !== undefined && time > 0);

  if (validTimes.length === 0) {
    return null;
  }

  return Math.min(...validTimes);
}

/**
 * Format gap from milliseconds to readable format
 * Returns format: "X.XXX" or "M:SS.XXX" for gaps over 60 seconds
 */
export function formatGap(gapMs: number): string {
  if (gapMs === 0) return '0.000';
  
  const seconds = gapMs / 1000;
  
  if (seconds < 60) {
    return seconds.toFixed(3);
  } else {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = (seconds % 60).toFixed(3);
    return `${minutes}:${remainingSeconds}`;
  }
}

/**
 * Format lap time from milliseconds to readable format
 * Returns format: "M:SS.mmm" or "SS.mmm" if under 60 seconds
 */
export function formatLapTime(timeInMs: number): string {
  if (timeInMs === 0 || timeInMs === undefined) return '--:--.---';
  
  const totalSeconds = timeInMs / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = (totalSeconds % 60).toFixed(3);
  
  if (minutes > 0) {
    return `${minutes}:${seconds}`;
  } else {
    return seconds;
  }
}

/**
 * Format sector time from milliseconds
 * @param timeInMs Time in milliseconds
 * @param minutes Optional whole minute part (from UDP packet)
 * @returns Formatted string "SS.mmm" or "M:SS.mmm"
 */
export function formatSectorTime(timeInMs: number, minutes: number = 0): string {
  if (timeInMs === 0 || timeInMs === undefined) return '--.---';
  
  const totalSeconds = timeInMs / 1000;
  const totalMinutes = minutes + Math.floor(totalSeconds / 60);
  const remainingSeconds = (totalSeconds % 60).toFixed(3);
  
  if (totalMinutes > 0) {
    return `${totalMinutes}:${remainingSeconds}`;
  } else {
    return remainingSeconds;
  }
}

/**
 * Calculate position change from grid position to current position
 * @param gridPosition Starting grid position
 * @param currentPosition Current race position
 * @returns Positive number = gained positions, Negative = lost positions
 */
export function calculatePositionChange(
  gridPosition: number,
  currentPosition: number
): number {
  return gridPosition - currentPosition;
}

/**
 * Validate packet header against F1 23 UDP specification
 * @param header Packet header to validate
 * @returns true if valid, false otherwise
 */
export function validatePacketHeader(header: {
  packetFormat?: number;
  gameYear?: number;
  packetId?: number;
}): boolean {
  // Validate packet format (should be 2023 for F1 23)
  if (header.packetFormat !== undefined && header.packetFormat !== 2023) {
    console.warn(
      `⚠️ Unexpected packet format: ${header.packetFormat}, expected 2023`
    );
    // Don't reject, but warn
  }

  // Validate game year (should be 23 for F1 23)
  if (header.gameYear !== undefined && header.gameYear !== 23) {
    console.warn(
      `⚠️ Unexpected game year: ${header.gameYear}, expected 23`
    );
    // Don't reject, but warn
  }

  // Validate packet ID (should be 0-13)
  if (
    header.packetId !== undefined &&
    (header.packetId < 0 || header.packetId > 13)
  ) {
    console.warn(
      `⚠️ Invalid packet ID: ${header.packetId}, must be 0-13`
    );
    return false;
  }

  return true;
}

/**
 * Calculate Sector 3 time from completed lap data
 * S3 = Last Lap Time - S1 - S2
 * Only valid for completed laps (lastLapTimeInMS > 0)
 * 
 * @param lastLapTimeMs Last lap time in milliseconds
 * @param sector1TimeMs Sector 1 time in milliseconds
 * @param sector1TimeMinutes Sector 1 whole minute part
 * @param sector2TimeMs Sector 2 time in milliseconds
 * @param sector2TimeMinutes Sector 2 whole minute part
 * @returns Sector 3 time in seconds, or 0 if invalid
 */
export function calculateS3TimeForCompletedLap(
  lastLapTimeMs: number,
  sector1TimeMs: number,
  sector1TimeMinutes: number,
  sector2TimeMs: number,
  sector2TimeMinutes: number
): number {
  // Only calculate S3 when we have a completed lap
  if (
    lastLapTimeMs === 0 ||
    sector1TimeMs === 0 ||
    sector2TimeMs === 0
  ) {
    return 0;
  }

  // Calculate total S1 and S2 times (including minutes)
  const s1Total = sector1TimeMs + sector1TimeMinutes * 60000;
  const s2Total = sector2TimeMs + sector2TimeMinutes * 60000;

  // S3 = Last Lap Time - S1 - S2
  const s3Time = lastLapTimeMs - s1Total - s2Total;

  // Return in seconds, ensure non-negative
  return Math.max(0, s3Time) / 1000;
}

/**
 * Convert time string to milliseconds
 * Handles formats like "1:23.456" or "83.456"
 */
export function convertTimeStringToMs(time: string | number): number {
  if (typeof time === 'number') {
    return time;
  }

  if (typeof time === 'string') {
    // Handle formats like "1:23.456" or "83.456"
    const parts = time.split(':');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0], 10) * 60 * 1000;
      const seconds = parseFloat(parts[1]) * 1000;
      return minutes + seconds;
    } else {
      return parseFloat(time) * 1000;
    }
  }

  return 0;
}

