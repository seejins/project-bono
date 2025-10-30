import { F123UDP } from 'f1-23-udp';
import { EventEmitter } from 'events';

// F1 23 UDP Packet Types
export interface PacketHeader {
  packetFormat: number; // 2023
  gameYear: number; // Game year - last two digits e.g. 23
  gameMajorVersion: number; // Game major version - "X.00"
  gameMinorVersion: number; // Game minor version - "1.XX"
  packetVersion: number; // Version of this packet type, all start from 1
  packetId: number; // Identifier for the packet type
  sessionUid: number; // Unique identifier for the session
  sessionTime: number; // Session timestamp
  frameIdentifier: number; // Identifier for the frame the data was retrieved on
  overallFrameIdentifier: number; // Overall identifier for the frame the data was retrieved on
  playerCarIndex: number; // Index of player's car in the array
  secondaryPlayerCarIndex: number; // Index of secondary player's car in the array (splitscreen)
}

// Lap Data Packet (ID: 2) - Core timing data
export interface LapData {
  lastLapTimeInMS: number; // Last lap time in milliseconds
  currentLapTimeInMS: number; // Current time around the lap in milliseconds
  sector1TimeInMS: number; // Sector 1 time in milliseconds
  sector1TimeMinutes: number; // Sector 1 whole minute part
  sector2TimeInMS: number; // Sector 2 time in milliseconds
  sector2TimeMinutes: number; // Sector 2 whole minute part
  // Remove these - they don't exist in the packet:
  // sector3TimeInMS: number; 
  // sector3TimeMinutes: number;
  deltaToCarInFrontInMS: number; // Time delta to car in front in milliseconds
  deltaToRaceLeaderInMS: number; // Time delta to race leader in milliseconds
  lapDistance: number; // Distance vehicle is around current lap in metres
  totalDistance: number; // Total distance travelled in session in metres
  safetyCarDelta: number; // Delta in seconds for safety car
  carPosition: number; // Car race position
  currentLapNum: number; // Current lap number
  pitStatus: number; // 0 = none, 1 = pitting, 2 = in pit area
  numPitStops: number; // Number of pit stops taken in this race
  sector: number; // 0 = sector1, 1 = sector2, 2 = sector3
  currentLapInvalid: number; // Current lap invalid - 0 = valid, 1 = invalid
  penalties: number; // Accumulated time penalties in seconds to be added
  totalWarnings: number; // Accumulated number of warnings issued
  cornerCuttingWarnings: number; // Accumulated number of corner cutting warnings issued
  numUnservedDriveThroughPens: number; // Num drive-through pens left to serve
  numUnservedStopGoPens: number; // Num stop-go pens left to serve
  gridPosition: number; // Grid position the vehicle started the race in
  driverStatus: number; // Status of driver - 0 = in garage, 1 = flying lap, 2 = in lap, 3 = out lap, 4 = on track
  resultStatus: number; // Result status - 0 = invalid, 1 = inactive, 2 = active, 3 = finished, 4 = did not finish, 5 = disqualified, 6 = not classified, 7 = retired
  pitLaneTimerActive: number; // Pit lane timing, 0 = inactive, 1 = active
  pitLaneTimeInLaneInMS: number; // If active, the current time spent in the pit lane in ms
  pitStopTimerInMS: number; // Time of the actual pit stop in ms
  pitStopShouldServePen: number; // Whether the car should serve a penalty at this stop
  bestLapTimeInMS: number; // Best lap time in milliseconds (from Final Classification or Session History)
}

// Car Status Packet (ID: 7) - Tire and fuel data
export interface CarStatusData {
  tractionControl: number; // Traction control - 0 = off, 1 = medium, 2 = full
  antiLockBrakes: number; // 0 (off) - 1 (on)
  fuelMix: number; // Fuel mix - 0 = lean, 1 = standard, 2 = rich, 3 = max
  frontBrakeBias: number; // Front brake bias (percentage)
  pitLimiterStatus: number; // Pit limiter status - 0 = off, 1 = on
  fuelInTank: number; // Current fuel mass
  fuelCapacity: number; // Fuel capacity
  fuelRemainingLaps: number; // Fuel remaining in terms of laps (value on MFD)
  maxRpm: number; // Car's max RPM, point of rev limiter
  idleRpm: number; // Car's idle RPM
  maxGears: number; // Maximum number of gears
  drsAllowed: number; // 0 = not allowed, 1 = allowed
  drsActivationDistance: number; // 0 = DRS not available, non-zero - DRS will be available in [X] meters
  actualTyreCompound: number; // F1 Modern - 16 = C5, 17 = C4, 18 = C3, 19 = C2, 20 = C1, 21 = C0, 7 = inter, 8 = wet
  visualTyreCompound: number; // F1 visual (can be different from actual compound)
  tyresAgeLaps: number; // Age in laps of the current set of tyres
  vehicleFiaFlags: number; // -1 = invalid/unknown, 0 = none, 1 = green, 2 = blue, 3 = yellow
  enginePowerIce: number; // Engine power output of ICE (W)
  enginePowerMguk: number; // Engine power output of MGU-K (W)
  ersStoreEnergy: number; // ERS energy store in Joules
  ersDeployMode: number; // ERS deployment mode, 0 = none, 1 = medium, 2 = hotlap, 3 = overtake
  ersHarvestedThisLapMguk: number; // ERS energy harvested this lap by MGU-K
  ersHarvestedThisLapMguh: number; // ERS energy harvested this lap by MGU-H
  ersDeployedThisLap: number; // ERS energy deployed this lap
  networkPaused: number; // Whether the car is paused in a network game
}

// Session History Packet (ID: 11) - Stint data
export interface TyreStintHistoryData {
  endLap: number; // Lap the tyre usage ends on (255 of current tyre)
  tyreActualCompound: number; // Actual tyres used by this driver
  tyreVisualCompound: number; // Visual tyres used by this driver
}

// Micro-Sector Tracking Interfaces
export interface MicroSectorData {
  time: number; // Time in milliseconds
  driverId: string; // Driver who set this time
}

