/**
 * F1 23 UDP Shared Helper Functions
 * Common utilities used across multiple services
 */
/**
 * Find pole position time (fastest lap time) from results array
 * Works with any object that has a bestLapTime property
 */
export declare function findPoleTime<T extends {
    bestLapTime?: number;
}>(results: T[]): number | null;
/**
 * Format gap from milliseconds to readable format
 * Returns format: "X.XXX" or "M:SS.XXX" for gaps over 60 seconds
 */
export declare function formatGap(gapMs: number): string;
/**
 * Format lap time from milliseconds to readable format
 * Returns format: "M:SS.mmm" or "SS.mmm" if under 60 seconds
 */
export declare function formatLapTime(timeInMs: number): string;
/**
 * Format sector time from milliseconds
 * @param timeInMs Time in milliseconds
 * @param minutes Optional whole minute part (from UDP packet)
 * @returns Formatted string "SS.mmm" or "M:SS.mmm"
 */
export declare function formatSectorTime(timeInMs: number, minutes?: number): string;
/**
 * Calculate position change from grid position to current position
 * @param gridPosition Starting grid position
 * @param currentPosition Current race position
 * @returns Positive number = gained positions, Negative = lost positions
 */
export declare function calculatePositionChange(gridPosition: number, currentPosition: number): number;
/**
 * Validate packet header against F1 23 UDP specification
 * @param header Packet header to validate
 * @returns true if valid, false otherwise
 */
export declare function validatePacketHeader(header: {
    packetFormat?: number;
    gameYear?: number;
    packetId?: number;
}): boolean;
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
export declare function calculateS3TimeForCompletedLap(lastLapTimeMs: number, sector1TimeMs: number, sector1TimeMinutes: number, sector2TimeMs: number, sector2TimeMinutes: number): number;
/**
 * Convert time string to milliseconds
 * Handles formats like "1:23.456" or "83.456"
 */
export declare function convertTimeStringToMs(time: string | number): number;
//# sourceMappingURL=f123Helpers.d.ts.map