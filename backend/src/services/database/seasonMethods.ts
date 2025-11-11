import { v4 as uuidv4 } from 'uuid';
import type { DatabaseService } from '../DatabaseService';
import { Season, SeasonData, SeasonStatus } from './types';

const normalizeStatus = (status?: string): SeasonStatus | undefined => {
  if (!status) {
    return undefined;
  }

  const lowered = status.toLowerCase();
  if (lowered === 'active' || lowered === 'draft' || lowered === 'completed') {
    return lowered as SeasonStatus;
  }

  return undefined;
};

export const seasonMethods = {
  async createSeason(this: DatabaseService, data: SeasonData): Promise<string> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const status = normalizeStatus(data.status) ?? (data.isActive ? 'active' : 'draft');

    await this.db.query(
      `INSERT INTO seasons (id, name, year, start_date, end_date, status, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        data.name,
        data.year,
        data.startDate || null,
        data.endDate || null,
        status,
        now,
        now,
      ],
    );

    return id;
  },

  async getAllSeasons(this: DatabaseService): Promise<Season[]> {
    const result = await this.db.query(
      `SELECT id, name, year, start_date, end_date, status, created_at, updated_at
         FROM seasons ORDER BY year DESC, name`,
    );
    return result.rows.map((row) => ({
      ...this.transformSeasonToCamelCase(row),
      isActive: row.status === 'active',
    }));
  },

  async getSeasonById(this: DatabaseService, id: string): Promise<Season | null> {
    const result = await this.db.query(
      `SELECT id, name, year, start_date, end_date, status, created_at, updated_at
         FROM seasons WHERE id = $1`,
      [id],
    );

    if (result.rows[0]) {
      return {
        ...this.transformSeasonToCamelCase(result.rows[0]),
        isActive: result.rows[0].status === 'active',
      };
    }
    return null;
  },

  async updateSeason(this: DatabaseService, id: string, data: Partial<SeasonData>): Promise<void> {
    const now = new Date().toISOString();
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.year !== undefined) {
      updates.push(`year = $${paramCount++}`);
      values.push(data.year);
    }
    if (data.startDate !== undefined) {
      updates.push(`start_date = $${paramCount++}`);
      values.push(data.startDate);
    }
    if (data.endDate !== undefined) {
      updates.push(`end_date = $${paramCount++}`);
      values.push(data.endDate);
    }
    const normalizedStatus = normalizeStatus(data.status);
    if (normalizedStatus !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(normalizedStatus);
    } else if (data.isActive !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(data.isActive ? 'active' : 'draft');
    }

    updates.push(`updated_at = $${paramCount++}`);
    values.push(now);
    values.push(id);

    await this.db.query(
      `UPDATE seasons SET ${updates.join(', ')} WHERE id = $${paramCount}`,
      values,
    );
  },

  async deleteSeason(this: DatabaseService, id: string): Promise<void> {
    await this.db.query('DELETE FROM seasons WHERE id = $1', [id]);
  },

  async deactivateAllOtherSeasons(this: DatabaseService, currentSeasonId: string): Promise<void> {
    await this.db.query(
      `UPDATE seasons SET status = 'completed', updated_at = $1 WHERE id != $2`,
      [new Date().toISOString(), currentSeasonId],
    );
  },

  async setCurrentSeason(this: DatabaseService, seasonId: string): Promise<void> {
    await this.withTransaction(async (tx) => {
      const timestamp = new Date().toISOString();

      await tx.query(
        `UPDATE seasons 
           SET status = 'completed', updated_at = $1 
         WHERE status = 'active' AND id <> $2`,
        [timestamp, seasonId],
      );

      await tx.query(
        `UPDATE seasons 
           SET status = 'active', updated_at = $1 
         WHERE id = $2`,
        [timestamp, seasonId],
      );
    });
  },

  async getActiveSeason(this: DatabaseService): Promise<Season | null> {
    const result = await this.db.query(
      `SELECT id, name, year, start_date as "startDate", end_date as "endDate", 
              status, created_at as "createdAt", updated_at as "updatedAt"
       FROM seasons WHERE status = 'active' ORDER BY created_at DESC LIMIT 1`,
    );

    if (result.rows[0]) {
      return {
        ...result.rows[0],
        isActive: result.rows[0].status === 'active',
      };
    }
    return null;
  },

  async getHistoricInsights(this: DatabaseService): Promise<any> {
    try {
      const seasonsResult = await this.db.query(`
        SELECT COUNT(*) as total_seasons
        FROM seasons
        WHERE status IN ('completed', 'active')
      `);

      const racesResult = await this.db.query(`
        SELECT COUNT(*) as total_races
        FROM races
        WHERE status = 'completed'
      `);

      const driversResult = await this.db.query(`
        SELECT COUNT(DISTINCT d.id) as total_drivers
        FROM drivers d
        JOIN seasons s ON d.season_id = s.id
        WHERE s.status IN ('completed', 'active')
      `);

      const winsResult = await this.db.query(`
        SELECT COUNT(*) as total_wins
        FROM driver_session_results dsr
        JOIN session_results sr ON dsr.session_result_id = sr.id
        WHERE dsr.position = 1 AND sr.session_type = 10
      `);

      const podiumsResult = await this.db.query(`
        SELECT COUNT(*) as total_podiums
        FROM driver_session_results dsr
        JOIN session_results sr ON dsr.session_result_id = sr.id
        WHERE dsr.position IN (1, 2, 3) AND sr.session_type = 10
      `);

      return {
        totalRaces: parseInt(racesResult.rows[0]?.total_races) || 0,
        totalSeasons: parseInt(seasonsResult.rows[0]?.total_seasons) || 0,
        totalDrivers: parseInt(driversResult.rows[0]?.total_drivers) || 0,
        totalPodiums: parseInt(podiumsResult.rows[0]?.total_podiums) || 0,
        totalWins: parseInt(winsResult.rows[0]?.total_wins) || 0,
        totalChampionships: 0,
      };
    } catch (error) {
      console.error('Error getting historic insights:', error);
      return {
        totalRaces: 0,
        totalSeasons: 1,
        totalDrivers: 12,
        totalPodiums: 0,
        totalWins: 0,
        totalChampionships: 0,
      };
    }
  },

  async getSeasonsForHistory(this: DatabaseService): Promise<any[]> {
    const result = await this.db.query(`
      SELECT 
        s.id,
        s.name,
        s.year,
        s.status,
        COUNT(DISTINCT r.id) as total_races,
        COUNT(DISTINCT d.id) as total_drivers
      FROM seasons s
      LEFT JOIN races r ON r.season_id = s.id
      LEFT JOIN drivers d ON d.season_id = s.id
      WHERE s.status IN ('completed', 'active')
      GROUP BY s.id, s.name, s.year, s.status
      ORDER BY s.year DESC
    `);

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      year: row.year,
      status: row.status,
      totalRaces: parseInt(row.total_races) || 0,
      totalDrivers: parseInt(row.total_drivers) || 0,
      champion: 'TBD',
    }));
  },

  async getPreviousRaceResults(this: DatabaseService, seasonId: string): Promise<any | null> {
    const result = await this.db.query(
      `
      SELECT 
        r.id,
        r.track_name,
        r.race_date,
        r.status,
        sr.id as session_result_id,
        sr.session_type,
        sr.session_name,
        sr.completed_at
      FROM races r
      LEFT JOIN session_results sr ON sr.race_id = r.id AND sr.session_type = 10
      WHERE r.season_id = $1 AND r.status = 'completed'
      ORDER BY r.race_date DESC
      LIMIT 1
    `,
      [seasonId],
    );

    if (result.rows.length === 0) {
      return null;
    }

    const race = result.rows[0];
    const driverResults = await this.getDriverSessionResults(race.session_result_id);

    return {
      raceId: race.id,
      trackName: race.track_name,
      date: race.race_date,
      status: race.status,
      results: driverResults,
    };
  },
} satisfies Partial<Record<keyof DatabaseService, unknown>>;

