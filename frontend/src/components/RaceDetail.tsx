import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { Calendar, MapPin, Trophy, Flag, ArrowUp, ArrowDown, Minus, Edit, X } from 'lucide-react';
import { F123DataService, F123DriverResult } from '../services/F123DataService';
import { getTireCompound } from '../utils/f123DataMapping';
import { useAdmin } from '../contexts/AdminContext';
import { DashboardPage } from './layout/DashboardPage';
import { DashboardTable, type DashboardTableColumn } from './layout/DashboardTable';

type DriverPenalty = {
  id: string;
  driverSessionResultId: string;
  seconds: number;
  reason: string | null;
  createdAt: string;
  createdBy: string | null;
  isPending?: boolean;
  isRemovalPending?: boolean;
};

type PendingPenaltyAdd = {
  id: string;
  driverSessionResultId: string;
  seconds: number;
  reason: string;
};

type PendingPenaltyRemoval = {
  penaltyId: string;
  driverSessionResultId: string;
};

type RaceDriverRow = F123DriverResult & {
  driver_session_result_id?: string | null;
  user_id?: string | null;
  mappedUserId?: string | null;
  mappedUserName?: string | null;
  jsonDriverName?: string | null;
  mappingDriverName?: string | null;
  json_driver_id?: string | null;
  jsonDriverId?: string | null;
  isHumanDriver?: boolean;
  participantIsAi?: boolean | null;
  sessionResultId?: string | null;
  canonicalDriverId?: string | null;
};

type DriverMemberOption = {
  id: string;
  name: string;
  number?: number | null;
  team?: string | null;
};

interface RaceDetailProps {
  raceId: string;
  onDriverSelect: (driverId: string, raceId: string, initialSessionType?: 'race' | 'qualifying' | 'practice') => void;
}