export interface DriverLapProgress {
  lapNumber: number;
  completedMicroSectors: Map<number, number>; // micro-sector index -> time
}

export interface MicroSectorTracker {
  // Global fastest times (only one driver per micro-sector)
  fastestOverall: Map<number, MicroSectorData>;
  
  // Personal bests per driver
  personalBest: Map<string, Map<number, number>>;
  
  // Current lap progress per driver
  currentLapProgress: Map<string, DriverLapProgress>;
  
  // Track length for micro-sector calculation
  trackLength: number;
  
  // Number of micro-sectors per lap
  microSectorsPerLap: number;
}

// Combined telemetry data interface
export interface F123TelemetryData {
  // Packet header
  header: PacketHeader;
  
  // Session Data
  sessionType: number; // 0=unknown, 1=practice1, 2=practice2, 3=practice3, 4=short practice, 5=qualifying1, 6=qualifying2, 7=qualifying3, 8=short qualifying, 9=osq, 10=race, 11=race2, 12=time trial
  sessionTimeLeft: number;
  sessionDuration: number;
  trackName?: string; // Track name from session data
  
  // Additional session data
  sessionData?: {
    totalLaps: number;
    trackLength: number;
  };
  
  // Driver Data
  driverName: string;
  teamName: string;
  carPosition: number;
  carNumber: number;
  
  // Lap Data (from Lap Data Packet)
  lapData: LapData;
  
  // Car Status (from Car Status Packet)
  carStatus: CarStatusData;
  
  // Stint History (from Session History Packet)
  stintHistory: TyreStintHistoryData[];
  
  // Micro-sector data
  microSectors: Array<'purple' | 'green' | 'yellow' | 'grey'>;
  
  // Additional fields expected by other services
  lapTime?: number;
  sector1Time?: number;
  sector2Time?: number;
  sector3Time?: number;
  bestLapSector1Time?: number;
  bestLapSector2Time?: number;
  bestLapSector3Time?: number;
  lapNumber?: number;
  currentLapTime?: number;
  lastLapTime?: number;
  bestLapTime?: number;
  speed?: number;
  throttle?: number;
  brake?: number;
  steering?: number;
  gear?: number;
  engineRPM?: number;
  tireWear?: { frontLeft: number; frontRight: number; rearLeft: number; rearRight: number };
  tireTemperature?: { frontLeft: number; frontRight: number; rearLeft: number; rearRight: number };
  fuelLevel?: number;
  fuelCapacity?: number;
  energyStore?: number;
  airTemperature?: number;
  trackTemperature?: number;
  rainPercentage?: number;
  drsEnabled?: boolean;
  ersDeployMode?: number;
  fuelMix?: number;
  penalties?: number;
  warnings?: number;
  numUnservedDriveThroughPens?: number;
  numUnservedStopGoPens?: number;
  numCars?: number;
  
  // Additional calculated fields
  gapToPole?: number; // calculated gap in milliseconds
  timestamp: Date;
}

export class TelemetryService extends EventEmitter {
  private f123: F123UDP;
  public isRunning: boolean = false;
  private lastData: F123TelemetryData | null = null;
  private dataBuffer: F123TelemetryData[] = [];
  private readonly BUFFER_SIZE = 1000; // Keep last 1000 data points
  private sessionStartTime: Date | null = null;
  private currentSessionData: F123TelemetryData[] = [];
  
  // Store data for all cars
  private lapDataMap: Map<number, LapData> = new Map();
  private carStatusMap: Map<number, CarStatusData> = new Map();
  private stintHistoryMap: Map<number, TyreStintHistoryData[]> = new Map();
  private participantsMap: Map<number, { driverName: string; teamName: string; carNumber: number; steamId?: string; platform?: number; networkId?: number }> = new Map();
  private bestLapTimesMap: Map<number, number> = new Map(); // Store best lap times from Session History
  private bestLapSector1Map: Map<number, number> = new Map(); // Store best lap sector 1 times
  private bestLapSector2Map: Map<number, number> = new Map(); // Store best lap sector 2 times
  private bestLapSector3Map: Map<number, number> = new Map(); // Store best lap sector 3 times
  private previousLapNumbers = new Map<number, number>(); // Track lap completion
  private completedLapS3Map = new Map<number, number>(); // Store S3 times for completed laps
  
  // Store final classification and damage data
  private finalClassificationData: any[] = [];
  private carDamageMap: Map<number, any> = new Map();
  
  // Micro-sector tracking
  private microSectorTracker: MicroSectorTracker = {
    fastestOverall: new Map(),
    personalBest: new Map(),
    currentLapProgress: new Map(),
    trackLength: 5000, // Default track length in meters
    microSectorsPerLap: 24 // 24 micro-sectors per lap
  };
  
  // Session data
  private sessionData: { 
    totalLaps: number; 
    trackLength: number; 
    sessionType: number;
    sessionTimeLeft: number;
    sessionDuration: number;
  } = { 
    totalLaps: 52, 
    trackLength: 5000, 
    sessionType: 10,
    sessionTimeLeft: 0,
    sessionDuration: 0
  };

  // Current session metadata for post-session processing
  private currentSessionType: number = 10;
  private currentTrackName: string = 'Unknown';
  private currentTrackLength: number = 0;
  private currentTotalLaps: number = 0;
  private currentSessionUid: number | null = null; // Track current session UID
  
  // Session restart detection
  private previousSessionTimeLeft: number | null = null;

  constructor() {
    super();
    this.f123 = new F123UDP({
      port: process.env.F1_UDP_PORT ? parseInt(process.env.F1_UDP_PORT) : 20777,
      address: process.env.F1_UDP_ADDR || '127.0.0.1'
    });
    this.setupF123Handlers();
  }

