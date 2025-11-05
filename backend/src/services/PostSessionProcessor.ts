import { DatabaseService } from './DatabaseService';
import { TelemetryService } from './TelemetryService';
import { Server } from 'socket.io';
import { getSessionTypeAbbreviation } from '../utils/f123Constants';
import { F123UDPProcessor } from './F123UDPProcessor';

export class PostSessionProcessor {
  private dbService: DatabaseService;
  private telemetryService: TelemetryService;
  private io: Server;
  private f123UDPProcessor: F123UDPProcessor | null = null;

  constructor(dbService: DatabaseService, telemetryService: TelemetryService, io: Server, f123UDPProcessor?: F123UDPProcessor) {
    this.dbService = dbService;
    this.telemetryService = telemetryService;
    this.io = io;
    this.f123UDPProcessor = f123UDPProcessor || null;
    
    // REMOVED: UDP event listener - now using JSON upload flow exclusively
    // this.telemetryService.on('finalClassification', this.handleSessionEnd.bind(this));
    
    console.log('🔄 PostSessionProcessor initialized (UDP post-session flow disabled, using JSON upload)');
  }

  private async handleSessionEnd(finalResults: any[]): Promise<void> {
    try {
      console.log('🏁 Session ended, processing final classification...');
      
      // 1. Extract session metadata
      const sessionInfo = this.extractSessionInfo(finalResults);
      console.log('📊 Session info:', sessionInfo);
      
      // 2. Find matching event using flexible track matching
      const eventId = await this.findActiveEventBySession(sessionInfo);
      
      if (!eventId) {
        console.log('⚠️ No matching event found, storing as orphaned session');
        await this.handleOrphanedSession(sessionInfo, finalResults);
        return;
      }
      
      console.log(`✅ Found matching event: ${eventId}`);
      
      // 3. Map F1 23 drivers to league members using steam_id
      const mappedResults = await this.mapDriversToLeague(finalResults, eventId);
      
      // 4. Create session result entry (dynamic tab creation)
      const sessionResultId = await this.dbService.createSessionResult(
        eventId,
        sessionInfo.sessionType,
        this.dbService.getSessionTypeName(sessionInfo.sessionType),
        sessionInfo.sessionUID
      );
      
      // 5. Store original results snapshot (preserve UDP data)
      await this.dbService.storeOriginalSessionResults(sessionResultId, mappedResults);
      
      // 6. Store session results
      await this.dbService.storeDriverSessionResults(sessionResultId, mappedResults);
      
      // 7. Mark event as completed if this was a race session
      if (sessionInfo.sessionType === 10) { // Race session
        await this.markEventAsCompleted(eventId);
      }
      
      // 8. Flush pending lap history data to database (post-session only)
      if (this.f123UDPProcessor) {
        try {
          await this.f123UDPProcessor.flushPendingLapHistory();
        } catch (error) {
          console.error('⚠️ Error flushing pending lap history:', error);
          // Don't fail session processing if this fails
        }
      }
      
      // 9. Recalculate season standings
      await this.recalculateSeasonStandings(eventId);
      
      // 10. Notify frontend via WebSocket
      this.io.emit('sessionCompleted', {
        eventId,
        sessionResultId,
        sessionType: sessionInfo.sessionType,
        sessionName: this.dbService.getSessionTypeName(sessionInfo.sessionType),
        results: mappedResults
      });
      
      console.log('✅ Session processing completed successfully');
      
    } catch (error) {
      console.error('❌ Error processing session end:', error);
      await this.logSessionError(error, finalResults);
    }
  }

  private extractSessionInfo(finalResults: any[]): any {
    if (finalResults.length === 0) {
      throw new Error('No final results provided');
    }
    
    const firstResult = finalResults[0];
    
    return {
      sessionType: firstResult.sessionType || 10,
      trackName: firstResult.trackName || 'Unknown',
      sessionUID: firstResult.sessionUID,
      totalLaps: firstResult.numLaps || 0,
      trackLength: firstResult.trackLength || 0
    };
  }

  private async findActiveEventBySession(sessionInfo: any): Promise<string | null> {
    // Try exact track name match first
    let eventId = await this.dbService.findActiveEventByTrack(sessionInfo.trackName);
    
    if (eventId) {
      return eventId;
    }
    
    // Try flexible matching
    eventId = await this.findFlexibleMatch(sessionInfo);
    
    return eventId;
  }

  private async findFlexibleMatch(sessionInfo: any): Promise<string | null> {
    // Try partial track name matching
    const trackNameVariations = this.generateTrackNameVariations(sessionInfo.trackName);
    
    for (const variation of trackNameVariations) {
      const eventId = await this.dbService.findActiveEventByTrack(variation);
      if (eventId) {
        console.log(`✅ Found flexible match: ${variation} -> ${eventId}`);
        return eventId;
      }
    }
    
    return null;
  }

