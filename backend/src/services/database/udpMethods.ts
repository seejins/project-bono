import { v4 as uuidv4 } from 'uuid';

import type { DatabaseService } from '../DatabaseService';

export const udpMethods = {
  async addUDPParticipant(this: DatabaseService, data: any): Promise<void> {
    const now = new Date().toISOString();

    await this.db.query(
      `INSERT INTO f123_udp_participants (
        id, season_id, user_id, vehicle_index, ai_controlled, f123_driver_id, 
        network_id, team_id, my_team, race_number, nationality, name, 
        your_telemetry, show_online_names, platform, session_uid, 
        session_time, frame_identifier, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
      [
        uuidv4(),
        data.seasonId,
        data.driverId || null,
        data.vehicleIndex,
        data.aiControlled,
        data.f123DriverId || data.driverId,
        data.networkId,
        data.teamId,
        data.myTeam,
        data.raceNumber,
        data.nationality,
        data.name,
        data.yourTelemetry,
        data.showOnlineNames,
        data.platform,
        data.sessionUid,
        data.sessionTime,
        data.frameIdentifier,
        now,
      ],
    );
  },

  async addUDPSessionResult(this: DatabaseService, data: any): Promise<void> {
    const now = new Date().toISOString();

    await this.db.query(
      `INSERT INTO f123_udp_session_results (
        id, season_id, event_id, user_id, position, num_laps, grid_position, 
        points, num_pit_stops, result_status, best_lap_time_ms, total_race_time_seconds,
        penalties_time, num_penalties, num_tyre_stints, session_uid, session_time,
        frame_identifier, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
      [
        uuidv4(),
        data.seasonId,
        data.eventId,
        data.driverId || null,
        data.position,
        data.numLaps,
        data.gridPosition,
        data.points,
        data.numPitStops,
        data.resultStatus,
        data.bestLapTimeMs,
        data.totalRaceTimeSeconds,
        data.penaltiesTime,
        data.numPenalties,
        data.numTyreStints,
        data.sessionUid,
        data.sessionTime,
        data.frameIdentifier,
        now,
      ],
    );
  },

  async addUDPTyreStint(this: DatabaseService, data: any): Promise<void> {
    const now = new Date().toISOString();

    await this.db.query(
      `INSERT INTO f123_udp_tyre_stints (
        id, user_id, stint_number, end_lap, tyre_actual_compound, 
        tyre_visual_compound, session_uid, session_time, frame_identifier, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        uuidv4(),
        data.driverId || null,
        data.stintNumber,
        data.endLap,
        data.tyreActualCompound,
        data.tyreVisualCompound,
        data.sessionUid,
        data.sessionTime,
        data.frameIdentifier,
        now,
      ],
    );
  },

  async addUDPLapHistory(this: DatabaseService, data: any): Promise<void> {
    const now = new Date().toISOString();

    await this.db.query(
      `INSERT INTO f123_udp_lap_history (
        id, user_id, lap_number, lap_time_ms, sector1_time_ms, sector1_time_minutes,
        sector2_time_ms, sector2_time_minutes, sector3_time_ms, sector3_time_minutes,
        lap_valid_bit_flags, session_uid, session_time, frame_identifier, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        uuidv4(),
        data.driverId || null,
        data.lapNumber,
        data.lapTimeMs,
        data.sector1TimeMs,
        data.sector1TimeMinutes,
        data.sector2TimeMs,
        data.sector2TimeMinutes,
        data.sector3TimeMs,
        data.sector3TimeMinutes,
        data.lapValidBitFlags,
        data.sessionUid,
        data.sessionTime,
        data.frameIdentifier,
        now,
      ],
    );
  },

  async batchAddUDPLapHistory(this: DatabaseService, lapHistoryArray: any[]): Promise<void> {
    if (lapHistoryArray.length === 0) {
      return;
    }

    const now = new Date().toISOString();
    const values: any[] = [];
    const placeholders: string[] = [];
    let paramIndex = 1;

    for (const data of lapHistoryArray) {
      placeholders.push(
        `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, ` +
          `$${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, ` +
          `$${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`,
      );
      values.push(
        uuidv4(),
        data.driverId || null,
        data.lapNumber,
        data.lapTimeMs,
        data.sector1TimeMs,
        data.sector1TimeMinutes,
        data.sector2TimeMs,
        data.sector2TimeMinutes,
        data.sector3TimeMs,
        data.sector3TimeMinutes,
        data.lapValidBitFlags,
        data.sessionUid,
        data.sessionTime,
        data.frameIdentifier,
        now,
      );
    }

    await this.db.query(
      `INSERT INTO f123_udp_lap_history (
        id, user_id, lap_number, lap_time_ms, sector1_time_ms, sector1_time_minutes,
        sector2_time_ms, sector2_time_minutes, sector3_time_ms, sector3_time_minutes,
        lap_valid_bit_flags, session_uid, session_time, frame_identifier, created_at
      ) VALUES ${placeholders.join(', ')}`,
      values,
    );
  },

  async getUDPSessionResults(this: DatabaseService): Promise<any[]> {
    const result = await this.db.query(`
      SELECT usr.*, d.name as driver_name, s.name as season_name
      FROM f123_udp_session_results usr
      LEFT JOIN drivers d ON usr.user_id = d.id
      LEFT JOIN seasons s ON usr.season_id = s.id
      ORDER BY usr.created_at DESC
      LIMIT 100
    `);
    return result.rows;
  },

  async getUDPLapHistory(this: DatabaseService, driverId?: string): Promise<any[]> {
    if (driverId) {
      const result = await this.db.query(
        `
        SELECT ulh.*, d.name as driver_name
        FROM f123_udp_lap_history ulh
        LEFT JOIN drivers d ON ulh.user_id = d.id
        WHERE ulh.user_id = $1
        ORDER BY ulh.created_at DESC
        LIMIT 100
      `,
        [driverId],
      );
      return result.rows;
    }

    const result = await this.db.query(`
      SELECT ulh.*, d.name as driver_name
      FROM f123_udp_lap_history ulh
      LEFT JOIN drivers d ON ulh.user_id = d.id
      ORDER BY ulh.created_at DESC
      LIMIT 100
    `);
    return result.rows;
  },

  async getUDPParticipantsBySession(
    this: DatabaseService,
    sessionUid: bigint,
  ): Promise<any[]> {
    const result = await this.db.query(
      `
      SELECT up.*, d.name as driver_name, s.name as season_name
      FROM f123_udp_participants up
      LEFT JOIN drivers d ON up.user_id = d.id
      LEFT JOIN seasons s ON up.season_id = s.id
      WHERE up.session_uid = $1
      ORDER BY up.vehicle_index
    `,
      [sessionUid.toString()],
    );

    return result.rows;
  },

  async getUDPSessionResultsBySession(
    this: DatabaseService,
    sessionUid: bigint,
  ): Promise<any[]> {
    const result = await this.db.query(
      `
      SELECT usr.*, d.name as driver_name, s.name as season_name, r.track_name
      FROM f123_udp_session_results usr
      LEFT JOIN drivers d ON usr.user_id = d.id
      LEFT JOIN seasons s ON usr.season_id = s.id
      LEFT JOIN races r ON usr.event_id = r.id
      WHERE usr.session_uid = $1
      ORDER BY usr.position
    `,
      [sessionUid.toString()],
    );

    return result.rows;
  },

  async getUDPLapHistoryByDriver(
    this: DatabaseService,
    driverId: string,
    sessionUid?: bigint,
  ): Promise<any[]> {
    let query = `
      SELECT ulh.*, d.name as driver_name
      FROM f123_udp_lap_history ulh
      LEFT JOIN drivers d ON ulh.user_id = d.id
      WHERE ulh.user_id = $1
    `;
    const params = [driverId];

    if (sessionUid) {
      query += ` AND ulh.session_uid = $2`;
      params.push(sessionUid.toString());
    }

    query += ` ORDER BY ulh.lap_number ASC`;

    const result = await this.db.query(query, params);
    return result.rows;
  },

  async getUDPTyreStintsByDriver(
    this: DatabaseService,
    driverId: string,
    sessionUid?: bigint,
  ): Promise<any[]> {
    let query = `
      SELECT uts.*, d.name as driver_name
      FROM f123_udp_tyre_stints uts
      LEFT JOIN drivers d ON uts.user_id = d.id
      WHERE uts.user_id = $1
    `;
    const params = [driverId];

    if (sessionUid) {
      query += ` AND uts.session_uid = $2`;
      params.push(sessionUid.toString());
    }

    query += ` ORDER BY uts.stint_number ASC`;

    const result = await this.db.query(query, params);
    return result.rows;
  },
} satisfies Partial<Record<keyof DatabaseService, unknown>>;

