import { DatabaseService } from './DatabaseService';
import { TelemetryService } from './TelemetryService';
import { Server } from 'socket.io';

export class PostSessionProcessor {
  private dbService: DatabaseService;
  private telemetryService: TelemetryService;
  private io: Server;

  // Track ID to name mapping from F1 23 UDP documentation
  private trackIdToName: Map<number, string> = new Map([
    [0, 'Melbourne'], [1, 'Paul Ricard'], [2, 'Shanghai'], [3, 'Sakhir (Bahrain)'],
    [4, 'Catalunya'], [5, 'Monaco'], [6, 'Montreal'], [7, 'Silverstone'],
    [8, 'Hockenheim'], [9, 'Hungaroring'], [10, 'Spa'], [11, 'Monza'],
    [12, 'Singapore'], [13, 'Suzuka'], [14, 'Abu Dhabi'], [15, 'Texas'],
    [16, 'Brazil'], [17, 'Austria'], [18, 'Sochi'], [19, 'Mexico'],
    [20, 'Baku (Azerbaijan)'], [21, 'Sakhir Short'], [22, 'Silverstone Short'],
    [23, 'Texas Short'], [24, 'Suzuka Short'], [25, 'Hanoi'], [26, 'Zandvoort'],
    [27, 'Imola'], [28, 'Portimão'], [29, 'Jeddah'], [30, 'Miami'],
    [31, 'Las Vegas'], [32, 'Losail']
  ]);

  // Session type names mapping
  private sessionTypeNames: Map<number, string> = new Map([
    [0, 'Unknown'], [1, 'P1'], [2, 'P2'], [3, 'P3'], [4, 'Short P'],
    [5, 'Q1'], [6, 'Q2'], [7, 'Q3'], [8, 'Short Q'], [9, 'OSQ'],
    [10, 'Race'], [11, 'R2'], [12, 'R3'], [13, 'Time Trial']
  ]);

  constructor(dbService: DatabaseService, telemetryService: TelemetryService, io: Server) {
    this.dbService = dbService;
    this.telemetryService = telemetryService;
    this.io = io;
    
    // Listen for finalClassification events from TelemetryService
    this.telemetryService.on('finalClassification', this.handleSessionEnd.bind(this));
    
    console.log('🔄 PostSessionProcessor initialized');
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
      
      // 8. Recalculate season standings
      await this.recalculateSeasonStandings(eventId);
      
      // 9. Notify frontend via WebSocket
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
    
    return Promise.all(finalResults.map(async (result) => {
      // Try to find mapping by steam_id first (most reliable)
      const mapping = await this.dbService.query(
        `SELECT member_id, f123_driver_name, f123_driver_number 
         FROM f123_driver_mappings 
         WHERE season_id = $1 AND f123_steam_id = $2`,
        [seasonId, result.steamId]
      );
      
      if (mapping.rows.length > 0) {
        return {
          ...result,
          member_id: mapping.rows[0].member_id,
          mapped_driver_name: mapping.rows[0].f123_driver_name,
          mapped_driver_number: mapping.rows[0].f123_driver_number
        };
      }
      
      // Fallback to driver name matching (less reliable)
      const nameMapping = await this.dbService.query(
        `SELECT member_id, f123_driver_name, f123_driver_number 
         FROM f123_driver_mappings 
         WHERE season_id = $1 AND f123_driver_name = $2`,
        [seasonId, result.driverName]
      );
      
      if (nameMapping.rows.length > 0) {
        return {
          ...result,
          member_id: nameMapping.rows[0].member_id,
          mapped_driver_name: nameMapping.rows[0].f123_driver_name,
          mapped_driver_number: nameMapping.rows[0].f123_driver_number
        };
      }
      
      // No mapping found - return with null member_id
      return {
        ...result,
        member_id: null,
        mapped_driver_name: result.driverName,
        mapped_driver_number: result.carNumber
      };
    }));
  }

  private async markEventAsCompleted(eventId: string): Promise<void> {
    await this.dbService.query(
      'UPDATE races SET status = $1, updated_at = $2 WHERE id = $3',
      ['completed', new Date().toISOString(), eventId]
    );
    
    console.log(`✅ Event ${eventId} marked as completed`);
  }

  private async recalculateSeasonStandings(eventId: string): Promise<void> {
    // This would recalculate season standings based on the new results
    // For now, just log that it would happen
    console.log(`📊 Recalculating season standings for event ${eventId}`);
    
    // TODO: Implement season standings recalculation
    // This would involve:
    // 1. Getting all completed races for the season
    // 2. Calculating points, wins, podiums, etc. for each driver
    // 3. Updating the season_standings table
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

  // Helper method to access dbService.query (since it's private)
  private async query(sql: string, params: any[] = []): Promise<any> {
    return await this.dbService['db'].query(sql, params);
  }
}

