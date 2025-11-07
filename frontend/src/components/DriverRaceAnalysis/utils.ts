import { F123DataService } from '../../services/F123DataService';

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
      return '#ef4444';
    case 'M':
    case 'MEDIUM':
      return '#eab308';
    case 'H':
    case 'HARD':
      return '#94a3b8';
    case 'I':
    case 'INTERMEDIATE':
      return '#22c55e';
    case 'W':
    case 'WET':
      return '#2563eb';
    default:
      return '#a855f7';
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

