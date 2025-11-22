import { F123DataService } from '../../services/F123DataService';
import { BRAND_COLORS, STATUS_COLORS } from '../../theme/colors';
import type { ReferenceLineConfig } from '../charts/BaseLineChart';

export const sanitizeLapTimeMs = (value: any): number | null => {
  if (value === undefined || value === null) return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return numeric;
};

export const parseLapNumber = (lap: any): number | null => {
  const raw = lap?.lap_number ?? lap?.lapNumber;
  if (raw === undefined || raw === null) return null;
  const numeric = Number(raw);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return numeric;
};

export const getCompoundKey = (compound?: string): string => {
  const text = F123DataService.getTireCompoundText(compound);
  return text ? text.toUpperCase() : 'UNK';
};

export const getCompoundDisplayName = (compoundKey: string): string => {
  switch (compoundKey.toUpperCase()) {
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
      return compoundKey.toUpperCase();
  }
};

export const getTireCompoundHex = (compound?: string): string => {
  const normalized = (F123DataService.getTireCompoundText(compound) || '').toUpperCase();
  switch (normalized) {
    case 'S':
    case 'SOFT':
      return STATUS_COLORS.danger;
    case 'M':
    case 'MEDIUM':
      return STATUS_COLORS.warning;
    case 'H':
    case 'HARD':
      return STATUS_COLORS.neutral;
    case 'I':
    case 'INTERMEDIATE':
      return STATUS_COLORS.success;
    case 'W':
    case 'WET':
      return STATUS_COLORS.info;
    default:
      return STATUS_COLORS.purple ?? BRAND_COLORS.accent;
  }
};

export const formatSecondsValue = (seconds?: number | null): string => {
  if (seconds === undefined || seconds === null) {
    return '--:--.---';
  }
  return F123DataService.formatTimeFromMs(Math.round(seconds * 1000));
};

export const formatSecondsDifference = (seconds?: number | null): string => {
  if (seconds === undefined || seconds === null) {
    return '--:--.---';
  }
  const sign = seconds > 0 ? '+' : seconds < 0 ? '-' : '';
  const absolute = Math.abs(seconds);
  if (absolute >= 60) {
    return `${sign}${F123DataService.formatTimeFromMs(Math.round(absolute * 1000))}`;
  }
  return `${sign}${absolute.toFixed(3)}s`;
};

export const isPitStopFlag = (value: any): boolean => {
  if (value === undefined || value === null) {
    return false;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'pit';
  }
  return false;
};

export const buildPitReferenceLines = (lapNumbers: number[], isDark: boolean = false): ReferenceLineConfig[] => {
  const unique = Array.from(
    new Set(
      lapNumbers.filter(
        (lap) => typeof lap === 'number' && Number.isFinite(lap) && lap > 0
      )
    )
  ).sort((a, b) => a - b);

  // Use lighter colors in dark mode, darker colors in light mode
  const strokeColor = isDark 
    ? 'rgba(255, 255, 255, 0.6)' // white with opacity for dark mode
    : 'rgba(51, 65, 85, 0.8)'; // slate-700 with opacity for light mode
  
  const labelColor = isDark
    ? '#e2e8f0' // slate-200 for dark mode
    : '#334155'; // slate-700 for light mode

  return unique.map((lap) => ({
    x: lap,
    stroke: strokeColor,
    strokeWidth: 1.2,
    strokeDasharray: '3 3',
    ifFront: true,
    label: {
      position: 'top',
      value: 'PIT',
      fill: labelColor,
      fontSize: 9,
      fontWeight: 600,
      dy: 2,
    },
  }));
};

