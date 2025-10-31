import { DatabaseService } from './DatabaseService';
import { getTrackName } from '../utils/f123Constants';
import { TelemetryService } from './TelemetryService';

export interface UDPPacketHeader {
  packetFormat: number;
  gameYear: number;
  gameMajorVersion: number;
  gameMinorVersion: number;
  packetVersion: number;
  packetId: number;
  sessionUid: bigint;
  sessionTime: number;
  frameIdentifier: number;
  overallFrameIdentifier: number;
  playerCarIndex: number;
  secondaryPlayerCarIndex: number;
}

export interface UDPParticipantData {
  aiControlled: number;
  driverId: number;
  networkId: number;
  teamId: number;
  myTeam: number;
  raceNumber: number;
  nationality: number;
  name: string;
  yourTelemetry: number;
  showOnlineNames: number;
  platform: number;
}

export interface UDPFinalClassificationData {
  position: number;
  numLaps: number;
  gridPosition: number;
  points: number;
  numPitStops: number;
  resultStatus: number;
  bestLapTimeInMS: number;
  totalRaceTime: number;
  penaltiesTime: number;
  numPenalties: number;
  numTyreStints: number;
  tyreStintsActual: number[];
  tyreStintsVisual: number[];
  tyreStintsEndLaps: number[];
}

export interface UDPLapHistoryData {
  lapTimeInMS: number;
  sector1TimeInMS: number;
  sector1TimeMinutes: number;
  sector2TimeInMS: number;
  sector2TimeMinutes: number;
  sector3TimeInMS: number;
  sector3TimeMinutes: number;
  lapValidBitFlags: number;
}

export interface UDPTyreStintHistoryData {
  endLap: number;
  tyreActualCompound: number;
  tyreVisualCompound: number;
}

export class F123UDPProcessor {
  private telemetryService: TelemetryService;
  private dbService: DatabaseService;
  private isInitialized: boolean = false;
  private activeSeasonId: string | null = null;
  private currentEventId: string | null = null;
  private participantMappings: Map<number, string> = new Map(); // vehicleIndex -> memberId
  private sessionUid: bigint | null = null;
  private loggedEventWarnings: Set<string> = new Set(); // Track tracks that have been warned about missing events
  
  // Queue data for post-session batch processing (no DB writes in live path)
  private pendingLapHistory: Map<string, Array<{
    lapHistory: UDPLapHistoryData[];
    sessionUid: bigint;
    sessionTime: number;
    frameIdentifier: number;
  }>> = new Map();

  constructor(dbService: DatabaseService, telemetryService: TelemetryService) {
    this.dbService = dbService;
    this.telemetryService = telemetryService;
    this.setupEventListeners();
  }

  /**
   * Initialize the processor (loads active season, sets up event listeners)
   * Note: No longer manages UDP connection - that's handled by TelemetryService
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await this.dbService.ensureInitialized();
      await this.loadActiveSeason();
      this.isInitialized = true;
      
      console.log('✅ F123UDPProcessor initialized (listening to TelemetryService events)');
    } catch (error: any) {
      console.error('❌ Failed to initialize F123UDPProcessor:', error);
      throw error;
    }
  }

  /**
   * Stop processing (clears state but doesn't stop UDP - that's handled by TelemetryService)
   */
  stop(): void {
    this.isInitialized = false;
    this.participantMappings.clear();
    this.sessionUid = null;
    console.log('🛑 F123UDPProcessor stopped');
  }

  private async loadActiveSeason(): Promise<void> {
    try {
      const activeSeason = await this.dbService.getActiveSeason();
      if (activeSeason) {
        this.activeSeasonId = activeSeason.id;
        console.log(`📊 Active season loaded: ${activeSeason.name} (${activeSeason.year})`);
        
        // Try to set the current event for this season
        const currentEvent = await this.dbService.getCurrentEventForSeason(activeSeason.id);
        if (currentEvent) {
          this.currentEventId = currentEvent;
          console.log(`🏁 Current event set: ${currentEvent}`);
        } else {
          console.log('⚠️ No current event found for active season - UDP data will be stored but not linked to specific event');
        }
      } else {
        console.log('⚠️ No active season found - UDP data will not be processed');
      }
    } catch (error) {
      console.error('❌ Failed to load active season:', error);
    }
  }

