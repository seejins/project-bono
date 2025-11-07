import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ArrowLeft, Calendar, MapPin, Trophy, Flag, ArrowUp, ArrowDown, Minus, Edit, X } from 'lucide-react';
import { F123DataService, F123DriverResult } from '../services/F123DataService';
import { getTireCompound } from '../utils/f123DataMapping';
import { useAdmin } from '../contexts/AdminContext';

interface RaceDetailProps {
  raceId: string;
  onBack: () => void;
  onDriverSelect: (driverId: string, raceId: string) => void;
}

export const RaceDetail: React.FC<RaceDetailProps> = ({ raceId, onBack, onDriverSelect }) => {
  const { isAuthenticated } = useAdmin();
  const [activeSession, setActiveSession] = useState<'practice' | 'qualifying' | 'race'>('race');
  const [raceData, setRaceData] = useState<any>(null);
  const [drivers, setDrivers] = useState<F123DriverResult[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [penaltyModalOpen, setPenaltyModalOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<F123DriverResult | null>(null);
  const [penaltySeconds, setPenaltySeconds] = useState<string>('5');
  const [penaltyReason, setPenaltyReason] = useState<string>('');
  const [penaltyHistory, setPenaltyHistory] = useState<Record<string, any[]>>({}); // driverId -> penalty edits
  const [pendingPenalties, setPendingPenalties] = useState<Array<{seconds: number, reason: string, id: string, driverSessionResultId: string}>>([]); // Temporary penalties to be added
  const [pendingPenaltyRemovals, setPendingPenaltyRemovals] = useState<Array<{penaltyId: string, driverSessionResultId: string}>>([]); // Pending penalty removals

  useEffect(() => {
    fetchRaceData();
  }, [raceId]);

  // Memoize session type checks (computed once, reused everywhere)
  const sessionTypes = useMemo(() => ({
    hasRace: sessions.some(s => s.sessionType === 10),
    hasQualifying: sessions.some(s => s.sessionType >= 5 && s.sessionType <= 9),
    hasPractice: sessions.some(s => s.sessionType >= 1 && s.sessionType <= 4)
  }), [sessions]);

  // Set default active session to first available session when sessions load
  useEffect(() => {
    if (sessions.length === 0) return;
    
    // Use memoized session types
    const { hasRace, hasQualifying, hasPractice } = sessionTypes;
    
    // If current active session doesn't exist, switch to first available
    if (activeSession === 'race' && !hasRace) {
      if (hasQualifying) {
        setActiveSession('qualifying');
      } else if (hasPractice) {
        setActiveSession('practice');
      }
    } else if (activeSession === 'qualifying' && !hasQualifying) {
      if (hasRace) {
        setActiveSession('race');
      } else if (hasPractice) {
        setActiveSession('practice');
      }
    } else if (activeSession === 'practice' && !hasPractice) {
      if (hasRace) {
        setActiveSession('race');
      } else if (hasQualifying) {
        setActiveSession('qualifying');
      }
    }
  }, [sessions, activeSession, sessionTypes]);

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
    const transformedDrivers: F123DriverResult[] = session.results.map((result: any, index: number) => {
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
      
      const driver: any = {
        id: result.id, // Use driver_session_results.id as primary identifier (UUID)
        driver_session_result_id: result.id, // Primary key from driver_session_results table (always a UUID)
        user_id: result.user_id, // Tournament participant/user (NULL until mapped)
        json_driver_id: result.json_driver_id ? String(result.json_driver_id) : null, // In-game driver ID from column
        name: result.json_driver_name || result.driver_name || result.mapping_driver_name || 'Unknown Driver',
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

  // Fetch penalty history when entering edit mode
  useEffect(() => {
    if (isEditing && sessions.length > 0) {
      fetchPenaltyHistory();
      setPendingPenalties([]);
      setPendingPenaltyRemovals([]);
    } else {
      setPenaltyHistory({});
    }
  }, [isEditing, activeSession, sessions]);

  // Note: Removed redundant penalty history fetch when modal opens - already fetched when entering edit mode

  const fetchPenaltyHistory = async () => {
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
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/races/sessions/${sessionId}/edit-history`);
      
      if (response.ok) {
        const data = await response.json();
        const history = data.editHistory || [];
        
        // Filter only penalty-related edits and group by driver_session_result_id (UUID)
        // Store penalties indexed by driver_session_result_id for efficient matching
        const penaltyEdits: Record<string, any[]> = {};
        const allPenalties: any[] = []; // Flat list for searching
        
        history.forEach((edit: any) => {
          if (edit.edit_type === 'post_race_penalty' || edit.edit_type === 'post_race_penalty_removal') {
            // Always add to flat list
            allPenalties.push(edit);
            
            // Index by driver_session_result_id (UUID) - this is the primary key
            if (edit.driver_session_result_id) {
              if (!penaltyEdits[edit.driver_session_result_id]) {
                penaltyEdits[edit.driver_session_result_id] = [];
              }
              penaltyEdits[edit.driver_session_result_id].push(edit);
            }
          }
        });
        
        // Store flat list for searching
        penaltyEdits['_all'] = allPenalties;
        
        console.log('📊 Fetched penalty history:', {
          sessionId,
          totalEdits: history.length,
          penaltyEdits: Object.keys(penaltyEdits).length,
          penaltyEditsByDriver: Object.keys(penaltyEdits).map(key => ({ driverId: key, count: penaltyEdits[key].length }))
        });
        
        setPenaltyHistory(penaltyEdits);
      }
    } catch (error) {
      console.error('Error fetching penalty history:', error);
    }
  };

  const fetchRaceData = async () => {
    try {
      setLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      
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

  const getPositionColor = (position: number) => F123DataService.getPositionColor(position);

  const handleDriverClick = (driver: F123DriverResult) => {
    onDriverSelect(driver.id, raceId);
  };

  // Get driver_session_result_id (UUID) - this is the primary identifier for all operations
  const getDriverSessionResultId = (driver: F123DriverResult): string | null => {
    return (driver as any).driver_session_result_id || (driver as any).id || null;
  };

  // Memoize penalty map for O(1) lookups instead of O(n) array iterations
  const penaltyMap = useMemo(() => {
    const map = new Map<string, any[]>();
    (penaltyHistory['_all'] || []).forEach((p: any) => {
      if (p.driver_session_result_id && p.edit_type === 'post_race_penalty' && !p.is_reverted) {
        if (!map.has(p.driver_session_result_id)) {
          map.set(p.driver_session_result_id, []);
        }
        map.get(p.driver_session_result_id)!.push(p);
      }
    });
    return map;
  }, [penaltyHistory]);

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
  const driverHasExistingPenalties = useCallback((driver: F123DriverResult): boolean => {
    const driverSessionResultId = getDriverSessionResultId(driver);
    
    // Silently return false if we can't identify the driver
    if (!driverSessionResultId) return false;
    
    // First check: Does the driver have post-race penalties in their data?
    const postRacePenalties = (driver as any).postRacePenalties || 0;
    if (postRacePenalties > 0) {
      return true;
    }
    
    // Second check: Use Map for O(1) lookup
    if (penaltyMap.has(driverSessionResultId)) {
      return true;
    }
    
    // Third check: Check if this driver has pending penalties/removals
    const matchingPendingPenalties = pendingPenalties.some(p => {
      return p.driverSessionResultId === driverSessionResultId;
    });
    const matchingPendingRemovals = pendingPenaltyRemovals.some(r => {
      return r.driverSessionResultId === driverSessionResultId;
    });
    
    return matchingPendingPenalties || matchingPendingRemovals;
  }, [penaltyMap, pendingPenalties, pendingPenaltyRemovals]);

  // Helper function to get all penalties for a driver (for modal display)
  // Uses driver_session_result_id (UUID) for direct matching with Map lookup
  const getDriverPenalties = useCallback((driver: F123DriverResult): any[] => {
    const driverSessionResultId = getDriverSessionResultId(driver);
    
    if (!driverSessionResultId) return [];
    
    // Use Map for O(1) lookup instead of filtering array
    const matchingPenalties = penaltyMap.get(driverSessionResultId) || [];
    
    // Filter out pending removals
    return matchingPenalties.filter((p: any) => {
      return !pendingPenaltyRemovals.some(removal => removal.penaltyId === p.id);
    });
  }, [penaltyMap, pendingPenaltyRemovals]);

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
    
    const newPenalty = {
      seconds,
      reason: penaltyReason.trim(),
      id: `pending-${Date.now()}-${Math.random()}`,
      driverSessionResultId: driverSessionResultId  // UUID from driver_session_results.id
    };
    
    setPendingPenalties([...pendingPenalties, newPenalty]);
    setPenaltySeconds('5');
    setPenaltyReason('');
  };

  const handleRemovePendingPenalty = (id: string) => {
    setPendingPenalties(pendingPenalties.filter(p => p.id !== id));
  };

  const handleApplyPenalties = () => {
    // This function now just closes the modal and keeps changes pending
    // Changes are only saved when main "Save" button is clicked
    // This allows Cancel to properly discard all changes
    setPenaltyModalOpen(false);
    setSelectedDriver(null);
    setPenaltySeconds('5');
    setPenaltyReason('');
    // Note: pendingPenalties and pendingPenaltyRemovals are NOT cleared here
    // They remain pending until Save or Cancel is clicked in edit mode
  };

  const handleSaveAllChanges = async () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

    try {
      // Apply all pending penalty additions (use driverSessionResultId)
      for (const penalty of pendingPenalties) {
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
        // Find the penalty to remove - use _all array for searching
        const allPenalties = penaltyHistory['_all'] || [];
        const penalty = allPenalties.find((p: any) => p.id === removal.penaltyId);
        
        if (!penalty) {
          console.warn(`Penalty ${removal.penaltyId} not found in history`);
          continue;
        }

        const penaltySeconds = penalty.new_value?.post_race_penalties - (penalty.old_value?.post_race_penalties || 0);
        if (!penaltySeconds || penaltySeconds <= 0) {
          console.warn(`Invalid penalty seconds for penalty ${removal.penaltyId}: ${penaltySeconds}`);
          continue;
        }
        
        if (!removal.driverSessionResultId) {
          console.warn('Skipping removal with missing driverSessionResultId:', removal);
          continue;
        }

        // Use driverSessionResultId from removal (already stored)
        
        console.log(`Removing penalty: ${removal.penaltyId}, driverSessionResultId: ${removal.driverSessionResultId}, seconds: ${penaltySeconds}`);

        const response = await fetch(`${apiUrl}/api/races/driver-results/${removal.driverSessionResultId}/penalties`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            penaltySeconds,
            reason: `Removed penalty: ${penalty.reason || 'No reason provided'}`,
            editedBy: 'admin'
          })
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || data.details || 'Failed to remove penalty');
        }
      }

      // Refresh all data
      await fetchRaceData();
      await fetchPenaltyHistory();
      setIsEditing(false);
      setPendingPenalties([]);
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
      pendingPenalties: pendingPenalties.length,
      pendingPenaltyRemovals: pendingPenaltyRemovals.length
    });
    
    setPendingPenalties([]);
    setPendingPenaltyRemovals([]);
    setPenaltyModalOpen(false);
    setSelectedDriver(null);
    setPenaltySeconds('5');
    setPenaltyReason('');
    setIsEditing(false);
    
    // Reload data to get original state (this will overwrite any local changes)
    await fetchRaceData();
    await fetchPenaltyHistory();
    
    console.log('Edit mode cancelled - all pending changes discarded');
  };

  const handleRemovePenaltyById = (driver: F123DriverResult, penalty: any) => {
    // Add to pending removals instead of applying immediately
    // Use driver_session_result_id (UUID) for matching
    const driverSessionResultId = getDriverSessionResultId(driver);
    
    if (!driverSessionResultId) {
      console.warn('Cannot remove penalty - missing driverSessionResultId');
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
    
    // Remove from displayed penalty history (optimistic update)
    const updatedHistory = { ...penaltyHistory };
    if (updatedHistory[driverSessionResultId]) {
      updatedHistory[driverSessionResultId] = updatedHistory[driverSessionResultId].filter((p: any) => p.id !== penalty.id);
      setPenaltyHistory(updatedHistory);
    }
  };

  const handleRemovePenalty = async () => {
    if (!selectedDriver || !penaltySeconds || !penaltyReason.trim()) {
      alert('Please enter penalty seconds and reason');
      return;
    }

    const seconds = parseFloat(penaltySeconds);
    if (isNaN(seconds) || seconds <= 0) {
      alert('Penalty seconds must be a positive number');
      return;
    }

    // Check if removing more than current post-race penalty
    const currentPostRacePenalty = (selectedDriver as any).postRacePenalties || 0;
    if (seconds > currentPostRacePenalty) {
      alert(`Cannot remove ${seconds}s penalty. Current post-race penalty is only ${currentPostRacePenalty}s.`);
      return;
    }

    const sessionId = getCurrentSession();
    
    if (!sessionId) {
      console.error('Session not found. Sessions:', sessions);
      console.error('Active session:', activeSession);
      alert('Session not found. Please ensure the session has been completed.');
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/races/sessions/${sessionId}/penalties`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          driverId: (selectedDriver as any).driver_session_result_id || (selectedDriver as any).driver_id || selectedDriver.id,
          penaltySeconds: seconds,
          reason: penaltyReason.trim(),
          editedBy: 'admin' // TODO: Get actual admin username
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Refresh race data to show updated penalties and positions
        await fetchRaceData();
        setPenaltyModalOpen(false);
        setSelectedDriver(null);
        setPenaltySeconds('5');
        setPenaltyReason('');
      } else {
        const errorMessage = data.error || data.details || 'Failed to remove penalty';
        console.error('Penalty error:', { status: response.status, data });
        alert(errorMessage);
      }
    } catch (error) {
      console.error('Error removing penalty:', error);
      alert(`Failed to remove penalty: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading race data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (!raceData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">No race data found</div>
      </div>
    );
  }

  return (
    <div className="max-w-[2048px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={onBack} 
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center space-x-2 text-base font-medium"
        >
          <ArrowLeft className="w-6 h-6" />
          <span>Back</span>
        </button>
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">{raceData.trackName || 'Race'}</h1>
          {raceData.track?.name && (
            <p className="text-lg text-gray-600 dark:text-gray-400 mt-1">{raceData.track.name}</p>
          )}
        </div>
        <div className="w-10"></div>
      </div>

      {/* Race Info */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-red-600 rounded-lg flex items-center justify-center">
              <Flag className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{raceData.trackName || 'Race'}</h2>
              {raceData.track?.name && (
              <div className="flex items-center space-x-2 mt-1">
                <MapPin className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  <span className="text-base text-gray-500 dark:text-gray-400">{raceData.track.name}</span>
              </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-2 text-base text-gray-500 dark:text-gray-400">
              <Calendar className="w-5 h-5" />
              <span>{raceData.raceDate ? new Date(raceData.raceDate).toLocaleDateString() : 'TBD'}</span>
            </div>
            <div className="text-base text-gray-500 dark:text-gray-400 mt-1">
              {raceData.track?.length ? `${raceData.track.length}km` : ''} {raceData.track?.length ? '•' : ''} {raceData.laps || 0} laps
            </div>
          </div>
        </div>
        
          <div className="flex items-center space-x-2">
            <div className={`w-4 h-4 rounded-full ${raceData.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
            <span className="text-base font-medium text-gray-700 dark:text-gray-300 capitalize">{raceData.status}</span>
        </div>
      </div>

      {/* Session Toggle */}
      {(sessionTypes.hasRace || sessionTypes.hasQualifying || sessionTypes.hasPractice) && (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
        <div className="flex space-x-2">
              {sessionTypes.hasRace && (
          <button
            onClick={() => setActiveSession('race')}
            className={`px-4 py-2 rounded-lg text-base font-semibold transition-colors ${
              activeSession === 'race'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Race
          </button>
              )}
              {sessionTypes.hasQualifying && (
          <button
            onClick={() => setActiveSession('qualifying')}
            className={`px-4 py-2 rounded-lg text-base font-semibold transition-colors ${
              activeSession === 'qualifying'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Qualifying
          </button>
              )}
              {sessionTypes.hasPractice && (
          <button
            onClick={() => setActiveSession('practice')}
            className={`px-4 py-2 rounded-lg text-base font-semibold transition-colors ${
              activeSession === 'practice'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Practice
          </button>
              )}
        </div>
            {isAuthenticated && (
              <>
                {isEditing ? (
                  <div className="flex space-x-2">
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-2 rounded-lg text-base font-semibold transition-colors bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveAllChanges}
                      className="px-4 py-2 rounded-lg text-base font-semibold transition-colors bg-green-600 text-white hover:bg-green-700"
                    >
                      Save
                    </button>
      </div>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 rounded-lg text-base font-semibold transition-colors flex items-center space-x-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Results Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-3 py-3 text-center text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">Pos</th>
                <th className="px-3 py-3 text-center text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-56">Driver</th>
                <th className="px-3 py-3 text-center text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-40">Team</th>
                {activeSession === 'race' && (
                  <th className="px-3 py-3 text-center text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">Grid</th>
                )}
                {activeSession === 'qualifying' || activeSession === 'practice' ? (
                  <>
                    <th className="px-3 py-3 text-center text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-28">Time</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">Gap</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20">S1</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20">S2</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20">S3</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">Tire</th>
                  </>
                ) : (
                  <>
                    <th className="px-3 py-3 text-center text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-28">Best Lap</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-28">Total Time</th>
                    <th className="px-2 py-3 text-center text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20">Penalty</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">Status</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">Tires</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">Points</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {drivers.length === 0 ? (
                <tr>
                  <td colSpan={activeSession === 'qualifying' || activeSession === 'practice' ? 10 : 9} className="px-4 py-8 text-center text-base text-gray-500 dark:text-gray-400">
                    No {activeSession === 'qualifying' ? 'qualifying' : activeSession === 'practice' ? 'practice' : 'race'} results available
                  </td>
                </tr>
              ) : (
                drivers.map((driver) => (
                <tr 
                  key={driver.id} 
                    className={`${!isEditing ? 'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer' : ''} transition-colors`}
                    onClick={() => !isEditing && handleDriverClick(driver)}
                >
                  <td className="px-3 py-4 whitespace-nowrap text-center w-16">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-normal mx-auto ${getPositionColor((activeSession === 'qualifying' || activeSession === 'practice' ? driver.qualifyingPosition : driver.racePosition) || 1)}`}>
                      {activeSession === 'qualifying' || activeSession === 'practice' ? (driver.qualifyingPosition || 0) : (driver.racePosition || 0)}
                    </div>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap w-56">
                    <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-sm font-normal text-gray-700 dark:text-gray-300 mr-3">
                        {driver.number}
                      </div>
                      <div>
                        <div className="text-base font-medium text-gray-900 dark:text-white">{driver.name}</div>
                      </div>
                      </div>
                      {/* Position gain indicator - only for race */}
                      {activeSession === 'race' && driver.positionGain != null && (
                        <div className="flex items-center space-x-1 ml-4">
                          {driver.positionGain > 0 ? (
                            <>
                              <ArrowUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                              <span className="text-sm font-normal text-green-600 dark:text-green-400">{driver.positionGain}</span>
                            </>
                          ) : driver.positionGain < 0 ? (
                            <>
                              <ArrowDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                              <span className="text-sm font-normal text-red-600 dark:text-red-400">{Math.abs(driver.positionGain)}</span>
                            </>
                          ) : (
                            <>
                              <Minus className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">0</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap w-40">
                    {(() => {
                      const teamColor = getTeamColorHex(driver.team);
                      const textColor = getContrastTextColor(teamColor);
                      return (
                        <span 
                          className="text-base font-semibold px-2 py-1 rounded inline-block"
                          style={{ 
                            backgroundColor: teamColor,
                            color: textColor
                          }}
                        >
                          {driver.team}
                        </span>
                      );
                    })()}
                  </td>
                  {activeSession === 'race' && (
                    <td className="px-3 py-4 whitespace-nowrap text-center text-lg text-gray-900 dark:text-white w-16">
                      {driver.gridPosition != null ? driver.gridPosition : '-'}
                    </td>
                  )}
                  {activeSession === 'qualifying' || activeSession === 'practice' ? (
                    <>
                      <td className="px-3 py-4 whitespace-nowrap text-center text-lg text-gray-900 dark:text-white w-28">
                        {driver.qualifyingTime ? (
                          F123DataService.formatTimeFromMs(driver.qualifyingTime)
                        ) : '--:--.---'}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-center text-lg text-gray-900 dark:text-white w-24">
                        {driver.qualifyingGap && driver.qualifyingGap > 0 ? (
                          '+' + F123DataService.formatGapTimeFromMs(driver.qualifyingGap)
                        ) : driver.qualifyingPosition === 1 ? (
                          activeSession === 'qualifying' ? 'Pole' : 'Leader'
                        ) : (
                          '--.---'
                        )}
                      </td>
                      <td className={`px-3 py-4 whitespace-nowrap text-center text-lg font-medium w-20 ${
                        driver.qualifyingSector1Time === fastestS1
                          ? 'text-purple-600 dark:text-purple-400'
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {driver.qualifyingSector1Time ? (
                          F123DataService.formatSectorTimeFromMs(driver.qualifyingSector1Time)
                        ) : '--.---'}
                      </td>
                      <td className={`px-3 py-4 whitespace-nowrap text-center text-lg font-medium w-20 ${
                        driver.qualifyingSector2Time === fastestS2
                          ? 'text-purple-600 dark:text-purple-400'
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {driver.qualifyingSector2Time ? (
                          F123DataService.formatSectorTimeFromMs(driver.qualifyingSector2Time)
                        ) : '--.---'}
                      </td>
                      <td className={`px-3 py-4 whitespace-nowrap text-center text-lg font-medium w-20 ${
                        driver.qualifyingSector3Time === fastestS3
                          ? 'text-purple-600 dark:text-purple-400'
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {driver.qualifyingSector3Time ? (
                          F123DataService.formatSectorTimeFromMs(driver.qualifyingSector3Time)
                        ) : '--.---'}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-center w-16">
                        {(() => {
                          const tire = (driver as any).qualifyingTire;
                          if (!tire) return <span className="text-lg text-gray-500 dark:text-gray-400">-</span>;

                          const tireValue = typeof tire === 'number' ? getTireCompound(tire) : tire;
                          const icon = F123DataService.getTireCompoundIcon(tireValue);
                          const label = F123DataService.getTireCompoundText(tireValue);
                          const fullName = F123DataService.getTireCompoundFullName(tireValue);

                          if (icon) {
                            return (
                              <div className="flex items-center justify-center">
                                <img
                                  src={icon}
                                  alt={`${fullName} tire`}
                                  className="h-6 w-6"
                                />
                              </div>
                            );
                          }

                          return (
                            <span className="text-lg font-semibold text-gray-900 dark:text-white">
                              {label}
                            </span>
                          );
                        })()}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className={`px-3 py-4 whitespace-nowrap text-center text-lg w-28 ${
                        driver.fastestLap
                          ? 'text-purple-600 dark:text-purple-400 font-semibold'
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {driver.raceBestLapTime ? (
                          F123DataService.formatTimeFromMs(driver.raceBestLapTime)
                        ) : '--:--.---'}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-center text-lg text-gray-900 dark:text-white w-28">
                        {(() => {
                          // If already formatted (race session with gap calculation), use it directly
                          if ((driver as any)._raceTimeFormatted && driver.raceTime) {
                            return driver.raceTime;
                          }
                          // Otherwise, format the total race time
                          const totalTimeMs = (driver as any)._totalRaceTimeMs;
                          if (totalTimeMs && totalTimeMs > 0) {
                            return F123DataService.formatTimeFromMs(totalTimeMs);
                          }
                          return '--:--.---';
                        })()}
                      </td>
                      <td className="px-2 py-4 whitespace-nowrap text-center w-20">
                        {isEditing ? (
                          <div className="flex items-center justify-center">
                            {/* Only show Add button - penalties are managed in modal */}
                            {(() => {
                              const hasExistingPenalties = driverHasExistingPenalties(driver);
                              const buttonColor = hasExistingPenalties 
                                ? 'text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 hover:text-red-700 dark:hover:text-red-300 border-red-300 dark:border-red-700 hover:border-red-500 dark:hover:border-red-500'
                                : 'text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:text-blue-700 dark:hover:text-blue-300 border-blue-300 dark:border-blue-700 hover:border-blue-500 dark:hover:border-blue-500';
                              
                              return (
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
                                    setPendingPenalties([]);
                                    setPendingPenaltyRemovals([]);
                                    setPenaltyModalOpen(true);
                                    // Refresh penalty history when opening modal
                                    await fetchPenaltyHistory();
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-200 ${buttonColor}`}
                                >
                                  Add
                                </button>
                              );
                            })()}
                          </div>
                        ) : (
                          (driver as any).totalPenalties != null && (driver as any).totalPenalties > 0 ? (
                            <div 
                              className="relative inline-block group"
                              onMouseEnter={(e) => {
                                // Show tooltip on hover
                                const tooltip = e.currentTarget.querySelector('.penalty-tooltip') as HTMLElement;
                                if (tooltip) {
                                  tooltip.style.opacity = '1';
                                  tooltip.style.visibility = 'visible';
                                }
                              }}
                              onMouseLeave={(e) => {
                                // Hide tooltip on leave
                                const tooltip = e.currentTarget.querySelector('.penalty-tooltip') as HTMLElement;
                                if (tooltip) {
                                  tooltip.style.opacity = '0';
                                  tooltip.style.visibility = 'hidden';
                                }
                              }}
                            >
                              <span className="text-base font-normal text-red-600 dark:text-red-400 cursor-help underline decoration-dotted">
                                {(driver as any).totalPenalties}s
                              </span>
                              {/* Tooltip */}
                              {(driver as any).penaltyReason && (
                                <div className="penalty-tooltip absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded shadow-lg opacity-0 invisible transition-all duration-200 pointer-events-none whitespace-nowrap z-50">
                                  {(driver as any).penaltyReason}
                                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-base text-gray-500 dark:text-gray-400">-</span>
                          )
                        )}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-center w-24">
                        <span className={`px-2 py-1 rounded-full text-sm font-medium inline-block ${
                          driver.status === 'finished' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          driver.status === 'dnf' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}>
                          {driver.status}
                        </span>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-center w-24">
                        {(() => {
                          const tiresUsed = (driver as any).raceTiresUsed;
                          if (!tiresUsed || (Array.isArray(tiresUsed) && tiresUsed.length === 0)) {
                            return <span className="text-lg text-gray-500 dark:text-gray-400">-</span>;
                          }
                          // If it's an array of tire compounds, format them (these should be visual compounds)
                          if (Array.isArray(tiresUsed)) {
                            const tireStrings = tiresUsed.map(t => {
                              if (typeof t === 'number') {
                                return getTireCompound(t);
                              }
                              // Handle visual compound strings like "Soft", "Medium", "Hard", etc.
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
                          // If it's a string, just display it
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
                        })()}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-center text-lg text-gray-900 dark:text-white w-16">
                        {driver.points}
                      </td>
                    </>
                  )}
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Penalty Modal */}
      {penaltyModalOpen && selectedDriver && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            // Close modal if clicking the backdrop
            // Don't clear pending changes - user might want to continue editing
            if (e.target === e.currentTarget) {
              setPenaltyModalOpen(false);
              setSelectedDriver(null);
              setPenaltySeconds('5');
              setPenaltyReason('');
              // Note: pendingPenalties and pendingPenaltyRemovals are NOT cleared
              // They remain pending until Save or Cancel is clicked in edit mode
            }
          }}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()} // Prevent backdrop click from closing
          >
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Manage Penalty - {selectedDriver.name}
            </h2>
            
            {/* Existing Penalties List */}
            {(() => {
              // Use helper function to get penalties for this driver
              const existingPenalties = getDriverPenalties(selectedDriver);
              
              // Debug log
              const driverId = (selectedDriver as any).driver_id;
              const currentDriverPosition = (selectedDriver as any).racePosition || (selectedDriver as any).qualifyingPosition || (selectedDriver as any).practicePosition;
              console.log('🔍 Penalty Modal Debug:', {
                driverSessionResultId: getDriverSessionResultId(selectedDriver), // UUID primary key
                userId: (selectedDriver as any).user_id, // User mapping (may be null)
                jsonDriverId: (selectedDriver as any).json_driver_id, // In-game driver ID
                currentDriverPosition,
                penaltyHistoryKeys: Object.keys(penaltyHistory),
                totalPenaltiesInHistory: penaltyHistory['_all']?.length || 0,
                penaltiesForDriver: getDriverSessionResultId(selectedDriver) ? (penaltyHistory[getDriverSessionResultId(selectedDriver)!] || []).length : 0,
                existingPenaltiesCount: existingPenalties.length,
                existingPenalties: existingPenalties.map(p => ({ 
                  id: p.id, 
                  driver_session_result_id: p.driver_session_result_id,
                  storedPosition: p.old_value?.position,
                  currentPosition: p.new_value?.position,
                  seconds: p.new_value?.post_race_penalties - (p.old_value?.post_race_penalties || 0), 
                  reason: p.reason 
                })),
                selectedDriver: {
                  id: selectedDriver.id,
                  driver_session_result_id: (selectedDriver as any).driver_session_result_id,
                  user_id: (selectedDriver as any).user_id,
                  json_driver_id: (selectedDriver as any).json_driver_id,
                  currentPosition: currentDriverPosition
                }
              });
              
              return (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Existing Penalties
                  </label>
                  {existingPenalties.length > 0 ? (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {existingPenalties.map((penalty: any, index: number) => {
                        const penaltySeconds = penalty.new_value?.post_race_penalties - (penalty.old_value?.post_race_penalties || 0);
                        return (
                          <div key={penalty.id || index} className="flex items-center justify-between bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded border border-red-200 dark:border-red-800">
                            <span className="text-sm text-red-700 dark:text-red-300 font-medium">
                              {penaltySeconds > 0 ? `+${penaltySeconds}s` : `${penaltySeconds}s`} - {penalty.reason || 'No reason'}
                            </span>
                            <button
                              onClick={() => {
                                handleRemovePenaltyById(selectedDriver, penalty);
                              }}
                              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 hover:bg-red-100 dark:hover:bg-red-900/40 rounded p-1 transition-colors"
                              title="Remove penalty"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No existing post-race penalties</p>
                  )}
                </div>
              );
            })()}
            
            {/* Pending Penalties List */}
            {pendingPenalties.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Pending Penalties
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {pendingPenalties.map((penalty) => (
                    <div key={penalty.id} className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded border border-blue-200 dark:border-blue-800">
                      <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                        {penalty.seconds}s - {penalty.reason}
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
                    setPendingPenalties(pendingPenalties.filter(p => {
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
              {(pendingPenalties.length > 0 || pendingPenaltyRemovals.some(r => {
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
    </div>
  );
};