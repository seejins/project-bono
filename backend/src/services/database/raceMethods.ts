import { v4 as uuidv4 } from 'uuid';

import type { DatabaseService } from '../DatabaseService';
import { Race, RaceData } from './types';

export const raceMethods = {
  async createRace(this: DatabaseService, data: RaceData): Promise<string> {
    const id = uuidv4();
    const now = new Date().toISOString();

    let trackName = data.trackName;
    if (!trackName && data.trackId) {
      const track = await this.getTrackById(data.trackId);
      trackName = track?.name || 'Unknown Track';
    }

    await this.db.query(
      `INSERT INTO races (id, season_id, track_id, track_name, race_date, status, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        data.seasonId,
        data.trackId,
        trackName || 'Unknown Track',
        data.raceDate,
        data.status || 'scheduled',
        now,
        now,
      ],
    );

    return id;
  },

  async getRacesBySeason(this: DatabaseService, seasonId: string): Promise<Race[]> {
    const result = await this.db.query(
      `SELECT 
        r.id,
        r.season_id as "seasonId",
        r.track_id as "trackId",
        r.track_name as "trackName",
        r.race_date as "raceDate",
        r.status,
        r.session_types as "sessionTypes",
        r.created_at as "createdAt",
        r.updated_at as "updatedAt",
        t.name as track_name,
        t.country as track_country,
        t.length_km as track_length
       FROM races r
       LEFT JOIN tracks t ON r.track_id = t.id
       WHERE r.season_id = $1 
       ORDER BY r.race_date`,
      [seasonId],
    );

    const racesWithSessions = await Promise.all(
      result.rows.map(async (race) => {
        const sessions = await this.getCompletedSessions(race.id);
        const sessionTypes: string[] = [];

        sessions.forEach((session) => {
          const sessionType = session.sessionType;
          if (sessionType >= 1 && sessionType <= 4) {
            if (!sessionTypes.includes('practice')) sessionTypes.push('practice');
          } else if (sessionType >= 5 && sessionType <= 9) {
            if (!sessionTypes.includes('qualifying')) sessionTypes.push('qualifying');
          } else if (sessionType === 10) {
            if (!sessionTypes.includes('race')) sessionTypes.push('race');
          }
        });

        const trackInfo = race.track_name
          ? {
              id: race.trackId,
              name: race.track_name,
              length: race.track_length || 0,
              country: race.track_country || 'Unknown',
            }
          : undefined;

        return {
          ...race,
          trackName: race.trackName || 'Unknown Track',
          country: race.track_country || 'Unknown',
          track: trackInfo,
          date: race.raceDate
            ? typeof race.raceDate === 'string'
              ? race.raceDate
              : race.raceDate.toISOString()
            : new Date().toISOString(),
          time: '14:00:00',
          type: sessionTypes.includes('race')
            ? 'race'
            : sessionTypes.includes('qualifying')
            ? 'qualifying'
            : sessionTypes.includes('practice')
            ? 'practice'
            : 'race',
        };
      }),
    );

    return racesWithSessions;
  },

  async getRaceById(this: DatabaseService, raceId: string): Promise<any | null> {
    const result = await this.db.query(
      `SELECT 
        r.id,
        r.season_id as "seasonId",
        r.track_id as "trackId",
        r.track_name as "trackName",
        r.race_date as "raceDate",
        r.status,
        r.session_type as "sessionType",
        r.session_types as "sessionTypes",
        r.session_duration as "sessionDuration",
        r.weather_air_temp as "weatherAirTemp",
        r.weather_track_temp as "weatherTrackTemp",
        r.weather_rain_percentage as "weatherRainPercentage",
        r.created_at as "createdAt",
        r.updated_at as "updatedAt",
        t.name as track_name,
        t.country as track_country,
        t.length_km as track_length
       FROM races r
       LEFT JOIN tracks t ON r.track_id = t.id
       WHERE r.id = $1`,
      [raceId],
    );

    if (result.rows.length === 0) {
      return null;
    }

    const race = result.rows[0];

    const sessionResult = await this.db.query(
      `SELECT additional_data 
       FROM session_results 
       WHERE race_id = $1 AND session_type = 10
       ORDER BY created_at DESC 
       LIMIT 1`,
      [raceId],
    );

    let totalLaps: number | null = null;
    if (sessionResult.rows.length > 0 && sessionResult.rows[0].additional_data) {
      const additionalData =
        typeof sessionResult.rows[0].additional_data === 'string'
          ? JSON.parse(sessionResult.rows[0].additional_data)
          : sessionResult.rows[0].additional_data;

      totalLaps =
        additionalData.sessionInfo?.['total-laps'] ??
        additionalData.sessionInfo?.totalLaps ??
        null;
    }

    if (!totalLaps) {
      const maxLapsResult = await this.db.query(
        `SELECT MAX(num_laps) as max_laps 
         FROM driver_session_results 
         WHERE session_result_id IN (
           SELECT id FROM session_results WHERE race_id = $1 AND session_type = 10
         )`,
        [raceId],
      );
      if (maxLapsResult.rows[0]?.max_laps) {
        totalLaps = maxLapsResult.rows[0].max_laps;
      }
    }

    return {
      id: race.id,
      seasonId: race.seasonId,
      trackId: race.trackId,
      trackName: race.trackName,
      raceDate: race.raceDate,
      status: race.status,
      sessionType: race.sessionType,
      sessionTypes: race.sessionTypes,
      sessionDuration: race.sessionDuration,
      weatherAirTemp: race.weatherAirTemp,
      weatherTrackTemp: race.weatherTrackTemp,
      weatherRainPercentage: race.weatherRainPercentage,
      createdAt: race.createdAt,
      updatedAt: race.updatedAt,
      laps: totalLaps,
      track: race.track_name
        ? {
            id: race.trackId,
            name: race.track_name,
            country: race.track_country,
            length: race.track_length || 0,
          }
        : null,
    };
  },

  async addRaceToSeason(this: DatabaseService, data: RaceData): Promise<string> {
    return this.createRace(data);
  },

  async removeRaceFromSeason(this: DatabaseService, raceId: string): Promise<void> {
    await this.db.query('DELETE FROM races WHERE id = $1', [raceId]);
  },

  async getEventsBySeason(this: DatabaseService, seasonId: string): Promise<any[]> {
    const result = await this.db.query(
      `SELECT r.*, t.name as track_name_full, t.country, t.length_km 
       FROM races r 
       LEFT JOIN tracks t ON r.track_id = t.id 
       WHERE r.season_id = $1 
       ORDER BY r.race_date ASC`,
      [seasonId],
    );

    const eventsWithSessions = await Promise.all(
      result.rows.map(async (row) => {
        const sessions = await this.getCompletedSessions(row.id);
        const sessionTypes: string[] = [];

        sessions.forEach((session) => {
          const sessionType = session.sessionType;
          if (sessionType >= 1 && sessionType <= 4) {
            if (!sessionTypes.includes('practice')) sessionTypes.push('practice');
          } else if (sessionType >= 5 && sessionType <= 9) {
            if (!sessionTypes.includes('qualifying')) sessionTypes.push('qualifying');
          } else if (sessionType === 10) {
            if (!sessionTypes.includes('race')) sessionTypes.push('race');
          }
        });

        const finalSessionTypes =
          row.session_types || (sessionTypes.length > 0 ? sessionTypes.join(', ') : null);

        let totalLaps: number | null = null;

        const sessionResult = await this.db.query(
          `SELECT additional_data
           FROM session_results
           WHERE race_id = $1 AND session_type = 10
           ORDER BY created_at DESC
           LIMIT 1`,
          [row.id],
        );

        if (sessionResult.rows.length > 0 && sessionResult.rows[0].additional_data) {
          const additionalData =
            typeof sessionResult.rows[0].additional_data === 'string'
              ? JSON.parse(sessionResult.rows[0].additional_data)
              : sessionResult.rows[0].additional_data;

          totalLaps =
            additionalData.sessionInfo?.['total-laps'] ??
            additionalData.sessionInfo?.totalLaps ??
            null;
        }

        if (!totalLaps) {
          const maxLapsResult = await this.db.query(
            `SELECT MAX(num_laps) as max_laps
             FROM driver_session_results
             WHERE session_result_id IN (
               SELECT id FROM session_results WHERE race_id = $1 AND session_type = 10
             )`,
            [row.id],
          );

          if (maxLapsResult.rows[0]?.max_laps) {
            totalLaps = maxLapsResult.rows[0].max_laps;
          }
        }

        return {
          id: row.id,
          season_id: row.season_id,
          track_id: row.track_id,
          track_name: row.track_name,
          track: {
            id: row.track_id,
            name: row.track_name_full || 'Unknown Track',
            country: row.country || '',
            length: row.length_km || 0,
          },
          race_date: row.race_date,
          status: row.status,
          session_type: row.session_type,
          session_types: finalSessionTypes,
          session_duration: row.session_duration,
          weather_air_temp: row.weather_air_temp,
          weather_track_temp: row.weather_track_temp,
          weather_rain_percentage: row.weather_rain_percentage,
          created_at: row.created_at,
          updated_at: row.updated_at,
          session_config: row.session_config,
          total_laps: totalLaps,
        };
      }),
    );

    return eventsWithSessions;
  },

  async addEventToSeason(
    this: DatabaseService,
    seasonId: string,
    eventData: any,
  ): Promise<string> {
    console.log(`Adding event to season ${seasonId}:`, eventData);

    if (!eventData.track_name) {
      throw new Error('Track name is required for events');
    }

    let trackId: string;
    if (eventData.track_id) {
      trackId = eventData.track_id;
    } else if (eventData.full_track_name) {
      trackId = await this.findOrCreateTrack(eventData.full_track_name, eventData.track_length);
    } else {
      trackId = await this.findOrCreateTrack(eventData.track_name);
    }

    const eventId = uuidv4();
    await this.db.query(
      `INSERT INTO races (
        id, season_id, track_id, track_name, race_date, status, session_type, session_duration, 
        weather_air_temp, weather_track_temp, weather_rain_percentage
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        eventId,
        seasonId,
        trackId,
        eventData.track_name,
        eventData.date
          ? new Date(eventData.date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        eventData.status || 'scheduled',
        eventData.session_type || 10,
        eventData.session_duration || 0,
        eventData.weather_air_temp || 0,
        eventData.weather_track_temp || 0,
        eventData.weather_rain_percentage || 0,
      ],
    );

    console.log(`✅ Event ${eventData.track_name} added to season ${seasonId} with ID ${eventId}`);
    return eventId;
  },

  async updateEventInSeason(
    this: DatabaseService,
    eventId: string,
    eventData: any,
  ): Promise<void> {
    console.log(`Updating event ${eventId}:`, eventData);

    const event = await this.db.query('SELECT id FROM races WHERE id = $1', [eventId]);
    if (event.rows.length === 0) {
      throw new Error(`Event with ID ${eventId} not found`);
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (eventData.track_name !== undefined) {
      updates.push(`track_name = $${paramCount++}`);
      values.push(eventData.track_name);
    }
    if (eventData.date !== undefined && eventData.date !== '') {
      updates.push(`race_date = $${paramCount++}`);
      values.push(new Date(eventData.date).toISOString());
    } else if (eventData.date === '') {
      updates.push(`race_date = $${paramCount++}`);
      values.push(null);
    }
    if (eventData.status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(eventData.status);
    }
    if (eventData.session_type !== undefined) {
      updates.push(`session_type = $${paramCount++}`);
      values.push(eventData.session_type);
    }
    if (eventData.session_types !== undefined) {
      updates.push(`session_types = $${paramCount++}`);
      values.push(eventData.session_types);
    }
    if (eventData.session_duration !== undefined) {
      updates.push(`session_duration = $${paramCount++}`);
      values.push(eventData.session_duration);
    }
    if (eventData.session_config !== undefined) {
      updates.push(`session_config = $${paramCount++}`);
      values.push(eventData.session_config);
    }
    if (eventData.weather_air_temp !== undefined) {
      updates.push(`weather_air_temp = $${paramCount++}`);
      values.push(eventData.weather_air_temp);
    }
    if (eventData.weather_track_temp !== undefined) {
      updates.push(`weather_track_temp = $${paramCount++}`);
      values.push(eventData.weather_track_temp);
    }
    if (eventData.weather_rain_percentage !== undefined) {
      updates.push(`weather_rain_percentage = $${paramCount++}`);
      values.push(eventData.weather_rain_percentage);
    }

    if (updates.length === 0) {
      console.log(`No updates provided for event ${eventId}`);
      return;
    }

    updates.push(`updated_at = $${paramCount++}`);
    values.push(new Date().toISOString());
    values.push(eventId);

    await this.db.query(
      `UPDATE races SET ${updates.join(', ')} WHERE id = $${paramCount}`,
      values,
    );

    console.log(`✅ Event ${eventId} updated successfully`);
  },

  async removeEventFromSeason(this: DatabaseService, eventId: string): Promise<void> {
    console.log(`Removing event ${eventId}`);

    const event = await this.db.query('SELECT id, track_name FROM races WHERE id = $1', [eventId]);
    if (event.rows.length === 0) {
      throw new Error(`Event with ID ${eventId} not found`);
    }

    await this.db.query('DELETE FROM races WHERE id = $1', [eventId]);

    console.log(`✅ Event ${eventId} (${event.rows[0].track_name}) removed successfully`);
  },

  async findActiveEventByTrack(this: DatabaseService, trackName: string): Promise<string | null> {
    const result = await this.db.query(
      `SELECT id FROM races 
       WHERE track_name = $1 
       AND status = 'scheduled' 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [trackName],
    );

    return result.rows[0]?.id || null;
  },

  async getCurrentEventForSeason(this: DatabaseService, seasonId: string): Promise<string | null> {
    const result = await this.db.query(
      `SELECT id FROM races 
       WHERE season_id = $1 AND status = 'scheduled' 
       ORDER BY race_date ASC 
       LIMIT 1`,
      [seasonId],
    );

    return result.rows[0]?.id || null;
  },

  async getSeasonIdFromEvent(this: DatabaseService, eventId: string): Promise<string> {
    const result = await this.db.query('SELECT season_id FROM races WHERE id = $1', [eventId]);

    if (!result.rows[0]) {
      throw new Error(`Event with ID ${eventId} not found`);
    }

    return result.rows[0].season_id;
  },
} satisfies Partial<Record<keyof DatabaseService, unknown>>;

