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

  async getSeasonAnalysis(this: DatabaseService, seasonId: string): Promise<any> {
    const season = await this.getSeasonById(seasonId);
    if (!season) {
      return null;
    }

    const [eventsRaw, standings, driverList, previousRace] = await Promise.all([
      this.getEventsBySeason(seasonId),
      this.getSeasonStandings(seasonId),
      this.getDriversBySeason(seasonId),
      this.getPreviousRaceResults(seasonId).catch(() => null),
    ]);

    const events = (eventsRaw ?? []).map((event: any) => {
      const raceDate = event.race_date || event.raceDate || null;
      return {
        id: event.id,
        trackName:
          event.track_name ||
          event.track?.name ||
          event.trackName ||
          'Unknown Track',
        status: event.status || 'scheduled',
        raceDate,
        sessionTypes: event.session_types || event.sessionTypes || null,
        track: event.track || null,
      };
    });

    const parseDate = (value: string | null | undefined) => {
      if (!value) {
        return null;
      }
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    };

    const completedEvents = events
      .filter((event) => event.status === 'completed')
      .sort((a, b) => {
        const dateA = parseDate(a.raceDate)?.getTime() ?? 0;
        const dateB = parseDate(b.raceDate)?.getTime() ?? 0;
        return dateB - dateA;
      });

    const upcomingEvents = events
      .filter((event) => event.status !== 'completed')
      .sort((a, b) => {
        const dateA = parseDate(a.raceDate)?.getTime() ?? Number.POSITIVE_INFINITY;
        const dateB = parseDate(b.raceDate)?.getTime() ?? Number.POSITIVE_INFINITY;
        return dateA - dateB;
      });

    const now = Date.now();
    const nextEvent =
      upcomingEvents.find((event) => {
        const date = parseDate(event.raceDate);
        return date ? date.getTime() >= now : false;
      }) ?? upcomingEvents[0] ?? null;

    const driverSummaries = await Promise.all(
      (driverList ?? []).map(async (driver) => {
        const [stats, raceHistory] = await Promise.all([
          this.getDriverSeasonStats(driver.id, seasonId),
          this.getDriverRaceHistory(driver.id, seasonId),
        ]);

        const standing = standings.find((entry) => entry.id === driver.id);
        const recentResults = (raceHistory ?? []).slice(0, 5).map((entry) => ({
          raceId: entry.raceId,
          trackName: entry.trackName,
          date: entry.raceDate,
          position: entry.position,
          points: entry.points ?? 0,
          gridPosition: entry.gridPosition ?? null,
          fastestLap: entry.fastestLap ?? false,
          resultStatus: entry.resultStatus ?? null,
        }));

        return {
          id: driver.id,
          name: driver.name,
          team: driver.team,
          number: driver.number,
          points: standing?.points ?? Number(stats?.points ?? 0),
          wins: standing?.wins ?? Number(stats?.wins ?? 0),
          podiums: standing?.podiums ?? Number(stats?.podiums ?? 0),
          polePositions: Number(stats?.polePositions ?? 0),
          fastestLaps: Number(stats?.fastestLaps ?? 0),
          averageFinish: Number(stats?.averageFinish ?? 0),
          totalRaces: Number(stats?.totalRaces ?? raceHistory?.length ?? 0),
          dnfs: Number(stats?.dnfs ?? 0),
          pointsFinishes: Number(stats?.pointsFinishes ?? 0),
          consistency: Number(stats?.consistency ?? 0),
          position: standing?.position ?? null,
          recentResults,
        };
      }),
    );

    const pickHighlight = (
      key: keyof (typeof driverSummaries)[number],
      options?: { lowerIsBetter?: boolean; minRaces?: number; minValue?: number },
    ) => {
      if (driverSummaries.length === 0) {
        return null;
      }

      let best: {
        id: string;
        name: string;
        team: string | null;
        value: number;
      } | null = null;

      for (const driver of driverSummaries) {
        const value = Number(driver[key as keyof typeof driver]);
        if (!Number.isFinite(value)) {
          continue;
        }
        if (options?.minRaces && (driver.totalRaces || 0) < options.minRaces) {
          continue;
        }
        if (options?.minValue !== undefined && value <= options.minValue) {
          continue;
        }

        if (!best) {
          best = {
            id: driver.id,
            name: driver.name,
            team: driver.team ?? null,
            value,
          };
          continue;
        }

        if (options?.lowerIsBetter) {
          if (value < best.value) {
            best = {
              id: driver.id,
              name: driver.name,
              team: driver.team ?? null,
              value,
            };
          }
        } else if (value > best.value) {
          best = {
            id: driver.id,
            name: driver.name,
            team: driver.team ?? null,
            value,
          };
        }
      }

      if (best && options?.minValue !== undefined && best.value <= options.minValue) {
        return null;
      }

      return best;
    };

    const highlights = {
      mostWins: pickHighlight('wins', { minValue: 0.5 }),
      mostPodiums: pickHighlight('podiums', { minValue: 0.5 }),
      mostPoles: pickHighlight('polePositions', { minValue: 0.5 }),
      mostFastestLaps: pickHighlight('fastestLaps', { minValue: 0.5 }),
      bestAverageFinish: pickHighlight('averageFinish', { lowerIsBetter: true, minRaces: 3 }),
      bestConsistency: pickHighlight('consistency', { minValue: 0 }),
    };

    return {
      season,
      summary: {
        totalEvents: events.length,
        completedEvents: completedEvents.length,
        upcomingEvents: events.length - completedEvents.length,
        highlights,
      },
      drivers: driverSummaries,
      events: {
        all: events,
        completed: completedEvents,
        upcoming: upcomingEvents,
      },
      nextEvent,
      previousRace: previousRace ?? null,
    };
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