export const RaceDetail: React.FC<RaceDetailProps> = ({ raceId, onDriverSelect }) => {
  const { isAuthenticated } = useAdmin();
  const [searchParams, setSearchParams] = useSearchParams();
  const sessionFromUrl = searchParams.get('session') as 'practice' | 'qualifying' | 'race' | null;
  const [activeSession, setActiveSession] = useState<'practice' | 'qualifying' | 'race'>(
    sessionFromUrl && ['practice', 'qualifying', 'race'].includes(sessionFromUrl) ? sessionFromUrl : 'race'
  );
  const [raceData, setRaceData] = useState<any>(null);
  const [drivers, setDrivers] = useState<RaceDriverRow[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [penaltyModalOpen, setPenaltyModalOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<RaceDriverRow | null>(null);
  const [penaltySeconds, setPenaltySeconds] = useState<string>('5');
  const [penaltyReason, setPenaltyReason] = useState<string>('');
  const [penaltiesByDriver, setPenaltiesByDriver] = useState<Record<string, DriverPenalty[]>>({});
  const [pendingPenaltyAdds, setPendingPenaltyAdds] = useState<PendingPenaltyAdd[]>([]);
  const [pendingPenaltyRemovals, setPendingPenaltyRemovals] = useState<PendingPenaltyRemoval[]>([]);
  const [driverOptions, setDriverOptions] = useState<DriverMemberOption[]>([]);
  const driverOptionsLoadedRef = useRef(false);
  const [driverOptionsLoading, setDriverOptionsLoading] = useState(false);
  const [mappingBusy, setMappingBusy] = useState<Record<string, boolean>>({});
  const [mappingErrors, setMappingErrors] = useState<Record<string, string | null>>({});
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const normalizePenalties = useCallback((penalties: any, driverSessionResultId: string): DriverPenalty[] => {
    let list = penalties;

    if (typeof list === 'string') {
      try {
        list = JSON.parse(list);
      } catch {
        list = [];
      }
    }

    if (!Array.isArray(list)) {
      list = [];
    }

    return list
      .map((penalty: any) => ({
        id: penalty.id,
        driverSessionResultId,
        seconds: Number(penalty.seconds) || 0,
        reason: penalty.reason ?? null,
        createdAt: penalty.created_at || penalty.createdAt || new Date().toISOString(),
        createdBy: penalty.created_by ?? penalty.createdBy ?? null
      }))
      .sort((a: DriverPenalty, b: DriverPenalty) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, []);

  useEffect(() => {
    fetchRaceData();
  }, [raceId]);

  const fetchDriverOptions = useCallback(async () => {
    if (driverOptionsLoadedRef.current || driverOptionsLoading) {
      return;
    }

    setDriverOptionsLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/drivers`);
      if (!response.ok) {
        throw new Error(`Failed to fetch drivers: ${response.status}`);
      }

      const data = await response.json();
      const driverList = Array.isArray(data.drivers) ? data.drivers : [];
      const options: DriverMemberOption[] = driverList.map((driver: any) => ({
        id: String(driver.id),
        name: driver.name ?? 'Unknown Driver',
        number: driver.number ?? null,
        team: driver.team ?? null,
      }));
      setDriverOptions(options);
      driverOptionsLoadedRef.current = true;
    } catch (error) {
      console.error('Error fetching driver options:', error);
    } finally {
      setDriverOptionsLoading(false);
    }
  }, [apiUrl, driverOptionsLoading]);

  useEffect(() => {
    if (!isAuthenticated || !isEditing) {
      return;
    }
    if (driverOptionsLoadedRef.current) {
      return;
    }
    fetchDriverOptions();
  }, [isAuthenticated, isEditing, fetchDriverOptions]);

  // Memoize session type checks (computed once, reused everywhere)
  const sessionTypes = useMemo(() => ({
    hasRace: sessions.some(s => s.sessionType === 10),
    hasQualifying: sessions.some(s => s.sessionType >= 5 && s.sessionType <= 9),
    hasPractice: sessions.some(s => s.sessionType >= 1 && s.sessionType <= 4)
  }), [sessions]);

  // Handle session change - update both state and URL
  const handleSessionChange = useCallback((session: 'practice' | 'qualifying' | 'race') => {
    setActiveSession(session);
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('session', session);
      return newParams;
    });
  }, [setSearchParams]);

  // Restore session from URL on mount
  useEffect(() => {
    if (sessionFromUrl && ['practice', 'qualifying', 'race'].includes(sessionFromUrl)) {
      setActiveSession(sessionFromUrl);
    }
  }, [sessionFromUrl]);

  // Set default active session to first available session when sessions load
  useEffect(() => {
    if (sessions.length === 0) return;
    
    // Use memoized session types
    const { hasRace, hasQualifying, hasPractice } = sessionTypes;
    
    // If current active session doesn't exist, switch to first available
    if (activeSession === 'race' && !hasRace) {
      if (hasQualifying) {
        handleSessionChange('qualifying');
      } else if (hasPractice) {
        handleSessionChange('practice');
      }
    } else if (activeSession === 'qualifying' && !hasQualifying) {
      if (hasRace) {
        handleSessionChange('race');
      } else if (hasPractice) {
        handleSessionChange('practice');
      }
    } else if (activeSession === 'practice' && !hasPractice) {
      if (hasRace) {
        handleSessionChange('race');
      } else if (hasQualifying) {
        handleSessionChange('qualifying');
      }
    }
  }, [sessions, activeSession, sessionTypes, handleSessionChange]);

  // Memoize updateDriversFromSessions to prevent unnecessary re-renders
  const updateDriversFromSessions = useCallback(() => {
    if (!sessions || sessions.length === 0) {
      setDrivers([]);
      return;
    }

    // Find the appropriate session based on activeSession
    // Session types: 1=P1, 2=P2, 3=P3, 4=Short Practice, 5=Q1, 6=Q2, 7=Q3, 8=Short Qualifying, 9=OSQ, 10=Race
    const targetSessionType = activeSession === 'practice' ? [1, 2, 3, 4] : 
                              activeSession === 'qualifying' ? [5, 6, 7, 8, 9] : 
                              [10];
    
    // Find the most recent session if multiple exist (prefer later sessions)
    const matchingSessions = sessions.filter(s => targetSessionType.includes(s.sessionType));
    const session = matchingSessions.length > 0 
      ? matchingSessions.sort((a, b) => (b.sessionType || 0) - (a.sessionType || 0))[0] // Prefer later sessions (Q3 > Q2 > Q1, P3 > P2 > P1)
      : null;
    
    if (!session || !session.results) {
      setDrivers([]);
      return;
    }

    // Transform the backend data to match F123DriverResult interface
    // Note: DB already returns sorted by position, no need to sort again
    const transformedDrivers: RaceDriverRow[] = session.results.map((result: any, index: number) => {
      // Parse additional_data ONCE and reuse
      let additionalData = null;
      if (result.additional_data) {
        additionalData = typeof result.additional_data === 'string' 
          ? JSON.parse(result.additional_data) 
          : result.additional_data;
      } else if (result.additionalData) {
        additionalData = typeof result.additionalData === 'string' 
          ? JSON.parse(result.additionalData) 
          : result.additionalData;
      }
      
      // Extract tire visual compound from parsed additional_data
      let visualTireCompound = null;
      let raceTiresUsed = null;
      
      if (additionalData) {
        // Get visual tire compound from car-status or tyreVisualCompound
        if (additionalData.carStatus?.visualTyreCompound || additionalData.carStatus?.['visual-tyre-compound']) {
          visualTireCompound = additionalData.carStatus.visualTyreCompound || additionalData.carStatus['visual-tyre-compound'];
        } else if (additionalData.tyreVisualCompound || additionalData['tyre-visual-compound']) {
          visualTireCompound = additionalData.tyreVisualCompound || additionalData['tyre-visual-compound'];
        }
        
        // Get race tires from final-classification tyre-stints-visual
        if (additionalData.finalClassification) {
          const fc = additionalData.finalClassification;
          if (fc.tyreStintsVisual && Array.isArray(fc.tyreStintsVisual) && fc.tyreStintsVisual.length > 0) {
            raceTiresUsed = fc.tyreStintsVisual;
          } else if (fc['tyre-stints-visual'] && Array.isArray(fc['tyre-stints-visual']) && fc['tyre-stints-visual'].length > 0) {
            raceTiresUsed = fc['tyre-stints-visual'];
          }
        }
        
        // Also check if it's stored directly in additionalData
        if (!raceTiresUsed && (additionalData.tyreStintsVisual || additionalData['tyre-stints-visual'])) {
          const stints = additionalData.tyreStintsVisual || additionalData['tyre-stints-visual'];
          if (Array.isArray(stints) && stints.length > 0) {
            raceTiresUsed = stints;
          }
        }
      }
      
      const participantData =
        additionalData?.participantData ||
        additionalData?.participant_data ||
        additionalData?.ParticipantData ||
        null;

      const aiIndicators = [
        participantData?.['ai-controlled'],
        participantData?.aiControlled,
        participantData?.ai_controlled,
        participantData?.isAiControlled,
        participantData?.isAI,
        result.ai_controlled,
        result.aiControlled,
        result.is_ai_controlled,
      ];

      let aiControlled: boolean | null = null;
      for (const indicator of aiIndicators) {
        if (indicator === undefined || indicator === null) {
          continue;
        }
        if (typeof indicator === 'boolean') {
          aiControlled = indicator;
          break;
        }
        if (typeof indicator === 'number') {
          aiControlled = indicator === 1;
          break;
        }
        if (typeof indicator === 'string') {
          const normalized = indicator.trim().toLowerCase();
          if (['true', '1', 'yes', 'y', 'ai'].includes(normalized)) {
            aiControlled = true;
            break;
          }
          if (['false', '0', 'no', 'n', 'human'].includes(normalized)) {
            aiControlled = false;
            break;
          }
        }
      }

      const rawDriverSessionResultId =
        result?.driver_session_result_id ??
        result?.driverSessionResultId ??
        result?.id ??
        null;
      const normalizedDriverSessionResultId =
        rawDriverSessionResultId !== undefined && rawDriverSessionResultId !== null
          ? String(rawDriverSessionResultId)
          : null;

      const rawSessionResultId =
        result?.session_result_id ??
        result?.sessionResultId ??
        null;
      const normalizedSessionResultId =
        rawSessionResultId !== undefined && rawSessionResultId !== null
          ? String(rawSessionResultId)
          : null;

      const mappedUserId = result.user_id ? String(result.user_id) : null;
      const mappedUserName = result.driver_name || null;
      const jsonDriverName = result.json_driver_name || null;
      const fallbackMappingName = result.mapping_driver_name || null;
      const jsonDriverId = result.json_driver_id ? String(result.json_driver_id) : null;
      const rawDriverId = result.driver_id ?? result.driverId ?? null;
      const normalizedDriverId = rawDriverId !== undefined && rawDriverId !== null ? String(rawDriverId) : null;
      const canonicalDriverId =
        mappedUserId ??
        jsonDriverId ??
        normalizedDriverId ??
        (result.member_id ? String(result.member_id) : null) ??
        (result.player_id ? String(result.player_id) : null) ??
        (result.driver_number != null ? `car-${result.driver_number}` : null);
      // Prioritize driver_session_result_id first (unique per result)
      const normalizedResultId =
        normalizedDriverSessionResultId ??
        (result?.id !== undefined && result?.id !== null ? String(result.id) : null) ??
        normalizedSessionResultId;
      const preferredDisplayName =
        mappedUserName || jsonDriverName || fallbackMappingName || 'Unknown Driver';
      const isHumanDriver = aiControlled === null ? Boolean(mappedUserId) : !aiControlled;
      
      const driver: any = {
        // driver.id MUST be driver_session_result_id (unique per result)
        id:
          normalizedDriverSessionResultId ??
          normalizedResultId ??
          `driver-${normalizedDriverSessionResultId ?? index}`,
        driver_session_result_id: normalizedDriverSessionResultId,
        user_id: result.user_id, // Tournament participant/user (NULL until mapped)
        json_driver_id: result.json_driver_id ? String(result.json_driver_id) : null, // In-game driver ID from column
        mappedUserId,
        mappedUserName,
        jsonDriverName,
        mappingDriverName: fallbackMappingName,
        isHumanDriver,
        participantIsAi: aiControlled,
        sessionResultId: normalizedResultId ?? normalizedSessionResultId ?? null,
        canonicalDriverId: canonicalDriverId ?? null,
        name: preferredDisplayName,
        team: result.json_team_name || result.mapping_team_name || result.driver_team || 'Unknown Team',
        number: result.json_car_number || result.driver_number || result.mapping_driver_number || result.position || 0,
        
        // Preserve additional_data (already parsed above)
        additional_data: additionalData,
        additionalData: additionalData, // camelCase alias
        
        // Race data - store raw time for gap calculation
        // Convert to numbers and handle null/undefined
        racePosition: result.position != null ? Number(result.position) : null,
        _totalRaceTimeMs: result.total_race_time_ms != null ? Number(result.total_race_time_ms) : null, // Store raw value for gap calculation
        raceLapTime: result.best_lap_time_ms != null ? Number(result.best_lap_time_ms) : null,
        raceBestLapTime: result.best_lap_time_ms != null ? Number(result.best_lap_time_ms) : null,
        raceSector1Time: result.sector1_time_ms != null ? Number(result.sector1_time_ms) : null,
        raceSector2Time: result.sector2_time_ms != null ? Number(result.sector2_time_ms) : null,
        raceSector3Time: result.sector3_time_ms != null ? Number(result.sector3_time_ms) : null,
        
        // Qualifying data (if available from other sessions)
        qualifyingPosition: result.position != null ? Number(result.position) : null,
        qualifyingTime: result.best_lap_time_ms != null ? Number(result.best_lap_time_ms) : null,
        qualifyingBestLapTime: result.best_lap_time_ms != null ? Number(result.best_lap_time_ms) : null,
        qualifyingSector1Time: result.sector1_time_ms != null ? Number(result.sector1_time_ms) : null,
        qualifyingSector2Time: result.sector2_time_ms != null ? Number(result.sector2_time_ms) : null,
        qualifyingSector3Time: result.sector3_time_ms != null ? Number(result.sector3_time_ms) : null,
        qualifyingTire: visualTireCompound || result.qualifying_tire || result.best_lap_tire || result.tire_compound || null,
        
        // Race tire data (all tires used throughout race) - use visual compounds
        raceTiresUsed: raceTiresUsed || result.race_tires_used || result.tires_used || null,
        
        // Points and achievements
        points: result.points != null ? Number(result.points) : 0,
        fastestLap: result.fastest_lap === true || result.fastest_lap === 'true' || result.fastest_lap === 1,
        fastestLapTime: result.best_lap_time_ms != null ? Number(result.best_lap_time_ms) : null,
        
        // Status - F1 23 result_status: 0=INVALID, 1=INACTIVE, 2=FINISHED, 3=?, 4=DNF, 5=DSQ, 6=NCL, 7=RET
        // Based on mapResultStatus: FINISHED=2, DNF=4, DSQ=5, NCL=6, RET=7
        status: result.result_status === 2 || result.result_status === '2' ? 'finished' : 
                result.result_status === 4 || result.result_status === '4' ? 'dnf' : 
                result.result_status === 5 || result.result_status === '5' ? 'dsq' : 
                result.result_status === 7 || result.result_status === '7' ? 'dnf' : // RET = retired (DNF)
                result.result_status === 6 || result.result_status === '6' ? 'dnq' : // NCL = not classified
                'finished', // Default to finished if status is unknown
        gridPosition: result.grid_position != null ? Number(result.grid_position) : null,
        
        // Penalties
        penalties: result.penalties != null ? Number(result.penalties) : 0, // In-race penalties
        postRacePenalties: result.post_race_penalties != null ? Number(result.post_race_penalties) : 0, // Post-race penalties
        totalPenalties: (result.penalties || 0) + (result.post_race_penalties || 0), // Total (in-race + post-race)
        penaltyReason: result.penalty_reason || result.all_penalty_reasons || null, // Most recent or all reasons
        warnings: result.warnings != null ? Number(result.warnings) : 0,
        dnf: result.result_status === 4 || result.result_status === 7 || result.dnf_reason ? true : false,
        dnfReason: result.dnf_reason,
        
        // Lap-by-lap data (if available)
        lap_times: result.lap_times || [], // Array of { lap_number, lap_time_ms, sector1_ms, sector2_ms, sector3_ms, tire_compound }
        
        // Data source
        dataSource: 'FILE_UPLOAD' as const
      };
      
      return driver;
    });

    // Calculate gaps for race (gap to leader)
    if (activeSession === 'race' && transformedDrivers.length > 0) {
      const leaderTimeMs = (transformedDrivers[0] as any)._totalRaceTimeMs || 0;
      
      transformedDrivers.forEach((driver, index) => {
        const driverTimeMs = (driver as any)._totalRaceTimeMs || 0;
        
        if (index === 0) {
          // Leader shows their total time
          driver.raceTime = driverTimeMs > 0 ? F123DataService.formatTimeFromMs(driverTimeMs) : '--:--.---';
          driver.raceGap = null; // Leader has no gap
          (driver as any)._raceTimeFormatted = true; // Mark as already formatted
        } else {
          // Others show gap to leader (not their total time)
          if (leaderTimeMs > 0 && driverTimeMs > 0) {
            const gapMs = driverTimeMs - leaderTimeMs;
            if (gapMs >= 0) {
              driver.raceTime = `+${F123DataService.formatGapTimeFromMs(gapMs)}`;
              driver.raceGap = gapMs;
          } else {
              driver.raceTime = '--:--.---';
              driver.raceGap = null;
            }
            (driver as any)._raceTimeFormatted = true; // Mark as already formatted
          } else {
            driver.raceTime = '--:--.---';
            driver.raceGap = null;
            (driver as any)._raceTimeFormatted = true; // Mark as already formatted
          }
        }
        
        // Calculate position gain (grid position vs race position)
        if (driver.gridPosition != null && driver.racePosition != null) {
          driver.positionGain = driver.gridPosition - driver.racePosition; // Positive = gained positions, negative = lost positions
        } else {
          driver.positionGain = null;
        }
      });
    }

    // Calculate gaps for qualifying and practice
    if ((activeSession === 'qualifying' || activeSession === 'practice') && transformedDrivers.length > 0) {
      const poleTime = transformedDrivers[0].qualifyingTime || 0;
      transformedDrivers.forEach(driver => {
        if (driver.qualifyingTime && driver.qualifyingTime > poleTime) {
          driver.qualifyingGap = driver.qualifyingTime - poleTime;
        }
      });
    }

    setDrivers(transformedDrivers);
  }, [activeSession, sessions]);

  useEffect(() => {
    // Update drivers when activeSession changes
    updateDriversFromSessions();
  }, [updateDriversFromSessions]);

  useEffect(() => {
    if (!sessions || sessions.length === 0) {
      setPenaltiesByDriver({});
      return;
    }

    const targetSessionType = activeSession === 'practice' ? [1, 2, 3, 4] :
      activeSession === 'qualifying' ? [5, 6, 7, 8, 9] :
      [10];

    const matchingSessions = sessions.filter((s: any) => targetSessionType.includes(s.sessionType));
    const session = matchingSessions.length > 0
      ? matchingSessions.sort((a: any, b: any) => (b.sessionType || 0) - (a.sessionType || 0))[0]
      : null;

    if (!session || !session.results) {
      setPenaltiesByDriver({});
      return;
    }

    const map: Record<string, DriverPenalty[]> = {};
    session.results.forEach((result: any) => {
      const driverSessionResultId = result.id || result.driver_session_result_id;
      if (!driverSessionResultId) {
        return;
      }

      const penalties = result.penalty_details ?? result.penaltyDetails ?? [];
      const normalizedPenalties = normalizePenalties(penalties, driverSessionResultId);

      if (normalizedPenalties.length > 0) {
        map[driverSessionResultId] = normalizedPenalties;
      }
    });

    setPenaltiesByDriver(map);
  }, [sessions, activeSession, normalizePenalties]);

  const fetchSessionPenalties = useCallback(async () => {
    if (!sessions || sessions.length === 0) return;

    const targetSessionType = activeSession === 'practice' ? [1, 2, 3, 4] :
      activeSession === 'qualifying' ? [5, 6, 7, 8, 9] :
      [10];

    const matchingSessions = sessions.filter((s: any) => targetSessionType.includes(s.sessionType));
    const session = matchingSessions.length > 0
      ? matchingSessions.sort((a: any, b: any) => (b.sessionType || 0) - (a.sessionType || 0))[0]
      : null;

    const sessionId = session?.id || session?.sessionId;
    if (!sessionId) return;

    try {
      const response = await fetch(`${apiUrl}/api/races/sessions/${sessionId}/penalties`);

      if (response.ok) {
        const data = await response.json();
        const penalties = Array.isArray(data.penalties) ? data.penalties : [];

        const grouped: Record<string, any[]> = {};
        penalties.forEach((penalty: any) => {
          const driverSessionResultId = penalty.driver_session_result_id;
          if (!driverSessionResultId) {
            return;
          }

          if (!grouped[driverSessionResultId]) {
            grouped[driverSessionResultId] = [];
          }

          grouped[driverSessionResultId].push(penalty);
        });

        const map: Record<string, DriverPenalty[]> = {};
        Object.entries(grouped).forEach(([driverSessionResultId, rawPenalties]) => {
          const normalized = normalizePenalties(rawPenalties, driverSessionResultId);
          if (normalized.length > 0) {
            map[driverSessionResultId] = normalized;
          }
        });

        setPenaltiesByDriver(map);
      }
    } catch (error) {
      console.error('Error fetching session penalties:', error);
    }
  }, [sessions, activeSession, normalizePenalties]);

  const fetchDriverPenalties = useCallback(async (driverSessionResultId: string) => {
    if (!driverSessionResultId) return;

    try {
      const response = await fetch(`${apiUrl}/api/races/driver-results/${driverSessionResultId}/penalties`);

      if (!response.ok) {
        console.error('Failed to fetch driver penalties:', response.status, response.statusText);
        return;
      }

      const data = await response.json();
      const penalties = Array.isArray(data.penalties) ? data.penalties : [];
      const normalized = normalizePenalties(penalties, driverSessionResultId);

      setPenaltiesByDriver(prev => {
        const updated = { ...prev };
        if (normalized.length === 0) {
          delete updated[driverSessionResultId];
        } else {
          updated[driverSessionResultId] = normalized;
        }
        return updated;
      });
    } catch (error) {
      console.error('Error fetching driver penalties:', error);
    }
  }, [normalizePenalties]);

  // Fetch penalty history when entering edit mode
  useEffect(() => {
    if (isEditing && sessions.length > 0) {
      fetchSessionPenalties();
      setPendingPenaltyAdds([]);
      setPendingPenaltyRemovals([]);
    }
  }, [isEditing, activeSession, sessions, fetchSessionPenalties]);

  // Note: Removed redundant penalty history fetch when modal opens - already fetched when entering edit mode

  const fetchRaceData = async () => {
    try {
      setLoading(true);
      // Fetch race data
      const raceResponse = await fetch(`${apiUrl}/api/races/${raceId}`);
      if (raceResponse.ok) {
        const raceDataResult = await raceResponse.json();
        setRaceData(raceDataResult.race);
      }
      
      // Fetch race results
      const resultsResponse = await fetch(`${apiUrl}/api/races/${raceId}/results`);
      if (resultsResponse.ok) {
        const resultsData = await resultsResponse.json();
        setSessions(resultsData.sessions || []);
      }
      
    } catch (error) {
      console.error('Error fetching race data:', error);
      setError('Failed to load race data');
    } finally {
      setLoading(false);
    }
  };

  const getTeamColor = (team: string) => F123DataService.getTeamColor(team);
  const getTeamColorHex = (team: string) => F123DataService.getTeamColorHex(team);

  /**
   * Determine if a color is light or dark, returns appropriate text color (black or white)
   */
  const getContrastTextColor = (hexColor: string): string => {
    // Remove # if present
    const hex = hexColor.replace('#', '');
    
    // Convert to RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // Calculate relative luminance (using WCAG formula)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return black for light colors, white for dark colors
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  };

  const getPositionBadgeClass = (position?: number | null) => {
    if (position === 1) {
      return 'inline-flex items-center rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-500 2xl:text-sm';
    }
    if (position === 2) {
      return 'inline-flex items-center rounded-full bg-slate-400/15 px-3 py-1 text-xs font-semibold text-slate-400 2xl:text-sm';
    }
    if (position === 3) {
      return 'inline-flex items-center rounded-full bg-orange-400/15 px-3 py-1 text-xs font-semibold text-orange-400 2xl:text-sm';
    }
    return 'inline-flex items-center rounded-full bg-slate-900/10 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-700/40 dark:text-slate-300 2xl:text-sm';
  };

  // Get driver_session_result_id - this is the primary identifier for all operations
  const getDriverSessionResultId = (driver: RaceDriverRow): string | null => {
    const rawId =
      (driver as any).driver_session_result_id ??
      (driver as any).driverSessionResultId ??
      (driver as any).id ??
      driver.id ??
      driver.sessionResultId ??
      null;

    if (rawId === null || rawId === undefined) {
      return null;
    }

    const normalized = String(rawId).trim();
    return normalized.length > 0 ? normalized : null;
  };

  const getCanonicalDriverIdentifier = (driver: RaceDriverRow): string | null => {
    const raw =
      driver.canonicalDriverId ??
      driver.mappedUserId ??
      driver.json_driver_id ??
      (driver as any)?.jsonDriverId ??
      (driver as any)?.driver_id ??
      (driver as any)?.driverId ??
      (driver.user_id != null ? String(driver.user_id) : null) ??
      (driver.number != null ? `car-${driver.number}` : null);

    if (raw === null || raw === undefined) {
      return null;
    }

    const normalized = String(raw).trim();
    return normalized.length > 0 ? normalized : null;
  };

  const sessionResultIdCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    drivers.forEach((driver) => {
      const sessionResultId = getDriverSessionResultId(driver);
      if (!sessionResultId) {
        return;
      }

      counts[sessionResultId] = (counts[sessionResultId] ?? 0) + 1;
    });

    return counts;
  }, [drivers]);

  const duplicateSessionResultIds = useMemo(() => {
    const duplicates = new Set<string>();

    Object.entries(sessionResultIdCounts).forEach(([id, count]) => {
      if (count > 1) {
        duplicates.add(id);
      }
    });

    return duplicates;
  }, [sessionResultIdCounts]);

  const handleDriverClick = useCallback(
    (driver: RaceDriverRow) => {
      const sessionResultId = getDriverSessionResultId(driver);

      // Only use driver_session_result_id - it's unique per driver result
      if (!sessionResultId) {
        console.warn('Cannot navigate: missing driver_session_result_id for driver:', driver.name);
        return;
      }

      onDriverSelect(sessionResultId, raceId, activeSession);
    },
    [activeSession, onDriverSelect, raceId],
  );

  const buildDriverRowKey = useCallback(
    (row: RaceDriverRow, index: number) => {
      // Prioritize driver_session_result_id first (most unique)
      const sessionResultId = getDriverSessionResultId(row);
      if (sessionResultId) {
        // Even if there are duplicates, include index as a fallback
        if (duplicateSessionResultIds.has(sessionResultId)) {
          const canonicalId = getCanonicalDriverIdentifier(row);
          const fallbackName =
            row.name && typeof row.name === 'string'
              ? row.name.replace(/\s+/g, '-').toLowerCase()
              : `driver-${index}`;
          return `${sessionResultId}-${canonicalId ?? fallbackName}-${index}-${activeSession}`;
        }
        return `${sessionResultId}-${activeSession}`;
      }

      // Fallback to other identifiers
      const uniqueRowId = row.id != null ? String(row.id) : null;
      const canonicalId = getCanonicalDriverIdentifier(row);
      const fallbackName =
        row.name && typeof row.name === 'string'
          ? row.name.replace(/\s+/g, '-').toLowerCase()
          : `driver-${index}`;

      if (uniqueRowId) {
        return `${uniqueRowId}-${activeSession}`;
      }

      if (canonicalId) {
        return `${canonicalId}-${activeSession}`;
      }

      return `${fallbackName}-${index}-${activeSession}`;
    },
    [activeSession, duplicateSessionResultIds],
  );

  const handleDriverMappingChange = useCallback(
    async (driver: RaceDriverRow, nextUserId: string | null) => {
      const driverSessionResultId = getDriverSessionResultId(driver);
      if (!driverSessionResultId) {
        return;
      }

      const normalizedNextUserId = nextUserId ? String(nextUserId) : null;
      const currentMappedId =
        driver.mappedUserId ??
        driver.user_id ??
        (driver as any)?.mappedUserId ??
        (driver as any)?.user_id ??
        null;

      if ((currentMappedId ?? '') === (normalizedNextUserId ?? '')) {
        return;
      }

      if (mappingBusy[driverSessionResultId]) {
        return;
      }

      setMappingBusy((prev) => ({ ...prev, [driverSessionResultId]: true }));
      setMappingErrors((prev) => ({ ...prev, [driverSessionResultId]: null }));

      try {
        const response = await fetch(
          `${apiUrl}/api/races/driver-results/${driverSessionResultId}/mapping`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: normalizedNextUserId,
              editedBy: 'admin',
              reason: normalizedNextUserId
                ? `Mapped to ${
                    driverOptions.find((option) => option.id === normalizedNextUserId)?.name ??
                    'league driver'
                  }`
                : 'Cleared driver mapping',
            }),
          },
        );

        const data = await response.json();
        if (response.status === 409) {
          throw new Error(
            data.error ||
              'That league driver is already mapped to another result. Unassign them first.',
          );
        }
        if (!response.ok || !data.success) {
          throw new Error(data.error || data.details || 'Failed to update driver mapping');
        }

        const selectedOption = normalizedNextUserId
          ? driverOptions.find((option) => option.id === normalizedNextUserId) ?? null
          : null;
        const nextDisplayName =
          selectedOption?.name ??
          driver.mappedUserName ??
          driver.jsonDriverName ??
          driver.mappingDriverName ??
          driver.name;

        setDrivers((prev) =>
          prev.map((row) => {
            if (getDriverSessionResultId(row) !== driverSessionResultId) {
              return row;
            }

            const updated: RaceDriverRow = {
              ...row,
              user_id: normalizedNextUserId,
              mappedUserId: normalizedNextUserId,
              mappedUserName: selectedOption?.name ?? null,
              canonicalDriverId:
                normalizedNextUserId ??
                row.json_driver_id ??
                (row as any)?.jsonDriverId ??
                row.canonicalDriverId ??
                null,  // Don't fall back to row.id - keep it null if no better option
              name: nextDisplayName,
              // Preserve driver_session_result_id
              driver_session_result_id: row.driver_session_result_id ?? getDriverSessionResultId(row),
            };
            return updated;
          }),
        );

        setSessions((prevSessions) =>
          prevSessions.map((session: any) => {
            if (!Array.isArray(session?.results)) {
              return session;
            }

            const updatedResults = session.results.map((result: any) => {
              const resultId = result?.id || result?.driver_session_result_id;
              if (resultId !== driverSessionResultId) {
                return result;
              }

              return {
                ...result,
                user_id: normalizedNextUserId,
                driver_name: selectedOption?.name ?? null,
              };
            });

            return {
              ...session,
              results: updatedResults,
            };
          }),
        );

        setMappingErrors((prev) => {
          const next = { ...prev };
          delete next[driverSessionResultId];
          return next;
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to update driver mapping';
        setMappingErrors((prev) => ({ ...prev, [driverSessionResultId]: message }));
      } finally {
        setMappingBusy((prev) => {
          const next = { ...prev };
          delete next[driverSessionResultId];
          return next;
        });
      }
    },
    [apiUrl, driverOptions, mappingBusy, setDrivers, setSessions],
  );

  // Memoize penalty map for O(1) lookups instead of O(n) array iterations
  const penaltyMap = useMemo(() => {
    const map = new Map<string, DriverPenalty[]>();

    Object.entries(penaltiesByDriver).forEach(([driverId, penalties]) => {
      const cloned = penalties.map(penalty => ({
        ...penalty,
        isRemovalPending: pendingPenaltyRemovals.some(removal => removal.penaltyId === penalty.id)
      }));
      map.set(driverId, cloned);
    });

    pendingPenaltyAdds.forEach(pending => {
      const existing = map.get(pending.driverSessionResultId) ?? [];
      const pendingPenalty: DriverPenalty = {
        id: pending.id,
        driverSessionResultId: pending.driverSessionResultId,
        seconds: pending.seconds,
        reason: pending.reason,
        createdAt: new Date().toISOString(),
        createdBy: 'pending',
        isPending: true
      };
      map.set(pending.driverSessionResultId, [...existing, pendingPenalty]);
    });

    return map;
  }, [penaltiesByDriver, pendingPenaltyAdds, pendingPenaltyRemovals]);

  const usedMappedUserIds = useMemo(() => {
    const ids = new Set<string>();
    drivers.forEach((driver) => {
      const mappedId =
        driver.mappedUserId ??
        driver.user_id ??
        (driver as any)?.mappedUserId ??
        (driver as any)?.user_id ??
        null;
      if (mappedId) {
        ids.add(String(mappedId));
      }
    });
    return ids;
  }, [drivers]);

  const renderDriverCell = useCallback(
    (_: unknown, driver: RaceDriverRow) => {
      const driverSessionResultId = getDriverSessionResultId(driver);
      const mappedUserId =
        driver.mappedUserId ??
        driver.user_id ??
        (driver as any)?.mappedUserId ??
        (driver as any)?.user_id ??
        null;
      const currentMappedIdValue = mappedUserId ?? '';
      const isSaving =
        driverSessionResultId != null && Boolean(mappingBusy[driverSessionResultId]);
      const errorMessage =
        driverSessionResultId != null ? mappingErrors[driverSessionResultId] : null;

      const combinedOptions =
        mappedUserId &&
        !driverOptions.some((option) => option.id === String(mappedUserId))
          ? [
              ...driverOptions,
              {
                id: String(mappedUserId),
                name:
                  driver.mappedUserName ??
                  driver.jsonDriverName ??
                  (driver as any)?.json_driver_name ??
                  'Mapped Driver',
                number: null,
                team: null,
              },
            ]
          : driverOptions;

      return (
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {driver.name}
              </span>
              {isAuthenticated && isEditing && driverSessionResultId && (
                <select
                  className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 transition hover:border-slate-400 focus:border-red-600 focus:outline-none focus:ring-0 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:focus:border-red-400"
                  value={currentMappedIdValue}
                  disabled={isSaving || driverOptionsLoading}
                  onChange={(event) => {
                    handleDriverMappingChange(driver, event.target.value || null);
                  }}
                >
                  <option value="">Unassigned</option>
                  {combinedOptions.map((option) => {
                    const optionDisabled =
                      option.id !== currentMappedIdValue && usedMappedUserIds.has(option.id);
                    const labelParts = [
                      option.name,
                      option.number != null ? `#${option.number}` : null,
                      option.team ?? null,
                    ].filter(Boolean);
                    return (
                      <option key={option.id} value={option.id} disabled={optionDisabled}>
                        {labelParts.join(' • ')}
                      </option>
                    );
                  })}
                </select>
              )}
              {isSaving && (
                <span className="text-[10px] text-slate-400 dark:text-slate-500">Saving…</span>
              )}
            </div>

            {activeSession === 'race' && driver.positionGain != null && (
              <div className="flex items-center space-x-1">
                {driver.positionGain > 0 ? (
                  <>
                    <ArrowUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm text-green-600 dark:text-green-400">
                      {driver.positionGain}
                    </span>
                  </>
                ) : driver.positionGain < 0 ? (
                  <>
                    <ArrowDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <span className="text-sm text-red-600 dark:text-red-400">
                      {Math.abs(driver.positionGain)}
                    </span>
                  </>
                ) : (
                  <>
                    <Minus className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">0</span>
                  </>
                )}
              </div>
            )}
          </div>
          {errorMessage && isAuthenticated && isEditing && (
            <div className="mt-1 text-xs text-red-500 dark:text-red-400">{errorMessage}</div>
          )}
        </div>
      );
    },
    [
      activeSession,
      driverOptions,
      driverOptionsLoading,
      handleDriverMappingChange,
      isAuthenticated,
      isEditing,
      mappingBusy,
      mappingErrors,
      usedMappedUserIds,
    ],
  );

  useEffect(() => {
    if (!isEditing) {
      setMappingErrors({});
      setMappingBusy({});
    }
  }, [isEditing]);


  // Memoize fastest sectors calculation (use reduce to avoid stack overflow with large arrays)
  // MUST be before any early returns to follow Rules of Hooks
  const fastestSectors = useMemo(() => ({
    s1: drivers.reduce((min, d) => {
      const time = d.qualifyingSector1Time;
      return time && time < min ? time : min;
    }, Infinity),
    s2: drivers.reduce((min, d) => {
      const time = d.qualifyingSector2Time;
      return time && time < min ? time : min;
    }, Infinity),
    s3: drivers.reduce((min, d) => {
      const time = d.qualifyingSector3Time;
      return time && time < min ? time : min;
    }, Infinity)
  }), [drivers]);
  
  const fastestS1 = fastestSectors.s1;
  const fastestS2 = fastestSectors.s2;
  const fastestS3 = fastestSectors.s3;

  // Helper function to check if a driver has existing penalties
  // Uses driver_session_result_id (UUID) for direct matching
  const driverHasExistingPenalties = useCallback((driver: RaceDriverRow): boolean => {
    const driverSessionResultId = getDriverSessionResultId(driver);
    
    // Silently return false if we can't identify the driver
    if (!driverSessionResultId) return false;
    
    // First check: Does the driver have post-race penalties in their data?
    const postRacePenalties = (driver as any).postRacePenalties || 0;
    if (postRacePenalties > 0) {
      return true;
    }
    
    // Second check: Use Map for O(1) lookup
    const penalties = penaltyMap.get(driverSessionResultId) || [];
    if (penalties.some(p => !p.isRemovalPending)) {
      return true;
    }
    
    // Third check: Pending additions
    const matchingPendingAdd = pendingPenaltyAdds.some(p => p.driverSessionResultId === driverSessionResultId);
    
    return matchingPendingAdd;
  }, [penaltyMap, pendingPenaltyAdds]);

  const formatRaceTotalTime = (driver: RaceDriverRow) => {
    if ((driver as any)._raceTimeFormatted && driver.raceTime) {
      return (driver as any).raceTime;
    }

    const totalTimeMs = (driver as any)._totalRaceTimeMs;
    if (totalTimeMs && totalTimeMs > 0) {
      return F123DataService.formatTimeFromMs(totalTimeMs);
    }

    return '--:--.---';
  };

  const renderPenaltyCell = (driver: RaceDriverRow) => {
    if (isEditing) {
      const hasExistingPenalties = driverHasExistingPenalties(driver);
      const buttonColor = hasExistingPenalties
        ? 'text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 hover:text-red-700 dark:hover:text-red-300 border-red-300 dark:border-red-700 hover:border-red-500 dark:hover:border-red-500'
        : 'text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:text-blue-700 dark:hover:text-blue-300 border-blue-300 dark:border-blue-700 hover:border-blue-500 dark:hover:border-blue-500';

      return (
        <div className="flex items-center justify-center">
          <button
            onClick={async (e) => {
              e.stopPropagation();
              console.log('🔍 CLICKED ADD BUTTON - Driver object:', {
                driver,
                driver_keys: Object.keys(driver as any),
                has_additional_data: !!(driver as any).additional_data,
                has_additionalData: !!(driver as any).additionalData,
                additional_data_sample: (driver as any).additional_data ? JSON.stringify((driver as any).additional_data).substring(0, 200) : 'MISSING',
                additionalData_sample: (driver as any).additionalData ? JSON.stringify((driver as any).additionalData).substring(0, 200) : 'MISSING'
              });
              setSelectedDriver(driver);
              setPenaltySeconds('5');
              setPenaltyReason('');
              setPendingPenaltyAdds([]);
              setPendingPenaltyRemovals([]);
              setPenaltyModalOpen(true);
              const driverSessionResultId = getDriverSessionResultId(driver);
              if (driverSessionResultId) {
                await fetchDriverPenalties(driverSessionResultId);
              } else {
                await fetchSessionPenalties();
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-200 ${buttonColor}`}
          >
            Add
          </button>
        </div>
      );
    }

    const totalPenalties = (driver as any).totalPenalties;
    if (totalPenalties != null && totalPenalties > 0) {
      const penaltyReason = (driver as any).penaltyReason;
      return (
        <div
          className="relative inline-block group"
          onMouseEnter={(e) => {
            const tooltip = e.currentTarget.querySelector('.penalty-tooltip') as HTMLElement;
            if (tooltip) {
              tooltip.style.opacity = '1';
              tooltip.style.visibility = 'visible';
            }
          }}
          onMouseLeave={(e) => {
            const tooltip = e.currentTarget.querySelector('.penalty-tooltip') as HTMLElement;
            if (tooltip) {
              tooltip.style.opacity = '0';
              tooltip.style.visibility = 'hidden';
            }
          }}
        >
          <span className="text-base font-normal text-red-600 dark:text-red-400 cursor-help underline decoration-dotted">
            {totalPenalties}s
          </span>
          {penaltyReason && (
            <div className="penalty-tooltip absolute bottom-full left-1/2 z-50 -translate-x-1/2 transform whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-all duration-200 dark:bg-gray-700">
              {penaltyReason}
              <div className="absolute top-full left-1/2 -mt-1 -translate-x-1/2 transform border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
            </div>
          )}
        </div>
      );
    }

    return <span className="text-base text-gray-500 dark:text-gray-400">-</span>;
  };

  const renderRaceTiresCell = (driver: RaceDriverRow) => {
    const tiresUsed = (driver as any).raceTiresUsed;
    if (!tiresUsed || (Array.isArray(tiresUsed) && tiresUsed.length === 0)) {
      return <span className="text-lg text-gray-500 dark:text-gray-400">-</span>;
    }

    if (Array.isArray(tiresUsed)) {
      const tireStrings = tiresUsed.map((t: any) => {
        if (typeof t === 'number') {
          return getTireCompound(t);
        }
        const tireStr = String(t).toLowerCase();
        if (tireStr.includes('soft')) return 'S';
        if (tireStr.includes('medium')) return 'M';
        if (tireStr.includes('hard')) return 'H';
        if (tireStr.includes('intermediate')) return 'I';
        if (tireStr.includes('wet')) return 'W';
        return String(t);
      });

      return (
        <div className="flex items-center justify-center gap-1">
          {tireStrings.map((tireStr, idx) => {
            const icon = F123DataService.getTireCompoundIcon(tireStr);
            const fullName = F123DataService.getTireCompoundFullName(tireStr);
            const label = F123DataService.getTireCompoundText(tireStr);
            return icon ? (
              <img
                key={`${tireStr}-${idx}`}
                src={icon}
                alt={`${fullName} tire`}
                className="h-6 w-6"
              />
            ) : (
              <span key={`${tireStr}-${idx}`} className="text-lg font-semibold text-gray-900 dark:text-white">
                {label}
              </span>
            );
          })}
        </div>
      );
    }

    const icon = F123DataService.getTireCompoundIcon(tiresUsed);
    const fullName = F123DataService.getTireCompoundFullName(tiresUsed);
    const label = F123DataService.getTireCompoundText(tiresUsed);
    return icon ? (
      <div className="flex items-center justify-center">
        <img src={icon} alt={`${fullName} tire`} className="h-6 w-6" />
      </div>
    ) : (
      <span className="text-lg text-gray-900 dark:text-white">{label}</span>
    );
  };

  const renderQualifyingTireCell = (driver: RaceDriverRow) => {
    const tire = (driver as any).qualifyingTire;
    if (!tire) {
      return <span className="text-lg text-gray-500 dark:text-gray-400">-</span>;
    }

    const tireValue = typeof tire === 'number' ? getTireCompound(tire) : tire;
    const icon = F123DataService.getTireCompoundIcon(tireValue);
    const label = F123DataService.getTireCompoundText(tireValue);
    const fullName = F123DataService.getTireCompoundFullName(tireValue);

    if (icon) {
      return (
        <div className="flex items-center justify-center">
          <img src={icon} alt={`${fullName} tire`} className="h-6 w-6" />
        </div>
      );
    }

    return (
      <span className="text-lg font-semibold text-gray-900 dark:text-white">
        {label}
      </span>
    );
  };

  // Helper function to get all penalties for a driver (for modal display)
  // Uses driver_session_result_id (UUID) for direct matching with Map lookup
  const getDriverPenalties = useCallback((driver: RaceDriverRow): DriverPenalty[] => {
    const driverSessionResultId = getDriverSessionResultId(driver);
    
    if (!driverSessionResultId) return [];
    
    // Use Map for O(1) lookup instead of filtering array
    const matchingPenalties = penaltyMap.get(driverSessionResultId) || [];
    
    return [...matchingPenalties].sort((a, b) => {
      const aDate = new Date(a.createdAt).getTime();
      const bDate = new Date(b.createdAt).getTime();
      return bDate - aDate;
    });
  }, [penaltyMap]);

  const getCurrentSession = () => {
    const currentSession = sessions.find(s => {
      if (activeSession === 'race') return s.sessionType === 10;
      if (activeSession === 'qualifying') return s.sessionType >= 5 && s.sessionType <= 9;
      if (activeSession === 'practice') return s.sessionType >= 1 && s.sessionType <= 4;
      return false;
    });
    return currentSession?.sessionId || currentSession?.id;
  };

  const handleAddPenaltyToPending = () => {
    if (!selectedDriver) {
      alert('No driver selected');
      return;
    }

    if (!penaltySeconds || !penaltyReason.trim()) {
      alert('Please enter penalty seconds and reason');
      return;
    }

    const seconds = parseFloat(penaltySeconds);
    if (isNaN(seconds) || seconds <= 0) {
      alert('Penalty seconds must be a positive number');
      return;
    }

    // Add to pending list - use driver_session_result_id (UUID)
    const driverSessionResultId = getDriverSessionResultId(selectedDriver);
    
    if (!driverSessionResultId) {
      alert(`Unable to identify driver. Missing driver_session_result_id.`);
      return;
    }
    
    const newPenalty: PendingPenaltyAdd = {
      seconds,
      reason: penaltyReason.trim(),
      id: `pending-${Date.now()}-${Math.random()}`,
      driverSessionResultId: driverSessionResultId  // UUID from driver_session_results.id
    };
    
    setPendingPenaltyAdds([...pendingPenaltyAdds, newPenalty]);
    setPenaltySeconds('5');
    setPenaltyReason('');
  };

  const handleRemovePendingPenalty = (id: string) => {
    setPendingPenaltyAdds(pendingPenaltyAdds.filter(p => p.id !== id));
  };

  const handleApplyPenalties = () => {
    // This function now just closes the modal and keeps changes pending
    // Changes are only saved when main "Save" button is clicked
    // This allows Cancel to properly discard all changes
    setPenaltyModalOpen(false);
    setSelectedDriver(null);
    setPenaltySeconds('5');
    setPenaltyReason('');
    // Note: pendingPenaltyAdds and pendingPenaltyRemovals are NOT cleared here
    // They remain pending until Save or Cancel is clicked in edit mode
  };

  const handleSaveAllChanges = async () => {
    try {
      // Apply all pending penalty additions (use driverSessionResultId)
      for (const penalty of pendingPenaltyAdds) {
        if (!penalty.driverSessionResultId) {
          console.warn('Skipping penalty with missing driverSessionResultId:', penalty);
          continue;
        }
        
        const response = await fetch(`${apiUrl}/api/races/driver-results/${penalty.driverSessionResultId}/penalties`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            penaltySeconds: penalty.seconds,
            reason: penalty.reason,
            editedBy: 'admin'
          })
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || data.details || 'Failed to add penalty');
        }
      }

      // Apply all pending penalty removals
      for (const removal of pendingPenaltyRemovals) {
        if (!removal.penaltyId) {
          console.warn('Skipping removal with missing penaltyId:', removal);
          continue;
        }

        if (!removal.driverSessionResultId) {
          console.warn('Skipping removal with missing driverSessionResultId:', removal);
          continue;
        }

        console.log(`Removing penalty: ${removal.penaltyId}, driverSessionResultId: ${removal.driverSessionResultId}`);

        const response = await fetch(`${apiUrl}/api/races/driver-results/${removal.driverSessionResultId}/penalties/${removal.penaltyId}`, {
          method: 'DELETE'
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || data.details || 'Failed to remove penalty');
        }
      }

      // Refresh all data
      await fetchSessionPenalties();
      await fetchRaceData();
      setIsEditing(false);
      setPendingPenaltyAdds([]);
      setPendingPenaltyRemovals([]);
    } catch (error) {
      console.error('Error saving changes:', error);
      alert(`Failed to save changes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCancelEdit = async () => {
    // Discard ALL pending changes and reload original state
    // This ensures no changes are saved when Cancel is clicked
    console.log('Canceling edit mode - discarding all pending changes:', {
      pendingPenaltyAdds: pendingPenaltyAdds.length,
      pendingPenaltyRemovals: pendingPenaltyRemovals.length
    });
    
    setPendingPenaltyAdds([]);
    setPendingPenaltyRemovals([]);
    setPenaltyModalOpen(false);
    setSelectedDriver(null);
    setPenaltySeconds('5');
    setPenaltyReason('');
    setIsEditing(false);
    
    // Reload data to get original state (this will overwrite any local changes)
    await fetchRaceData();
    await fetchSessionPenalties();
    
    console.log('Edit mode cancelled - all pending changes discarded');
  };

  const handleRemovePenaltyById = (driver: RaceDriverRow, penalty: DriverPenalty) => {
    // Add to pending removals instead of applying immediately
    // Use driver_session_result_id (UUID) for matching
    const driverSessionResultId = getDriverSessionResultId(driver);
    
    if (!driverSessionResultId) {
      console.warn('Cannot remove penalty - missing driverSessionResultId');
      return;
    }

    if (penalty.isPending) {
      setPendingPenaltyAdds(pendingPenaltyAdds.filter(p => p.id !== penalty.id));
      return;
    }
    
    // Check if already in pending removals
    const alreadyPending = pendingPenaltyRemovals.some(r => r.penaltyId === penalty.id);
    if (alreadyPending) {
      // Remove from pending if already there (toggle)
      setPendingPenaltyRemovals(pendingPenaltyRemovals.filter(r => r.penaltyId !== penalty.id));
      return;
    }
    
    setPendingPenaltyRemovals([...pendingPenaltyRemovals, {
      penaltyId: penalty.id,
      driverSessionResultId: driverSessionResultId
    }]);
    
    console.log('Added penalty to pending removals:', {
      penaltyId: penalty.id,
      driverSessionResultId: driverSessionResultId,
      totalPending: pendingPenaltyRemovals.length + 1
    });
  };

  const distanceLabel = raceData?.track?.length ? `${raceData.track.length} km` : 'Distance TBD';
  const lapsLabel = raceData?.laps != null ? `${raceData.laps} laps` : 'Laps TBD';
  const heroTitle = raceData?.trackName ?? 'Race Overview';
  const heroSubtitle = 'Race Results';
  const heroDescription = raceData?.raceDate
    ? `${new Date(raceData.raceDate).toLocaleDateString()} • ${distanceLabel} • ${lapsLabel}`
    : `${distanceLabel} • ${lapsLabel}`;
  const heroBase = {
    imageSrc: '/hero/94mliza3aat71.jpg',
    title: heroTitle,
    subtitle: heroSubtitle,
    description: heroDescription,
  };
  const isReady = !loading && !error && !!raceData;
  const distanceDisplay = raceData?.track?.length ? `${raceData.track.length} km` : distanceLabel;
  const lapsDisplay = raceData?.laps != null ? `${raceData.laps} laps` : lapsLabel;
  const raceMetaParts = [distanceDisplay, lapsDisplay].filter(Boolean);

  const viewState = loading
    ? 'loading'
    : error
      ? 'error'
      : !raceData
        ? 'empty'
        : 'ready';

  const heroStatus = (() => {
    switch (viewState) {
      case 'loading':
    return (
          <div className="rounded-full border border-white/25 px-5 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-white/70 backdrop-blur">
            Loading Race Data
      </div>
    );
      case 'error':
    return (
          <div className="rounded-full border border-red-400/60 px-5 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-red-200 backdrop-blur">
            Error Loading Race
      </div>
    );
      case 'empty':
    return (
          <div className="rounded-full border border-white/20 px-5 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-white/70 backdrop-blur">
            Awaiting Selection
      </div>
    );
      default:
        return undefined;
    }
  })();

  const isQualifyingSession = activeSession === 'qualifying' || activeSession === 'practice';

  const baseHeaderPadding = 'px-3 py-3 2xl:px-4 2xl:py-3';
  const baseCellPadding = 'px-3 py-3 2xl:px-4 2xl:py-3';

  const tableColumns: DashboardTableColumn<RaceDriverRow>[] = [
    {
      key: 'position',
      label: 'Pos',
      align: 'center',
      headerClassName: clsx(baseHeaderPadding, 'w-16'),
      className: clsx(baseCellPadding, 'w-16'),
      render: (_: unknown, row) => {
        const positionValue = isQualifyingSession
          ? row.qualifyingPosition ?? (row as any).position ?? null
          : row.racePosition ?? (row as any).position ?? null;

    return (
          <div className="flex justify-center">
            <span className={getPositionBadgeClass(positionValue)}>
              P{positionValue ?? '—'}
            </span>
      </div>
        );
      },
    },
    {
      key: 'driver',
      label: 'Driver',
      align: 'left' as const,
      headerClassName: clsx(baseHeaderPadding, 'text-left'),
    className: clsx(baseCellPadding, 'w-56'),
      render: renderDriverCell,
    },
    {
      key: 'team',
      label: 'Team',
      align: 'left' as const,
      headerClassName: clsx(baseHeaderPadding, 'text-left'),
      className: clsx(baseCellPadding, 'w-40'),
      render: (_: unknown, row) => {
        const teamColor = getTeamColorHex(row.team);
        return (
          <span
            className="text-base font-medium"
            style={{ color: teamColor }}
          >
            {row.team}
          </span>
        );
      },
    },
  ];

  if (activeSession === 'race') {
    tableColumns.push(
      {
        key: 'grid',
        label: 'Grid',
        align: 'center',
        headerClassName: clsx(baseHeaderPadding, 'w-16'),
        className: clsx(baseCellPadding, 'w-16 text-lg text-gray-900 dark:text-white'),
        render: (_: unknown, row) => (row.gridPosition != null ? row.gridPosition : '—'),
      },
      {
        key: 'bestLap',
        label: 'Best Lap',
        align: 'center',
        headerClassName: clsx(baseHeaderPadding, 'w-28'),
        className: clsx(baseCellPadding, 'w-28'),
        render: (_: unknown, row) => (
          <span
            className={`text-lg ${
              row.fastestLap
                ? 'text-purple-600 dark:text-purple-400 font-semibold'
                : 'text-gray-900 dark:text-white'
            }`}
          >
            {row.raceBestLapTime ? F123DataService.formatTimeFromMs(row.raceBestLapTime) : '--:--.---'}
          </span>
        ),
      },
      {
        key: 'totalTime',
        label: 'Total Time',
        align: 'center',
        headerClassName: clsx(baseHeaderPadding, 'w-28'),
        className: clsx(baseCellPadding, 'w-28 text-lg text-gray-900 dark:text-white'),
        render: (_: unknown, row) => formatRaceTotalTime(row),
      },
      {
        key: 'penalty',
        label: 'Penalty',
        align: 'center',
        headerClassName: clsx(baseHeaderPadding, 'w-20'),
        className: clsx(baseCellPadding, 'w-20'),
        render: (_: unknown, row) => renderPenaltyCell(row),
      },
      {
        key: 'status',
        label: 'Status',
        align: 'center',
        headerClassName: clsx(baseHeaderPadding, 'w-24'),
        className: clsx(baseCellPadding, 'w-24'),
        render: (_: unknown, row) => (
          <span
            className={`inline-block rounded-full px-2 py-1 text-sm font-medium ${
              row.status === 'finished'
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : row.status === 'dnf'
                  ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
            }`}
          >
            {row.status}
          </span>
        ),
      },
      {
        key: 'tires',
        label: 'Tires',
        align: 'center',
        headerClassName: clsx(baseHeaderPadding, 'w-24'),
        className: clsx(baseCellPadding, 'w-24'),
        render: (_: unknown, row) => renderRaceTiresCell(row),
      },
      {
        key: 'points',
        label: 'Points',
        align: 'center',
        headerClassName: clsx(baseHeaderPadding, 'w-16'),
        className: clsx(baseCellPadding, 'w-16 text-lg text-gray-900 dark:text-white'),
        render: (_: unknown, row) => (row.points != null ? row.points : '—'),
      }
    );
  } else {
    tableColumns.push(
      {
        key: 'time',
        label: 'Time',
        align: 'center',
        headerClassName: clsx(baseHeaderPadding, 'w-28'),
        className: clsx(baseCellPadding, 'w-28 text-lg text-gray-900 dark:text-white'),
        render: (_: unknown, row) =>
          row.qualifyingTime ? F123DataService.formatTimeFromMs(row.qualifyingTime) : '--:--.---',
      },
      {
        key: 'gap',
        label: 'Gap',
        align: 'center',
        headerClassName: clsx(baseHeaderPadding, 'w-24'),
        className: clsx(baseCellPadding, 'w-24 text-lg text-gray-900 dark:text-white'),
        render: (_: unknown, row) => {
          if (row.qualifyingGap && row.qualifyingGap > 0) {
            return '+' + F123DataService.formatGapTimeFromMs(row.qualifyingGap);
          }
          if (row.qualifyingPosition === 1) {
            return activeSession === 'qualifying' ? 'Pole' : 'Leader';
          }
          return '--.---';
        },
      },
      {
        key: 's1',
        label: 'S1',
        align: 'center',
        headerClassName: clsx(baseHeaderPadding, 'w-20'),
        className: clsx(baseCellPadding, 'w-20 text-lg font-medium'),
        render: (_: unknown, row) => {
          const value = row.qualifyingSector1Time;
          const isFastest = value != null && value === fastestS1 && fastestS1 !== Infinity;
          return (
            <span className={isFastest ? 'text-purple-600 dark:text-purple-400' : 'text-gray-900 dark:text-white'}>
              {value ? F123DataService.formatSectorTimeFromMs(value) : '--.---'}
            </span>
          );
        },
      },
      {
        key: 's2',
        label: 'S2',
        align: 'center',
        headerClassName: clsx(baseHeaderPadding, 'w-20'),
        className: clsx(baseCellPadding, 'w-20 text-lg font-medium'),
        render: (_: unknown, row) => {
          const value = row.qualifyingSector2Time;
          const isFastest = value != null && value === fastestS2 && fastestS2 !== Infinity;
          return (
            <span className={isFastest ? 'text-purple-600 dark:text-purple-400' : 'text-gray-900 dark:text-white'}>
              {value ? F123DataService.formatSectorTimeFromMs(value) : '--.---'}
            </span>
          );
        },
      },
      {
        key: 's3',
        label: 'S3',
        align: 'center',
        headerClassName: clsx(baseHeaderPadding, 'w-20'),
        className: clsx(baseCellPadding, 'w-20 text-lg font-medium'),
        render: (_: unknown, row) => {
          const value = row.qualifyingSector3Time;
          const isFastest = value != null && value === fastestS3 && fastestS3 !== Infinity;
          return (
            <span className={isFastest ? 'text-purple-600 dark:text-purple-400' : 'text-gray-900 dark:text-white'}>
              {value ? F123DataService.formatSectorTimeFromMs(value) : '--.---'}
            </span>
          );
        },
      },
      {
        key: 'tire',
        label: 'Tire',
        align: 'center',
        headerClassName: clsx(baseHeaderPadding, 'w-16'),
        className: clsx(baseCellPadding, 'w-16'),
        render: (_: unknown, row) => renderQualifyingTireCell(row),
      }
    );
  }

  const tableEmptyMessage =
    activeSession === 'qualifying'
      ? 'No qualifying results available.'
      : activeSession === 'practice'
        ? 'No practice results available.'
        : 'No race results available.';

  return (
    <DashboardPage
      hero={{ ...heroBase, content: heroStatus }}
      isReady={viewState !== 'loading'}
      contentClassName="space-y-6"
    >
      {viewState === 'error' && (
        <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-10 text-center text-sm text-red-200 backdrop-blur dark:border-red-400/40 dark:bg-red-500/15">
          <p className="text-base font-semibold uppercase tracking-[0.3em]">Unable to load</p>
          <p className="mt-2 text-sm text-red-200/80">{error}</p>
      </div>
      )}

      {viewState === 'empty' && (
        <div className="rounded-3xl border border-dashed border-white/20 bg-white/10 p-12 text-center text-sm text-white/70 backdrop-blur dark:border-white/15 dark:bg-slate-900/50">
          <p className="text-base font-semibold uppercase tracking-[0.3em] text-white/80">No race selected</p>
          <p className="mt-2 text-sm text-white/65">Choose a race to review classification, stints, and telemetry.</p>
              </div>
              )}

      {viewState === 'ready' && (
        <div className="space-y-6">
      {/* Session Toggle */}
      {(sessionTypes.hasRace || sessionTypes.hasQualifying || sessionTypes.hasPractice) && (
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex h-10 items-center rounded-xl bg-slate-100 p-1 text-sm font-medium dark:bg-slate-900">
              {sessionTypes.hasRace && (
          <button
            onClick={() => handleSessionChange('race')}
            className={`rounded-lg px-3 py-1 transition-colors ${
              activeSession === 'race'
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100'
            }`}
          >
            Race
          </button>
              )}
              {sessionTypes.hasQualifying && (
          <button
            onClick={() => handleSessionChange('qualifying')}
            className={`rounded-lg px-3 py-1 transition-colors ${
              activeSession === 'qualifying'
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100'
            }`}
          >
            Qualifying
          </button>
              )}
              {sessionTypes.hasPractice && (
          <button
            onClick={() => handleSessionChange('practice')}
            className={`rounded-lg px-3 py-1 transition-colors ${
              activeSession === 'practice'
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100'
            }`}
          >
            Practice
          </button>
              )}
        </div>
            {isAuthenticated && (
              <>
                {isEditing ? (
                <div className="flex items-center gap-2">
                    <button
                      onClick={handleCancelEdit}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveAllChanges}
                    className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-400"
                    >
                      Save
                    </button>
      </div>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                )}
              </>
            )}
        </div>
      )}

      {/* Results Table */}
        <DashboardTable
          columns={tableColumns}
          rows={drivers}
          rowKey={(row, index) => buildDriverRowKey(row, index)}
          onRowClick={!isEditing ? (row) => handleDriverClick(row) : undefined}
          emptyMessage={tableEmptyMessage}
        />
                                </div>
                              )}

      {/* Penalty Modal */}
      {penaltyModalOpen && selectedDriver && (
        <div 
          className="modal-overlay"
          onClick={(e) => {
            // Close modal if clicking the backdrop
            // Don't clear pending changes - user might want to continue editing
            if (e.target === e.currentTarget) {
              setPenaltyModalOpen(false);
              setSelectedDriver(null);
              setPenaltySeconds('5');
              setPenaltyReason('');
              // Note: pendingPenaltyAdds and pendingPenaltyRemovals are NOT cleared
              // They remain pending until Save or Cancel is clicked in edit mode
            }
          }}
        >
          <div 
            className="modal-panel max-w-md p-6 mx-4"
            onClick={(e) => e.stopPropagation()} // Prevent backdrop click from closing
          >
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Manage Penalty - {selectedDriver.name}
            </h2>
            
            {/* Existing Penalties List */}
            {(() => {
              const driverSessionResultId = getDriverSessionResultId(selectedDriver);
              const penalties = getDriverPenalties(selectedDriver);
              const committedPenalties = penalties.filter((penalty: DriverPenalty) => !penalty.isPending);
              const pendingAddsForDriver = pendingPenaltyAdds.filter(p => p.driverSessionResultId === driverSessionResultId);
              
              return (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Active Penalties
                    </label>
                    {committedPenalties.length > 0 ? (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {committedPenalties.map((penalty) => (
                          <div
                            key={penalty.id}
                            className="flex items-center justify-between bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded border border-red-200 dark:border-red-800"
                          >
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-red-700 dark:text-red-300">
                                {penalty.seconds > 0 ? `+${penalty.seconds}s` : `${penalty.seconds}s`}
                                <span className="font-normal">
                                  {penalty.reason ? ` – ${penalty.reason}` : ' – No reason provided'}
                                </span>
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                Added {new Date(penalty.createdAt).toLocaleString()} {penalty.createdBy ? `by ${penalty.createdBy}` : ''}
                              </span>
                              {penalty.isRemovalPending && (
                                <span className="mt-1 inline-flex items-center w-fit rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-800">
                                  Removal pending
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                handleRemovePenaltyById(selectedDriver, penalty);
                              }}
                              className={`text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 hover:bg-red-100 dark:hover:bg-red-900/40 rounded p-1 transition-colors ${penalty.isRemovalPending ? 'opacity-60' : ''}`}
                              title={penalty.isRemovalPending ? 'Undo removal' : 'Mark for removal'}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">No existing post-race penalties</p>
                    )}
                  </div>

                  {pendingAddsForDriver.length > 0 && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Pending Additions
                      </label>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {pendingAddsForDriver.map((penalty) => (
                          <div key={penalty.id} className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded border border-blue-200 dark:border-blue-800">
                            <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                              +{penalty.seconds}s – {penalty.reason}
                            </span>
                            <button
                              onClick={() => handleRemovePendingPenalty(penalty.id)}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded p-1 transition-colors"
                              title="Remove from pending"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
            
            {/* Add New Penalty Form */}
            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Penalty Seconds
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={penaltySeconds}
                  onChange={(e) => setPenaltySeconds(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="5"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reason
                </label>
                <textarea
                  value={penaltyReason}
                  onChange={(e) => setPenaltyReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Enter reason for penalty (e.g., Track limits violation)"
                  autoComplete="off"
                  data-autocomplete="off"
                  spellCheck={false}
                />
              </div>
              
              <button
                onClick={handleAddPenaltyToPending}
                className="w-full px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add to List
              </button>
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  // Discard pending changes for this driver only
                  const driverSessionResultId = getDriverSessionResultId(selectedDriver);
                  
                  if (driverSessionResultId) {
                    // Remove pending penalties for this driver
                    setPendingPenaltyAdds(pendingPenaltyAdds.filter(p => {
                      return p.driverSessionResultId !== driverSessionResultId;
                    }));
                    
                    // Remove pending removals for this driver
                    setPendingPenaltyRemovals(pendingPenaltyRemovals.filter(r => {
                      return r.driverSessionResultId !== driverSessionResultId;
                    }));
                  }
                  
                  setPenaltyModalOpen(false);
                  setSelectedDriver(null);
                  setPenaltySeconds('5');
                  setPenaltyReason('');
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              {(pendingPenaltyAdds.length > 0 || pendingPenaltyRemovals.some(r => {
                const driverSessionResultId = getDriverSessionResultId(selectedDriver);
                return driverSessionResultId && r.driverSessionResultId === driverSessionResultId;
              })) && (
                <button
                  onClick={handleApplyPenalties}
                  className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  title="Close modal and keep changes pending (save with main Save button)"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardPage>
  );
};