  private generateTrackNameVariations(trackName: string): string[] {
    const variations = [trackName];
    
    // Common variations
    const commonVariations: { [key: string]: string[] } = {
      'Sakhir (Bahrain)': ['Bahrain', 'Sakhir'],
      'Paul Ricard': ['Paul Ricard', 'Le Castellet'],
      'Catalunya': ['Barcelona', 'Catalunya', 'Montmelo'],
      'Silverstone': ['Silverstone', 'Great Britain'],
      'Monza': ['Monza', 'Italy'],
      'Spa': ['Spa', 'Spa-Francorchamps', 'Belgium'],
      'Suzuka': ['Suzuka', 'Japan'],
      'Abu Dhabi': ['Abu Dhabi', 'Yas Marina'],
      'Texas': ['Austin', 'Texas', 'COTA'],
      'Brazil': ['Interlagos', 'Brazil', 'São Paulo'],
      'Austria': ['Red Bull Ring', 'Austria', 'Spielberg'],
      'Mexico': ['Mexico City', 'Mexico', 'Hermanos Rodriguez'],
      'Baku (Azerbaijan)': ['Baku', 'Azerbaijan'],
      'Zandvoort': ['Zandvoort', 'Netherlands', 'Holland'],
      'Imola': ['Imola', 'San Marino'],
      'Portimão': ['Portimão', 'Portugal', 'Algarve'],
      'Jeddah': ['Jeddah', 'Saudi Arabia'],
      'Miami': ['Miami', 'Miami Gardens'],
      'Las Vegas': ['Las Vegas', 'Nevada'],
      'Losail': ['Losail', 'Qatar']
    };
    
    if (commonVariations[trackName]) {
      variations.push(...commonVariations[trackName]);
    }
    
    return variations;
  }

  private async mapDriversToLeague(finalResults: any[], eventId: string): Promise<any[]> {
    const seasonId = await this.dbService.getSeasonIdFromEvent(eventId);
    
    // Batch query all steam_ids and driver names at once (fixes N+1 query problem)
    const steamIds = finalResults.map(r => r.steamId).filter(Boolean);
    const driverNames = finalResults.map(r => r.driverName).filter(Boolean);
    
    // Query all mappings in one go
    const steamIdMappings = steamIds.length > 0 ? await this.dbService.query(
      `SELECT member_id, f123_driver_name, f123_driver_number, f123_steam_id 
       FROM f123_driver_mappings 
       WHERE season_id = $1 AND f123_steam_id = ANY($2)`,
      [seasonId, steamIds]
    ) : { rows: [] };
    
    const nameMappings = driverNames.length > 0 ? await this.dbService.query(
      `SELECT member_id, f123_driver_name, f123_driver_number, f123_driver_name as driver_name
       FROM f123_driver_mappings 
       WHERE season_id = $1 AND f123_driver_name = ANY($2)`,
      [seasonId, driverNames]
    ) : { rows: [] };
    
    // Create lookup maps for O(1) access
    const steamIdMap = new Map(steamIdMappings.rows.map((r: any) => [r.f123_steam_id, r]));
    const nameMap = new Map(nameMappings.rows.map((r: any) => [r.driver_name, r]));
    
    // Map results using pre-fetched data
    return finalResults.map((result) => {
      // Try steam_id first (most reliable)
      const steamMapping = result.steamId ? steamIdMap.get(result.steamId) as any : null;
      if (steamMapping) {
        return {
          ...result,
          member_id: steamMapping.member_id,
          mapped_driver_name: steamMapping.f123_driver_name,
          mapped_driver_number: steamMapping.f123_driver_number
        };
      }
      
      // Fallback to driver name matching
      const nameMapping = nameMap.get(result.driverName) as any;
      if (nameMapping) {
        return {
          ...result,
          member_id: nameMapping.member_id,
          mapped_driver_name: nameMapping.f123_driver_name,
          mapped_driver_number: nameMapping.f123_driver_number
        };
      }
      
      // No mapping found
      return {
        ...result,
        member_id: null,
        mapped_driver_name: result.driverName,
        mapped_driver_number: result.carNumber
      };
    });
  }

  private async markEventAsCompleted(eventId: string): Promise<void> {
    await this.dbService.query(
      'UPDATE races SET status = $1, updated_at = $2 WHERE id = $3',
      ['completed', new Date().toISOString(), eventId]
    );
    
    console.log(`✅ Event ${eventId} marked as completed`);
  }