  private setupEventListeners(): void {
    // Listen to raw packet events from TelemetryService instead of creating own UDP listener
    
    // Participants packet (ID: 4) - Maps Steam IDs to members
    this.telemetryService.on('raw_packet:participants', async (data: any) => {
      try {
        await this.handleParticipantsPacket(data);
      } catch (error) {
        console.error('❌ Error handling participants packet:', error);
      }
    });

    // Final Classification packet (ID: 8) - Session results
    this.telemetryService.on('raw_packet:finalClassification', async (data: any) => {
      try {
        await this.handleFinalClassificationPacket(data);
      } catch (error) {
        console.error('❌ Error handling final classification packet:', error);
      }
    });

    // Session History packet (ID: 11) - Lap-by-lap data
    this.telemetryService.on('raw_packet:sessionHistory', async (data: any) => {
      try {
        await this.handleSessionHistoryPacket(data);
      } catch (error) {
        console.error('❌ Error handling session history packet:', error);
      }
    });

    // Session packet (ID: 1) - Track and session info
    this.telemetryService.on('raw_packet:session', async (data: any) => {
      try {
        await this.handleSessionPacket(data);
      } catch (error) {
        console.error('❌ Error handling session packet:', error);
      }
    });
  }

  private async handleParticipantsPacket(data: any): Promise<void> {
    if (!this.activeSeasonId) {
      console.log('⚠️ No active season - skipping participants packet');
      return;
    }

    const header = data.m_header as UDPPacketHeader;
    this.sessionUid = header.sessionUid;

    console.log(`👥 Processing participants packet for session ${header.sessionUid}`);
    console.log(`📊 Packet details: Game Year: ${header.gameYear}, Session Time: ${header.sessionTime}, Frame: ${header.frameIdentifier}`);

    const participants = data.m_participants as UDPParticipantData[];
    console.log(`👥 Found ${participants.length} participants in packet`);
    
    // Cache all members once before loop (avoids redundant DB calls)
    const allMembers = await this.dbService.getAllMembers();
    const membersBySteamId = new Map(allMembers.map(m => [m.steam_id, m]));

    for (let i = 0; i < participants.length; i++) {
      const participant = participants[i];
      
      if (!participant.name || participant.name.trim() === '') {
        // Silently skip empty participants
        continue; // Skip empty participants
      }

      try {
        // Try to find member by Steam ID using cached map
        const member = membersBySteamId.get(participant.name.trim());
        
        if (member) {
          this.participantMappings.set(i, member.id);
          
          // Store participant data
          await this.dbService.addUDPParticipant({
            seasonId: this.activeSeasonId,
            memberId: member.id,
            vehicleIndex: i,
            aiControlled: participant.aiControlled === 1,
            driverId: participant.driverId,
            networkId: participant.networkId,
            teamId: participant.teamId,
            myTeam: participant.myTeam === 1,
            raceNumber: participant.raceNumber,
            nationality: participant.nationality,
            name: participant.name,
            yourTelemetry: participant.yourTelemetry,
            showOnlineNames: participant.showOnlineNames,
            platform: participant.platform,
            sessionUid: header.sessionUid,
            sessionTime: header.sessionTime,
            frameIdentifier: header.frameIdentifier
          });
          
          console.log(`✅ Mapped participant ${participant.name} (vehicle ${i}) to member ${member.name}`);
          console.log(`📊 Participant details: Team ID: ${participant.teamId}, Race Number: ${participant.raceNumber}, Platform: ${participant.platform}`);
        } else {
          console.log(`⚠️ No member found for Steam ID: ${participant.name}`);
          // Only log available members once (not per participant)
          if (i === 0) {
            console.log(`📊 Available members:`, allMembers.map(m => ({ name: m.name, steam_id: m.steam_id })));
          }
        }
      } catch (error) {
        console.error(`❌ Error processing participant ${i}:`, error);
      }
    }
    
    console.log(`📊 Total participant mappings created: ${this.participantMappings.size}`);
  }

