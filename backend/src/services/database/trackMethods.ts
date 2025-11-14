import { QueryResultRow } from 'pg';
import { v4 as uuidv4 } from 'uuid';

import type { DatabaseService } from '../DatabaseService';
import { Track, TrackData } from './types';

export const trackMethods = {
  async createTrack(this: DatabaseService, data: TrackData): Promise<string> {
    const id = uuidv4();
    const now = new Date().toISOString();

    await this.db.query(
      `INSERT INTO tracks (id, name, country, length_km, event_name, short_event_name, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id,
        data.name,
        data.country,
        data.circuitLength,
        data.eventName ?? data.name,
        data.shortEventName ?? null,
        now,
      ],
    );

    return id;
  },

  async getAllTracks(this: DatabaseService): Promise<any[]> {
    const result = await this.db.query(
      `SELECT id, name, country, length_km as length, event_name, short_event_name, created_at as "createdAt"
       FROM tracks ORDER BY name`,
    );

    return result.rows.map((row: QueryResultRow) => ({
      ...row,
      city: '',
      laps: 0,
      eventName: row.event_name ?? null,
      shortEventName: row.short_event_name ?? null,
      updatedAt: row.createdAt,
    }));
  },

  async getTrackById(this: DatabaseService, id: string): Promise<Track | null> {
    const result = await this.db.query(
      `SELECT id, name, country, length_km as length, event_name, short_event_name, created_at as "createdAt"
       FROM tracks WHERE id = $1`,
      [id],
    );

    if (result.rows[0]) {
      return {
        ...result.rows[0],
        city: '',
        laps: 0,
        eventName: result.rows[0].event_name ?? null,
        shortEventName: result.rows[0].short_event_name ?? null,
        updatedAt: result.rows[0].createdAt,
      };
    }
    return null;
  },

  async findOrCreateTrack(
    this: DatabaseService,
    trackName: string,
    lengthKm?: number,
  ): Promise<string> {
    const existing = await this.db.query(
      'SELECT id FROM tracks WHERE name = $1',
      [trackName],
    );

    if (existing.rows[0]) {
      const existingId = existing.rows[0].id;

      if (lengthKm && lengthKm > 0) {
        await this.db.query(
          `UPDATE tracks
             SET length_km = COALESCE(NULLIF(length_km, 0), $1)
           WHERE id = $2`,
          [lengthKm, existingId],
        );
      }

      return existingId;
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    await this.db.query(
      `INSERT INTO tracks (id, name, country, length_km, event_name, short_event_name, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id,
        trackName,
        'Unknown',
        lengthKm || 0,
        trackName,
        null,
        now,
      ],
    );

    return id;
  },

  async getTracksBySeason(this: DatabaseService, _seasonId: string): Promise<Track[]> {
    // Placeholder implementation (data not yet modeled)
    return [];
  },

  async createTrackAndAddToSeason(
    this: DatabaseService,
    data: TrackData,
    seasonId: string,
  ): Promise<string> {
    const trackId = await this.createTrack(data);
    console.log(`Track ${trackId} added to season ${seasonId}`);
    return trackId;
  },

  async removeTrackFromSeason(
    this: DatabaseService,
    seasonId: string,
    trackId: string,
  ): Promise<void> {
    console.log(`Removing track ${trackId} from season ${seasonId}`);
    // TODO: implement when track-season relationship is modeled
  },
} satisfies Partial<Record<keyof DatabaseService, unknown>>;