  private async recalculateSeasonStandings(eventId: string): Promise<void> {
    try {
      console.log(`📊 Recalculating season standings for event ${eventId}`);
      
      // 1. Get the season ID from the event
      const seasonId = await this.dbService.getSeasonIdFromEvent(eventId);
      if (!seasonId) {
        console.log('⚠️ Could not find season for event, skipping standings recalculation');
        return;
      }
      
      // 2. Aggregate standings for each member from completed race sessions
      const standingsResult = await this.query(`
        SELECT 
          dsr.member_id,
          COUNT(DISTINCT dsr.session_result_id) as races_participated,
          COALESCE(SUM(dsr.points), 0)::INTEGER as total_points,
          SUM(CASE WHEN dsr.position = 1 THEN 1 ELSE 0 END)::INTEGER as wins,
          SUM(CASE WHEN dsr.position <= 3 THEN 1 ELSE 0 END)::INTEGER as podiums,
          SUM(CASE WHEN dsr.fastest_lap = true THEN 1 ELSE 0 END)::INTEGER as fastest_laps,
          SUM(CASE WHEN dsr.pole_position = true THEN 1 ELSE 0 END)::INTEGER as pole_positions,
          MIN(dsr.position) as best_finish,
          COALESCE(SUM(dsr.penalties), 0)::INTEGER as total_penalties,
          COALESCE(SUM(dsr.warnings), 0)::INTEGER as total_warnings
        FROM driver_session_results dsr
        JOIN session_results sr ON sr.id = dsr.session_result_id
        JOIN races r ON r.id = sr.race_id
        WHERE r.season_id = $1
          AND sr.session_type = 10
          AND dsr.member_id IS NOT NULL
        GROUP BY dsr.member_id
        ORDER BY total_points DESC, wins DESC, podiums DESC
      `, [seasonId]);
      
      console.log(`📊 Calculated standings for ${standingsResult.rows.length} member(s)`);
      
      // 3. Log the top standings (for debugging/monitoring)
      const topStandings = standingsResult.rows.slice(0, 5);
      if (topStandings.length > 0) {
        console.log('📊 Top 5 standings:');
        for (let i = 0; i < topStandings.length; i++) {
          const standing = topStandings[i];
          const member = await this.dbService.getMemberById(standing.member_id);
          const position = i + 1;
          console.log(`  ${position}. ${member?.name || 'Unknown'} - ${standing.total_points || 0} pts (${standing.wins || 0} wins, ${standing.podiums || 0} podiums)`);
        }
      }
      
      // Note: Standings are calculated on-demand rather than stored in a separate table
      // This ensures standings are always up-to-date after each race
      console.log('✅ Season standings recalculation completed');
      
    } catch (error) {
      console.error('❌ Error recalculating season standings:', error);
      // Don't throw - this is non-critical for session completion
    }
  }

  private async handleOrphanedSession(sessionInfo: any, finalResults: any[]): Promise<void> {
    // Store orphaned session data for admin review
    await this.dbService.query(
      `INSERT INTO orphaned_sessions (id, track_name, session_type, session_data, session_time, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        require('uuid').v4(),
        sessionInfo.trackName,
        sessionInfo.sessionType,
        JSON.stringify({ sessionInfo, finalResults }),
        new Date().toISOString(),
        'pending'
      ]
    );
    
    // Notify admin
    await this.notifyAdminOfOrphanedSession(sessionInfo);
    
    console.log('📝 Orphaned session stored for admin review');
  }

  private async notifyAdminOfOrphanedSession(sessionInfo: any): Promise<void> {
    // Send notification to admin via WebSocket
    this.io.emit('orphanedSession', {
      trackName: sessionInfo.trackName,
      sessionType: sessionInfo.sessionType,
      sessionName: this.dbService.getSessionTypeName(sessionInfo.sessionType),
      timestamp: new Date().toISOString()
    });
    
    console.log(`🔔 Admin notified of orphaned session: ${sessionInfo.trackName} - ${this.dbService.getSessionTypeName(sessionInfo.sessionType)}`);
  }

  private async logSessionError(error: any, finalResults: any[]): Promise<void> {
    console.error('📝 Logging session error:', error);
    
    // Store error details for debugging
    await this.dbService.query(
      `INSERT INTO session_errors (id, error_message, session_data, created_at)
       VALUES ($1, $2, $3, $4)`,
      [
        require('uuid').v4(),
        error.message || 'Unknown error',
        JSON.stringify({ error: error.toString(), finalResults }),
        new Date().toISOString()
      ]
    );
  }

  // Use DatabaseService public query method
  private async query(sql: string, params: any[] = []): Promise<any> {
    return await this.dbService.query(sql, params);
  }
}

