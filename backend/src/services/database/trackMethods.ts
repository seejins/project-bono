import { v4 as uuidv4 } from 'uuid';

import type { DatabaseService } from '../DatabaseService';
import { Track, TrackData } from './types';

export const trackMethods = {
  async createTrack(this: DatabaseService, data: TrackData): Promise<string> {
    const id = uuidv4();
    const now = new Date().toISOString();

    await this.db.query(
      `INSERT INTO tracks (id, name, country, length_km, created_at) 
         VALUES ($1, $2, $3, $4, $5)`,
      [id, data.name, data.country, data.circuitLength, now],
    );

    return id;
  },

  async getAllTracks(this: DatabaseService): Promise<Track[]> {
    const result = await this.db.query(
      `SELECT id, name, country, length_km as length, created_at as "createdAt"
       FROM tracks ORDER BY name`,
    );

    return result.rows.map((row) => ({
      ...row,
      city: '',
      laps: 0,
      updatedAt: row.createdAt,
    }));
  },

  async getTrackById(this: DatabaseService, id: string): Promise<Track | null> {
    const result = await this.db.query(
      `SELECT id, name, country, length_km as length, created_at as "createdAt"
       FROM tracks WHERE id = $1`,
      [id],
    );

    if (result.rows[0]) {
      return {
        ...result.rows[0],
        city: '',
        laps: 0,
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
      if (lengthKm && lengthKm > 0) {
        const currentLength = await this.db.query(
          'SELECT length_km FROM tracks WHERE id = $1',
          [existing.rows[0].id],
        );
        if (!currentLength.rows[0]?.length_km || currentLength.rows[0].length_km === 0) {
          await this.db.query(
            'UPDATE tracks SET length_km = $1 WHERE id = $2',
            [lengthKm, existing.rows[0].id],
          );
          console.log(`✅ Updated track length for ${trackName} to ${lengthKm}km`);
        }
      }
      return existing.rows[0].id;
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    await this.db.query(
      `INSERT INTO tracks (id, name, country, length_km, created_at) 
         VALUES ($1, $2, $3, $4, $5)`,
      [id, trackName, 'Unknown', lengthKm || 0, now],
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

