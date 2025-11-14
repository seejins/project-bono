import { QueryResultRow } from 'pg';
import { v4 as uuidv4 } from 'uuid';

import type { DatabaseService } from '../DatabaseService';
import { SessionResult } from './types';

const getDefaultStats = () => ({
  totalRaces: 0,
  wins: 0,
  podiums: 0,
  fastestLaps: 0,
  poles: 0,
  averagePosition: 0,
  bestFinish: 0,
});

async function recalculateDriverPostRacePenalties(
  this: DatabaseService,
  driverSessionResultId: string,
): Promise<{ sessionResultId: string }> {
  const now = new Date().toISOString();

  const current = await this.db.query(
    `SELECT session_result_id, total_race_time_ms, base_race_time_ms
     FROM driver_session_results
     WHERE id = $1`,
    [driverSessionResultId],
  );

  if (!current.rows[0]) {
    throw new Error(`Driver session result not found: ${driverSessionResultId}`);
  }

  const sessionResultId = current.rows[0].session_result_id;
  let baseRaceTimeMs = current.rows[0].base_race_time_ms;
  const currentTotalRaceTimeMs = current.rows[0].total_race_time_ms || 0;

  if (baseRaceTimeMs == null) {
    baseRaceTimeMs = currentTotalRaceTimeMs;
    await this.db.query(
      `UPDATE driver_session_results
       SET base_race_time_ms = $1
       WHERE id = $2`,
      [baseRaceTimeMs, driverSessionResultId],
    );
  }

  const penaltySum = await this.db.query(
    `SELECT COALESCE(SUM(seconds), 0) AS total_seconds
       FROM driver_penalties
       WHERE driver_session_result_id = $1`,
    [driverSessionResultId],
  );

  const totalPenaltySeconds = Number(penaltySum.rows[0]?.total_seconds || 0);
  const newTotalRaceTimeMs = baseRaceTimeMs + totalPenaltySeconds * 1000;

  await this.db.query(
    `UPDATE driver_session_results
     SET post_race_penalties = $1,
         total_race_time_ms = $2,
         updated_at = $3
     WHERE id = $4`,
    [totalPenaltySeconds, newTotalRaceTimeMs, now, driverSessionResultId],
  );

  return { sessionResultId };
}