  private async handleFinalClassificationPacket(data: any): Promise<void> {
    if (!this.activeSeasonId || !this.currentEventId) {
      console.log('⚠️ No active season or event - skipping final classification packet');
      return;
    }

    const header = data.m_header as UDPPacketHeader;
    const classificationData = data.m_classificationData as UDPFinalClassificationData[];

    console.log(`🏁 Processing final classification packet for session ${header.sessionUid}`);
    console.log(`📊 Found ${classificationData.length} classification entries`);

    for (let i = 0; i < classificationData.length; i++) {
      const result = classificationData[i];
      const memberId = this.participantMappings.get(i);
      
      if (!memberId) {
        // Silently skip unmapped participants (expected for AI/empty slots)
        continue;
      }

      // Log when mapping IS found
      console.log(`✅ Member mapping found for vehicle index ${i} → member ${memberId}`);

      try {
        await this.dbService.addUDPSessionResult({
          seasonId: this.activeSeasonId,
          eventId: this.currentEventId,
          memberId: memberId,
          position: result.position,
          numLaps: result.numLaps,
          gridPosition: result.gridPosition,
          points: result.points,
          numPitStops: result.numPitStops,
          resultStatus: result.resultStatus,
          bestLapTimeMs: result.bestLapTimeInMS,
          totalRaceTimeSeconds: result.totalRaceTime,
          penaltiesTime: result.penaltiesTime,
          numPenalties: result.numPenalties,
          numTyreStints: result.numTyreStints,
          sessionUid: header.sessionUid,
          sessionTime: header.sessionTime,
          frameIdentifier: header.frameIdentifier
        });

        // Store tyre stint data
        for (let stintIndex = 0; stintIndex < result.numTyreStints; stintIndex++) {
          await this.dbService.addUDPTyreStint({
            memberId: memberId,
            stintNumber: stintIndex,
            endLap: result.tyreStintsEndLaps[stintIndex],
            tyreActualCompound: result.tyreStintsActual[stintIndex],
            tyreVisualCompound: result.tyreStintsVisual[stintIndex],
            sessionUid: header.sessionUid,
            sessionTime: header.sessionTime,
            frameIdentifier: header.frameIdentifier
          });
        }

        console.log(`✅ Stored final classification for member ${memberId} - Position: ${result.position}, Points: ${result.points}, Laps: ${result.numLaps}`);
      } catch (error) {
        console.error(`❌ Error storing final classification for vehicle ${i}:`, error);
      }
    }
    
    console.log(`🏁 Final classification processing completed for session ${header.sessionUid}`);
  }

  private async handleSessionHistoryPacket(data: any): Promise<void> {
    if (!this.activeSeasonId) {
      console.log('⚠️ No active season - skipping session history packet');
      return;
    }

    const header = data.m_header as UDPPacketHeader;
    const carIdx = data.m_carIdx as number;
    const lapHistoryData = data.m_lapHistoryData as UDPLapHistoryData[];

    const memberId = this.participantMappings.get(carIdx);
    if (!memberId) {
      // Silently skip unmapped participants (expected for AI/empty slots)
      return;
    }

    // Log when mapping IS found
    console.log(`✅ Member mapping found for car index ${carIdx} → member ${memberId}, processing session history`);

    // Queue data for post-session batch processing (NO database writes in live path)
    if (!this.pendingLapHistory.has(memberId)) {
      this.pendingLapHistory.set(memberId, []);
    }

    // Store in memory only - will be written to DB on session end
    this.pendingLapHistory.get(memberId)!.push({
      lapHistory: lapHistoryData,
      sessionUid: header.sessionUid,
      sessionTime: header.sessionTime,
      frameIdentifier: header.frameIdentifier
    });

    // Count valid laps for logging (no DB write)
    const validLaps = lapHistoryData.filter(lap => lap.lapTimeInMS > 0).length;
    console.log(`📊 Queued session history for car ${carIdx} (member ${memberId}) - ${validLaps} valid laps (will write to DB on session end)`);
  }