  private setupF123Handlers(): void {
    // Lap Data Packet (ID: 2) - Core timing data
    this.f123.on('lapData', (data) => {
      try {
        this.processLapDataPacket(data);
      } catch (error) {
        console.error('Error processing lap data packet:', error);
      }
    });

    // Car Status Packet (ID: 7) - Tire and fuel data
    this.f123.on('carStatus', (data) => {
      try {
        this.processCarStatusPacket(data);
      } catch (error) {
        console.error('Error processing car status packet:', error);
      }
    });

    // Session History Packet (ID: 11) - Stint data
    this.f123.on('sessionHistory', (data) => {
      try {
        this.processSessionHistoryPacket(data);
      } catch (error) {
        console.error('Error processing session history packet:', error);
      }
    });

    // Participants Packet (ID: 4) - Driver information
    this.f123.on('participants', (data) => {
      try {
        this.processParticipantsPacket(data);
      } catch (error) {
        console.error('Error processing participants packet:', error);
      }
    });

    // Session Packet (ID: 1) - Session information
    this.f123.on('session', (data) => {
      try {
        this.processSessionPacket(data);
      } catch (error) {
        console.error('Error processing session packet:', error);
      }
    });

    // Event Packet (ID: 3) - Race events
    this.f123.on('event', (data) => {
      try {
        this.processEventPacket(data);
      } catch (error) {
        console.error('Error processing event packet:', error);
      }
    });

    // Final Classification Packet (ID: 8) - Post-session results
    this.f123.on('finalClassification', (data) => {
      try {
        this.processFinalClassificationPacket(data);
      } catch (error) {
        console.error('Error processing final classification packet:', error);
      }
    });

    // Car Damage Packet (ID: 10) - Tire wear and damage data
    this.f123.on('carDamage', (data) => {
      try {
        this.processCarDamagePacket(data);
      } catch (error) {
        console.error('Error processing car damage packet:', error);
      }
    });
  }

  // Process Lap Data Packet (ID: 2)
  private processLapDataPacket(data: any): void {
    if (data.m_lapData && Array.isArray(data.m_lapData)) {
      data.m_lapData.forEach((lapData: any, index: number) => {
        if (lapData && lapData.m_carPosition > 0) {
          const currentLapNum = lapData.m_currentLapNum || 0;
          const previousLapNum = this.previousLapNumbers.get(index) || 0;
          
          // Detect lap completion: lap number increased
          if (currentLapNum > previousLapNum && previousLapNum > 0) {
            // Get the completed lap data BEFORE updating the map
            const completedLapData = this.lapDataMap.get(index);
            if (completedLapData && completedLapData.lastLapTimeInMS > 0) {
              const s3Time = this.calculateS3TimeForCompletedLap(completedLapData);
              this.completedLapS3Map.set(index, s3Time);
              console.log(`🏁 Lap ${previousLapNum} completed for car ${index}, S3: ${s3Time.toFixed(3)}s`);
            }
          }
          
          // Update previous lap number for next comparison
          this.previousLapNumbers.set(index, currentLapNum);
          
          this.lapDataMap.set(index, {
            lastLapTimeInMS: lapData.m_lastLapTimeInMS || 0,
            currentLapTimeInMS: lapData.m_currentLapTimeInMS || 0,
            sector1TimeInMS: lapData.m_sector1TimeInMS || 0,
            sector1TimeMinutes: lapData.m_sector1TimeMinutes || 0,
            sector2TimeInMS: lapData.m_sector2TimeInMS || 0,
            sector2TimeMinutes: lapData.m_sector2TimeMinutes || 0,
            // Remove these - they don't exist in the packet:
            // sector3TimeInMS: lapData.m_sector3TimeInMS || 0,
            // sector3TimeMinutes: lapData.m_sector3TimeMinutes || 0,
            deltaToCarInFrontInMS: lapData.m_deltaToCarInFrontInMS || 0,
            deltaToRaceLeaderInMS: lapData.m_deltaToRaceLeaderInMS || 0,
            lapDistance: lapData.m_lapDistance || 0,
            totalDistance: lapData.m_totalDistance || 0,
            safetyCarDelta: lapData.m_safetyCarDelta || 0,
            carPosition: lapData.m_carPosition || 0,
            currentLapNum: lapData.m_currentLapNum || 0,
            pitStatus: lapData.m_pitStatus || 0,
            numPitStops: lapData.m_numPitStops || 0,
            sector: lapData.m_sector || 0,
            currentLapInvalid: lapData.m_currentLapInvalid || 0,
            penalties: lapData.m_penalties || 0,
            totalWarnings: lapData.m_totalWarnings || 0,
            cornerCuttingWarnings: lapData.m_cornerCuttingWarnings || 0,
            numUnservedDriveThroughPens: lapData.m_numUnservedDriveThroughPens || 0,
            numUnservedStopGoPens: lapData.m_numUnservedStopGoPens || 0,
            gridPosition: lapData.m_gridPosition || 0,
            driverStatus: lapData.m_driverStatus || 0,
            resultStatus: lapData.m_resultStatus || 0,
            pitLaneTimerActive: lapData.m_pitLaneTimerActive || 0,
            pitLaneTimeInLaneInMS: lapData.m_pitLaneTimeInLaneInMS || 0,
            pitStopTimerInMS: lapData.m_pitStopTimerInMS || 0,
            pitStopShouldServePen: lapData.m_pitStopShouldServePen || 0,
            bestLapTimeInMS: lapData.m_bestLapTimeInMS || lapData.m_lastLapTimeInMS || 0,
          });
        }
      });
      
      // Emit combined telemetry data
      this.emitCombinedTelemetryData();
    }
  }

