export interface Driver {
  id: string;
  name: string;
  team?: string;
  number?: number;
  seasonId?: string; // Nullable for cross-season drivers
  steam_id?: string; // Steam ID for F1 23 UDP mapping
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DriverData {
  name: string;
  team?: string;
  number?: number;
  seasonId?: string;
  steam_id?: string;
  isActive?: boolean;
}

export type Member = Driver;
export type MemberData = DriverData;

export type SeasonStatus = 'draft' | 'active' | 'completed';

export interface Season {
  id: string;
  name: string;
  year: number;
  startDate?: string;
  endDate?: string;
  status: SeasonStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SeasonData {
  name: string;
  year: number;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  status?: SeasonStatus;
}

export interface Track {
  id: string;
  name: string;
  country: string;
  city: string;
  length: number;
  laps: number;
  createdAt: string;
  updatedAt: string;
}

export interface TrackData {
  name: string;
  country: string;
  city?: string;
  circuitLength: number;
  laps: number;
}

export interface Race {
  id: string;
  seasonId: string;
  trackId: string;
  raceDate: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface RaceData {
  seasonId: string;
  trackId: string;
  trackName?: string; // Optional - will be looked up from track if not provided
  raceDate: string;
  status?: 'scheduled' | 'completed' | 'cancelled';
}

export interface DriverMapping {
  id: string;
  seasonId: string;
  f123DriverId: number;
  f123DriverName: string;
  f123DriverNumber?: number;
  f123TeamName?: string;
  yourDriverId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DriverMappingData {
  seasonId: string;
  f123DriverId: number;
  f123DriverName: string;
  f123DriverNumber?: number;
  f123TeamName?: string;
  yourDriverId?: string;
}

export interface SessionResult {
  driverId?: string | null;
  driverName: string;
  teamName?: string | null;
  carNumber?: number | null;
  position?: number | null;
  lapTime?: number | null;
  sector1Time?: number | null;
  sector2Time?: number | null;
  sector3Time?: number | null;
  bestLapTime?: number | null;
  gapToPole?: number | null;
  fastestLap?: boolean | null;
  polePosition?: boolean | null;
  penalties?: number | null;
  warnings?: number | null;
  dnfReason?: string | null;
  points?: number | null;
  lapTimes?: Array<{
    lapNumber?: number;
    lapTime?: number;
    sector1Time?: number;
    sector2Time?: number;
    sector3Time?: number;
  }>;
  dataSource?: 'UDP' | 'FILE_UPLOAD' | 'MANUAL';
}

