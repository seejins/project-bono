import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { getSessionTypeAbbreviation } from '../utils/f123Constants';
import { DatabaseInitializer } from './database/initializer';
import { RepositoryBase, TransactionContext } from './database/repositoryBase';
import {
  Driver,
  DriverData,
  DriverMapping,
  DriverMappingData,
  Member,
  MemberData,
  Race,
  RaceData,
  Season,
  SeasonData,
  SessionResult,
  Track,
  TrackData,
} from './database/types';
import { seasonMethods } from './database/seasonMethods';
import { driverMethods } from './database/driverMethods';
import { trackMethods } from './database/trackMethods';
import { raceMethods } from './database/raceMethods';
import { sessionMethods } from './database/sessionMethods';
import { udpMethods } from './database/udpMethods';
import {
  AppRepositories,
  DriverRepository,
  RaceRepository,
  SeasonRepository,
  SessionRepository,
  TrackRepository,
  UDPRepository,
} from './database/repositories';

export class DatabaseService extends RepositoryBase {
  private initialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  private readonly initializer: DatabaseInitializer;
  public readonly seasons: SeasonRepository;
  public readonly drivers: DriverRepository;
  public readonly tracks: TrackRepository;
  public readonly races: RaceRepository;
  public readonly sessionsRepo: SessionRepository;
  public readonly udpRepo: UDPRepository;

