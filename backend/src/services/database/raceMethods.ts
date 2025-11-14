import { v4 as uuidv4 } from 'uuid';

import type { DatabaseService } from '../DatabaseService';
import { Race, RaceData } from './types';

export const raceMethods = {
  async getNextOrderIndex(this: DatabaseService, seasonId: string): Promise<number> {
    const result = await this.db.query<{ next_index: number }>(
      `SELECT COALESCE(MAX(order_index), 0) + 1 AS next_index
       FROM races
       WHERE season_id = $1`,
      [seasonId],
    );

    return result.rows[0]?.next_index ?? 1;
  },

  async createRace(this: DatabaseService, data: RaceData): Promise<string> {
    const id = uuidv4();
    const now = new Date().toISOString();

    let trackName = data.trackName;
    if (!trackName && data.trackId) {
      const track = await this.getTrackById(data.trackId);
      trackName = track?.eventName || track?.name || 'Unknown Track';
    }

    const raceDate =
      data.raceDate === undefined || data.raceDate === null || data.raceDate === ''
        ? null
        : new Date(data.raceDate).toISOString().split('T')[0];

    let orderIndex = data.orderIndex ?? null;
    if (orderIndex === null || orderIndex === undefined) {
      orderIndex = await this.getNextOrderIndex(data.seasonId);
    }

    await this.db.query(
      `INSERT INTO races (
         id,
         season_id,
         track_id,
         track_name,
         race_date,
         order_index,
         status,
         session_type,
         session_types,
         session_duration,
         weather_air_temp,
         weather_track_temp,
         weather_rain_percentage,
         session_config,
         primary_session_result_id,
         created_at,
         updated_at
       ) 
       VALUES (
         $1, $2, $3, $4, $5, $6,
         $7, $8, $9, $10, $11, $12,
         $13, $14, $15, $16, $17
       )`,
      [
        id,
        data.seasonId,
        data.trackId,
        trackName || 'Unknown Track',
        raceDate,
        orderIndex,
        data.status || 'scheduled',
        data.sessionType ?? null,
        data.sessionTypes ?? null,
        data.sessionDuration ?? null,
        data.weatherAirTemp ?? null,
        data.weatherTrackTemp ?? null,
        data.weatherRainPercentage ?? null,
        data.sessionConfig ?? null,
        data.primarySessionResultId ?? null,
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
        r.order_index as "orderIndex",
        r.status,
        r.session_type as "sessionType",
        r.session_types as "sessionTypes",
        r.primary_session_result_id as "primarySessionResultId",
        r.created_at as "createdAt",
        r.updated_at as "updatedAt",
        t.name as track_name,
        t.country as track_country,
        t.length_km as track_length,
        t.event_name as track_event_name,
        t.short_event_name as track_short_event_name
       FROM races r
       LEFT JOIN tracks t ON r.track_id = t.id
       WHERE r.season_id = $1 
       ORDER BY 
         CASE WHEN r.order_index IS NULL THEN 1 ELSE 0 END,
         r.order_index,
         r.race_date ASC NULLS LAST,
         r.created_at ASC`,
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
              eventName: race.track_event_name || null,
              shortEventName: race.track_short_event_name || null,
            }
          : undefined;

        const normalizedRaceDate =
          race.raceDate && typeof race.raceDate !== 'string'
            ? race.raceDate.toISOString().split('T')[0]
            : (race.raceDate as string | null | undefined) ?? null;

        return {
          ...race,
          trackName: race.trackName || trackInfo?.eventName || 'Unknown Event',
          country: race.track_country || 'Unknown',
          track: trackInfo,
          date: normalizedRaceDate,
          orderIndex: race.orderIndex ?? null,
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
      `SELECT r.*, 
              t.name as track_name_full, 
              t.country, 
              t.length_km,
              t.event_name,
              t.short_event_name
       FROM races r 
       LEFT JOIN tracks t ON r.track_id = t.id 
       WHERE r.season_id = $1 
       ORDER BY 
         CASE WHEN r.order_index IS NULL THEN 1 ELSE 0 END,
         r.order_index,
         r.race_date ASC NULLS LAST,
         r.created_at ASC`,
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

        const eventName =
          row.event_name ||
          row.track_name ||
          row.short_event_name ||
          row.track_name_full ||
          'Unknown Event';
        const circuitName = row.track_name_full || row.track_name || eventName;
        const raceDateNormalized =
          row.race_date && typeof row.race_date !== 'string'
            ? row.race_date.toISOString().split('T')[0]
            : (row.race_date as string | null | undefined) ?? null;

        return {
          id: row.id,
          season_id: row.season_id,
          track_id: row.track_id,
          event_name: eventName,
          short_event_name: row.short_event_name || row.event_name || null,
          track_name: circuitName,
          order_index: row.order_index,
          track: {
            id: row.track_id,
            name: circuitName,
            country: row.country || '',
            length: row.length_km || 0,
            eventName: row.event_name || null,
            shortEventName: row.short_event_name || null,
          },
          race_date: raceDateNormalized,
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
          primary_session_result_id: row.primary_session_result_id,
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

    if (!eventData.track_name && !eventData.event_name) {
      throw new Error('Event or track name is required for events');
    }

    let trackId: string;
    let trackRecord: Awaited<ReturnType<typeof this.getTrackById>> | null = null;
    if (eventData.track_id) {
      trackId = eventData.track_id;
    } else if (eventData.full_track_name) {
      trackId = await this.findOrCreateTrack(eventData.full_track_name, eventData.track_length);
    } else {
      trackId = await this.findOrCreateTrack(eventData.track_name);
    }

    trackRecord = await this.getTrackById(trackId);

    const displayName =
      eventData.event_name ||
      eventData.track_name ||
      trackRecord?.eventName ||
      trackRecord?.name ||
      'Unknown Event';

    const now = new Date().toISOString();
    const rawStatus = eventData.status;
    const normalizedStatus =
      typeof rawStatus === 'string' ? rawStatus.toLowerCase() : rawStatus;
    const statusToStore = normalizedStatus || 'scheduled';

    let raceDate: string | null = null;
    const rawDate = eventData.date;
    if (rawDate !== undefined && rawDate !== null && rawDate !== '') {
      const parsedDate = new Date(rawDate);
      if (!Number.isNaN(parsedDate.getTime())) {
        raceDate = parsedDate.toISOString().split('T')[0];
      }
    } else if (normalizedStatus === 'completed') {
      raceDate = new Date().toISOString().split('T')[0];
    }

    let orderIndex =
      eventData.order_index ??
      eventData.orderIndex ??
      (await this.getNextOrderIndex(seasonId));

    const eventId = uuidv4();
    await this.db.query(
      `INSERT INTO races (
         id,
         season_id,
         track_id,
         track_name,
         race_date,
         order_index,
         status,
         session_type,
         session_types,
         session_duration,
         weather_air_temp,
         weather_track_temp,
         weather_rain_percentage,
         session_config,
         primary_session_result_id,
         created_at,
         updated_at
       )
       VALUES (
         $1, $2, $3, $4, $5, $6,
         $7, $8, $9, $10, $11, $12,
         $13, $14, $15, $16, $17
       )`,
      [
        eventId,
        seasonId,
        trackId,
        displayName,
        raceDate,
        orderIndex,
        statusToStore,
        eventData.session_type || 10,
        eventData.session_types || null,
        eventData.session_duration || 0,
        eventData.weather_air_temp || null,
        eventData.weather_track_temp || null,
        eventData.weather_rain_percentage || null,
        eventData.session_config || null,
        null,
        now,
        now,
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

    const event = await this.db.query(
      'SELECT id, status, race_date FROM races WHERE id = $1',
      [eventId],
    );
    if (event.rows.length === 0) {
      throw new Error(`Event with ID ${eventId} not found`);
    }
    const existingStatus: string | null = event.rows[0].status ?? null;
    const existingRaceDate: string | null = event.rows[0].race_date ?? null;

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    const nextTrackName = eventData.event_name ?? eventData.track_name;
    if (nextTrackName !== undefined) {
      updates.push(`track_name = $${paramCount++}`);
      values.push(nextTrackName);
    }
    if (eventData.date !== undefined) {
      updates.push(`race_date = $${paramCount++}`);
      if (eventData.date === '' || eventData.date === null) {
        values.push(null);
      } else {
        values.push(new Date(eventData.date).toISOString().split('T')[0]);
      }
    }
    let normalizedStatus: string | undefined;
    if (eventData.order_index !== undefined) {
      updates.push(`order_index = $${paramCount++}`);
      values.push(eventData.order_index);
    } else if (eventData.orderIndex !== undefined) {
      updates.push(`order_index = $${paramCount++}`);
      values.push(eventData.orderIndex);
    }
    if (eventData.status !== undefined) {
      normalizedStatus =
        typeof eventData.status === 'string'
          ? eventData.status.toLowerCase()
          : eventData.status;
      updates.push(`status = $${paramCount++}`);
      values.push(normalizedStatus ?? eventData.status);
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
    if (eventData.primarySessionResultId !== undefined) {
      updates.push(`primary_session_result_id = $${paramCount++}`);
      values.push(eventData.primarySessionResultId);
    } else if (eventData.primary_session_result_id !== undefined) {
      updates.push(`primary_session_result_id = $${paramCount++}`);
      values.push(eventData.primary_session_result_id);
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
    if (eventData.race_date !== undefined) {
      updates.push(`race_date = $${paramCount++}`);
      values.push(
        eventData.race_date === '' || eventData.race_date === null
          ? null
          : new Date(eventData.race_date).toISOString().split('T')[0],
      );
    }

    const hasExplicitDateUpdate =
      eventData.date !== undefined || eventData.race_date !== undefined;
    if (
      !hasExplicitDateUpdate &&
      normalizedStatus === 'completed' &&
      existingStatus !== 'completed' &&
      (existingRaceDate === null || existingRaceDate === undefined)
    ) {
      updates.push(`race_date = $${paramCount++}`);
      values.push(new Date().toISOString().split('T')[0]);
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

  async updateEventOrder(
    this: DatabaseService,
    seasonId: string,
    orderedEventIds: string[],
  ): Promise<void> {
    if (!Array.isArray(orderedEventIds) || orderedEventIds.length === 0) {
      throw new Error('Event order payload must include at least one event id');
    }

    const trimmedIds = orderedEventIds.map((id) => id?.trim()).filter(Boolean) as string[];
    if (trimmedIds.length !== orderedEventIds.length) {
      throw new Error('Event order payload contains invalid event ids');
    }

    const existingEvents = await this.db.query<{ id: string }>(
      'SELECT id FROM races WHERE season_id = $1 ORDER BY order_index ASC NULLS LAST, race_date ASC NULLS LAST, created_at ASC',
      [seasonId],
    );

    const existingIds = existingEvents.rows.map((row) => row.id);

    const unknownIds = trimmedIds.filter((id) => !existingIds.includes(id));
    if (unknownIds.length > 0) {
      throw new Error(`Event order payload references unknown events: ${unknownIds.join(', ')}`);
    }

    const uniqueIds = new Set(trimmedIds);
    if (uniqueIds.size !== trimmedIds.length) {
      throw new Error('Event order payload contains duplicate event ids');
    }

    const remainingIds = existingIds.filter((id) => !uniqueIds.has(id));
    const finalOrdering = [...trimmedIds, ...remainingIds];

    await this.withTransaction(async (tx) => {
      for (let index = 0; index < trimmedIds.length; index++) {
        const eventId = trimmedIds[index];
        await tx.query(
          `UPDATE races 
             SET order_index = $1, updated_at = NOW()
           WHERE id = $2 AND season_id = $3`,
          [index + 1, eventId, seasonId],
        );
      }

      for (let offset = trimmedIds.length; offset < finalOrdering.length; offset++) {
        const eventId = finalOrdering[offset];
        await tx.query(
          `UPDATE races 
             SET order_index = $1, updated_at = NOW()
           WHERE id = $2 AND season_id = $3`,
          [offset + 1, eventId, seasonId],
        );
      }
    });
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
       ORDER BY 
         CASE WHEN order_index IS NULL THEN 1 ELSE 0 END,
         order_index,
         race_date ASC NULLS LAST,
         created_at ASC
       LIMIT 1`,
      [trackName],
    );

    return result.rows[0]?.id || null;
  },

  async getCurrentEventForSeason(this: DatabaseService, seasonId: string): Promise<string | null> {
    const result = await this.db.query(
      `SELECT id FROM races 
       WHERE season_id = $1 AND status = 'scheduled' 
       ORDER BY 
         CASE WHEN order_index IS NULL THEN 1 ELSE 0 END,
         order_index,
         race_date ASC NULLS LAST,
         created_at ASC 
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