  // Process Car Status Packet (ID: 7)
  private processCarStatusPacket(data: any): void {
    if (data.m_car_status_data && Array.isArray(data.m_car_status_data)) {
      data.m_car_status_data.forEach((carStatus: any, index: number) => {
        if (carStatus) {
          this.carStatusMap.set(index, {
            tractionControl: carStatus.m_traction_control || 0,
            antiLockBrakes: carStatus.m_anti_lock_brakes || 0,
            fuelMix: carStatus.m_fuel_mix || 0,
            frontBrakeBias: carStatus.m_front_brake_bias || 0,
            pitLimiterStatus: carStatus.m_pit_limiter_status || 0,
            fuelInTank: carStatus.m_fuel_in_tank || 0,
            fuelCapacity: carStatus.m_fuel_capacity || 0,
            fuelRemainingLaps: carStatus.m_fuel_remaining_laps || 0,
            maxRpm: carStatus.m_max_rpm || 0,
            idleRpm: carStatus.m_idle_rpm || 0,
            maxGears: carStatus.m_max_gears || 0,
            drsAllowed: carStatus.m_drs_allowed || 0,
            drsActivationDistance: carStatus.m_drs_activation_distance || 0,
            actualTyreCompound: carStatus.m_actual_tyre_compound || 0,
            visualTyreCompound: carStatus.m_visual_tyre_compound || 0,
            tyresAgeLaps: carStatus.m_tyres_age_laps || 0,
            vehicleFiaFlags: carStatus.m_vehicle_fia_flags || 0,
            enginePowerIce: carStatus.m_engine_power_ice || 0,
            enginePowerMguk: carStatus.m_engine_power_mguk || 0,
            ersStoreEnergy: carStatus.m_ers_store_energy || 0,
            ersDeployMode: carStatus.m_ers_deploy_mode || 0,
            ersHarvestedThisLapMguk: carStatus.m_ers_harvested_this_lap_mguk || 0,
            ersHarvestedThisLapMguh: carStatus.m_ers_harvested_this_lap_mguh || 0,
            ersDeployedThisLap: carStatus.m_ers_deployed_this_lap || 0,
            networkPaused: carStatus.m_network_paused || 0,
          });
        }
      });
      
      // Emit combined telemetry data
      this.emitCombinedTelemetryData();
    }
  }

  // Helper function to calculate S3 time for completed laps only
  private calculateS3TimeForCompletedLap(lapData: LapData): number {
    // Only calculate S3 when we have a completed lap (lastLapTimeInMS > 0)
    // and we have valid S1 and S2 times from the completed lap
    if (lapData.lastLapTimeInMS === 0 || lapData.sector1TimeInMS === 0 || lapData.sector2TimeInMS === 0) {
      return 0;
    }
    
    // S3 = Last Lap Time - S1 - S2 (from the completed lap)
    const s1Total = lapData.sector1TimeInMS + (lapData.sector1TimeMinutes * 60000);
    const s2Total = lapData.sector2TimeInMS + (lapData.sector2TimeMinutes * 60000);
    const s3Time = lapData.lastLapTimeInMS - s1Total - s2Total;
    
    return Math.max(0, s3Time) / 1000; // Convert to seconds, ensure non-negative
  }

  // Helper function to get S3 time (returns completed lap S3 or 0 for current lap)
  private calculateS3Time(lapData: LapData, carIndex: number): number {
    // For current lap, return 0 (S3 only shows after lap completion)
    // For completed laps, return the stored S3 time
    return this.completedLapS3Map.get(carIndex) || 0;
  }

  // Process Session History Packet (ID: 11)
  private processSessionHistoryPacket(data: any): void {
    if (data.m_carIdx !== undefined && data.m_tyreStintsHistoryData) {
      const carIndex = data.m_carIdx;
      
      // Process stint history
      const stintHistory: TyreStintHistoryData[] = data.m_tyreStintsHistoryData.map((stint: any) => ({
        endLap: stint.m_endLap || 0,
        tyreActualCompound: stint.m_tyreActualCompound || 0,
        tyreVisualCompound: stint.m_tyreVisualCompound || 0,
      }));
      
      this.stintHistoryMap.set(carIndex, stintHistory);
      
      // Extract best lap time and sector times from lap history data
      if (data.m_lapHistoryData && Array.isArray(data.m_lapHistoryData)) {
        let bestLapTime = 0;
        let bestLapSector1 = 0;
        let bestLapSector2 = 0;
        let bestLapSector3 = 0;
        
        for (const lap of data.m_lapHistoryData) {
          if (lap.m_lapTimeInMS && lap.m_lapTimeInMS > 0) {
            if (bestLapTime === 0 || lap.m_lapTimeInMS < bestLapTime) {
              bestLapTime = lap.m_lapTimeInMS;
              bestLapSector1 = lap.m_sector1TimeInMS || 0;
              bestLapSector2 = lap.m_sector2TimeInMS || 0;
              bestLapSector3 = lap.m_sector3TimeInMS || 0;
            }
          }
        }
        
        if (bestLapTime > 0) {
          this.bestLapTimesMap.set(carIndex, bestLapTime);
          this.bestLapSector1Map.set(carIndex, bestLapSector1);
          this.bestLapSector2Map.set(carIndex, bestLapSector2);
          this.bestLapSector3Map.set(carIndex, bestLapSector3);
        }
      }
      
      // Emit combined telemetry data
      this.emitCombinedTelemetryData();
    }
  }

  // Process Participants Packet (ID: 4)
  private processParticipantsPacket(data: any): void {
    if (data.m_participants && Array.isArray(data.m_participants)) {
      const participants = data.m_participants.map((participant: any, index: number) => {
        if (participant && participant.m_name) {
          const driverName = Buffer.from(participant.m_name).toString('utf8').replace(/\0/g, '');
          const steamId = this.extractSteamId(participant.m_name);
          
          return {
            carIndex: index,
            aiControlled: participant.m_aiControlled,
            driverId: participant.m_driverId,
            networkId: participant.m_networkId,
            teamId: participant.m_teamId,
            raceNumber: participant.m_raceNumber,
            name: driverName,
            platform: participant.m_platform,
            steamId: steamId
          };
        }
        return null;
      }).filter(Boolean);

      // Store participants with enhanced data
      participants.forEach((participant: any) => {
        this.participantsMap.set(participant.carIndex, {
          driverName: participant.name,
          teamName: this.getTeamName(participant.teamId || 0),
          carNumber: participant.raceNumber || 0,
          steamId: participant.steamId,
          platform: participant.platform,
          networkId: participant.networkId
        });
      });

      // Emit participants event with enhanced data
      this.emit('participants', {
        sessionUid: data.m_header?.m_sessionUid,
        participants: participants,
        timestamp: new Date()
      });
    }
  }

