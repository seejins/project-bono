/**
 * Date formatting utilities
 * Consolidated date formatting functions used across the application
 */

/**
 * Format date as "Jan 15" (short format)
 * Returns "TBD" if date is null/undefined/invalid
 */
export const formatDate = (value: string | null | undefined): string => {
  if (!value) {
    return 'TBD';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'TBD';
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/**
 * Format date as "Jan 15, 2024" (full format with year)
 * Returns empty string if date is null/undefined/invalid
 */
export const formatFullDate = (value: string | null | undefined): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { 
    year: 'numeric',
    month: 'short', 
    day: 'numeric',
    // Force display in Pacific Time (PST/PDT) so dates are consistent
    timeZone: 'America/Los_Angeles',
  });
};

/**
 * Format time string (HH:MM format) from time-only string
 * e.g., "14:30" -> "14:30"
 */
export const formatTime = (timeString: string): string => {
  if (!timeString) return '';
  try {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch {
    return timeString;
  }
};

/**
 * Format time in milliseconds to MM:SS.mmm format
 * e.g., 90000 -> "1:30.000"
 */
export const formatTimeFromMs = (timeMs: number): string => {
  if (!timeMs || timeMs === 0) return '--:--.---';
  const minutes = Math.floor(timeMs / 60000);
  const seconds = Math.floor((timeMs % 60000) / 1000);
  const milliseconds = timeMs % 1000;
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
};