export const sessionMethods = {
  async importSessionResults(
    this: DatabaseService,
    raceId: string,
    results: SessionResult[],
  ): Promise<{ resultsCount: number; lapTimesCount: number }> {
    const now = new Date().toISOString();

    await this.db.query('DELETE FROM f123_session_results WHERE race_id = $1', [raceId]);

    let lapTimesCount = 0;

    for (const result of results) {
      const driverId =
        (result.driverId && String(result.driverId)) ||
        (result.driverName ? result.driverName : uuidv4());
      const teamName = result.teamName ?? 'Unknown Team';
      const carNumber =
        result.carNumber !== undefined && result.carNumber !== null ? result.carNumber : 0;
      const position =
        result.position !== undefined && result.position !== null ? result.position : 0;
      const lapTime =
        result.lapTime !== undefined && result.lapTime !== null ? result.lapTime : null;
      const sector1 =
        result.sector1Time !== undefined && result.sector1Time !== null
          ? result.sector1Time
          : null;
      const sector2 =
        result.sector2Time !== undefined && result.sector2Time !== null
          ? result.sector2Time
          : null;
      const sector3 =
        result.sector3Time !== undefined && result.sector3Time !== null
          ? result.sector3Time
          : null;
      const bestLap =
        result.bestLapTime !== undefined && result.bestLapTime !== null
          ? result.bestLapTime
          : lapTime;

      await this.db.query(
        `INSERT INTO f123_session_results (id, race_id, driver_id, driver_name, team_name, car_number, position, lap_time, sector1_time, sector2_time, sector3_time, best_lap_time, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          uuidv4(),
          raceId,
          driverId,
          result.driverName,
          teamName,
          carNumber,
          position,
          lapTime,
          sector1,
          sector2,
          sector3,
          bestLap,
          now,
        ],
      );

      if (Array.isArray(result.lapTimes)) {
        lapTimesCount += result.lapTimes.length;
      }
    }

    return {
      resultsCount: results.length,
      lapTimesCount,
    };
  },

  async getSessionResultsByRace(this: DatabaseService, raceId: string): Promise<SessionResult[]> {
    const result = await this.db.query(
      `SELECT driver_id as "driverId", driver_name as "driverName", team_name as "teamName", car_number as "carNumber", 
              position, lap_time as "lapTime", sector1_time as "sector1Time", sector2_time as "sector2Time", 
              sector3_time as "sector3Time", best_lap_time as "bestLapTime", created_at as "createdAt"
       FROM f123_session_results WHERE race_id = $1 ORDER BY position`,
      [raceId],
    );
    return result.rows;
  },

  async storeF123SessionResults(
    this: DatabaseService,
    raceId: string,
    sessionType: number,
    driverResults: any[],
  ): Promise<void> {
    const now = new Date().toISOString();

    await this.db.query('DELETE FROM f123_session_results WHERE race_id = $1', [raceId]);

    for (const result of driverResults) {
      const driverName = result.driverName || result.mapped_driver_name || result.name || 'Unknown';
      const teamName = result.teamName || result.team || 'Unknown Team';
      const carNumber = result.carNumber || result.car_number || result.mapped_driver_number || 0;
      const driverId = result.driver_id || driverName || 'UNKNOWN';

      await this.db.query(
        `INSERT INTO f123_session_results (
          id, race_id, driver_id, driver_name, team_name, car_number, position, 
          lap_time, sector1_time, sector2_time, sector3_time, best_lap_time,
          data_source, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          uuidv4(),
          raceId,
          driverId,
          driverName,
          teamName,
          carNumber,
          result.position,
          result.best_lap_time_ms || null,
          result.sector1_time_ms || null,
          result.sector2_time_ms || null,
          result.sector3_time_ms || null,
          result.best_lap_time_ms || null,
          'FILE_UPLOAD',
          now,
        ],
      );
    }
  },

  async getMemberCareerStats(this: DatabaseService, memberId: string): Promise<any> {
    const query = `
      SELECT 
        COUNT(*) as totalRaces,
        SUM(CASE WHEN fsr.position = 1 THEN 1 ELSE 0 END) as wins,
        SUM(CASE WHEN fsr.position <= 3 THEN 1 ELSE 0 END) as podiums,
        SUM(CASE WHEN fsr.fastest_lap = true THEN 1 ELSE 0 END) as fastestLaps,
        SUM(CASE WHEN fsr.pole_position = true THEN 1 ELSE 0 END) as poles,
        AVG(fsr.position) as averagePosition,
        MIN(fsr.position) as bestFinish
      FROM f123_session_results fsr
      JOIN f123_driver_mappings fdm ON fsr.driver_id = fdm.f123_driver_id::text
      WHERE fdm.your_driver_id = $1 AND fsr.session_type = 10
    `;

    const result = await this.executeQuery(query, [memberId]);
    return result[0] || getDefaultStats();
  },

  async importRaceResults(
    this: DatabaseService,
    raceId: string,
    data: SessionResult[] | { results?: any[] },
  ): Promise<{ resultsCount: number; lapTimesCount: number }> {
    const rawResults = Array.isArray(data)
      ? data
      : Array.isArray(data?.results)
      ? data.results
      : [];

    if (!Array.isArray(rawResults) || rawResults.length === 0) {
      return { resultsCount: 0, lapTimesCount: 0 };
    }

    const normalizedResults: SessionResult[] = rawResults.map((result: any) => {
      const lapTimes = Array.isArray(result.lapTimes || result.lap_times)
        ? result.lapTimes || result.lap_times
        : undefined;

      return {
        driverId:
          result.driverId ??
          result.yourDriverId ??
          (typeof result.driverName === 'string' ? result.driverName : null),
        driverName: result.driverName ?? result.name ?? 'Unknown Driver',
        teamName: result.teamName ?? result.team ?? null,
        carNumber:
          result.carNumber ??
          result.driverNumber ??
          (typeof result.car_number === 'number' ? result.car_number : null),
        position:
          result.position ??
          result.finalPosition ??
          (typeof result.finishPosition === 'number' ? result.finishPosition : null),
        lapTime: result.lapTime ?? result.bestLapTime ?? null,
        sector1Time: result.sector1Time ?? null,
        sector2Time: result.sector2Time ?? null,
        sector3Time: result.sector3Time ?? null,
        bestLapTime: result.bestLapTime ?? null,
        gapToPole: result.gapToPole ?? null,
        penalties: result.penalties ?? null,
        warnings: result.warnings ?? null,
        dnfReason: result.dnfReason ?? null,
        fastestLap:
          typeof result.fastestLap === 'boolean' ? result.fastestLap : result.fastest_lap ?? false,
        polePosition:
          typeof result.polePosition === 'boolean'
            ? result.polePosition
            : result.pole_position ?? false,
        points:
          typeof result.points === 'number' ? result.points : result.pointsEarned ?? null,
        lapTimes,
        dataSource: result.dataSource ?? 'FILE_UPLOAD',
      };
    });

    return this.importSessionResults(raceId, normalizedResults);
  },

  async createSessionResult(
    this: DatabaseService,
    raceId: string,
    sessionType: number,
    sessionName: string,
    sessionUID: bigint | null,
    additionalData?: any,
  ): Promise<string> {
    const now = new Date().toISOString();

    const result = await this.db.query(
      `INSERT INTO session_results (id, race_id, session_type, session_name, session_uid, completed_at, created_at, additional_data) 
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (race_id, session_type) 
       DO UPDATE SET 
         completed_at = EXCLUDED.completed_at,
         session_name = EXCLUDED.session_name,
         session_uid = COALESCE(EXCLUDED.session_uid, session_results.session_uid),
         additional_data = COALESCE(EXCLUDED.additional_data, session_results.additional_data)
       RETURNING id`,
      [raceId, sessionType, sessionName, sessionUID, now, now, additionalData ? JSON.stringify(additionalData) : null],
    );

    return result.rows[0].id;
  },

  async getSessionByUID(
    this: DatabaseService,
    sessionUID: bigint,
  ): Promise<{ id: string; sessionName: string; trackName: string; raceDate: string; raceId: string } | null> {
    const result = await this.db.query(
      `SELECT sr.id, sr.session_name, r.track_name, r.race_date, sr.race_id
       FROM session_results sr 
       JOIN races r ON sr.race_id = r.id 
       WHERE sr.session_uid = $1 
       LIMIT 1`,
      [sessionUID.toString()],
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      sessionName: row.session_name,
      trackName: row.track_name,
      raceDate: row.race_date,
      raceId: row.race_id,
    };
  },

  async deleteDriverSessionResults(this: DatabaseService, sessionResultId: string): Promise<void> {
    const driverResults = await this.db.query(
      `SELECT id FROM driver_session_results WHERE session_result_id = $1`,
      [sessionResultId],
    );

    const driverResultIds = driverResults.rows.map((r: QueryResultRow) => r.id as string);
    if (driverResultIds.length > 0) {
      await this.db.query(
        `DELETE FROM lap_times WHERE driver_session_result_id = ANY($1)`,
        [driverResultIds],
      );
    }

    await this.db.query(
      `DELETE FROM driver_session_results WHERE session_result_id = $1`,
      [sessionResultId],
    );
  },

  async storeDriverSessionResults(
    this: DatabaseService,
    sessionResultId: string,
    driverResults: any[],
  ): Promise<Map<number, string>> {
    const now = new Date().toISOString();
    const driverResultIdMap = new Map<number, string>();

    for (let i = 0; i < driverResults.length; i++) {
      const result = driverResults[i];
      const driverSessionResultId = uuidv4();

      await this.db.query(
        `INSERT INTO driver_session_results (
          id, session_result_id, user_id, json_driver_id, json_driver_name, json_team_name, json_car_number,
          position, grid_position, points,
          num_laps, best_lap_time_ms, sector1_time_ms, sector2_time_ms, sector3_time_ms,
          total_race_time_ms, base_race_time_ms, penalties, post_race_penalties, warnings, num_unserved_drive_through_pens,
          num_unserved_stop_go_pens, result_status, dnf_reason, fastest_lap, pole_position, additional_data, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)`,
        [
          driverSessionResultId,
          sessionResultId,
          result.user_id,
          result.json_driver_id || null,
          result.json_driver_name || null,
          result.json_team_name || null,
          result.json_car_number || null,
          result.position,
          result.grid_position,
          result.points,
          result.num_laps,
          result.best_lap_time_ms,
          result.sector1_time_ms,
          result.sector2_time_ms,
          result.sector3_time_ms,
          result.total_race_time_ms,
          result.total_race_time_ms,
          result.penalties,
          result.post_race_penalties || 0,
          result.warnings,
          result.num_unserved_drive_through_pens,
          result.num_unserved_stop_go_pens,
          result.result_status,
          result.dnf_reason,
          result.fastest_lap,
          result.pole_position,
          result.additional_data ? JSON.stringify(result.additional_data) : null,
          now,
          now,
        ],
      );

      driverResultIdMap.set(i, driverSessionResultId);
    }

    return driverResultIdMap;
  },

  async storeLapTimes(
    this: DatabaseService,
    driverSessionResultId: string,
    raceId: string,
    lapData: any[],
  ): Promise<void> {
    if (!lapData || lapData.length === 0) {
      return;
    }

    const now = new Date().toISOString();

    const driverResult = await this.db.query(
      `SELECT user_id FROM driver_session_results WHERE id = $1`,
      [driverSessionResultId],
    );
    const userId = driverResult.rows[0]?.user_id || null;

    // Batch insert all lap times in a single query instead of N+1 queries
    if (lapData.length === 0) {
      return;
    }

    // Build parameterized VALUES clause
    const values: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    for (const lap of lapData) {
      const rowValues: string[] = [];
      // 30 parameters per row
      for (let i = 0; i < 30; i++) {
        rowValues.push(`$${paramIndex++}`);
      }
      values.push(`(${rowValues.join(', ')})`);
      
      // Push actual values in order
      params.push(
          uuidv4(),
          driverSessionResultId,
          raceId,
          userId,
          lap.lapNumber,
          lap.lapTimeMs,
          lap.sector1Ms || null,
          lap.sector2Ms || null,
          lap.sector3Ms || null,
          lap.sector1TimeMinutes || null,
          lap.sector2TimeMinutes || null,
          lap.sector3TimeMinutes || null,
          lap.lapValidBitFlags || null,
          lap.tireCompound || null,
          lap.trackPosition || null,
          lap.tireAgeLaps || null,
          lap.topSpeedKmph || null,
          lap.maxSafetyCarStatus || null,
          lap.vehicleFiaFlags || null,
          lap.pitStop || false,
          lap.ersStoreEnergy || null,
          lap.ersDeployedThisLap || null,
          lap.ersDeployMode || null,
          lap.fuelInTank || null,
          lap.fuelRemainingLaps || null,
          lap.gapToLeaderMs || null,
          lap.gapToPositionAheadMs || null,
          lap.carDamageData ? JSON.stringify(lap.carDamageData) : null,
          lap.tyreSetsData ? JSON.stringify(lap.tyreSetsData) : null,
          now,
      );
    }

    await this.db.query(
      `INSERT INTO lap_times (
        id, driver_session_result_id, race_id, driver_id, lap_number, 
        lap_time_ms, sector1_ms, sector2_ms, sector3_ms, 
        sector1_time_minutes, sector2_time_minutes, sector3_time_minutes,
        lap_valid_bit_flags, tire_compound, track_position, tire_age_laps,
        top_speed_kmph, max_safety_car_status, vehicle_fia_flags, pit_stop,
        ers_store_energy, ers_deployed_this_lap, ers_deploy_mode,
        fuel_in_tank, fuel_remaining_laps, gap_to_leader_ms, gap_to_position_ahead_ms,
        car_damage_data, tyre_sets_data, created_at
      ) VALUES ${values.join(', ')}
      ON CONFLICT DO NOTHING`,
      params,
    );
  },

  async getCompletedSessions(this: DatabaseService, raceId: string): Promise<any[]> {
    const result = await this.db.query(
      `SELECT id, session_type, session_name, completed_at, created_at
       FROM session_results 
       WHERE race_id = $1 
       ORDER BY session_type ASC`,
      [raceId],
    );

    console.log(`🔍 getCompletedSessions: Found ${result.rows.length} sessions for race_id ${raceId}`);

    return result.rows.map((row: QueryResultRow) => ({
      id: row.id,
      sessionType: row.session_type,
      sessionName: row.session_name,
      completedAt: row.completed_at,
      createdAt: row.created_at,
    }));
  },

  async getDriverSessionResults(
    this: DatabaseService,
    sessionResultId: string,
    includeLapTimes: boolean = false,
  ): Promise<any[]> {
    const sessionInfo = await this.db.query(
      `SELECT sr.race_id, sr.session_type 
       FROM session_results sr 
       WHERE sr.id = $1`,
      [sessionResultId],
    );

    if (sessionInfo.rows.length === 0) {
      console.log(`⚠️ getDriverSessionResults: No session found with id ${sessionResultId}`);
      return [];
    }

    const raceId = sessionInfo.rows[0].race_id;

    const countResult = await this.db.query(
      `SELECT COUNT(*) as count FROM driver_session_results WHERE session_result_id = $1`,
      [sessionResultId],
    );
    const driverCount = parseInt(countResult.rows[0].count, 10);
    console.log(
      `🔍 getDriverSessionResults: Found ${driverCount} driver_session_results for session ${sessionResultId}`,
    );

    const lapTimesSelect = includeLapTimes
      ? `,
        COALESCE(lap_times_summary.lap_times, '[]'::json) AS lap_times`
      : '';
    const lapTimesJoin = includeLapTimes
      ? `
       LEFT JOIN LATERAL (
         SELECT 
           COALESCE(
             json_agg(
               json_build_object(
                 'lap_number', lt.lap_number,
                 'lap_time_ms', lt.lap_time_ms,
                 'sector1_ms', lt.sector1_ms,
                 'sector2_ms', lt.sector2_ms,
                 'sector3_ms', lt.sector3_ms,
                 'sector1_time_minutes', lt.sector1_time_minutes,
                 'sector2_time_minutes', lt.sector2_time_minutes,
                 'sector3_time_minutes', lt.sector3_time_minutes,
                 'lap_valid_bit_flags', lt.lap_valid_bit_flags,
                 'tire_compound', lt.tire_compound,
                 'track_position', lt.track_position,
                 'tire_age_laps', lt.tire_age_laps,
                 'top_speed_kmph', lt.top_speed_kmph,
                 'max_safety_car_status', lt.max_safety_car_status,
                 'vehicle_fia_flags', lt.vehicle_fia_flags,
                 'pit_stop', lt.pit_stop,
                 'ers_store_energy', lt.ers_store_energy,
                 'ers_deployed_this_lap', lt.ers_deployed_this_lap,
                 'ers_deploy_mode', lt.ers_deploy_mode,
                 'fuel_in_tank', lt.fuel_in_tank,
                 'fuel_remaining_laps', lt.fuel_remaining_laps,
                 'gap_to_leader_ms', lt.gap_to_leader_ms,
                 'gap_to_position_ahead_ms', lt.gap_to_position_ahead_ms,
                 'car_damage_data', lt.car_damage_data,
                 'tyre_sets_data', lt.tyre_sets_data
               ) ORDER BY lt.lap_number
             ),
             '[]'::json
           ) AS lap_times
         FROM lap_times lt
         WHERE lt.driver_session_result_id = dsr.id
       ) lap_times_summary ON true`
      : '';

    const result = await this.db.query(
      `SELECT 
        dsr.id,
        dsr.session_result_id,
        dsr.user_id,
        dsr.json_driver_id,
        dsr.json_driver_name,
        dsr.json_team_name,
        dsr.json_car_number,
        dsr.position,
        dsr.grid_position,
        dsr.points,
        dsr.num_laps,
        dsr.best_lap_time_ms,
        dsr.sector1_time_ms,
        dsr.sector2_time_ms,
        dsr.sector3_time_ms,
        dsr.total_race_time_ms,
        dsr.base_race_time_ms,
        dsr.penalties,
        dsr.post_race_penalties,
        dsr.warnings,
        dsr.num_unserved_drive_through_pens,
        dsr.num_unserved_stop_go_pens,
        dsr.result_status,
        dsr.dnf_reason,
        dsr.fastest_lap,
        dsr.pole_position,
        dsr.additional_data,
        dsr.created_at,
        d.name as driver_name, 
        d.team as driver_team,
        d.number as driver_number,
        fdm.f123_team_name as mapping_team_name,
        fdm.f123_driver_name as mapping_driver_name,
        fdm.f123_driver_number as mapping_driver_number,
        penalty_summary.penalty_details,
        penalty_summary.total_post_race_penalties${lapTimesSelect}
       FROM driver_session_results dsr
       LEFT JOIN drivers d ON dsr.user_id = d.id
       LEFT JOIN f123_driver_mappings fdm ON (
         d.name = fdm.f123_driver_name
       )
       LEFT JOIN f123_session_results fsr ON (
         fsr.race_id = $2 
         AND fsr.position = dsr.position
       )
       LEFT JOIN LATERAL (
         SELECT 
           COALESCE(SUM(dp.seconds), 0) AS total_post_race_penalties,
           COALESCE(
             json_agg(
               json_build_object(
                 'id', dp.id,
                 'driver_session_result_id', dp.driver_session_result_id,
                 'seconds', dp.seconds,
                 'reason', dp.reason,
                 'created_at', dp.created_at,
                 'created_by', dp.created_by
               ) ORDER BY dp.created_at DESC
             ) FILTER (WHERE dp.id IS NOT NULL),
             '[]'::json
           ) AS penalty_details
        FROM driver_penalties dp
        WHERE dp.driver_session_result_id = dsr.id
       ) penalty_summary ON true${lapTimesJoin}
       WHERE dsr.session_result_id = $1
       ORDER BY dsr.position ASC NULLS LAST`,
      [sessionResultId, raceId],
    );

    console.log(
      `✅ getDriverSessionResults: Returning ${result.rows.length} driver results for session ${sessionResultId}`,
    );

    const transformedRows = result.rows.map((row) => {
      let additionalData = row.additional_data;
      if (additionalData === null || additionalData === undefined) {
        additionalData = null;
      } else if (typeof additionalData === 'string') {
        try {
          additionalData = JSON.parse(additionalData);
        } catch (e) {
          console.warn('Failed to parse additional_data:', e);
          additionalData = null;
        }
      }

      const transformed: any = {};
      for (const key in row) {
        if (key !== 'additional_data') {
          transformed[key] = row[key];
        }
      }
      transformed.additional_data = additionalData;
      transformed.additionalData = additionalData;

      let penaltyDetails = row.penalty_details;
      if (penaltyDetails === null || penaltyDetails === undefined) {
        penaltyDetails = [];
      } else if (typeof penaltyDetails === 'string') {
        try {
          penaltyDetails = JSON.parse(penaltyDetails);
        } catch (e) {
          console.warn('Failed to parse penalty_details:', e);
          penaltyDetails = [];
        }
      }
      transformed.penalty_details = penaltyDetails;
      transformed.penaltyDetails = penaltyDetails;
      transformed.total_post_race_penalties =
        row.total_post_race_penalties != null ? Number(row.total_post_race_penalties) : 0;
      if (Array.isArray(penaltyDetails) && penaltyDetails.length > 0) {
        const reasons = penaltyDetails
          .map((penalty: any) => penalty.reason)
          .filter((reason: any) => typeof reason === 'string' && reason.trim().length > 0);
        transformed.penalty_reason = penaltyDetails[0]?.reason ?? null;
        transformed.all_penalty_reasons = reasons.length > 0 ? reasons.join(' | ') : null;
      } else {
        transformed.penalty_reason = null;
        transformed.all_penalty_reasons = null;
      }

      if (includeLapTimes && row.lap_times) {
        if (typeof row.lap_times === 'string') {
          try {
            transformed.lap_times = JSON.parse(row.lap_times);
          } catch (e) {
            console.warn('Failed to parse lap_times:', e);
            transformed.lap_times = [];
          }
        } else {
          transformed.lap_times = row.lap_times;
        }
      } else if (includeLapTimes) {
        transformed.lap_times = [];
      }

      if (!additionalData && row.additional_data) {
        console.warn(`⚠️ Failed to parse additional_data for driver ${row.id}:`, {
          original_type: typeof row.additional_data,
          original_value: row.additional_data,
        });
      }

      return transformed;
    });

    if (transformedRows.length > 0) {
      const sample = transformedRows[0];
      console.log(`📊 Sample result (key fields):`, {
        position: sample.position,
        grid_position: sample.grid_position,
        points: sample.points,
        best_lap_time_ms: sample.best_lap_time_ms,
        total_race_time_ms: sample.total_race_time_ms,
        has_additional_data: !!sample.additional_data,
        additional_data_type: typeof sample.additional_data,
        participantData_driver_id: sample.additional_data?.participantData?.['driver-id'],
        participantData_keys: sample.additional_data?.participantData
          ? Object.keys(sample.additional_data.participantData)
          : null,
        full_additional_data_sample: JSON.stringify(sample.additional_data).substring(0, 500),
      });
    }

    return transformedRows;
  },

  async deleteOriginalSessionResults(this: DatabaseService, sessionResultId: string): Promise<void> {
    await this.db.query(
      `DELETE FROM session_results_original WHERE session_result_id = $1`,
      [sessionResultId],
    );
  },

  async storeOriginalSessionResults(
    this: DatabaseService,
    sessionResultId: string,
    driverResults: any[],
  ): Promise<void> {
    const now = new Date().toISOString();

    for (const result of driverResults) {
      await this.db.query(
        `INSERT INTO session_results_original (
          id, session_result_id, user_id, original_position, original_points,
          original_penalties, original_warnings, original_result_status,
          original_dnf_reason, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          uuidv4(),
          sessionResultId,
          result.user_id,
          result.position,
          result.points,
          result.penalties,
          result.warnings,
          result.result_status,
          result.dnf_reason,
          now,
        ],
      );
    }
  },

  async getPenaltiesForDriverResult(
    this: DatabaseService,
    driverSessionResultId: string,
  ): Promise<Array<{
    id: string;
    driver_session_result_id: string;
    seconds: number;
    reason: string | null;
    created_at: string;
    created_by: string | null;
  }>> {
    const result = await this.db.query(
      `SELECT id, driver_session_result_id, seconds, reason, created_at, created_by
       FROM driver_penalties
       WHERE driver_session_result_id = $1
       ORDER BY created_at DESC`,
      [driverSessionResultId],
    );

    return result.rows;
  },

  async getPenaltiesForSession(
    this: DatabaseService,
    sessionResultId: string,
  ): Promise<Array<{
    id: string;
    driver_session_result_id: string;
    seconds: number;
    reason: string | null;
    created_at: string;
    created_by: string | null;
  }>> {
    const result = await this.db.query(
      `SELECT dp.id,
              dp.driver_session_result_id,
              dp.seconds,
              dp.reason,
              dp.created_at,
              dp.created_by
       FROM driver_penalties dp
       INNER JOIN driver_session_results dsr ON dsr.id = dp.driver_session_result_id
       WHERE dsr.session_result_id = $1
       ORDER BY dp.created_at DESC`,
      [sessionResultId],
    );

    return result.rows;
  },

  async addPenalty(
    this: DatabaseService,
    driverSessionResultId: string,
    penaltySeconds: number,
    reason: string,
    editedBy: string,
  ): Promise<{
    id: string;
    driver_session_result_id: string;
    seconds: number;
    reason: string | null;
    created_at: string;
    created_by: string | null;
  }> {
    const normalizedSeconds = Math.round(penaltySeconds);
    if (!Number.isFinite(normalizedSeconds) || normalizedSeconds <= 0) {
      throw new Error('Penalty seconds must be a positive number');
    }

    const insertResult = await this.db.query(
      `INSERT INTO driver_penalties (id, driver_session_result_id, seconds, reason, created_by)
       VALUES (gen_random_uuid(), $1, $2, $3, $4)
       RETURNING id, driver_session_result_id, seconds, reason, created_at, created_by`,
      [driverSessionResultId, normalizedSeconds, reason || null, editedBy || null],
    );

    const { sessionResultId } = await recalculateDriverPostRacePenalties.call(
      this,
      driverSessionResultId,
    );
    await this.recalculatePositions(sessionResultId);

    return insertResult.rows[0];
  },

  async updateDriverUserMapping(
    this: DatabaseService,
    driverSessionResultId: string,
    userId: string | null,
  ): Promise<
    Array<{
      driverSessionResultId: string;
      sessionResultId: string;
      oldUserId: string | null;
      newUserId: string | null;
    }>
  > {
    const normalizedUserId = userId ? String(userId) : null;
    const updates: Array<{
      driverSessionResultId: string;
      sessionResultId: string;
      oldUserId: string | null;
      newUserId: string | null;
    }> = [];

    await this.withTransaction(async (tx) => {
      const current = await tx.query(
        `SELECT 
           dsr.session_result_id,
           dsr.user_id,
           dsr.json_driver_id,
           dsr.json_driver_name,
           sr.race_id
         FROM driver_session_results dsr
         JOIN session_results sr ON sr.id = dsr.session_result_id
         WHERE dsr.id = $1`,
        [driverSessionResultId],
      );

      if (!current.rows[0]) {
        const error: any = new Error('Driver session result not found');
        error.code = 'DRIVER_RESULT_NOT_FOUND';
        throw error;
      }

      const {
        session_result_id: sessionResultId,
        user_id: previousUserIdRaw,
        json_driver_id: jsonDriverId,
        json_driver_name: jsonDriverName,
        race_id: raceId,
      } = current.rows[0];
      const previousUserId: string | null = previousUserIdRaw || null;

      let matchingDriverRows;
      if (jsonDriverId !== null && jsonDriverId !== undefined) {
        matchingDriverRows = await tx.query(
          `SELECT dsr.id, dsr.session_result_id, dsr.user_id
           FROM driver_session_results dsr
           JOIN session_results sr ON sr.id = dsr.session_result_id
           WHERE sr.race_id = $1
             AND dsr.json_driver_id = $2`,
          [raceId, jsonDriverId],
        );
      } else {
        matchingDriverRows = await tx.query(
          `SELECT dsr.id, dsr.session_result_id, dsr.user_id
           FROM driver_session_results dsr
           JOIN session_results sr ON sr.id = dsr.session_result_id
           WHERE sr.race_id = $1
             AND dsr.json_driver_id IS NULL
             AND dsr.json_driver_name = $2`,
          [raceId, jsonDriverName],
        );
      }

      const now = new Date().toISOString();

      for (const row of matchingDriverRows.rows) {
        const targetId: string = row.id;
        const targetSessionResultId: string = row.session_result_id;
        const currentUserId: string | null = row.user_id || null;

        if (targetId !== driverSessionResultId) {
          if (
            currentUserId &&
            normalizedUserId &&
            currentUserId !== normalizedUserId
          ) {
            const conflictError: any = new Error(
              'User already mapped to another driver in this session',
            );
            conflictError.code = 'USER_ALREADY_MAPPED';
            conflictError.conflictDriverSessionResultId = targetId;
            throw conflictError;
          }
          if (normalizedUserId) {
            const conflict = await tx.query(
              `SELECT id
               FROM driver_session_results
               WHERE session_result_id = $1
                 AND user_id = $2
                 AND id <> $3
               LIMIT 1`,
              [targetSessionResultId, normalizedUserId, targetId],
            );

            if (conflict.rows.length > 0) {
              const conflictError: any = new Error(
                'User already mapped to another driver in this session',
              );
              conflictError.code = 'USER_ALREADY_MAPPED';
              conflictError.conflictDriverSessionResultId = conflict.rows[0].id;
              throw conflictError;
            }
          }
        } else {
          if (
            normalizedUserId &&
            normalizedUserId === currentUserId
          ) {
            // Already mapped as requested; continue but still cascade to others.
          } else if (normalizedUserId) {
            const conflict = await tx.query(
              `SELECT id
               FROM driver_session_results
               WHERE session_result_id = $1
                 AND user_id = $2
                 AND id <> $3
               LIMIT 1`,
              [targetSessionResultId, normalizedUserId, targetId],
            );

            if (conflict.rows.length > 0) {
              const conflictError: any = new Error(
                'User already mapped to another driver in this session',
              );
              conflictError.code = 'USER_ALREADY_MAPPED';
              conflictError.conflictDriverSessionResultId = conflict.rows[0].id;
              throw conflictError;
            }
          }
        }

        if (currentUserId === normalizedUserId) {
          updates.push({
            driverSessionResultId: targetId,
            sessionResultId: targetSessionResultId,
            oldUserId: currentUserId,
            newUserId: normalizedUserId,
          });
          continue;
        }

        await tx.query(
          `UPDATE driver_session_results
           SET user_id = $1,
               updated_at = $2
           WHERE id = $3`,
          [normalizedUserId, now, targetId],
        );

        updates.push({
          driverSessionResultId: targetId,
          sessionResultId: targetSessionResultId,
          oldUserId: currentUserId,
          newUserId: normalizedUserId,
        });
      }

      if (!matchingDriverRows.rows.some((row) => row.id === driverSessionResultId)) {
        updates.push({
          driverSessionResultId,
          sessionResultId,
          oldUserId: previousUserId,
          newUserId: normalizedUserId,
        });
      }
    });

    return updates;
  },

  async removePenalty(
    this: DatabaseService,
    driverSessionResultId: string,
    penaltyId: string,
  ): Promise<void> {
    const deleted = await this.db.query(
      `DELETE FROM driver_penalties
       WHERE id = $1 AND driver_session_result_id = $2
       RETURNING driver_session_result_id`,
      [penaltyId, driverSessionResultId],
    );

    if (deleted.rows.length === 0) {
      throw new Error(
        `Penalty ${penaltyId} not found for driver session result ${driverSessionResultId}`,
      );
    }

    const { sessionResultId } = await recalculateDriverPostRacePenalties.call(
      this,
      driverSessionResultId,
    );
    await this.recalculatePositions(sessionResultId);
  },

  async recalculatePositions(this: DatabaseService, sessionResultId: string): Promise<void> {
    const drivers = await this.db.query(
      `SELECT id, position, total_race_time_ms, result_status
       FROM driver_session_results
       WHERE session_result_id = $1
       ORDER BY 
         CASE WHEN result_status = 2 THEN 0 ELSE 1 END,
         total_race_time_ms ASC NULLS LAST,
         position ASC`,
      [sessionResultId],
    );

    // Batch update positions in a single query instead of N+1 queries
    const updates: Array<{ id: string; position: number }> = [];
    for (let i = 0; i < drivers.rows.length; i++) {
      const driver = drivers.rows[i];
      const newPosition = i + 1;

      if (driver.position !== newPosition) {
        updates.push({ id: driver.id, position: newPosition });
      }
    }

    if (updates.length > 0) {
      // Use CASE statement with parameterized queries to batch update all positions
      const params: any[] = [];
      const cases: string[] = [];
      const ids: string[] = [];
      
      updates.forEach((update, index) => {
        const idParam = `$${index * 2 + 1}`;
        const posParam = `$${index * 2 + 2}`;
        cases.push(`WHEN id = ${idParam} THEN ${posParam}`);
        params.push(update.id, update.position);
        ids.push(idParam);
      });
      
      params.push(...updates.map(u => u.id));
      
        await this.db.query(
          `UPDATE driver_session_results 
         SET position = CASE ${cases.join(' ')} END
         WHERE id IN (${ids.join(', ')})`,
        params,
        );
    }
  },

  async changePosition(
    this: DatabaseService,
    sessionResultId: string,
    driverId: string,
    newPosition: number,
    reason: string,
    editedBy: string,
  ): Promise<void> {
    const now = new Date().toISOString();

    const current = await this.db.query(
      'SELECT position FROM driver_session_results WHERE session_result_id = $1 AND driver_id = $2',
      [sessionResultId, driverId],
    );

    if (!current.rows[0]) {
      throw new Error('Driver session result not found');
    }

    const oldPosition = current.rows[0].position;

    await this.db.query(
      'UPDATE driver_session_results SET position = $1, updated_at = $2 WHERE session_result_id = $3 AND driver_id = $4',
      [newPosition, now, sessionResultId, driverId],
    );

    await this.db.query(
      `INSERT INTO race_edit_history (id, session_result_id, user_id, edit_type, old_value, new_value, reason, edited_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        uuidv4(),
        sessionResultId,
        driverId,
        'position_change',
        { position: oldPosition },
        { position: newPosition },
        reason,
        editedBy,
        now,
      ],
    );
  },

  async resetDriverToOriginal(
    this: DatabaseService,
    sessionResultId: string,
    driverId: string,
  ): Promise<void> {
    const now = new Date().toISOString();

    const original = await this.db.query(
      'SELECT * FROM session_results_original WHERE session_result_id = $1 AND driver_id = $2',
      [sessionResultId, driverId],
    );

    if (!original.rows[0]) {
      throw new Error('Original session result not found');
    }

    const orig = original.rows[0];

    await this.db.query(
      `UPDATE driver_session_results SET 
       position = $1, points = $2, penalties = $3, warnings = $4, 
       result_status = $5, dnf_reason = $6, updated_at = $7
       WHERE session_result_id = $8 AND driver_id = $9`,
      [
        orig.original_position,
        orig.original_points,
        orig.original_penalties,
        orig.original_warnings,
        orig.original_result_status,
        orig.original_dnf_reason,
        now,
        sessionResultId,
        driverId,
      ],
    );

    await this.db.query(
      'UPDATE session_results_original SET is_restored = true WHERE session_result_id = $1 AND driver_id = $2',
      [sessionResultId, driverId],
    );

    await this.db.query(
      `INSERT INTO race_edit_history (id, session_result_id, user_id, edit_type, old_value, new_value, reason, edited_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        uuidv4(),
        sessionResultId,
        driverId,
        'reset_to_original',
        {},
        {},
        'Reset to original UDP data',
        'system',
        now,
      ],
    );
  },

  async getEditHistory(this: DatabaseService, sessionResultId: string): Promise<any[]> {
    const result = await this.db.query(
      `SELECT reh.*, d.name as driver_name, dsr.json_driver_name, dsr.json_team_name
       FROM race_edit_history reh
       LEFT JOIN drivers d ON reh.user_id = d.id
       LEFT JOIN driver_session_results dsr ON reh.driver_session_result_id = dsr.id
       WHERE reh.session_result_id = $1
       ORDER BY reh.created_at DESC`,
      [sessionResultId],
    );

    return result.rows;
  },

  async getEditHistoryForDriver(
    this: DatabaseService,
    driverSessionResultId: string,
  ): Promise<any[]> {
    const result = await this.db.query(
      `SELECT reh.*, d.name as driver_name, dsr.json_driver_name, dsr.json_team_name
       FROM race_edit_history reh
       LEFT JOIN drivers d ON reh.user_id = d.id
       LEFT JOIN driver_session_results dsr ON reh.driver_session_result_id = dsr.id
       WHERE reh.driver_session_result_id = $1
       ORDER BY reh.created_at DESC`,
      [driverSessionResultId],
    );

    return result.rows;
  },

  async revertEdit(this: DatabaseService, editId: string): Promise<void> {
    const edit = await this.db.query(
      'SELECT * FROM race_edit_history WHERE id = $1 AND is_reverted = false',
      [editId],
    );

    if (!edit.rows[0]) {
      throw new Error('Edit not found or already reverted');
    }

    const editData = edit.rows[0];

    if (
      editData.edit_type === 'penalty' ||
      editData.edit_type === 'post_race_penalty' ||
      editData.edit_type === 'post_race_penalty_removal'
    ) {
      if (
        editData.edit_type === 'post_race_penalty' ||
        editData.edit_type === 'post_race_penalty_removal'
      ) {
        const driverResult = await this.db.query(
          `SELECT id FROM driver_session_results 
           WHERE session_result_id = $1 
           AND (driver_id = $2 OR (driver_id IS NULL AND $2 IS NULL))`,
          [editData.session_result_id, editData.driver_id],
        );

        if (driverResult.rows[0]) {
          const driverId = driverResult.rows[0].id;
          await this.db.query(
            `UPDATE driver_session_results 
             SET post_race_penalties = $1, total_race_time_ms = $2 
             WHERE id = $3`,
            [
              editData.old_value.post_race_penalties || 0,
              editData.old_value.total_race_time_ms || 0,
              driverId,
            ],
          );
          await this.recalculatePositions(editData.session_result_id);
        }
      } else {
        await this.db.query(
          'UPDATE driver_session_results SET penalties = $1 WHERE session_result_id = $2 AND (driver_id = $3 OR (driver_id IS NULL AND $3 IS NULL))',
          [editData.old_value.penalties, editData.session_result_id, editData.driver_id],
        );
      }
    } else if (editData.edit_type === 'position_change') {
      const driverResult = await this.db.query(
        `SELECT id FROM driver_session_results 
         WHERE session_result_id = $1 
         AND (driver_id = $2 OR (driver_id IS NULL AND $2 IS NULL))`,
        [editData.session_result_id, editData.driver_id],
      );

      if (driverResult.rows[0]) {
        await this.db.query(
          'UPDATE driver_session_results SET position = $1 WHERE id = $2',
          [editData.old_value.position, driverResult.rows[0].id],
        );
      }
    }

    await this.db.query('UPDATE race_edit_history SET is_reverted = true WHERE id = $1', [editId]);
  },
} satisfies Partial<Record<keyof DatabaseService, unknown>>;