  // Process Session Packet (ID: 1)
  private processSessionPacket(data: any): void {
    const newSessionUid = data.m_header?.sessionUid || data.m_sessionUid;
    const newSessionType = data.m_sessionType;
    const newSessionTimeLeft = data.m_sessionTimeLeft;
    
    // Detect session change (by session UID or session type change)
    if (this.currentSessionUid !== null && 
        (this.currentSessionUid !== newSessionUid || 
         this.sessionData.sessionType !== newSessionType)) {
      console.log('🔄 New session detected, clearing cached data...');
      this.clearSessionData();
      // Emit session change event to frontend
      this.emit('sessionChanged', {
        oldSessionType: this.sessionData.sessionType,
        newSessionType: newSessionType,
        sessionUid: newSessionUid
      });
    }
    
    // Detect session restart (same UID and type, but session time suddenly increased)
    if (this.currentSessionUid === newSessionUid && 
        this.sessionData.sessionType === newSessionType &&
        this.previousSessionTimeLeft !== null &&
        newSessionTimeLeft !== undefined &&
        newSessionTimeLeft > this.previousSessionTimeLeft + 30) { // 30 second threshold
      console.log('🔄 Session restart detected (same session, time reset), clearing cached data...');
      this.clearSessionData();
      // Emit session restart event to frontend
      this.emit('sessionRestarted', {
        sessionType: newSessionType,
        sessionUid: newSessionUid,
        reason: 'Session time reset'
      });
    }
    
    this.currentSessionUid = newSessionUid;
    
    // Store session information for use in combined data
    this.sessionStartTime = this.sessionStartTime || new Date();
    
    // Extract session data from UDP
    if (data.m_totalLaps !== undefined) {
      this.sessionData.totalLaps = data.m_totalLaps;
    }
    if (data.m_trackLength !== undefined) {
      this.sessionData.trackLength = data.m_trackLength;
      // Update micro-sector tracker with actual track length
      this.microSectorTracker.trackLength = data.m_trackLength;
    }
    if (data.m_sessionType !== undefined) {
      this.sessionData.sessionType = data.m_sessionType;
    }
    if (data.m_sessionTimeLeft !== undefined) {
      this.previousSessionTimeLeft = this.sessionData.sessionTimeLeft;
      this.sessionData.sessionTimeLeft = data.m_sessionTimeLeft;
    }
    if (data.m_sessionDuration !== undefined) {
      this.sessionData.sessionDuration = data.m_sessionDuration;
    }

    // Store current session metadata for post-session processing
    this.currentSessionType = data.m_sessionType || 10;
    this.currentTrackName = this.getTrackName(data.m_trackId || -1);
    this.currentTrackLength = data.m_trackLength || 0;
    this.currentTotalLaps = data.m_totalLaps || 0;
  }

  // Clear session data when new session starts
  private clearSessionData(): void {
    this.lapDataMap.clear();
    this.carStatusMap.clear();
    this.participantsMap.clear();
    this.stintHistoryMap.clear();
    this.bestLapTimesMap.clear();
    this.bestLapSector1Map.clear();
    this.bestLapSector2Map.clear();
    this.bestLapSector3Map.clear();
    this.previousLapNumbers.clear();
    this.completedLapS3Map.clear();
    this.currentSessionData = [];
    this.previousSessionTimeLeft = null; // Reset session restart detection
    console.log('✅ Session data cleared');
  }

  // Process Event Packet (ID: 3)
  private processEventPacket(data: any): void {
    // Handle race events like penalties, retirements, etc.
    this.emit('event', data);
  }

  // Process Final Classification Packet (ID: 8) - Post-session results
  private processFinalClassificationPacket(data: any): void {
    if (data.m_classificationData && Array.isArray(data.m_classificationData)) {
      const finalResults = data.m_classificationData.map((result: any, index: number) => {
        const participant = this.participantsMap.get(index);
        return {
          position: result.m_position || 0,
          numLaps: result.m_numLaps || 0,
          gridPosition: result.m_gridPosition || 0,
          points: result.m_points || 0,
          numPitStops: result.m_numPitStops || 0,
          resultStatus: result.m_resultStatus || 0,
          bestLapTimeInMS: result.m_bestLapTimeInMS || 0,
          totalRaceTime: result.m_totalRaceTime || 0,
          penaltiesTime: result.m_penaltiesTime || 0,
          numPenalties: result.m_numPenalties || 0,
          numTyreStints: result.m_numTyreStints || 0,
          tyreStintsActual: result.m_tyreStintsActual || [],
          tyreStintsVisual: result.m_tyreStintsVisual || [],
          tyreStintsEndLaps: result.m_tyreStintsEndLaps || [],
          // Add driver name and team from participants map
          driverName: participant?.driverName || 'Unknown',
          teamName: participant?.teamName || 'Unknown',
          carNumber: participant?.carNumber || 0,
          steamId: participant?.steamId || null,
          platform: participant?.platform || 255,
          networkId: participant?.networkId || 0,
          carIndex: index,
          // Add session metadata
          sessionType: this.currentSessionType,
          trackName: this.currentTrackName,
          trackLength: this.currentTrackLength,
          totalLaps: this.currentTotalLaps,
          sessionUID: data.m_header?.m_sessionUid
        };
      });

      // Store final classification data
      this.finalClassificationData = finalResults;
      
      // Emit final classification event
      this.emit('finalClassification', finalResults);

    }
  }

