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
    this.f123 = new F123UDP();
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
      
      throw error;
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

    const participants = data.m_participants as UDPParticipantData[];
    
    for (let i = 0; i < participants.length; i++) {
      const participant = participants[i];
      
      if (!participant.name || participant.name.trim() === '') {
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
        } else {
          console.log(`⚠️ No member found for Steam ID: ${participant.name}`);
        }
      } catch (error) {
        console.error(`❌ Error processing participant ${i}:`, error);
      }
    }
  }

  private async handleFinalClassificationPacket(data: any): Promise<void> {
    if (!this.activeSeasonId || !this.currentEventId) {
      console.log('⚠️ No active season or event - skipping final classification packet');
      return;
    }

    const header = data.m_header as UDPPacketHeader;
    const classificationData = data.m_classificationData as UDPFinalClassificationData[];

    console.log(`🏁 Processing final classification packet for session ${header.sessionUid}`);

    for (let i = 0; i < classificationData.length; i++) {
      const result = classificationData[i];
      const memberId = this.participantMappings.get(i);
      
      if (!memberId) {
        console.log(`⚠️ No member mapping found for vehicle index ${i}`);
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

        console.log(`✅ Stored final classification for member ${memberId} - Position: ${result.position}`);
      } catch (error) {
        console.error(`❌ Error storing final classification for vehicle ${i}:`, error);
      }
    }
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
      console.log(`⚠️ No member mapping found for car index ${carIdx}`);
      return;
    }

    console.log(`📊 Processing session history packet for car ${carIdx} (member ${memberId})`);

    try {
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
      }

      console.log(`✅ Stored ${lapHistoryData.length} laps for member ${memberId}`);
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

    // If we have an active season, we could create or update the current event
    // For now, we'll just log the session info
    if (this.activeSeasonId) {
      console.log(`📊 Session info for active season ${this.activeSeasonId}: Track ${trackId}, Type ${sessionType}`);
    }
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
