import { useEffect, useState } from 'react';
import { F123DataService } from '../../../services/F123DataService';
import { DriverRaceData, LapData, DriverSessionData, DriverResultWithMeta } from '../types';

interface UseDriverRaceDataResult extends DriverRaceData {}

type CanonicalDriverIdentifiers = {
  driverId: string | null;
  jsonDriverId: string | null;
  driverName: string | null;
  carNumber: string | null;
};

const getApiUrl = () => import.meta.env.VITE_API_URL || 'http://localhost:3001';

const DEFAULT_STATE: UseDriverRaceDataResult = {
  raceData: null,
  sessions: [],
  defaultSessionId: null,
  loading: true,
  error: null,
};

export const useDriverRaceData = (driverId: string, raceId: string): UseDriverRaceDataResult => {
  const [state, setState] = useState<UseDriverRaceDataResult>(DEFAULT_STATE);

  useEffect(() => {
    const abortController = new AbortController();

    const fetchDriverRaceData = async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const apiUrl = getApiUrl();
        const fetchOptions = { signal: abortController.signal };

        // Fetch race metadata
        const raceMetadataResponse = await fetch(`${apiUrl}/api/races/${raceId}`, fetchOptions);
        let raceMetadata: any = null;
        if (raceMetadataResponse.ok) {
          const raceMetadataResult = await raceMetadataResponse.json();
          raceMetadata = raceMetadataResult?.race ?? null;
        }

        // Fetch race results with driver data (includes lap_times if available)
        const raceResponse = await fetch(`${apiUrl}/api/races/${raceId}/results`, fetchOptions);
        if (!raceResponse.ok) {
          const errorText = await raceResponse.text();
          throw new Error(`Failed to fetch race data: ${raceResponse.status} ${errorText}`);
        }

        const raceDataResult = await raceResponse.json();
        const sessionsFromResponse: any[] = Array.isArray(raceDataResult.sessions)
          ? raceDataResult.sessions
          : [];

        if (sessionsFromResponse.length === 0) {
          throw new Error('No session data found for this race');
        }

        const canonicalIdentifiers = deriveCanonicalDriverIdentifiers(
          sessionsFromResponse,
          driverId
        );

        const sessionsData: DriverSessionData[] = sessionsFromResponse.map((session: any, index: number) => {
          const sessionTypeRaw = session?.sessionType ?? session?.session_type ?? 0;
          const sessionType = Number(sessionTypeRaw) || 0;
          const sessionTypeName = F123DataService.getSessionTypeName(sessionType);
          const sessionIdRaw =
            session?.id ??
            session?.sessionId ??
            session?.session_id ??
            session?.session_result_id ??
            `${raceId}-${sessionType}-${index}`;
          const sessionId = String(sessionIdRaw);
          const sessionName = session?.sessionName ?? session?.session_name ?? sessionTypeName;
          const sessionResults: any[] = Array.isArray(session?.results) ? session.results : [];

          const driverResult = sessionResults.find((result: any) =>
            doesResultMatchDriver(result, canonicalIdentifiers)
          );

          let transformedDriver: DriverResultWithMeta | null = null;
          let lapDataWithGaps: LapData[] = [];
          let sessionDrivers = sessionResults;

          if (driverResult) {
            transformedDriver = transformDriverResult(driverResult);
            const { lapData: enrichedLapData, sessionDrivers: enrichedSessionDrivers } = buildLapDataWithGaps(
              transformedDriver,
              sessionResults
            );
            lapDataWithGaps = enrichedLapData;
            sessionDrivers = enrichedSessionDrivers;
          }

          return {
            sessionId,
            sessionType,
            sessionName,
            sessionTypeName,
            driver: transformedDriver,
            lapData: lapDataWithGaps,
            sessionDrivers,
          };
        });

        const hasDriverData = sessionsData.some((session) => session.driver);
        if (!hasDriverData) {
          throw new Error(`Driver with id ${driverId} not found in any session results`);
        }

        const defaultSession =
          sessionsData.find((session) => session.sessionType === 10 && session.driver) ||
          sessionsData.find((session) => session.driver) ||
          sessionsData[0] ||
          null;

        if (!abortController.signal.aborted) {
          setState({
            raceData: raceMetadata,
            sessions: sessionsData,
            defaultSessionId: defaultSession ? defaultSession.sessionId : null,
            loading: false,
            error: null,
          });
        }
      } catch (error: any) {
        if (abortController.signal.aborted) {
          return;
        }

        setState((prev) => ({
          ...prev,
          loading: false,
          error: error?.message ?? 'Failed to load driver race data',
        }));
      }
    };

    fetchDriverRaceData();

    return () => {
      abortController.abort();
    };
  }, [driverId, raceId]);

  return state;
};