  // Process Car Damage Packet (ID: 10) - Tire wear and damage data
  private processCarDamagePacket(data: any): void {
    if (data.m_car_damage_data && Array.isArray(data.m_car_damage_data)) {
      data.m_car_damage_data.forEach((damageData: any, index: number) => {
        if (damageData) {
          const damageInfo = {
            carIndex: index,
            tyresWear: damageData.m_tyres_wear || [0, 0, 0, 0], // [RL, RR, FL, FR]
            tyresDamage: damageData.m_tyres_damage || [0, 0, 0, 0],
            brakesDamage: damageData.m_brakes_damage || [0, 0, 0, 0],
            frontLeftWingDamage: damageData.m_front_left_wing_damage || 0,
            frontRightWingDamage: damageData.m_front_right_wing_damage || 0,
            rearWingDamage: damageData.m_rear_wing_damage || 0,
            floorDamage: damageData.m_floor_damage || 0,
            diffuserDamage: damageData.m_diffuser_damage || 0,
            sidepodDamage: damageData.m_sidepod_damage || 0,
            drsFault: damageData.m_drs_fault || 0,
            ersFault: damageData.m_ers_fault || 0,
            gearBoxDamage: damageData.m_gear_box_damage || 0,
            engineDamage: damageData.m_engine_damage || 0,
            engineMGUHWear: damageData.m_engine_mguh_wear || 0,
            engineESWear: damageData.m_engine_es_wear || 0,
            engineCEWear: damageData.m_engine_ce_wear || 0,
            engineICEWear: damageData.m_engine_ice_wear || 0,
            engineMGUKWear: damageData.m_engine_mguk_wear || 0,
            engineTCWear: damageData.m_engine_tc_wear || 0,
            engineBlown: damageData.m_engine_blown || 0,
            engineSeized: damageData.m_engine_seized || 0
          };

          // Store damage data
          this.carDamageMap.set(index, damageInfo);
        }
      });

      // Emit car damage event
      this.emit('carDamage', {
        sessionUid: data.m_header?.m_sessionUid,
        damageData: Array.from(this.carDamageMap.values()),
        timestamp: new Date()
      });

    }
  }

  // Emit combined telemetry data for all cars
  private emitCombinedTelemetryData(): void {
    const startTime = Date.now();
    const allCarsData: F123TelemetryData[] = [];
    
    // Combine data from all maps for each car
    for (let carIndex = 0; carIndex < 22; carIndex++) {
      const lapData = this.lapDataMap.get(carIndex);
      const carStatus = this.carStatusMap.get(carIndex);
      const stintHistory = this.stintHistoryMap.get(carIndex) || [];
      const participant = this.participantsMap.get(carIndex);
      
      if (lapData && carStatus) {
        // Update lap data with best lap time from Session History
        const bestLapTime = this.bestLapTimesMap.get(carIndex);
        if (bestLapTime && bestLapTime > 0) {
          lapData.bestLapTimeInMS = bestLapTime;
        }
        
        // Update micro-sector progress for this driver
        this.updateMicroSectorProgress(carIndex, lapData, participant?.driverName || `Driver ${carIndex + 1}`);
        
        const combinedData: F123TelemetryData = {
          header: {
            packetFormat: 2023,
            gameYear: 23,
            gameMajorVersion: 1,
            gameMinorVersion: 0,
            packetVersion: 1,
            packetId: 2,
            sessionUid: 0,
            sessionTime: 0,
            frameIdentifier: 0,
            overallFrameIdentifier: 0,
            playerCarIndex: 0,
            secondaryPlayerCarIndex: 255,
          },
          sessionType: this.sessionData.sessionType,
          sessionTimeLeft: this.sessionData.sessionTimeLeft,
          sessionDuration: this.sessionData.sessionDuration,
          trackName: this.currentTrackName,
          driverName: participant?.driverName || `Driver ${carIndex + 1}`,
          teamName: participant?.teamName || 'Unknown Team',
          carPosition: lapData.carPosition,
          carNumber: participant?.carNumber || carIndex + 1,
          lapData,
          carStatus,
          stintHistory,
          microSectors: this.getMicroSectorColors(carIndex, participant?.driverName || `Driver ${carIndex + 1}`),
          sessionData: {
            totalLaps: this.sessionData.totalLaps,
            trackLength: this.sessionData.trackLength
          },
          // Populate additional fields expected by frontend
          lapNumber: lapData.currentLapNum,
          currentLapTime: lapData.currentLapTimeInMS / 1000, // Convert to seconds
          lastLapTime: lapData.lastLapTimeInMS / 1000, // Convert to seconds
          bestLapTime: lapData.bestLapTimeInMS / 1000, // Convert to seconds
          sector1Time: lapData.sector1TimeInMS / 1000, // Convert to seconds (current lap)
          sector2Time: lapData.sector2TimeInMS / 1000, // Convert to seconds (current lap)
          sector3Time: this.calculateS3Time(lapData, carIndex), // Get S3 from completed laps only
          // Best lap sector times for practice/qualifying tables
          bestLapSector1Time: (this.bestLapSector1Map.get(carIndex) || 0) / 1000, // Convert to seconds
          bestLapSector2Time: (this.bestLapSector2Map.get(carIndex) || 0) / 1000, // Convert to seconds
          bestLapSector3Time: (this.bestLapSector3Map.get(carIndex) || 0) / 1000, // Convert to seconds
          fuelLevel: carStatus.fuelInTank,
          fuelCapacity: carStatus.fuelCapacity,
          energyStore: carStatus.ersStoreEnergy,
          drsEnabled: carStatus.drsAllowed === 1,
          ersDeployMode: carStatus.ersDeployMode,
          fuelMix: carStatus.fuelMix,
          penalties: lapData.penalties,
          warnings: lapData.totalWarnings,
          numUnservedDriveThroughPens: lapData.numUnservedDriveThroughPens,
          numUnservedStopGoPens: lapData.numUnservedStopGoPens,
          // Add tire wear data from car damage packet if available
          tireWear: this.getTireWearData(carIndex),
          timestamp: new Date(),
        };
        
        allCarsData.push(combinedData);
      }
    }
    
    if (allCarsData.length > 0) {
      const processingTime = Date.now() - startTime;
      if (processingTime > 100) { // Log if processing takes more than 100ms
        console.log(`⚠️ Slow telemetry processing: ${processingTime}ms for ${allCarsData.length} cars`);
      }
      this.emit('telemetry', allCarsData);
    }
  }

  // Helper method to get team name from team ID
  private getTeamName(teamId: number): string {
    const teamNames: { [key: number]: string } = {
      0: 'Mercedes',
      1: 'Ferrari',
      2: 'Red Bull Racing',
      3: 'Williams',
      4: 'Aston Martin',
      5: 'Alpine',
      6: 'Alpha Tauri',
      7: 'Haas',
      8: 'McLaren',
      9: 'Alfa Romeo',
    };
    return teamNames[teamId] || 'Unknown Team';
  }

