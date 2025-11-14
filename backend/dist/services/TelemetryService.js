"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelemetryService = void 0;
const f1_23_udp_1 = require("f1-23-udp");
const events_1 = require("events");
const f123Constants_1 = require("../utils/f123Constants");
const f123Helpers_1 = require("../utils/f123Helpers");
class TelemetryService extends events_1.EventEmitter {
    constructor() {
        super();
        this.isRunning = false;
        this.lastData = null;
        this.dataBuffer = [];
        // Cached header object to avoid recreating on every emission
        this.DEFAULT_HEADER = {
            packetFormat: 2023,
            gameYear: 23,
            gameMajorVersion: 1,
            gameMinorVersion: 0,
            packetVersion: 1,
            packetId: 2,
            sessionUid: 0n,
            sessionTime: 0,
            frameIdentifier: 0,
            overallFrameIdentifier: 0,
            playerCarIndex: 0,
            secondaryPlayerCarIndex: 255,
        };
        // Store data for all cars
        this.lapDataMap = new Map();
        this.carStatusMap = new Map();
        this.stintHistoryMap = new Map();
        this.participantsMap = new Map();
        this.bestLapTimesMap = new Map(); // Store best lap times from Session History
        this.bestLapSector1Map = new Map(); // Store best lap sector 1 times
        this.bestLapSector2Map = new Map(); // Store best lap sector 2 times
        this.bestLapSector3Map = new Map(); // Store best lap sector 3 times
        this.previousLapNumbers = new Map(); // Track lap completion
        this.completedLapSectors = new Map(); // Store S1/S2 when entering sector 3
        // Last completed sector times (right-side columns) - updated on sector completion
        this.persistedLS1 = new Map(); // Updated when entering sector 2
        this.persistedLS2 = new Map(); // Updated when entering sector 3
        this.persistedLS3 = new Map(); // Updated on sector 3 completion
        // Micro-sector tracking for all session types (optimized)
        this.MICRO_SECTORS_PER_SECTOR = 8;
        this.TOTAL_MICRO_SECTORS = 24;
        // Cached calculations (computed once per session, not per car)
        this.cachedSectorLength = 0; // trackLength / 3
        this.cachedMicroSectorLength = 0; // sectorLength / 8
        // Fastest lap time per micro-sector (across all drivers) - for purple comparison
        this.fastestMicroSectorLapTimes = new Map(); // microSectorIndex(0-23) -> fastest currentLapTimeInMS
        // Personal best lap time per driver per micro-sector - for green comparison
        this.personalBestMicroSectorLapTimes = new Map(); // carIndex -> Map<microSectorIndex, personalBest currentLapTimeInMS>
        // Store colors directly (no recalculation needed)
        this.microSectorColors = new Map(); // carIndex -> Map<microSectorIndex, color>
        // Simplified tracking (no entryTimeInMS needed)
        this.microSectorTracking = new Map();
        // Track previous state for event-based emission (only emit on meaningful changes)
        this.previousCarStates = new Map();
        // Store damage data
        this.carDamageMap = new Map();
        // Session data
        this.sessionData = {
            totalLaps: 52,
            trackLength: 5000,
            sessionType: 10,
            sessionTimeLeft: 0,
            sessionDuration: 0
        };
        // Current session metadata for post-session processing
        this.currentSessionType = 10;
        this.currentTrackName = 'Unknown';
        this.currentTrackLength = 0;
        this.currentTotalLaps = 0;
        this.currentSessionUid = null; // Track current session UID
        // Frame 1 initial load tracking (per spec: Frame 1 has session_timestamp 0.000)
        this.participantsLoadedForCurrentSession = false;
        this.pendingInitialEmission = false;
        this.initialEmissionTimeout = null;
        // Event Packet state management
        this.isRedFlag = false;
        this.isChequeredFlag = false;
        this.safetyCarStatus = 0; // 0=none, 1=full SC, 2=VSC, 3=formation
        this.previousSafetyCarStatus = null;
        // Fastest lap tracking (isolated - ONLY for Best Lap column color coding)
        this.fastestLapCarIndex = null;
        this.fastestLapTime = null;
        this.f123 = new f1_23_udp_1.F123UDP({
            port: process.env.F1_UDP_PORT ? parseInt(process.env.F1_UDP_PORT, 10) : 20999,
            address: process.env.F1_UDP_ADDR || '127.0.0.1'
        });
        this.setupF123Handlers();
    }
    setupF123Handlers() {
        // Lap Data Packet (ID: 2) - Core timing data
        this.f123.on('lapData', (data) => {
            try {
                this.processLapDataPacket(data);
            }
            catch (error) {
                console.error('Error processing lap data packet:', error);
            }
        });
        // Car Status Packet (ID: 7) - Tire and fuel data
        this.f123.on('carStatus', (data) => {
            try {
                this.processCarStatusPacket(data);
            }
            catch (error) {
                console.error('Error processing car status packet:', error);
            }
        });
        // Session History Packet (ID: 11) - Stint data
        this.f123.on('sessionHistory', (data) => {
            try {
                this.processSessionHistoryPacket(data);
                // Emit raw packet for F123UDPProcessor consumption
                this.emit('raw_packet:sessionHistory', data);
            }
            catch (error) {
                console.error('Error processing session history packet:', error);
            }
        });
        // Participants Packet (ID: 4) - Driver information
        this.f123.on('participants', (data) => {
            try {
                this.processParticipantsPacket(data);
                // Emit raw packet for F123UDPProcessor consumption
                this.emit('raw_packet:participants', data);
            }
            catch (error) {
                console.error('Error processing participants packet:', error);
            }
        });
        // Session Packet (ID: 1) - Session information
        this.f123.on('session', (data) => {
            try {
                this.processSessionPacket(data);
                // Emit raw packet for F123UDPProcessor consumption
                this.emit('raw_packet:session', data);
            }
            catch (error) {
                console.error('Error processing session packet:', error);
            }
        });
        // Event Packet (ID: 3) - Race events
        this.f123.on('event', (data) => {
            try {
                this.processEventPacket(data);
            }
            catch (error) {
                console.error('Error processing event packet:', error);
            }
        });
        // Final Classification Packet (ID: 8) - Post-session results
        this.f123.on('finalClassification', (data) => {
            try {
                this.processFinalClassificationPacket(data);
                // Emit raw packet for F123UDPProcessor consumption
                this.emit('raw_packet:finalClassification', data);
            }
            catch (error) {
                console.error('Error processing final classification packet:', error);
            }
        });
        // Car Damage Packet (ID: 10) - Tire wear and damage data
        this.f123.on('carDamage', (data) => {
            try {
                this.processCarDamagePacket(data);
            }
            catch (error) {
                console.error('Error processing car damage packet:', error);
            }
        });
    }
    // Process Lap Data Packet (ID: 2)
    processLapDataPacket(data) {
        if (data.m_lapData && Array.isArray(data.m_lapData)) {
            let hasMeaningfulChange = false;
            let isNewSession = false;
            // Extract session UID from packet header (check multiple possible paths)
            const packetSessionUid = BigInt(data.m_header?.m_sessionUid ||
                data.m_header?.sessionUid ||
                data.m_sessionUid ||
                0);
            // Check for new session (will process data first, then emit)
            if (packetSessionUid > 0n) {
                if (this.currentSessionUid === null || this.currentSessionUid !== packetSessionUid) {
                    isNewSession = true;
                    hasMeaningfulChange = true;
                    // Reset participants flag for new session
                    this.participantsLoadedForCurrentSession = false;
                    // Clear any pending timeout
                    if (this.initialEmissionTimeout) {
                        clearTimeout(this.initialEmissionTimeout);
                        this.initialEmissionTimeout = null;
                    }
                    // Update current session UID if it changed
                    if (this.currentSessionUid !== packetSessionUid) {
                        this.currentSessionUid = packetSessionUid;
                    }
                }
            }
            // Detect Frame 1 using session_time (only check if new session)
            // Frame 1 has session_timestamp 0.000 per spec
            let isFrame1 = false;
            if (isNewSession) {
                const sessionTime = data.m_header?.m_sessionTime || data.m_header?.sessionTime || data.m_sessionTime || -1;
                isFrame1 = sessionTime === 0.0 || (sessionTime >= 0 && sessionTime < 0.05);
            }
            // Process lap data first to populate maps before emission
            // Allow position 0 during Frame 1 (formation lap/grid positions)
            const totalCarsInPacket = data.m_lapData.length;
            let processedCount = 0;
            data.m_lapData.forEach((lapData, index) => {
                if (lapData && (lapData.m_carPosition > 0 || isFrame1)) {
                    processedCount++;
                    const currentLapNum = lapData.m_currentLapNum || 0;
                    const previousLapNum = this.previousLapNumbers.get(index) || 0;
                    // Get previous state for this car
                    const prevState = this.previousCarStates.get(index) || {
                        position: 0,
                        bestLapTime: 0,
                        sector: 0,
                        lapNumber: 0,
                        driverStatus: 0,
                        resultStatus: 0,
                        pitStatus: 0
                    };
                    // Current state values
                    const currentPosition = lapData.m_carPosition || 0;
                    const currentBestLapTime = lapData.m_bestLapTimeInMS || lapData.m_lastLapTimeInMS || 0;
                    const currentSector = lapData.m_sector || 0;
                    const currentDriverStatus = lapData.m_driverStatus || 0;
                    const currentResultStatus = lapData.m_resultStatus || 0;
                    const currentPitStatus = lapData.m_pitStatus || 0;
                    // Get previous sector early (needed for micro-sector tracking)
                    const prevSector = prevState.sector ?? 0;
                    // Extract values once for micro-sector tracking (avoid redundant extraction)
                    const currentLapDistance = lapData.m_lapDistance || 0;
                    const currentLapTimeInMS = lapData.m_currentLapTimeInMS || 0;
                    const trackLength = this.sessionData.trackLength || 0;
                    // Clean up inactive cars (memory leak prevention)
                    if (currentPosition === 0) {
                        this.microSectorTracking.delete(index);
                        this.microSectorColors.delete(index);
                        // Keep personalBestMicroSectorLapTimes and fastestMicroSectorLapTimes (session-level stats)
                    }
                    // Micro-sector tracking for ALL session types (qualifying, practice, race)
                    // Visualization handled by frontend (only shown in practice/qualifying tables)
                    if (trackLength > 0 && currentLapDistance >= 0 && currentLapDistance < trackLength && currentLapTimeInMS > 0) {
                        // Initialize or get tracking (lazy initialization - only for active cars)
                        let tracking = this.microSectorTracking.get(index);
                        if (!tracking) {
                            tracking = {
                                currentMicroSectorIndex: 0,
                                entryDistance: 0
                            };
                            this.microSectorTracking.set(index, tracking);
                        }
                        // Calculate distance within current major sector (using cached values - no redundant calculation)
                        const sectorStartDistance = currentSector * this.cachedSectorLength;
                        const distanceInSector = currentLapDistance - sectorStartDistance;
                        // Calculate micro-sector index (use cached microSectorLength - no redundant division)
                        const microSectorInMajor = Math.floor(distanceInSector / this.cachedMicroSectorLength);
                        const clampedMicroSector = Math.min(microSectorInMajor, this.MICRO_SECTORS_PER_SECTOR - 1);
                        const globalMicroSectorIndex = (currentSector * this.MICRO_SECTORS_PER_SECTOR) + clampedMicroSector;
                        // Detect boundary crossing (sector change OR micro-sector change)
                        const sectorChanged = currentSector !== prevSector;
                        const microSectorChanged = globalMicroSectorIndex !== tracking.currentMicroSectorIndex;
                        if (sectorChanged || microSectorChanged) {
                            hasMeaningfulChange = true;
                            // Store color for completed micro-sector (compare currentLapTimeInMS directly)
                            if (tracking.currentMicroSectorIndex >= 0) {
                                const previousMicroSectorIndex = tracking.currentMicroSectorIndex;
                                // Initialize maps if needed (optimized Map.has() pattern)
                                if (!this.microSectorColors.has(index)) {
                                    this.microSectorColors.set(index, new Map());
                                }
                                if (!this.personalBestMicroSectorLapTimes.has(index)) {
                                    this.personalBestMicroSectorLapTimes.set(index, new Map());
                                }
                                const driverColors = this.microSectorColors.get(index);
                                const driverBestMap = this.personalBestMicroSectorLapTimes.get(index);
                                // Compare currentLapTimeInMS directly (lower time = faster)
                                const fastestLapTime = this.fastestMicroSectorLapTimes.get(previousMicroSectorIndex) ?? Infinity;
                                const personalBestLapTime = driverBestMap.get(previousMicroSectorIndex) ?? Infinity;
                                // Determine color immediately based on comparison (only if valid lap time)
                                if (currentLapTimeInMS > 0) {
                                    if (currentLapTimeInMS < fastestLapTime) {
                                        driverColors.set(previousMicroSectorIndex, 'purple'); // Fastest overall
                                        this.fastestMicroSectorLapTimes.set(previousMicroSectorIndex, currentLapTimeInMS);
                                    }
                                    else if (currentLapTimeInMS < personalBestLapTime) {
                                        driverColors.set(previousMicroSectorIndex, 'green'); // Personal best
                                        driverBestMap.set(previousMicroSectorIndex, currentLapTimeInMS);
                                    }
                                    else {
                                        driverColors.set(previousMicroSectorIndex, 'yellow'); // Slower than personal best
                                        if (personalBestLapTime === Infinity) {
                                            driverBestMap.set(previousMicroSectorIndex, currentLapTimeInMS); // First attempt becomes personal best
                                        }
                                    }
                                }
                            }
                            // Update tracking state (no entryTimeInMS needed)
                            tracking.currentMicroSectorIndex = globalMicroSectorIndex;
                            tracking.entryDistance = currentLapDistance;
                        }
                        // Detect lap reset (use existing detection)
                        if (currentLapNum > previousLapNum && previousLapNum > 0) {
                            // Clear current colors for new lap (keep fastest/personal best lap times)
                            const driverColors = this.microSectorColors.get(index);
                            if (driverColors) {
                                driverColors.clear();
                            }
                            // Reset tracking
                            tracking.currentMicroSectorIndex = 0;
                            tracking.entryDistance = 0;
                        }
                    }
                    // Detect lap completion: lap number increased
                    if (currentLapNum > previousLapNum && previousLapNum > 0) {
                        hasMeaningfulChange = true;
                        // S3 is now stored on sector completion (sector 2 → 0), not here
                        // Just detect lap completion for meaningful change detection
                    }
                    // Capture S1 when entering sector 2 (sector 1 completed)
                    // Allow RUNNING (1), IN_LAP (2) for practice/qualifying, and ON_TRACK (4) for races
                    const isRace = this.currentSessionType === 10 || this.currentSessionType === 11;
                    if (currentSector === 1 && prevSector === 0 && (currentDriverStatus === 1 || // Flying Lap (all sessions)
                        (!isRace && currentDriverStatus === 2) || // In Lap (practice/qualifying only)
                        (isRace && currentDriverStatus === 4) // On Track (race only)
                    )) {
                        const s1Time = lapData.m_sector1TimeInMS || 0;
                        const s1Minutes = lapData.m_sector1TimeMinutes || 0;
                        if (s1Time > 0) {
                            // Store S1 for right-side persistence
                            this.persistedLS1.set(index, { time: s1Time, minutes: s1Minutes });
                            // Clear S2 and S3 from right-side persistence when S1 completes (new lap started)
                            this.persistedLS2.delete(index);
                            this.persistedLS3.delete(index);
                        }
                    }
                    // Capture S2 when entering sector 3 (sector 2 completed)
                    // Also store S1/S2 for S3 calculation on sector completion
                    // Allow RUNNING (1), IN_LAP (2) for practice/qualifying, and ON_TRACK (4) for races
                    if (currentSector === 2 && prevSector === 1 && (currentDriverStatus === 1 || // Flying Lap (all sessions)
                        (!isRace && currentDriverStatus === 2) || // In Lap (practice/qualifying only)
                        (isRace && currentDriverStatus === 4) // On Track (race only)
                    )) {
                        // Capture S2 for persistence (right-side column)
                        const s2Time = lapData.m_sector2TimeInMS || 0;
                        const s2Minutes = lapData.m_sector2TimeMinutes || 0;
                        if (s2Time > 0) {
                            this.persistedLS2.set(index, { time: s2Time, minutes: s2Minutes });
                        }
                        // Also store S1/S2 for S3 calculation on sector completion (when entering sector 1 of next lap)
                        const s1Time = lapData.m_sector1TimeInMS || 0;
                        const s1Minutes = lapData.m_sector1TimeMinutes || 0;
                        if (s1Time > 0 && s2Time > 0) {
                            this.completedLapSectors.set(index, {
                                s1: s1Time,
                                s1Minutes: s1Minutes,
                                s2: s2Time,
                                s2Minutes: s2Minutes
                            });
                        }
                    }
                    // Capture S3 when entering sector 1 of next lap (sector 3 completed: sector 2 → 0)
                    // Allow RUNNING (1), IN_LAP (2) for practice/qualifying, and ON_TRACK (4) for races
                    if (currentSector === 0 && prevSector === 2 && (currentDriverStatus === 1 || // Flying Lap (all sessions)
                        (!isRace && currentDriverStatus === 2) || // In Lap (practice/qualifying only)
                        (isRace && currentDriverStatus === 4) // On Track (race only)
                    )) {
                        // Use lastLapTimeInMS directly from current packet (most accurate timing)
                        const lastLapTimeInMS = lapData.m_lastLapTimeInMS || 0;
                        if (lastLapTimeInMS > 0) {
                            // Use stored S1/S2 from when driver entered sector 3
                            const storedSectors = this.completedLapSectors.get(index);
                            if (storedSectors) {
                                // Calculate S3 using stored S1/S2 from completed lap
                                const s3Time = (0, f123Helpers_1.calculateS3TimeForCompletedLap)(lastLapTimeInMS, // Use from current packet, not map (more accurate timing)
                                storedSectors.s1, storedSectors.s1Minutes, storedSectors.s2, storedSectors.s2Minutes);
                                // Store S3 for persistence (right-side column) - updated on sector completion, not lap completion
                                this.persistedLS3.set(index, s3Time);
                                // Clear stored sectors after use
                                this.completedLapSectors.delete(index);
                            }
                            else {
                                // Fallback: get lap data from map for S1/S2, but use current packet for lastLapTime
                                const completedLapData = this.lapDataMap.get(index);
                                if (completedLapData) {
                                    const s3Time = (0, f123Helpers_1.calculateS3TimeForCompletedLap)(lastLapTimeInMS, // Use from current packet
                                    completedLapData.sector1TimeInMS, completedLapData.sector1TimeMinutes, completedLapData.sector2TimeInMS, completedLapData.sector2TimeMinutes);
                                    this.persistedLS3.set(index, s3Time);
                                }
                            }
                        }
                    }
                    // Check for meaningful changes (only emit on these events)
                    if (currentPosition !== prevState.position || // Position change
                        (currentLapNum > prevState.lapNumber && prevState.lapNumber > 0) || // New lap started
                        (currentSector > prevState.sector && prevState.driverStatus === 1) || // Sector completion (only when RUNNING)
                        (currentBestLapTime > 0 && currentBestLapTime < prevState.bestLapTime && prevState.bestLapTime > 0) || // New best lap
                        currentDriverStatus !== prevState.driverStatus || // Status change (IN_GARAGE, PITTING, etc.)
                        currentResultStatus !== prevState.resultStatus || // DNF/DSQ/Retired
                        currentPitStatus !== prevState.pitStatus // Pit entry/exit
                    ) {
                        hasMeaningfulChange = true;
                    }
                    // Clear right-side sector times when entering out lap (driverStatus = 3) or entering pit status (pitStatus = 1 or 2)
                    if ((currentDriverStatus === 3 && prevState.driverStatus !== 3) ||
                        ((currentPitStatus === 1 || currentPitStatus === 2) && prevState.pitStatus === 0)) {
                        this.persistedLS1.delete(index);
                        this.persistedLS2.delete(index);
                        this.persistedLS3.delete(index);
                    }
                    // Update previous lap number for next comparison
                    this.previousLapNumbers.set(index, currentLapNum);
                    // Always update the maps (store latest data)
                    this.lapDataMap.set(index, {
                        lastLapTimeInMS: lapData.m_lastLapTimeInMS || 0,
                        currentLapTimeInMS: lapData.m_currentLapTimeInMS || 0,
                        sector1TimeInMS: lapData.m_sector1TimeInMS || 0,
                        sector1TimeMinutes: lapData.m_sector1TimeMinutes || 0,
                        sector2TimeInMS: lapData.m_sector2TimeInMS || 0,
                        sector2TimeMinutes: lapData.m_sector2TimeMinutes || 0,
                        deltaToCarInFrontInMS: lapData.m_deltaToCarInFrontInMS || 0,
                        deltaToRaceLeaderInMS: lapData.m_deltaToRaceLeaderInMS || 0,
                        lapDistance: lapData.m_lapDistance || 0,
                        totalDistance: lapData.m_totalDistance || 0,
                        safetyCarDelta: lapData.m_safetyCarDelta || 0,
                        carPosition: currentPosition,
                        currentLapNum: currentLapNum,
                        pitStatus: currentPitStatus,
                        numPitStops: lapData.m_numPitStops || 0,
                        sector: currentSector,
                        currentLapInvalid: lapData.m_currentLapInvalid || 0,
                        penalties: lapData.m_penalties || 0,
                        totalWarnings: lapData.m_totalWarnings || 0,
                        cornerCuttingWarnings: lapData.m_cornerCuttingWarnings || 0,
                        numUnservedDriveThroughPens: lapData.m_numUnservedDriveThroughPens || 0,
                        numUnservedStopGoPens: lapData.m_numUnservedStopGoPens || 0,
                        gridPosition: lapData.m_gridPosition || 0,
                        driverStatus: currentDriverStatus,
                        resultStatus: currentResultStatus,
                        pitLaneTimerActive: lapData.m_pitLaneTimerActive || 0,
                        pitLaneTimeInLaneInMS: lapData.m_pitLaneTimeInLaneInMS || 0,
                        pitStopTimerInMS: lapData.m_pitStopTimerInMS || 0,
                        pitStopShouldServePen: lapData.m_pitStopShouldServePen || 0,
                        bestLapTimeInMS: currentBestLapTime,
                    });
                    // Update previous state
                    this.previousCarStates.set(index, {
                        position: currentPosition,
                        bestLapTime: currentBestLapTime,
                        sector: currentSector,
                        lapNumber: currentLapNum,
                        driverStatus: currentDriverStatus,
                        resultStatus: currentResultStatus,
                        pitStatus: currentPitStatus
                    });
                }
            });
            // Emit if meaningful change detected OR if it's a new session (force initial load)
            // For new sessions (Frame 1), wait for participants with timeout fallback
            if (isNewSession) {
                if (this.participantsLoadedForCurrentSession) {
                    // Participants already loaded, emit immediately
                    this.pendingInitialEmission = false;
                    this.emitCombinedTelemetryData();
                }
                else {
                    // Mark pending and set timeout (2 second fallback)
                    this.pendingInitialEmission = true;
                    if (this.initialEmissionTimeout) {
                        clearTimeout(this.initialEmissionTimeout);
                    }
                    this.initialEmissionTimeout = setTimeout(() => {
                        // Timeout: emit even without participants (fallback)
                        if (this.pendingInitialEmission) {
                            this.pendingInitialEmission = false;
                            this.emitCombinedTelemetryData();
                        }
                        this.initialEmissionTimeout = null;
                    }, 2000);
                }
            }
            else if (hasMeaningfulChange) {
                // Normal emission (not initial load)
                this.emitCombinedTelemetryData();
            }
        }
    }
    // Process Car Status Packet (ID: 7)
    processCarStatusPacket(data) {
        if (data.m_car_status_data && Array.isArray(data.m_car_status_data)) {
            data.m_car_status_data.forEach((carStatus, index) => {
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
            // Don't emit here - carStatus packets are frequent and don't need separate emission
            // Emission will happen from lapData packet when meaningful changes occur
        }
    }
    // Process Session History Packet (ID: 11)
    processSessionHistoryPacket(data) {
        if (data.m_carIdx !== undefined && data.m_tyreStintsHistoryData) {
            const carIndex = data.m_carIdx;
            // Process stint history
            const stintHistory = data.m_tyreStintsHistoryData.map((stint) => ({
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
            // Don't emit here - sessionHistory packets are infrequent but emission happens from lapData
            // when meaningful changes occur
        }
    }
    // Process Participants Packet (ID: 4)
    processParticipantsPacket(data) {
        if (data.m_participants && Array.isArray(data.m_participants)) {
            const participants = data.m_participants.map((participant, index) => {
                if (participant && participant.m_name) {
                    // The f1-23-udp library may provide m_name as string, Buffer, or byte array
                    // Handle all cases robustly
                    let driverName;
                    const nameType = typeof participant.m_name;
                    if (nameType === 'string') {
                        // Already a string - use directly (most common case)
                        driverName = participant.m_name.replace(/\0/g, '').trim();
                    }
                    else if (Buffer.isBuffer(participant.m_name)) {
                        // Already a Buffer - convert to string
                        driverName = participant.m_name.toString('utf8').replace(/\0/g, '').trim();
                    }
                    else if (Array.isArray(participant.m_name)) {
                        // Byte array [u8; 48] - convert to Buffer then string
                        driverName = Buffer.from(participant.m_name).toString('utf8').replace(/\0/g, '').trim();
                    }
                    else {
                        // Fallback: try Buffer.from for any other type
                        try {
                            driverName = Buffer.from(participant.m_name).toString('utf8').replace(/\0/g, '').trim();
                        }
                        catch (error) {
                            console.warn(`⚠️ Failed to parse driver name for participant ${index} (type: ${nameType}):`, error);
                            return null;
                        }
                    }
                    // Only proceed if we got a valid, non-empty name
                    if (!driverName || driverName.length === 0) {
                        console.warn(`⚠️ Empty driver name for participant ${index} (original type: ${nameType})`);
                        return null;
                    }
                    // Debug: Log if name looks suspicious (contains "undefined" or very short)
                    if (driverName.includes('undefined') || driverName.length < 2) {
                        console.warn(`⚠️ Suspicious driver name for participant ${index}: "${driverName}" (type: ${nameType}, original: ${JSON.stringify(participant.m_name).substring(0, 100)})`);
                    }
                    const steamId = this.extractSteamIdFromName(driverName);
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
            participants.forEach((participant) => {
                this.participantsMap.set(participant.carIndex, {
                    driverName: participant.name,
                    teamName: this.getTeamName(participant.teamId || 0),
                    carNumber: participant.raceNumber || 0,
                    steamId: participant.steamId,
                    platform: participant.platform,
                    networkId: participant.networkId
                });
            });
            // Mark participants loaded for current session
            this.participantsLoadedForCurrentSession = true;
            // If we were waiting for initial emission, emit now
            if (this.pendingInitialEmission) {
                this.pendingInitialEmission = false;
                if (this.initialEmissionTimeout) {
                    clearTimeout(this.initialEmissionTimeout);
                    this.initialEmissionTimeout = null;
                }
                // Use setImmediate to ensure maps are fully populated
                setImmediate(() => {
                    this.emitCombinedTelemetryData();
                });
            }
            // Emit participants event with enhanced data
            this.emit('participants', {
                sessionUid: BigInt(data.m_header?.m_sessionUid || 0),
                participants: participants,
                timestamp: new Date()
            });
        }
    }
    // Process Session Packet (ID: 1)
    processSessionPacket(data) {
        const newSessionUid = BigInt(data.m_header?.m_sessionUid || data.m_sessionUid || 0);
        const newSessionType = data.m_sessionType;
        const newSessionTimeLeft = data.m_sessionTimeLeft;
        // Detect session change (by session UID or session type change)
        if (this.currentSessionUid !== null &&
            (this.currentSessionUid !== newSessionUid ||
                this.sessionData.sessionType !== newSessionType)) {
            this.clearSessionData();
            this.clearPreviousStates(); // Clear state tracking for new session
            // Emit session change event to frontend (convert bigint to number for JSON)
            this.emit('sessionChanged', {
                oldSessionType: this.sessionData.sessionType,
                newSessionType: newSessionType,
                sessionUid: Number(newSessionUid)
            });
        }
        this.currentSessionUid = newSessionUid;
        // Extract session data from UDP
        if (data.m_totalLaps !== undefined) {
            this.sessionData.totalLaps = data.m_totalLaps;
        }
        if (data.m_trackLength !== undefined) {
            this.sessionData.trackLength = data.m_trackLength;
            // Calculate ONCE per session (not per car) - cached for performance
            this.cachedSectorLength = this.sessionData.trackLength / 3;
            this.cachedMicroSectorLength = this.cachedSectorLength / this.MICRO_SECTORS_PER_SECTOR;
        }
        if (data.m_sessionType !== undefined) {
            this.sessionData.sessionType = data.m_sessionType;
        }
        if (data.m_sessionTimeLeft !== undefined) {
            this.sessionData.sessionTimeLeft = data.m_sessionTimeLeft;
        }
        if (data.m_sessionDuration !== undefined) {
            this.sessionData.sessionDuration = data.m_sessionDuration;
        }
        // Capture Safety Car / VSC status from Session Packet
        if (data.m_safetyCarStatus !== undefined) {
            this.previousSafetyCarStatus = this.safetyCarStatus;
            this.safetyCarStatus = data.m_safetyCarStatus;
            // Emit if status changed
            if (this.previousSafetyCarStatus !== null &&
                this.previousSafetyCarStatus !== this.safetyCarStatus) {
                this.emit('safetyCarStatusChanged', {
                    status: this.safetyCarStatus, // 0=none, 1=SC, 2=VSC, 3=formation
                    isVSC: this.safetyCarStatus === 2,
                    isSC: this.safetyCarStatus === 1,
                    isFormation: this.safetyCarStatus === 3,
                    timestamp: new Date()
                });
            }
        }
        // Store current session metadata for post-session processing
        this.currentSessionType = data.m_sessionType || 10;
        this.currentTrackName = (0, f123Constants_1.getTrackName)(data.m_trackId || -1);
        this.currentTrackLength = data.m_trackLength || 0;
        this.currentTotalLaps = data.m_totalLaps || 0;
    }
    // Clear session data when new session starts
    clearSessionData() {
        // Clear event state
        this.isRedFlag = false;
        this.isChequeredFlag = false;
        this.safetyCarStatus = 0;
        this.previousSafetyCarStatus = null;
        // Clear fastest lap tracking
        this.fastestLapCarIndex = null;
        this.fastestLapTime = null;
        this.lapDataMap.clear();
        this.carStatusMap.clear();
        this.participantsMap.clear();
        this.stintHistoryMap.clear();
        this.carDamageMap.clear(); // Clear car damage data on session change
        this.bestLapTimesMap.clear();
        this.bestLapSector1Map.clear();
        this.bestLapSector2Map.clear();
        this.bestLapSector3Map.clear();
        this.previousLapNumbers.clear();
        this.completedLapSectors.clear();
        this.persistedLS1.clear(); // Clear persisted sector times
        this.persistedLS2.clear();
        this.persistedLS3.clear();
        // Clear micro-sector tracking maps
        this.microSectorTracking.clear();
        this.microSectorColors.clear();
        // Option: Clear fastest/personal best if you want fresh stats per session:
        // this.fastestMicroSectorLapTimes.clear();
        // this.personalBestMicroSectorLapTimes.clear();
        this.cachedSectorLength = 0;
        this.cachedMicroSectorLength = 0;
        // Reset Frame 1 initial load tracking
        this.participantsLoadedForCurrentSession = false;
        this.pendingInitialEmission = false;
        if (this.initialEmissionTimeout) {
            clearTimeout(this.initialEmissionTimeout);
            this.initialEmissionTimeout = null;
        }
    }
    // Process Event Packet (ID: 3)
    processEventPacket(data) {
        // Handle both string and array formats (UDP library may parse it)
        let eventCode;
        if (typeof data.m_eventStringCode === 'string') {
            // Already a string (UDP library parsed it)
            eventCode = data.m_eventStringCode.trim();
        }
        else if (Array.isArray(data.m_eventStringCode)) {
            // Array of bytes - parse to string
            eventCode = String.fromCharCode(...data.m_eventStringCode)
                .replace(/\0/g, '')
                .trim();
        }
        else {
            // Invalid format - return early
            return;
        }
        if (!eventCode || eventCode.length === 0) {
            return;
        }
        const eventDetails = data.m_eventDetails || {};
        const header = data.m_header || {};
        switch (eventCode) {
            case 'SSTA': // Session Started
                this.emit('event:sessionStarted', {
                    sessionUid: Number(header.m_sessionUid || header.sessionUid || 0),
                    timestamp: new Date()
                });
                break;
            case 'SEND': // Session Ended
                this.emit('event:sessionEnded', {
                    sessionUid: Number(header.m_sessionUid || header.sessionUid || 0),
                    timestamp: new Date()
                });
                break;
            case 'FTLP': // Fastest Lap
                {
                    const carIndex = eventDetails.vehicleIdx;
                    const lapTime = eventDetails.lapTime; // in seconds
                    if (carIndex !== undefined && lapTime !== null && lapTime > 0) {
                        const lapTimeMs = lapTime * 1000; // Convert to milliseconds
                        // Update isolated fastest lap tracking (ONLY for Best Lap column)
                        this.fastestLapCarIndex = carIndex;
                        this.fastestLapTime = lapTimeMs;
                        // Emit notification
                        const participant = this.participantsMap.get(carIndex);
                        this.emit('event:fastestLap', {
                            carIndex,
                            driverName: participant?.driverName || `Driver ${carIndex + 1}`,
                            lapTime: lapTimeMs,
                            timestamp: new Date()
                        });
                    }
                }
                break;
            case 'RTMT': // Retirement
                {
                    const carIndex = eventDetails.vehicleIdx;
                    if (carIndex !== undefined) {
                        // Update result status in lapDataMap
                        const lapData = this.lapDataMap.get(carIndex);
                        if (lapData) {
                            lapData.resultStatus = 7; // Retired
                            this.lapDataMap.set(carIndex, lapData);
                        }
                        // Emit notification
                        const participant = this.participantsMap.get(carIndex);
                        this.emit('event:retirement', {
                            carIndex,
                            driverName: participant?.driverName || `Driver ${carIndex + 1}`,
                            timestamp: new Date()
                        });
                    }
                }
                break;
            case 'DRSE': // DRS Enabled
                this.emit('event:drsEnabled', {
                    timestamp: new Date()
                });
                break;
            case 'DRSD': // DRS Disabled
                this.emit('event:drsDisabled', {
                    timestamp: new Date()
                });
                break;
            case 'RCWN': // Race Winner
                {
                    const carIndex = eventDetails.vehicleIdx;
                    if (carIndex !== undefined) {
                        const participant = this.participantsMap.get(carIndex);
                        this.emit('event:raceWinner', {
                            carIndex,
                            driverName: participant?.driverName || `Driver ${carIndex + 1}`,
                            timestamp: new Date()
                        });
                    }
                }
                break;
            case 'CHQF': // Chequered Flag
                this.isChequeredFlag = true;
                this.emit('event:chequeredFlag', {
                    timestamp: new Date()
                });
                break;
            case 'RDFL': // Red Flag
                this.isRedFlag = true;
                this.emit('event:redFlag', {
                    timestamp: new Date()
                });
                break;
            case 'STLG': // Start Lights
                {
                    const numLights = eventDetails.numLights || 5;
                    this.emit('event:startLights', {
                        numLights,
                        timestamp: new Date()
                    });
                }
                break;
            case 'LGOT': // Lights Out
                this.emit('event:lightsOut', {
                    timestamp: new Date()
                });
                break;
            default:
                // Unknown event code - ignore silently
                break;
        }
    }
    // Process Final Classification Packet (ID: 8) - Post-session results
    processFinalClassificationPacket(data) {
        if (data.m_classificationData && Array.isArray(data.m_classificationData)) {
            const finalResults = data.m_classificationData.map((result, index) => {
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
                    sessionUID: BigInt(data.m_header?.m_sessionUid || 0)
                };
            });
            // Emit final classification event
            this.emit('finalClassification', finalResults);
        }
    }
    // Process Car Damage Packet (ID: 10) - Tire wear and damage data
    processCarDamagePacket(data) {
        if (data.m_car_damage_data && Array.isArray(data.m_car_damage_data)) {
            data.m_car_damage_data.forEach((damageData, index) => {
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
            // Emit car damage event (spread Map values directly instead of Array.from)
            this.emit('carDamage', {
                sessionUid: BigInt(data.m_header?.m_sessionUid || 0),
                damageData: [...this.carDamageMap.values()], // Spread is slightly more efficient
                timestamp: new Date()
            });
        }
    }
    // Emit combined telemetry data for all cars
    emitCombinedTelemetryData() {
        const allCarsData = [];
        // Iterate over Map keys (only cars that have data) instead of fixed 22-car loop
        const carIndices = new Set([
            ...this.lapDataMap.keys(),
            ...this.carStatusMap.keys(),
            ...this.participantsMap.keys()
        ]);
        for (const carIndex of carIndices) {
            const lapData = this.lapDataMap.get(carIndex);
            const carStatus = this.carStatusMap.get(carIndex);
            const stintHistory = this.stintHistoryMap.get(carIndex) || [];
            const participant = this.participantsMap.get(carIndex);
            // Allow emission with just lapData for new sessions (carStatus might arrive later)
            // This ensures initial data loads immediately when session starts
            if (lapData) {
                // Create minimal carStatus if missing (for new sessions)
                const effectiveCarStatus = carStatus || {
                    tractionControl: 0,
                    antiLockBrakes: 0,
                    fuelMix: 0,
                    frontBrakeBias: 0,
                    pitLimiterStatus: 0,
                    fuelInTank: 0,
                    fuelCapacity: 0,
                    fuelRemainingLaps: 0,
                    maxRpm: 0,
                    idleRpm: 0,
                    maxGears: 0,
                    drsAllowed: 0,
                    drsActivationDistance: 0,
                    actualTyreCompound: 0,
                    visualTyreCompound: 0,
                    tyresAgeLaps: 0,
                    vehicleFiaFlags: 0,
                    enginePowerIce: 0,
                    enginePowerMguk: 0,
                    ersStoreEnergy: 0,
                    ersDeployMode: 0,
                    ersHarvestedThisLapMguk: 0,
                    ersHarvestedThisLapMguh: 0,
                    ersDeployedThisLap: 0,
                    networkPaused: 0
                };
                // Update lap data with best lap time from Session History
                const bestLapTime = this.bestLapTimesMap.get(carIndex);
                if (bestLapTime && bestLapTime > 0) {
                    lapData.bestLapTimeInMS = bestLapTime;
                }
                // Micro-sector tracking disabled for performance (can re-enable when needed)
                // this.updateMicroSectorProgress(carIndex, lapData, participant?.driverName || `Driver ${carIndex + 1}`);
                // Create header with sessionUid (use 0n since we have top-level sessionUid for frontend)
                // The top-level sessionUid field (number) is what the frontend uses, header.sessionUid is kept as bigint for type compatibility
                const header = {
                    ...this.DEFAULT_HEADER,
                    sessionUid: this.currentSessionUid || 0n
                };
                const combinedData = {
                    header: header,
                    sessionType: this.sessionData.sessionType,
                    sessionTimeLeft: this.sessionData.sessionTimeLeft,
                    sessionDuration: this.sessionData.sessionDuration,
                    trackName: this.currentTrackName,
                    driverName: participant?.driverName || `Driver ${carIndex + 1}`,
                    teamName: participant?.teamName || 'Unknown Team',
                    carPosition: lapData.carPosition,
                    carNumber: participant?.carNumber ?? carIndex + 1, // Use ?? instead of || to handle carNumber: 0 correctly
                    carIndex: carIndex, // Include carIndex for unique identification
                    lapData,
                    carStatus: effectiveCarStatus,
                    stintHistory,
                    // Generate micro-sectors for all session types (tracking always active)
                    // Frontend handles visualization (only shown in practice/qualifying tables)
                    microSectors: (this.sessionData.trackLength > 0 && lapData.lapDistance > 0)
                        ? this.getMicroSectorColors(carIndex, lapData.sector, lapData.lapDistance)
                        : [],
                    sessionData: {
                        totalLaps: this.sessionData.totalLaps,
                        trackLength: this.sessionData.trackLength,
                        safetyCarStatus: this.safetyCarStatus, // Include SC/VSC status
                        isRedFlag: this.isRedFlag,
                        isChequeredFlag: this.isChequeredFlag
                    },
                    // Add sessionUid as number for frontend compatibility
                    sessionUid: this.currentSessionUid ? Number(this.currentSessionUid) : 0,
                    // Event-driven flags
                    // Use event packet as source of truth (FTLP event sets fastestLapCarIndex)
                    isFastestLap: (this.fastestLapCarIndex !== null &&
                        this.fastestLapCarIndex === carIndex),
                    // Populate additional fields expected by frontend
                    lapNumber: lapData.currentLapNum,
                    currentLapTime: lapData.currentLapTimeInMS / 1000, // Convert to seconds
                    lastLapTime: lapData.lastLapTimeInMS / 1000, // Convert to seconds
                    bestLapTime: lapData.bestLapTimeInMS / 1000, // Convert to seconds
                    sector1Time: lapData.sector1TimeInMS / 1000, // Convert to seconds (current lap)
                    sector2Time: lapData.sector2TimeInMS / 1000, // Convert to seconds (current lap)
                    sector3Time: 0, // Micro-sectors will have its own logic - placeholder for now
                    // Last completed sector times (right-side columns) - updated on sector completion
                    LS1: this.persistedLS1.get(carIndex)?.time || 0, // In milliseconds
                    LS1Minutes: this.persistedLS1.get(carIndex)?.minutes || 0,
                    LS2: this.persistedLS2.get(carIndex)?.time || 0, // In milliseconds
                    LS2Minutes: this.persistedLS2.get(carIndex)?.minutes || 0,
                    LS3: this.persistedLS3.get(carIndex) || 0, // In seconds (already calculated)
                    // Best lap sector times for practice/qualifying tables
                    bestLapSector1Time: (this.bestLapSector1Map.get(carIndex) || 0) / 1000, // Convert to seconds
                    bestLapSector2Time: (this.bestLapSector2Map.get(carIndex) || 0) / 1000, // Convert to seconds
                    bestLapSector3Time: (this.bestLapSector3Map.get(carIndex) || 0) / 1000, // Convert to seconds
                    fuelLevel: effectiveCarStatus.fuelInTank,
                    fuelCapacity: effectiveCarStatus.fuelCapacity,
                    energyStore: effectiveCarStatus.ersStoreEnergy,
                    drsEnabled: effectiveCarStatus.drsAllowed === 1,
                    ersDeployMode: effectiveCarStatus.ersDeployMode,
                    fuelMix: effectiveCarStatus.fuelMix,
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
            // Update data buffers for getter methods
            this.updateDataBuffers(allCarsData);
            this.emit('telemetry', allCarsData);
        }
    }
    // Simplified micro-sector color generation (read stored colors directly)
    getMicroSectorColors(carIndex, currentSector, lapDistance) {
        const tracking = this.microSectorTracking.get(carIndex);
        if (!tracking) {
            // Return all grey if no tracking data (always show 24 squares)
            return new Array(this.TOTAL_MICRO_SECTORS).fill('grey');
        }
        const driverColors = this.microSectorColors.get(carIndex);
        // Always return 24-element array (grey for uncompleted, stored colors for completed)
        const colors = new Array(this.TOTAL_MICRO_SECTORS);
        // Calculate current position once (using cached values - no redundant division)
        const sectorStartDistance = currentSector * this.cachedSectorLength;
        const lapDistanceInSector = Math.max(0, lapDistance - sectorStartDistance);
        const microSectorInMajor = Math.floor(lapDistanceInSector / this.cachedMicroSectorLength);
        const clampedMicroSector = Math.min(microSectorInMajor, this.MICRO_SECTORS_PER_SECTOR - 1);
        const currentGlobalIndex = (currentSector * this.MICRO_SECTORS_PER_SECTOR) + clampedMicroSector;
        // Fill colors (read stored colors for completed segments, grey for uncompleted)
        for (let i = 0; i < this.TOTAL_MICRO_SECTORS; i++) {
            if (i < currentGlobalIndex && driverColors && driverColors.has(i)) {
                colors[i] = driverColors.get(i); // Read stored color (no recalculation)
            }
            else {
                colors[i] = 'grey'; // Not completed yet (always show grey squares)
            }
        }
        return colors;
    }
    // Helper method to get team name from team ID (uses shared constant)
    getTeamName(teamId) {
        return (0, f123Constants_1.getTeamName)(teamId);
    }
    // Extract Steam ID from already-converted name string
    extractSteamIdFromName(name) {
        // Steam ID format: "STEAM_0:0:12345678" or similar
        const steamIdMatch = name.match(/STEAM_\d+:\d+:\d+/);
        return steamIdMatch ? steamIdMatch[0] : null;
    }
    // Get tire wear data from car damage packet
    getTireWearData(carIndex) {
        const damageData = this.carDamageMap.get(carIndex);
        if (damageData && damageData.tyresWear) {
            // F1 23 UDP format: [RL, RR, FL, FR] - Rear Left, Rear Right, Front Left, Front Right
            return {
                frontLeft: damageData.tyresWear[3] || 0, // FL
                frontRight: damageData.tyresWear[2] || 0, // FR
                rearLeft: damageData.tyresWear[0] || 0, // RL
                rearRight: damageData.tyresWear[1] || 0 // RR
            };
        }
        // Return default values if no damage data available
        return { frontLeft: 0, frontRight: 0, rearLeft: 0, rearRight: 0 };
    }
    // Clear previous states on session change/restart
    clearPreviousStates() {
        this.previousCarStates.clear();
    }
    // Update data buffers when telemetry is emitted (used by getters)
    updateDataBuffers(allCarsData) {
        // Update lastData with first car (or could be latest/last car)
        if (allCarsData.length > 0) {
            this.lastData = allCarsData[0];
            // Add to buffer (keep last 1000 entries)
            allCarsData.forEach(data => {
                this.dataBuffer.push(data);
            });
            // Trim buffer if it exceeds 1000 entries
            if (this.dataBuffer.length > 1000) {
                this.dataBuffer.shift();
            }
        }
    }
    start() {
        if (this.isRunning) {
            console.log('Telemetry service already running');
            return;
        }
        try {
            this.f123.start();
            this.isRunning = true;
            console.log('F1 23 UDP telemetry service started');
        }
        catch (error) {
            console.error('Failed to start telemetry service:', error);
            this.isRunning = false;
        }
    }
    stop() {
        if (!this.isRunning) {
            console.log('Telemetry service not running');
            return;
        }
        try {
            this.f123.stop();
            this.isRunning = false;
            console.log('F1 23 UDP telemetry service stopped');
        }
        catch (error) {
            console.error('Failed to stop telemetry service:', error);
        }
    }
    getLastData() {
        return this.lastData;
    }
    getDataBuffer() {
        return [...this.dataBuffer];
    }
}
exports.TelemetryService = TelemetryService;
//# sourceMappingURL=TelemetryService.js.map