  /**
   * Flush pending lap history data to database (called post-session only)
   * Uses batch insert for much better performance
   */
  public async flushPendingLapHistory(): Promise<void> {
    if (this.pendingLapHistory.size === 0) {
      return;
    }

    console.log(`💾 Flushing ${this.pendingLapHistory.size} pending lap history entries to database...`);

    try {
      // Collect all valid lap history entries for batch insert
      const allLapHistoryEntries: any[] = [];
      const memberLapCounts: Map<string, number> = new Map();

      for (const [memberId, historyBatches] of this.pendingLapHistory.entries()) {
        let validLaps = 0;
        
        for (const batch of historyBatches) {
          for (let lapIndex = 0; lapIndex < batch.lapHistory.length; lapIndex++) {
            const lapData = batch.lapHistory[lapIndex];
            
            if (lapData.lapTimeInMS === 0) {
              continue; // Skip empty lap data
            }

            allLapHistoryEntries.push({
              memberId: memberId,
              lapNumber: lapIndex + 1,
              lapTimeMs: lapData.lapTimeInMS,
              sector1TimeMs: lapData.sector1TimeInMS,
              sector1TimeMinutes: lapData.sector1TimeMinutes,
              sector2TimeMs: lapData.sector2TimeInMS,
              sector2TimeMinutes: lapData.sector2TimeMinutes,
              sector3TimeMs: lapData.sector3TimeInMS,
              sector3TimeMinutes: lapData.sector3TimeMinutes,
              lapValidBitFlags: lapData.lapValidBitFlags,
              sessionUid: batch.sessionUid,
              sessionTime: batch.sessionTime,
              frameIdentifier: batch.frameIdentifier
            });
            
            validLaps++;
          }
        }
        
        memberLapCounts.set(memberId, validLaps);
      }

      // Batch insert all lap history in one query
      if (allLapHistoryEntries.length > 0) {
        await this.dbService.batchAddUDPLapHistory(allLapHistoryEntries);
        
        // Log results per member
        for (const [memberId, count] of memberLapCounts.entries()) {
          console.log(`✅ Stored ${count} valid laps for member ${memberId}`);
        }
      }

      // Clear pending data after flush
      this.pendingLapHistory.clear();
      console.log(`✅ All pending lap history flushed to database (${allLapHistoryEntries.length} total laps)`);
    } catch (error) {
      console.error('❌ Error flushing pending lap history:', error);
      throw error;
    }
  }

  private async handleSessionPacket(data: any): Promise<void> {
    const header = data.m_header as UDPPacketHeader;
    
    // Extract track and session information
    const trackId = data.m_trackId as number;
    const sessionType = data.m_sessionType as number;
    const totalLaps = data.m_totalLaps as number;
    const trackLength = data.m_trackLength as number;

    // If we have an active season, try to find or create an event for this track
    if (this.activeSeasonId) {
      // Try to find or create an event for this track
      const trackName = this.getTrackNameFromId(trackId);
      if (trackName) {
        // Try to find existing event for this track
        const existingEvent = await this.dbService.findActiveEventByTrack(trackName);
        if (existingEvent) {
          this.currentEventId = existingEvent;
        } else {
          // Only log this warning once per track
          if (!this.loggedEventWarnings.has(trackName)) {
            console.log(`⚠️ No existing event found for track ${trackName} - UDP data will be stored but not linked to specific event`);
            this.loggedEventWarnings.add(trackName);
          }
        }
      }
    }
  }

  private getTrackNameFromId(trackId: number): string | null {
    // Uses shared constant from f123Constants
    const trackName = getTrackName(trackId);
    return trackName !== 'Unknown Track' ? trackName : null;
  }

  // Public methods for external control
  public async setActiveSeason(seasonId: string): Promise<void> {
    this.activeSeasonId = seasonId;
    console.log(`📊 Active season set to: ${seasonId}`);
  }

  public async setCurrentEvent(eventId: string): Promise<void> {
    this.currentEventId = eventId;
    console.log(`🏁 Current event set to: ${eventId}`);
  }

  public getParticipantMappings(): Map<number, string> {
    return new Map(this.participantMappings);
  }

  public isProcessorRunning(): boolean {
    return this.isInitialized;
  }

  public getSessionUid(): bigint | null {
    return this.sessionUid;
  }
}