  // Extract Steam ID from participant name buffer
  private extractSteamId(nameBuffer: Uint8Array): string | null {
    const name = Buffer.from(nameBuffer).toString('utf8').replace(/\0/g, '');
    // Steam ID format: "STEAM_0:0:12345678" or similar
    // Extract from the name field
    const steamIdMatch = name.match(/STEAM_\d+:\d+:\d+/);
    return steamIdMatch ? steamIdMatch[0] : null;
  }

  // Get track name from track ID
  private getTrackName(trackId: number): string {
    const trackNames: { [key: number]: string } = {
      0: 'Melbourne', [1]: 'Paul Ricard', [2]: 'Shanghai', [3]: 'Sakhir (Bahrain)',
      4: 'Catalunya', [5]: 'Monaco', [6]: 'Montreal', [7]: 'Silverstone',
      8: 'Hockenheim', [9]: 'Hungaroring', [10]: 'Spa', [11]: 'Monza',
      12: 'Singapore', [13]: 'Suzuka', [14]: 'Abu Dhabi', [15]: 'Texas',
      16: 'Brazil', [17]: 'Austria', [18]: 'Sochi', [19]: 'Mexico',
      20: 'Baku (Azerbaijan)', [21]: 'Sakhir Short', [22]: 'Silverstone Short',
      23: 'Texas Short', [24]: 'Suzuka Short', [25]: 'Hanoi', [26]: 'Zandvoort',
      27: 'Imola', [28]: 'Portimão', [29]: 'Jeddah', [30]: 'Miami',
      31: 'Las Vegas', [32]: 'Losail'
    };
    return trackNames[trackId] || 'Unknown Track';
  }

  // Get tire wear data from car damage packet
  private getTireWearData(carIndex: number): { frontLeft: number; frontRight: number; rearLeft: number; rearRight: number } {
    const damageData = this.carDamageMap.get(carIndex);
    if (damageData && damageData.tyresWear) {
      // F1 23 UDP format: [RL, RR, FL, FR] - Rear Left, Rear Right, Front Left, Front Right
    return {
        frontLeft: damageData.tyresWear[3] || 0,   // FL
        frontRight: damageData.tyresWear[2] || 0,  // FR
        rearLeft: damageData.tyresWear[0] || 0,    // RL
        rearRight: damageData.tyresWear[1] || 0    // RR
      };
    }
    // Return default values if no damage data available
    return { frontLeft: 0, frontRight: 0, rearLeft: 0, rearRight: 0 };
  }


  // Handle session data changes
  private handleSessionData(data: F123TelemetryData): void {
    // Detect session start
    if (data.sessionTimeLeft === data.sessionDuration) {
      this.sessionStartTime = new Date();
      this.currentSessionData = [];
      console.log('Session started:', this.getSessionTypeName(data.sessionType));
    }
    
    // Detect session end
    if (data.sessionTimeLeft === 0 && this.currentSessionData.length > 0) {
      this.autoExportSessionData();
    }
    
    // Emit session data
    this.emit('session', data);
  }

  private processTelemetryData(data: F123TelemetryData): void {
    this.lastData = data;
    this.addToBuffer(data);
    this.currentSessionData.push(data);
    
    // Emit events for different data types
    this.emit('telemetry', data);
    this.emit('speed', data.speed);
    this.emit('tireWear', data.tireWear);
    this.emit('fuel', data.fuelLevel);
    this.emit('lap', data.lapNumber);
    
    // Emit alerts for critical conditions
    this.checkCriticalConditions(data);
  }

  private addToBuffer(data: F123TelemetryData): void {
    this.dataBuffer.push(data);
    if (this.dataBuffer.length > this.BUFFER_SIZE) {
      this.dataBuffer.shift();
    }
  }

  // Get session type name
  private getSessionTypeName(sessionType: number): string {
    const sessionTypes = [
      'Unknown', 'Practice 1', 'Practice 2', 'Practice 3',
      'Short Practice', 'Q1', 'Q2', 'Q3', 'Short Qualifying',
      'One Shot Qualifying', 'Race', 'Race 2', 'Time Trial'
    ];
    return sessionTypes[sessionType] || 'Unknown';
  }

  // Auto-export session data when session ends
  private async autoExportSessionData(): Promise<void> {
    if (this.currentSessionData.length === 0) return;
    
    try {
      console.log('Session ended, exporting data...');
      
      // Extract final results from session data
      const finalResults = this.extractFinalResults(this.currentSessionData);
      
      // Calculate gaps to pole
      const poleTime = this.findPoleTime(finalResults);
      if (poleTime) {
        finalResults.forEach(driver => {
          if (driver.bestLapTime !== undefined) {
          driver.gapToPole = driver.bestLapTime - poleTime;
          }
        });
      }
      
      // Emit session completed event
      this.emit('sessionCompleted', {
        sessionType: this.currentSessionData[0].sessionType,
        sessionTypeName: this.getSessionTypeName(this.currentSessionData[0].sessionType),
        sessionStartTime: this.sessionStartTime,
        sessionEndTime: new Date(),
        drivers: finalResults
      });
      
      console.log('Session data exported successfully');
    } catch (error) {
      console.error('Error exporting session data:', error);
    }
  }

  // Extract final results from session data
  private extractFinalResults(sessionData: F123TelemetryData[]): F123TelemetryData[] {
    // Get the latest data point for each driver (in this case, just the host)
    const latestData = sessionData[sessionData.length - 1];
    
    return [latestData];
  }

  // Find pole position time
  private findPoleTime(results: F123TelemetryData[]): number | null {
    const validTimes = results
      .map(r => r.bestLapTime)
      .filter((time): time is number => time !== undefined && time > 0);
    
    return validTimes.length > 0 ? Math.min(...validTimes) : null;
  }