  public createSeason!: (data: SeasonData) => Promise<string>;
  public getAllSeasons!: () => Promise<Season[]>;
  public getSeasonById!: (id: string) => Promise<Season | null>;
  public updateSeason!: (id: string, data: Partial<SeasonData>) => Promise<void>;
  public deleteSeason!: (id: string) => Promise<void>;
  public deactivateAllOtherSeasons!: (currentSeasonId: string) => Promise<void>;
  public setCurrentSeason!: (seasonId: string) => Promise<void>;
  public getActiveSeason!: () => Promise<Season | null>;
  public getSeasonAnalysis!: (seasonId: string) => Promise<any>;
  public getHistoricInsights!: () => Promise<any>;
  public getSeasonsForHistory!: () => Promise<any[]>;
  public getPreviousRaceResults!: (seasonId: string) => Promise<any>;
  public getDriversBySeason!: (seasonId: string) => Promise<Driver[]>;
  public getAllDrivers!: () => Promise<Driver[]>;
  public getAllMembers!: () => Promise<Member[]>;
  public createMember!: (data: MemberData) => Promise<string>;
  public getMemberById!: (id: string) => Promise<Member | null>;
  public updateMember!: (id: string, data: Partial<MemberData>) => Promise<void>;
  public deleteMember!: (id: string) => Promise<void>;
  public getMemberCareerProfile!: (memberId: string) => Promise<any>;
  public getMemberSeasonStats!: (memberId: string, seasonId: string) => Promise<any>;
  public getMemberRaceHistory!: (memberId: string, seasonId?: string) => Promise<any[]>;
  public createDriver!: (data: DriverData) => Promise<string>;
  public updateDriver!: (id: string, data: Partial<DriverData>) => Promise<void>;
  public getDriverById!: (id: string) => Promise<Driver | null>;
  public deleteDriver!: (id: string) => Promise<void>;
  public getDriverBySteamId!: (steamId: string) => Promise<Driver | null>;
  public addDriverToSeason!: (seasonId: string, driverId: string) => Promise<void>;
  public removeDriverFromSeason!: (seasonId: string, driverId: string) => Promise<void>;
  public updateSeasonParticipant!: (driverId: string, data: { team?: string; number?: number }) => Promise<void>;
  public getDriverCareerProfile!: (driverId: string) => Promise<any>;
  public getDriverSeasonStats!: (driverId: string, seasonId: string) => Promise<any>;
  public getSeasonStandings!: (
    seasonId: string,
  ) => Promise<
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
  >;
  public getDriverRaceHistory!: (driverId: string, seasonId?: string) => Promise<any[]>;
  public createTrack!: (data: TrackData) => Promise<string>;
  public getAllTracks!: () => Promise<Track[]>;
  public getTrackById!: (id: string) => Promise<Track | null>;
  public findOrCreateTrack!: (trackName: string, lengthKm?: number) => Promise<string>;
  public getTracksBySeason!: (seasonId: string) => Promise<Track[]>;
  public createTrackAndAddToSeason!: (data: TrackData, seasonId: string) => Promise<string>;
  public removeTrackFromSeason!: (seasonId: string, trackId: string) => Promise<void>;
  public createRace!: (data: RaceData) => Promise<string>;
  public getRacesBySeason!: (seasonId: string) => Promise<Race[]>;
  public getRaceById!: (raceId: string) => Promise<any | null>;
  public addRaceToSeason!: (data: RaceData) => Promise<string>;
  public removeRaceFromSeason!: (raceId: string) => Promise<void>;
  public getEventsBySeason!: (seasonId: string) => Promise<any[]>;
  public addEventToSeason!: (seasonId: string, eventData: any) => Promise<string>;
  public updateEventInSeason!: (eventId: string, eventData: any) => Promise<void>;
  public updateEventOrder!: (seasonId: string, orderedEventIds: string[]) => Promise<void>;
  public removeEventFromSeason!: (eventId: string) => Promise<void>;
  public findActiveEventByTrack!: (trackName: string) => Promise<string | null>;
  public getCurrentEventForSeason!: (seasonId: string) => Promise<string | null>;
  public getSeasonIdFromEvent!: (eventId: string) => Promise<string>;
  public getNextOrderIndex!: (seasonId: string) => Promise<number>;
  public importSessionResults!: (
    raceId: string,
    results: SessionResult[],
  ) => Promise<{ resultsCount: number; lapTimesCount: number }>;
  public getSessionResultsByRace!: (raceId: string) => Promise<SessionResult[]>;
  public storeF123SessionResults!: (
    raceId: string,
    sessionType: number,
    driverResults: any[],
  ) => Promise<void>;
  public getMemberCareerStats!: (memberId: string) => Promise<any>;
  public importRaceResults!: (
    raceId: string,
    data: SessionResult[] | { results?: any[] },
  ) => Promise<{ resultsCount: number; lapTimesCount: number }>;
  public createSessionResult!: (
    raceId: string,
    sessionType: number,
    sessionName: string,
    sessionUID: bigint | null,
    additionalData?: any,
  ) => Promise<string>;
  public getSessionByUID!: (
    sessionUID: bigint,
  ) => Promise<{ id: string; sessionName: string; trackName: string; raceDate: string; raceId: string } | null>;
  public deleteDriverSessionResults!: (sessionResultId: string) => Promise<void>;
  public storeDriverSessionResults!: (sessionResultId: string, driverResults: any[]) => Promise<Map<number, string>>;
  public storeLapTimes!: (driverSessionResultId: string, raceId: string, lapData: any[]) => Promise<void>;
  public getCompletedSessions!: (raceId: string) => Promise<any[]>;
  public getDriverSessionResults!: (sessionResultId: string, includeLapTimes?: boolean) => Promise<any[]>;
  public deleteOriginalSessionResults!: (sessionResultId: string) => Promise<void>;
  public storeOriginalSessionResults!: (sessionResultId: string, driverResults: any[]) => Promise<void>;
  public getPenaltiesForDriverResult!: (driverSessionResultId: string) => Promise<any[]>;
  public getPenaltiesForSession!: (sessionResultId: string) => Promise<any[]>;
  public addPenalty!: (
    driverSessionResultId: string,
    penaltySeconds: number,
    reason: string,
    editedBy: string,
  ) => Promise<any>;
  public updateDriverUserMapping!: (
    driverSessionResultId: string,
    userId: string | null,
  ) => Promise<
    Array<{
      driverSessionResultId: string;
      sessionResultId: string;
      oldUserId: string | null;
      newUserId: string | null;
    }>
  >;
  public removePenalty!: (driverSessionResultId: string, penaltyId: string) => Promise<void>;
  public recalculatePositions!: (sessionResultId: string) => Promise<void>;
  public changePosition!: (
    sessionResultId: string,
    driverId: string,
    newPosition: number,
    reason: string,
    editedBy: string,
  ) => Promise<void>;
  public resetDriverToOriginal!: (sessionResultId: string, driverId: string) => Promise<void>;
  public getEditHistory!: (sessionResultId: string) => Promise<any[]>;
  public getEditHistoryForDriver!: (driverSessionResultId: string) => Promise<any[]>;
  public revertEdit!: (editId: string) => Promise<void>;
  public addUDPParticipant!: (data: any) => Promise<void>;
  public addUDPSessionResult!: (data: any) => Promise<void>;
  public addUDPTyreStint!: (data: any) => Promise<void>;
  public addUDPLapHistory!: (data: any) => Promise<void>;
  public batchAddUDPLapHistory!: (lapHistoryArray: any[]) => Promise<void>;
  public getUDPSessionResults!: () => Promise<any[]>;
  public getUDPLapHistory!: (driverId?: string) => Promise<any[]>;
  public getUDPParticipantsBySession!: (sessionUid: bigint) => Promise<any[]>;
  public getUDPSessionResultsBySession!: (sessionUid: bigint) => Promise<any[]>;
  public getUDPLapHistoryByDriver!: (driverId: string, sessionUid?: bigint) => Promise<any[]>;
  public getUDPTyreStintsByDriver!: (driverId: string, sessionUid?: bigint) => Promise<any[]>;