const transformDriverResult = (result: any): DriverResultWithMeta => {
  const additionalData = parseAdditionalData(result.additional_data);

  const mappedName =
    result.driver_name ||
    result.mapping_driver_name ||
    additionalData?.participantData?.name ||
    null;

  const displayName =
    mappedName ||
    result.json_driver_name ||
    'Unknown Driver';

  return {
    id: result.id,
    name: displayName,
    team: result.json_team_name || result.mapping_team_name || result.driver_team || 'Unknown Team',
    number: result.json_car_number || result.driver_number || result.mapping_driver_number || result.position || 0,
    additional_data: additionalData,
    additionalData,
    racePosition: result.position != null ? Number(result.position) : undefined,
    _totalRaceTimeMs: result.total_race_time_ms != null ? Number(result.total_race_time_ms) : undefined,
    raceLapTime: result.best_lap_time_ms != null ? Number(result.best_lap_time_ms) : undefined,
    raceBestLapTime: result.best_lap_time_ms != null ? Number(result.best_lap_time_ms) : undefined,
    raceSector1Time: result.sector1_time_ms != null ? Number(result.sector1_time_ms) : undefined,
    raceSector2Time: result.sector2_time_ms != null ? Number(result.sector2_time_ms) : undefined,
    raceSector3Time: result.sector3_time_ms != null ? Number(result.sector3_time_ms) : undefined,
    points: result.points != null ? Number(result.points) : 0,
    fastestLap: result.fastest_lap === true || result.fastest_lap === 'true' || result.fastest_lap === 1,
    fastestLapTime: result.best_lap_time_ms != null ? Number(result.best_lap_time_ms) : undefined,
    status: mapResultStatus(result.result_status) as 'finished' | 'dnf' | 'dsq' | 'dns' | 'dnq',
    gridPosition: result.grid_position != null ? Number(result.grid_position) : undefined,
    penalties: result.penalties != null ? Number(result.penalties) : 0,
    postRacePenalties: result.post_race_penalties != null ? Number(result.post_race_penalties) : 0,
    totalPenalties: (result.penalties || 0) + (result.post_race_penalties || 0),
    penaltyReason: result.penalty_reason || result.all_penalty_reasons || null,
    warnings: result.warnings != null ? Number(result.warnings) : 0,
    dnf: result.result_status === 4 || result.result_status === 7 || result.dnf_reason ? true : false,
    dnfReason: result.dnf_reason,
    lap_times: result.lap_times || [],
    dataSource: 'FILE_UPLOAD' as const,
    raceGap: null,
    raceTime:
      result.total_race_time_ms != null
        ? F123DataService.formatTimeFromMs(Number(result.total_race_time_ms))
        : '--:--.---',
  };
};

const parseAdditionalData = (raw: any) => {
  if (!raw) {
    return null;
  }
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch (error) {
      return {};
    }
  }
  return raw;
};

const mapResultStatus = (status: any): string => {
  switch (String(status)) {
    case '2':
      return 'finished';
    case '4':
    case '7':
      return 'dnf';
    case '5':
      return 'dsq';
    case '6':
      return 'dnq';
    default:
      return 'finished';
  }
};

const buildLapDataWithGaps = (
  driver: DriverResultWithMeta,
  sessionResults: any[]
): { lapData: LapData[]; sessionDrivers: any[] } => {
  const sessionDrivers = sessionResults || [];

  if (!driver.lap_times || driver.lap_times.length === 0) {
    return { lapData: [], sessionDrivers };
  }

  const sortedDriverLaps = [...driver.lap_times].sort(
    (a: any, b: any) => (a.lap_number || 0) - (b.lap_number || 0)
  );

  const cumulativeLapTimes = new Map<number, number>();
  let cumulativeTime = 0;
  sortedDriverLaps.forEach((lap: any) => {
    if (lap.lap_time_ms && lap.lap_time_ms > 0) {
      cumulativeTime += lap.lap_time_ms;
      cumulativeLapTimes.set(lap.lap_number, cumulativeTime);
    }
  });

  const allDriversCumulative = new Map<string, Map<number, number>>();
  sessionDrivers.forEach((otherDriver: any) => {
    if (otherDriver.id === driver.id) return;

    const otherLapTimes = otherDriver.lap_times || [];
    if (otherLapTimes.length === 0) return;

    const sortedOtherLaps = [...otherLapTimes].sort(
      (a: any, b: any) => (a.lap_number || 0) - (b.lap_number || 0)
    );

    const otherCumulative = new Map<number, number>();
    let otherCumulativeTime = 0;
    sortedOtherLaps.forEach((lap: any) => {
      if (lap.lap_time_ms && lap.lap_time_ms > 0) {
        otherCumulativeTime += lap.lap_time_ms;
        otherCumulative.set(lap.lap_number, otherCumulativeTime);
      }
    });

    allDriversCumulative.set(otherDriver.id, otherCumulative);
  });

  const lapDataWithGaps: LapData[] = sortedDriverLaps.map((lap: any) => {
    if (!lap.lap_time_ms || lap.lap_time_ms <= 0) {
      return lap;
    }

    const lapNumber = lap.lap_number;
    const thisDriverCumulative = cumulativeLapTimes.get(lapNumber) || 0;

    let leaderCumulative = Infinity;
    allDriversCumulative.forEach((otherCumulative) => {
      const otherTime = otherCumulative.get(lapNumber);
      if (otherTime !== undefined && otherTime > 0 && otherTime < leaderCumulative) {
        leaderCumulative = otherTime;
      }
    });

    if (thisDriverCumulative > 0 && thisDriverCumulative <= leaderCumulative) {
      leaderCumulative = thisDriverCumulative;
    }

    let positionAheadCumulative = Infinity;
    const thisPosition = lap.track_position;

    if (thisPosition && thisPosition > 1) {
      sessionDrivers.forEach((otherDriver: any) => {
        if (otherDriver.id === driver.id) return;

        const otherLapTimes = otherDriver.lap_times || [];
        const otherLapAtThisLap = otherLapTimes.find((l: any) => l.lap_number === lapNumber);
        const otherPosition = otherLapAtThisLap?.track_position;

        if (otherPosition === thisPosition - 1) {
          const otherCumulative = allDriversCumulative.get(otherDriver.id);
          if (otherCumulative) {
            const otherTime = otherCumulative.get(lapNumber);
            if (otherTime !== undefined && otherTime > 0 && otherTime < positionAheadCumulative) {
              positionAheadCumulative = otherTime;
            }
          }
        }
      });
    }

    const gapToLeader =
      leaderCumulative !== Infinity && thisDriverCumulative > 0 && thisDriverCumulative > leaderCumulative
        ? thisDriverCumulative - leaderCumulative
        : null;

    const gapToAhead =
      positionAheadCumulative !== Infinity &&
      thisDriverCumulative > 0 &&
      thisDriverCumulative > positionAheadCumulative
        ? thisDriverCumulative - positionAheadCumulative
        : null;

    return {
      ...lap,
      gap_to_leader_ms: gapToLeader,
      gap_to_position_ahead_ms: gapToAhead,
    };
  });

  return { lapData: lapDataWithGaps, sessionDrivers };
};