  private checkCriticalConditions(data: F123TelemetryData): void {
    // Low fuel warning
    if (data.fuelLevel && data.fuelLevel < 5) {
      this.emit('alert', { type: 'low_fuel', message: 'Low fuel warning!' });
    }
    
    // High tire wear warning
    if (data.tireWear) {
    const maxTireWear = Math.max(
      data.tireWear.frontLeft,
      data.tireWear.frontRight,
      data.tireWear.rearLeft,
      data.tireWear.rearRight
    );
    
    if (maxTireWear > 80) {
      this.emit('alert', { type: 'tire_wear', message: 'High tire wear detected!' });
      }
    }
    
    // High tire temperature warning
    if (data.tireTemperature) {
    const maxTireTemp = Math.max(
      data.tireTemperature.frontLeft,
      data.tireTemperature.frontRight,
      data.tireTemperature.rearLeft,
      data.tireTemperature.rearRight
    );
    
    if (maxTireTemp > 120) {
      this.emit('alert', { type: 'tire_temp', message: 'High tire temperature!' });
      }
    }
    
    // Penalty warnings
    if (data.penalties && data.penalties > 0) {
      this.emit('alert', { type: 'penalty', message: `Penalty received: ${data.penalties}` });
    }
  }

  public start(): void {
    if (this.isRunning) {
      console.log('Telemetry service already running');
      return;
    }
    
    try {
      this.f123.start();
      this.isRunning = true;
      console.log('F1 23 UDP telemetry service started');
    } catch (error) {
      console.error('Failed to start telemetry service:', error);
      this.isRunning = false;
    }
  }

  public stop(): void {
    if (!this.isRunning) {
      console.log('Telemetry service not running');
      return;
    }
    
    try {
      this.f123.stop();
      this.isRunning = false;
      console.log('F1 23 UDP telemetry service stopped');
    } catch (error) {
      console.error('Failed to stop telemetry service:', error);
    }
  }

  public getLastData(): F123TelemetryData | null {
    return this.lastData;
  }

  public getDataBuffer(): F123TelemetryData[] {
    return [...this.dataBuffer];
  }

  public getCurrentSessionData(): F123TelemetryData[] {
    return [...this.currentSessionData];
  }

  // Micro-sector tracking methods
  private updateMicroSectorProgress(carIndex: number, lapData: LapData, driverName: string): void {
    const driverId = driverName;
    const currentLap = lapData.currentLapNum;
    const lapDistance = lapData.lapDistance;
    
    // Check if new lap started
    const driverProgress = this.microSectorTracker.currentLapProgress.get(driverId);
    if (!driverProgress || driverProgress.lapNumber !== currentLap) {
      // Reset current lap progress for new lap
      this.microSectorTracker.currentLapProgress.set(driverId, {
        lapNumber: currentLap,
        completedMicroSectors: new Map()
      });
    }
    
    // Calculate which micro-sectors are completed based on lap distance
    const microSectorLength = this.microSectorTracker.trackLength / this.microSectorTracker.microSectorsPerLap;
    const completedMicroSectors = Math.floor(lapDistance / microSectorLength);
    
    // Update completed micro-sectors with current lap time
    const currentLapTime = lapData.currentLapTimeInMS;
    const driverProgressData = this.microSectorTracker.currentLapProgress.get(driverId);
    
    if (driverProgressData) {
      for (let i = 0; i < completedMicroSectors && i < this.microSectorTracker.microSectorsPerLap; i++) {
        if (!driverProgressData.completedMicroSectors.has(i)) {
          // Calculate micro-sector time (simplified - using current lap time divided by completed sectors)
          const microSectorTime = completedMicroSectors > 0 ? currentLapTime / completedMicroSectors : currentLapTime;
          driverProgressData.completedMicroSectors.set(i, microSectorTime);
          
          // Check against fastest overall
          this.updateFastestMicroSector(i, microSectorTime, driverId);
          
          // Update personal best
          this.updatePersonalBest(driverId, i, microSectorTime);
        }
      }
    }
  }
  
  private updateFastestMicroSector(microSectorIndex: number, time: number, driverId: string): void {
    const currentFastest = this.microSectorTracker.fastestOverall.get(microSectorIndex);
    
    if (!currentFastest || time < currentFastest.time) {
      // New fastest micro-sector
      this.microSectorTracker.fastestOverall.set(microSectorIndex, {
        time,
        driverId
      });
    }
  }
  
  private updatePersonalBest(driverId: string, microSectorIndex: number, time: number): void {
    if (!this.microSectorTracker.personalBest.has(driverId)) {
      this.microSectorTracker.personalBest.set(driverId, new Map());
    }
    
    const driverPersonalBest = this.microSectorTracker.personalBest.get(driverId)!;
    const currentPersonalBest = driverPersonalBest.get(microSectorIndex);
    
    if (!currentPersonalBest || time < currentPersonalBest) {
      driverPersonalBest.set(microSectorIndex, time);
    }
  }
  
  private getMicroSectorColors(carIndex: number, driverName: string): Array<'purple' | 'green' | 'yellow' | 'grey'> {
    const driverId = driverName;
    const microSectors: Array<'purple' | 'green' | 'yellow' | 'grey'> = [];
    
    const driverProgress = this.microSectorTracker.currentLapProgress.get(driverId);
    
    for (let i = 0; i < this.microSectorTracker.microSectorsPerLap; i++) {
      // If micro-sector not completed in current lap, return grey
      if (!driverProgress || !driverProgress.completedMicroSectors.has(i)) {
        microSectors.push('grey');
        continue;
      }
      
      const time = driverProgress.completedMicroSectors.get(i)!;
      const fastest = this.microSectorTracker.fastestOverall.get(i);
      const personalBest = this.microSectorTracker.personalBest.get(driverId)?.get(i);
      
      if (fastest && time === fastest.time && fastest.driverId === driverId) {
        microSectors.push('purple'); // Fastest overall
      } else if (personalBest && time === personalBest) {
        microSectors.push('green'); // Personal best
      } else {
        microSectors.push('yellow'); // Slower than personal best
      }
    }
    
    return microSectors;
  }

}
