import { F123UDP } from "f1-23-udp";
import { DatabaseService } from './DatabaseService';

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
  private f123: F123UDP;
  private dbService: DatabaseService;
  private isRunning: boolean = false;
  private activeSeasonId: string | null = null;
  private currentEventId: string | null = null;
  private participantMappings: Map<number, string> = new Map(); // vehicleIndex -> memberId
  private sessionUid: bigint | null = null;

  constructor(dbService: DatabaseService) {
    this.dbService = dbService;
    this.f123 = new F123UDP({
      port: process.env.F1_UDP_PORT ? parseInt(process.env.F1_UDP_PORT) : 20777,
      address: process.env.F1_UDP_ADDR || '127.0.0.1'
    });
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('F123UDPProcessor is already running');
      return;
    }

    try {
      await this.dbService.ensureInitialized();
      await this.loadActiveSeason();
      
      this.f123.start();
      this.setupEventListeners();
      this.isRunning = true;
      
      console.log('🏎️ F123UDPProcessor started successfully');
    } catch (error: any) {
      console.error('❌ Failed to start F123UDPProcessor:', error);
      
      // Handle specific UDP port conflicts
      if (error.code === 'EADDRINUSE' && error.syscall === 'bind') {
        console.log('⚠️ UDP port 20777 is already in use. This is normal if another F1 23 UDP instance is running.');
        console.log('💡 You can safely ignore this error - the processor will work with the existing UDP listener.');
        this.isRunning = false; // Don't mark as running if port is in use
        return; // Don't throw error for port conflicts
      }
      
      // For other errors, log but don't crash the entire process
      console.error('❌ F123UDPProcessor error (non-critical):', error.message);
      this.isRunning = false;
      return;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      this.f123.stop();
      this.isRunning = false;
      this.participantMappings.clear();
      this.sessionUid = null;
      
      console.log('🛑 F123UDPProcessor stopped');
    } catch (error) {
      console.error('❌ Error stopping F123UDPProcessor:', error);
    }
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
    // Participants packet (ID: 4) - Maps Steam IDs to members
    this.f123.on('participants', async (data: any) => {
      try {
        await this.handleParticipantsPacket(data);
      } catch (error) {
        console.error('❌ Error handling participants packet:', error);
      }
    });

    // Final Classification packet (ID: 8) - Session results
    this.f123.on('finalClassification', async (data: any) => {
      try {
        await this.handleFinalClassificationPacket(data);
      } catch (error) {
        console.error('❌ Error handling final classification packet:', error);
      }
    });

    // Session History packet (ID: 11) - Lap-by-lap data
    this.f123.on('sessionHistory', async (data: any) => {
      try {
        await this.handleSessionHistoryPacket(data);
      } catch (error) {
        console.error('❌ Error handling session history packet:', error);
      }
    });

    // Session packet (ID: 1) - Track and session info
    this.f123.on('session', async (data: any) => {
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
    
    for (let i = 0; i < participants.length; i++) {
      const participant = participants[i];
      
      if (!participant.name || participant.name.trim() === '') {
        console.log(`⚠️ Skipping empty participant at index ${i}`);
        continue; // Skip empty participants
      }

      try {
        // Try to find member by Steam ID (name field contains Steam ID for network players)
        const member = await this.dbService.getMemberBySteamId(participant.name.trim());
        
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
          console.log(`📊 Available members:`, await this.dbService.getAllMembers().then(members => members.map(m => ({ name: m.name, steam_id: m.steam_id }))));
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
        console.log(`⚠️ No member mapping found for vehicle index ${i} - skipping classification entry`);
        continue;
      }

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
      console.log(`⚠️ No member mapping found for car index ${carIdx} - skipping session history`);
      return;
    }

    console.log(`📊 Processing session history packet for car ${carIdx} (member ${memberId})`);
    console.log(`📊 Found ${lapHistoryData.length} lap history entries`);

    try {
      let validLaps = 0;
      for (let lapIndex = 0; lapIndex < lapHistoryData.length; lapIndex++) {
        const lapData = lapHistoryData[lapIndex];
        
        if (lapData.lapTimeInMS === 0) {
          continue; // Skip empty lap data
        }

        await this.dbService.addUDPLapHistory({
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
          sessionUid: header.sessionUid,
          sessionTime: header.sessionTime,
          frameIdentifier: header.frameIdentifier
        });
        
        validLaps++;
      }

      console.log(`✅ Stored ${validLaps} valid laps for member ${memberId} (${lapHistoryData.length - validLaps} empty laps skipped)`);
    } catch (error) {
      console.error(`❌ Error storing session history for car ${carIdx}:`, error);
    }
  }

  private async handleSessionPacket(data: any): Promise<void> {
    const header = data.m_header as UDPPacketHeader;
    
    // Extract track and session information
    const trackId = data.m_trackId as number;
    const sessionType = data.m_sessionType as number;
    const totalLaps = data.m_totalLaps as number;
    const trackLength = data.m_trackLength as number;

    console.log(`🏁 Session packet received - Track ID: ${trackId}, Session Type: ${sessionType}, Total Laps: ${totalLaps}`);
    console.log(`📊 Session details: Track Length: ${trackLength}m, Session UID: ${header.sessionUid}, Session Time: ${header.sessionTime}`);

    // If we have an active season, we could create or update the current event
    // For now, we'll just log the session info
    if (this.activeSeasonId) {
      console.log(`📊 Session info for active season ${this.activeSeasonId}: Track ${trackId}, Type ${sessionType}`);
      
      // Try to find or create an event for this track
      const trackName = this.getTrackNameFromId(trackId);
      if (trackName) {
        console.log(`🏁 Track identified as: ${trackName}`);
        
        // Try to find existing event for this track
        const existingEvent = await this.dbService.findActiveEventByTrack(trackName);
        if (existingEvent) {
          this.currentEventId = existingEvent;
          console.log(`✅ Found existing event for track ${trackName}: ${existingEvent}`);
        } else {
          console.log(`⚠️ No existing event found for track ${trackName} - UDP data will be stored but not linked to specific event`);
        }
      }
    }
  }

  private getTrackNameFromId(trackId: number): string | null {
    // F1 23 Track ID mapping (simplified - you might want to expand this)
    const trackMap: { [key: number]: string } = {
      0: 'Melbourne',
      1: 'Paul Ricard',
      2: 'Shanghai',
      3: 'Sakhir (Bahrain)',
      4: 'Catalunya',
      5: 'Monaco',
      6: 'Montreal',
      7: 'Silverstone',
      8: 'Hockenheim',
      9: 'Hungaroring',
      10: 'Spa',
      11: 'Monza',
      12: 'Singapore',
      13: 'Suzuka',
      14: 'Abu Dhabi',
      15: 'Texas',
      16: 'Brazil',
      17: 'Austria',
      18: 'Sochi',
      19: 'Mexico',
      20: 'Baku (Azerbaijan)',
      21: 'Sakhir Short',
      22: 'Silverstone Short',
      23: 'Texas Short',
      24: 'Suzuka Short',
      25: 'Miami',
      26: 'Imola',
      27: 'Zandvoort',
      28: 'Las Vegas',
      29: 'Losail'
    };
    
    return trackMap[trackId] || null;
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
    return this.isRunning;
  }

  public getSessionUid(): bigint | null {
    return this.sessionUid;
  }
}