const deriveCanonicalDriverIdentifiers = (
  sessions: any[],
  driverId: string
): CanonicalDriverIdentifiers => {
  const driverIdStr = driverId ? String(driverId) : null;

  const directMatchSession = sessions.find((session: any) =>
    Array.isArray(session?.results) && session.results.some((result: any) => String(result?.id) === driverIdStr)
  );

  if (directMatchSession) {
    const match = directMatchSession.results.find((result: any) => String(result?.id) === driverIdStr);

    return {
      driverId: driverIdStr,
      jsonDriverId: normalizeIdentifier(match?.json_driver_id ?? match?.jsonDriverId),
      driverName: normalizeIdentifier(
        match?.json_driver_name ?? match?.driver_name ?? match?.mapping_driver_name ?? match?.name,
        true
      ),
      carNumber: normalizeIdentifier(match?.json_car_number ?? match?.driver_number ?? match?.number),
    };
  }

  // Fallback: use the first session's first result as reference if we cannot find an exact match
  for (const session of sessions) {
    const candidate = Array.isArray(session?.results) && session.results.length > 0 ? session.results[0] : null;
    if (!candidate) {
      continue;
    }

    return {
      driverId: driverIdStr,
      jsonDriverId: normalizeIdentifier(candidate?.json_driver_id ?? candidate?.jsonDriverId),
      driverName: normalizeIdentifier(
        candidate?.json_driver_name ?? candidate?.driver_name ?? candidate?.mapping_driver_name ?? candidate?.name,
        true
      ),
      carNumber: normalizeIdentifier(candidate?.json_car_number ?? candidate?.driver_number ?? candidate?.number),
    };
  }

  return {
    driverId: driverIdStr,
    jsonDriverId: null,
    driverName: null,
    carNumber: null,
  };
};

const doesResultMatchDriver = (result: any, identifiers: CanonicalDriverIdentifiers): boolean => {
  if (!result || !identifiers) {
    return false;
  }

  if (identifiers.driverId && String(result?.id) === identifiers.driverId) {
    return true;
  }

  const resultJsonDriverId = normalizeIdentifier(result?.json_driver_id ?? result?.jsonDriverId);
  if (identifiers.jsonDriverId && resultJsonDriverId === identifiers.jsonDriverId) {
    return true;
  }

  const resultCarNumber = normalizeIdentifier(result?.json_car_number ?? result?.driver_number ?? result?.number);
  if (identifiers.carNumber && resultCarNumber && resultCarNumber === identifiers.carNumber) {
    return true;
  }

  const resultDriverName = normalizeIdentifier(
    result?.json_driver_name ?? result?.driver_name ?? result?.mapping_driver_name ?? result?.name,
    true
  );

  if (identifiers.driverName && resultDriverName && resultDriverName === identifiers.driverName) {
    return true;
  }

  return false;
};

const normalizeIdentifier = (value: any, lowercase: boolean = false): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return null;
  }

  return lowercase ? normalized.toLowerCase() : normalized;
};

export default useDriverRaceData;