  public readonly repositories: AppRepositories;

  constructor(private readonly poolInstance: Pool) {
    super(poolInstance);
    this.seasons = new SeasonRepository(this);
    this.drivers = new DriverRepository(this);
    this.tracks = new TrackRepository(this);
    this.races = new RaceRepository(this);
    this.sessionsRepo = new SessionRepository(this);
    this.udpRepo = new UDPRepository(this);
    this.repositories = {
      seasons: this.seasons,
      drivers: this.drivers,
      tracks: this.tracks,
      races: this.races,
      sessions: this.sessionsRepo,
      udp: this.udpRepo,
    };
    this.initializer = new DatabaseInitializer(this.pool);
    this.initializeTables();
  }

  // Helper methods for snake_case to camelCase transformation
  protected transformSeasonToCamelCase(dbRow: any): any {
    return {
      id: dbRow.id,
      name: dbRow.name,
      year: dbRow.year,
      startDate: dbRow.start_date,
      endDate: dbRow.end_date,
      status: dbRow.status,
      createdAt: dbRow.created_at,
      updatedAt: dbRow.updated_at
    };
  }

  protected transformDriverToCamelCase(dbRow: any): Driver {
    return {
      id: dbRow.id,
      name: dbRow.name,
      team: dbRow.team,
      number: dbRow.number,
      seasonId: dbRow.season_id,
      steam_id: dbRow.steam_id,
      isActive: dbRow.is_active,
      createdAt: dbRow.created_at,
      updatedAt: dbRow.updated_at
    };
  }

  protected transformRaceToCamelCase(dbRow: any): any {
    return {
      id: dbRow.id,
      seasonId: dbRow.season_id,
      trackId: dbRow.track_id,
      trackName: dbRow.track_name,
      raceDate: dbRow.race_date,
      status: dbRow.status,
      sessionType: dbRow.session_type,
      sessionTypes: dbRow.session_types,
      sessionDuration: dbRow.session_duration,
      primarySessionResultId: dbRow.primary_session_result_id,
      orderIndex: dbRow.order_index,
      weatherAirTemp: dbRow.weather_air_temp,
      weatherTrackTemp: dbRow.weather_track_temp,
      weatherRainPercentage: dbRow.weather_rain_percentage,
      createdAt: dbRow.created_at,
      updatedAt: dbRow.updated_at
    };
  }

  private async initializeTables(): Promise<void> {
    if (!this.initializationPromise) {
      console.log('📋 Initializing database tables...');
      this.initializationPromise = this.initializer
        .initialize()
        .then(() => {
      this.initialized = true;
        })
        .catch((error) => {
          this.initializationPromise = null;
      throw error;
        });
    }

    await this.initializationPromise;
  }

