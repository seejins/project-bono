import { QueryResultRow } from 'pg';
import { v4 as uuidv4 } from 'uuid';

import type { DatabaseService } from '../DatabaseService';
import {
  Driver,
  DriverData,
  Member,
  MemberData,
} from './types';

export const driverMethods = {
  async getDriversBySeason(this: DatabaseService, seasonId: string): Promise<Driver[]> {
    const result = await this.db.query(
      'SELECT * FROM drivers WHERE season_id = $1 ORDER BY name ASC',
      [seasonId],
    );

    return result.rows.map((row: QueryResultRow) => this.transformDriverToCamelCase(row));
  },

  async getAllDrivers(this: DatabaseService): Promise<Driver[]> {
    const result = await this.db.query('SELECT * FROM drivers ORDER BY name ASC');
    return result.rows.map((row: QueryResultRow) => this.transformDriverToCamelCase(row));
  },

  async getAllMembers(this: DatabaseService): Promise<Member[]> {
    return this.getAllDrivers();
  },

  async createMember(this: DatabaseService, data: MemberData): Promise<string> {
    return this.createDriver(data);
  },

  async getMemberById(this: DatabaseService, id: string): Promise<Member | null> {
    return this.getDriverById(id);
  },

  async updateMember(this: DatabaseService, id: string, data: Partial<MemberData>): Promise<void> {
    await this.updateDriver(id, data);
  },

  async deleteMember(this: DatabaseService, id: string): Promise<void> {
    await this.deleteDriver(id);
  },

  async getMemberCareerProfile(this: DatabaseService, memberId: string): Promise<any> {
    return this.getDriverCareerProfile(memberId);
  },

  async getMemberSeasonStats(this: DatabaseService, memberId: string, seasonId: string): Promise<any> {
    return this.getDriverSeasonStats(memberId, seasonId);
  },

  async getMemberRaceHistory(
    this: DatabaseService,
    memberId: string,
    seasonId?: string,
  ): Promise<any[]> {
    return this.getDriverRaceHistory(memberId, seasonId);
  },

  async createDriver(this: DatabaseService, data: DriverData): Promise<string> {
    const id = uuidv4();
    const now = new Date().toISOString();

    await this.db.query(
      `INSERT INTO drivers (id, name, team, number, season_id, steam_id, is_active, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        id,
        data.name,
        data.team || null,
        data.number || null,
        data.seasonId || null,
        data.steam_id || null,
        data.isActive ?? true,
        now,
        now,
      ],
    );

    return id;
  },

  async updateDriver(
    this: DatabaseService,
    id: string,
    data: Partial<DriverData>,
  ): Promise<void> {
    const now = new Date().toISOString();
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.team !== undefined) {
      updates.push(`team = $${paramCount++}`);
      values.push(data.team);
    }
    if (data.number !== undefined) {
      updates.push(`number = $${paramCount++}`);
      values.push(data.number);
    }
    if (data.steam_id !== undefined) {
      updates.push(`steam_id = $${paramCount++}`);
      values.push(data.steam_id || null);
    }
    if (data.isActive !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(data.isActive);
    }

    updates.push(`updated_at = $${paramCount++}`);
    values.push(now);
    values.push(id);

    await this.db.query(
      `UPDATE drivers SET ${updates.join(', ')} WHERE id = $${paramCount}`,
      values,
    );
  },

  async getDriverById(this: DatabaseService, id: string): Promise<Driver | null> {
    const result = await this.db.query(
      `SELECT id, name, team, number, season_id as "seasonId", steam_id, is_active as "isActive", 
              created_at as "createdAt", updated_at as "updatedAt"
       FROM drivers WHERE id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.transformDriverToCamelCase(result.rows[0]);
  },

  async deleteDriver(this: DatabaseService, id: string): Promise<void> {
    await this.db.query('DELETE FROM drivers WHERE id = $1', [id]);
  },

  async getDriverBySteamId(this: DatabaseService, steamId: string): Promise<Driver | null> {
    const result = await this.db.query(
      `SELECT id, name, team, number, season_id as "seasonId", steam_id, is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt" 
       FROM drivers WHERE steam_id = $1`,
      [steamId],
    );
    return result.rows[0] ? this.transformDriverToCamelCase(result.rows[0]) : null;
  },

  async addDriverToSeason(this: DatabaseService, seasonId: string, driverId: string): Promise<void> {
    console.log(`Adding driver ${driverId} to season ${seasonId}`);

    const driver = await this.getDriverById(driverId);
    if (!driver) {
      throw new Error(`Driver with ID ${driverId} not found`);
    }

    const existingDriver = await this.db.query(
      'SELECT id FROM drivers WHERE season_id = $1 AND (id = $2 OR name = $3)',
      [seasonId, driverId, driver.name],
    );

    if (existingDriver.rows.length > 0) {
      throw new Error(`Driver ${driver.name} is already in this season`);
    }

    if (!driver.seasonId) {
      await this.db.query(
        'INSERT INTO drivers (id, name, team, number, season_id, steam_id, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [
          driverId,
          driver.name,
          driver.team || 'TBD',
          driver.number || 0,
          seasonId,
          driver.steam_id || null,
          driver.isActive,
        ],
      );
    } else {
      await this.db.query(
        'UPDATE drivers SET season_id = $1 WHERE id = $2',
        [seasonId, driverId],
      );
    }

    console.log(`✅ Driver ${driver.name} added to season ${seasonId}`);
  },

  async removeDriverFromSeason(
    this: DatabaseService,
    seasonId: string,
    driverId: string,
  ): Promise<void> {
    console.log(`Removing driver ${driverId} from season ${seasonId}`);

    const driver = await this.db.query(
      'SELECT id, name FROM drivers WHERE id = $1 AND season_id = $2',
      [driverId, seasonId],
    );

    if (driver.rows.length === 0) {
      throw new Error(`Driver with ID ${driverId} not found in season ${seasonId}`);
    }

    await this.db.query(
      `UPDATE drivers
       SET season_id = NULL,
           team = NULL,
           number = NULL,
           updated_at = NOW()
       WHERE id = $1 AND season_id = $2`,
      [driverId, seasonId],
    );

    await this.db.query(
      `UPDATE f123_driver_mappings
       SET your_driver_id = NULL,
           updated_at = NOW()
       WHERE season_id = $1 AND your_driver_id = $2`,
      [seasonId, driverId],
    );

    console.log(`✅ Driver ${driver.rows[0].name} removed from season ${seasonId}`);
  },

  async updateSeasonParticipant(
    this: DatabaseService,
    driverId: string,
    data: { team?: string; number?: number },
  ): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.team !== undefined) {
      updates.push(`team = $${paramIndex++}`);
      const normalizedTeam =
        typeof data.team === 'string'
          ? data.team.trim() || null
          : data.team ?? null;
      values.push(normalizedTeam);
    }

    if (data.number !== undefined) {
      updates.push(`number = $${paramIndex++}`);
      const normalizedNumber =
        data.number === undefined || data.number === null || Number.isNaN(data.number)
          ? null
          : data.number;
      values.push(normalizedNumber);
    }

    if (updates.length === 0) {
      return;
    }

    updates.push(`updated_at = $${paramIndex++}`);
    values.push(new Date().toISOString());
    values.push(driverId);

    await this.db.query(
      `UPDATE drivers SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values,
    );
  },

  async getDriverCareerProfile(this: DatabaseService, driverId: string): Promise<any> {
    try {
      const driver = await this.getDriverById(driverId);
      if (!driver) return null;

      const careerStats = {
        wins: 0,
        podiums: 0,
        points: 0,
        seasons: 0,
        polePositions: 0,
        fastestLaps: 0,
        averageFinish: 0,
        finishRate: 0,
        championships: 0,
        bestFinish: 0,
      };

      const seasonsResult = await this.db.query(
        `
        SELECT DISTINCT s.id, s.name, s.year
        FROM seasons s
        JOIN driver_session_results dsr ON dsr.user_id = $1
        JOIN session_results sr ON sr.id = dsr.session_result_id
        JOIN races r ON r.id = sr.race_id
        WHERE r.season_id = s.id
        ORDER BY s.year DESC
      `,
        [driverId],
      );

      return {
        driver,
        careerStats,
        seasons: seasonsResult.rows.map((row: QueryResultRow) => ({
          id: row.id,
          year: row.year,
          name: row.name,
        })),
      };
    } catch (error) {
      console.error('Error getting driver career profile:', error);
      return null;
    }
  },

  async getDriverSeasonStats(
    this: DatabaseService,
    driverId: string,
    seasonId: string,
  ): Promise<any> {
    try {
      const statsResult = await this.db.query(
        `
        SELECT 
          COUNT(*) FILTER (WHERE dsr.position = 1) as wins,
          COUNT(*) FILTER (WHERE dsr.position <= 3) as podiums,
          SUM(dsr.points) as points,
          COUNT(*) FILTER (WHERE dsr.pole_position = true) as pole_positions,
          COUNT(*) FILTER (WHERE dsr.fastest_lap = true) as fastest_laps,
          AVG(NULLIF(dsr.position, 0)) as avg_finish,
          COUNT(*) as total_races,
          COUNT(*) FILTER (WHERE dsr.result_status IN (4, 7)) as dnfs,
          COUNT(*) FILTER (WHERE dsr.position IS NOT NULL AND dsr.position <= 10) as points_finishes
        FROM driver_session_results dsr
        JOIN session_results sr ON sr.id = dsr.session_result_id
        JOIN races r ON r.id = sr.race_id
        WHERE dsr.user_id = $1 AND r.season_id = $2 AND sr.session_type = 10
      `,
        [driverId, seasonId],
      );

      const stats = statsResult.rows[0] || {};
      const wins = Number(stats.wins ?? 0);
      const podiums = Number(stats.podiums ?? 0);
      const points = Number(stats.points ?? 0);
      const polePositions = Number(stats.pole_positions ?? 0);
      const fastestLaps = Number(stats.fastest_laps ?? 0);
      const avgFinish = Number(stats.avg_finish ?? 0);
      const totalRaces = Number(stats.total_races ?? 0);
      const dnfs = Number(stats.dnfs ?? 0);
      const pointsFinishes = Number(stats.points_finishes ?? 0);
      const consistency = totalRaces > 0 ? Math.round((pointsFinishes / totalRaces) * 1000) / 10 : 0;

      return {
        wins,
        podiums,
        points,
        polePositions,
        fastestLaps,
        averageFinish: avgFinish,
        totalRaces,
        dnfs,
        pointsFinishes,
        consistency,
      };
    } catch (error) {
      console.error('Error getting driver season stats:', error);
      return {
        wins: 0,
        podiums: 0,
        points: 0,
        polePositions: 0,
        fastestLaps: 0,
        averageFinish: 0,
        totalRaces: 0,
        dnfs: 0,
        pointsFinishes: 0,
        consistency: 0,
      };
    }
  },

  async getSeasonStandings(
    this: DatabaseService,
    seasonId: string,
  ): Promise<
    Array<{
      id: string;
      name: string;
      team: string | null;
      number: number | null;
      points: number;
      wins: number;
      podiums: number;
      position: number;
    }>
  > {
    const result = await this.db.query(
      `
      SELECT 
        d.id,
        d.name,
        d.team,
        d.number,
        COALESCE(SUM(dsr.points), 0) AS points,
        COUNT(*) FILTER (WHERE dsr.position = 1) AS wins,
        COUNT(*) FILTER (WHERE dsr.position <= 3) AS podiums
      FROM drivers d
        LEFT JOIN driver_session_results dsr 
          ON dsr.user_id = d.id
        LEFT JOIN session_results sr 
          ON sr.id = dsr.session_result_id
        LEFT JOIN races r 
          ON r.id = sr.race_id
      WHERE d.season_id = $1
        AND sr.session_type = 10
        AND r.season_id = $1
      GROUP BY d.id, d.name, d.team, d.number
      ORDER BY points DESC, wins DESC, podiums DESC, d.name ASC
      `,
      [seasonId],
    );

    return result.rows.map((row: QueryResultRow, index: number) => ({
      id: row.id,
      name: row.name,
      team: row.team,
      number: row.number,
      points: Number(row.points) || 0,
      wins: Number(row.wins) || 0,
      podiums: Number(row.podiums) || 0,
      position: index + 1,
    }));
  },

  async getDriverRaceHistory(
    this: DatabaseService,
    driverId: string,
    seasonId?: string,
  ): Promise<any[]> {
    try {
      let query = `
        SELECT 
          r.id as race_id,
          r.track_name,
          r.race_date,
          sr.id as session_result_id,
          sr.session_type,
          sr.session_name,
          dsr.position,
          dsr.grid_position,
          dsr.points,
          dsr.num_laps,
          dsr.best_lap_time_ms,
          dsr.total_race_time_ms,
          dsr.penalties,
          dsr.warnings,
          dsr.fastest_lap,
          dsr.pole_position,
          dsr.result_status,
          dsr.dnf_reason,
          r.status as race_status
        FROM driver_session_results dsr
        JOIN session_results sr ON sr.id = dsr.session_result_id
        JOIN races r ON r.id = sr.race_id
        WHERE dsr.user_id = $1
          AND sr.session_type = 10
      `;

      const params: any[] = [driverId];

      if (seasonId) {
        query += ` AND r.season_id = $2`;
        params.push(seasonId);
      }

      query += ` ORDER BY r.race_date DESC, r.created_at DESC`;

      const result = await this.db.query(query, params);

      return result.rows.map((row: QueryResultRow) => ({
        raceId: row.race_id,
        trackName: row.track_name,
        raceDate: row.race_date,
        sessionResultId: row.session_result_id,
        sessionType: row.session_type,
        sessionName: row.session_name,
        position: row.position,
        gridPosition: row.grid_position,
        points: row.points,
        numLaps: row.num_laps,
        bestLapTimeMs: row.best_lap_time_ms,
        totalRaceTimeMs: row.total_race_time_ms,
        penalties: row.penalties,
        warnings: row.warnings,
        fastestLap: row.fastest_lap,
        polePosition: row.pole_position,
        resultStatus: row.result_status,
        dnfReason: row.dnf_reason,
        raceStatus: row.race_status,
      }));
    } catch (error) {
      console.error('Error getting driver race history:', error);
      return [];
    }
  },
} satisfies Partial<Record<keyof DatabaseService, unknown>>;