  async ensureInitialized(): Promise<void> {
    if (this.initialized) {
              return;
            }
            
    console.log('🔧 ensureInitialized called, initialized:', this.initialized);
    try {
      await this.initializeTables();
      console.log('✅ Database initialization completed successfully');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  protected async executeQuery(query: string, params: any[] = []): Promise<any[]> {
    await this.ensureInitialized();
    return super.executeQuery(query, params);
  }

  protected async executeUpdate(query: string, params: any[] = []): Promise<void> {
    await this.ensureInitialized();
    await super.executeUpdate(query, params);
  }

  /**
   * Public method to execute SQL queries
   * Use this instead of accessing private db property
   */
  public async query(sql: string, params: any[] = []): Promise<any> {
    await this.ensureInitialized();
    return await this.db.query(sql, params);
  }

  async withTransaction<T>(fn: (tx: TransactionContext) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    const context = new TransactionContext(this.pool, client);

    try {
      await client.query('BEGIN');
      const result = await fn(context);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      context.release();
    }
  }

  // Driver Mapping operations
  async createDriverMapping(data: DriverMappingData): Promise<string> {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    await this.db.query(
      `INSERT INTO f123_driver_mappings (id, season_id, f123_driver_id, f123_driver_name, f123_driver_number, f123_team_name, your_driver_id, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        id, 
        data.seasonId, 
        data.f123DriverId, 
        data.f123DriverName, 
        data.f123DriverNumber || null, 
        data.f123TeamName || null, 
        data.yourDriverId || null,
        now, 
        now
      ]
    );
    
    return id;
  }

  async getDriverMappingsBySeason(seasonId: string): Promise<DriverMapping[]> {
    const result = await this.db.query(
      `SELECT id, season_id as "seasonId", f123_driver_id as "f123DriverId", f123_driver_name as "f123DriverName", 
              f123_driver_number as "f123DriverNumber", f123_team_name as "f123TeamName", your_driver_id as "yourDriverId", 
              created_at as "createdAt", updated_at as "updatedAt"
       FROM f123_driver_mappings WHERE season_id = $1 ORDER BY f123_driver_name`,
        [seasonId]
      );
      return result.rows;
  }

  async updateDriverMapping(id: string, data: Partial<DriverMappingData>): Promise<void> {
    const now = new Date().toISOString();
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.f123DriverId !== undefined) {
      updates.push(`f123_driver_id = $${paramCount++}`);
      values.push(data.f123DriverId);
    }
    if (data.f123DriverName !== undefined) {
      updates.push(`f123_driver_name = $${paramCount++}`);
      values.push(data.f123DriverName);
    }
    if (data.f123DriverNumber !== undefined) {
      updates.push(`f123_driver_number = $${paramCount++}`);
      values.push(data.f123DriverNumber);
    }
    if (data.f123TeamName !== undefined) {
      updates.push(`f123_team_name = $${paramCount++}`);
      values.push(data.f123TeamName);
    }
    if (data.yourDriverId !== undefined) {
      updates.push(`your_driver_id = $${paramCount++}`);
      values.push(data.yourDriverId || null);
    }

    updates.push(`updated_at = $${paramCount++}`);
    values.push(now);
    values.push(id);

    await this.db.query(
      `UPDATE f123_driver_mappings SET ${updates.join(', ')} WHERE id = $${paramCount}`,
        values
      );
  }

  async deleteDriverMapping(id: string): Promise<void> {
    await this.db.query('DELETE FROM f123_driver_mappings WHERE id = $1', [id]);
  }

  async getDriverMappings(seasonId: string): Promise<DriverMapping[]> {
    return this.getDriverMappingsBySeason(seasonId);
  }

  // Store driver results for a session
  // Returns a map of driver result index to driver_session_result_id for linking lap times
  getSessionTypeName(sessionType: number): string {
    return getSessionTypeAbbreviation(sessionType);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

Object.assign(
  DatabaseService.prototype,
  seasonMethods,
  driverMethods,
  trackMethods,
  raceMethods,
  sessionMethods,
  udpMethods,
);