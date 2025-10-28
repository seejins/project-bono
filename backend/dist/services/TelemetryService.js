"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelemetryService = void 0;
const f1_23_udp_1 = require("f1-23-udp");
const events_1 = require("events");
class TelemetryService extends events_1.EventEmitter {
    constructor() {
        super();
        this.isRunning = false;
        this.lastData = null;
        this.dataBuffer = [];
        this.BUFFER_SIZE = 1000; // Keep last 1000 data points
        this.sessionStartTime = null;
        this.currentSessionData = [];
        // Store data for all cars
        this.lapDataMap = new Map();
        this.carStatusMap = new Map();
        this.stintHistoryMap = new Map();
        this.participantsMap = new Map();
        this.bestLapTimesMap = new Map(); // Store best lap times from Session History
        // Store final classification and damage data
        this.finalClassificationData = [];
        this.carDamageMap = new Map();
        // Micro-sector tracking
        this.microSectorTracker = {
            fastestOverall: new Map(),
            personalBest: new Map(),
            currentLapProgress: new Map(),
            trackLength: 5000, // Default track length in meters
            microSectorsPerLap: 24 // 24 micro-sectors per lap
        };
        // Session data
        this.sessionData = {
            totalLaps: 52,
            trackLength: 5000,
            sessionType: 10,
            sessionTimeLeft: 0,
            sessionDuration: 0
        };
        this.f123 = new f1_23_udp_1.F123UDP();
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
            }
            catch (error) {
                console.error('Error processing session history packet:', error);
            }
        });
        // Participants Packet (ID: 4) - Driver information
        this.f123.on('participants', (data) => {
            try {
                this.processParticipantsPacket(data);
            }
            catch (error) {
                console.error('Error processing participants packet:', error);
            }
        });
        // Session Packet (ID: 1) - Session information
        this.f123.on('session', (data) => {
            try {
                this.processSessionPacket(data);
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
            data.m_lapData.forEach((lapData, index) => {
                if (lapData && lapData.m_carPosition > 0) {
                    this.lapDataMap.set(index, {
                        lastLapTimeInMS: lapData.m_lastLapTimeInMS || 0,
                        currentLapTimeInMS: lapData.m_currentLapTimeInMS || 0,
                        sector1TimeInMS: lapData.m_sector1TimeInMS || 0,
                        sector1TimeMinutes: lapData.m_sector1TimeMinutes || 0,
                        sector2TimeInMS: lapData.m_sector2TimeInMS || 0,
                        sector2TimeMinutes: lapData.m_sector2TimeMinutes || 0,
                        sector3TimeInMS: lapData.m_sector3TimeInMS || 0,
                        sector3TimeMinutes: lapData.m_sector3TimeMinutes || 0,
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
            // Emit combined telemetry data
            this.emitCombinedTelemetryData();
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
            // Extract best lap time from lap history data
            if (data.m_lapHistoryData && Array.isArray(data.m_lapHistoryData)) {
                let bestLapTime = 0;
                for (const lap of data.m_lapHistoryData) {
                    if (lap.m_lapTimeInMS && lap.m_lapTimeInMS > 0) {
                        if (bestLapTime === 0 || lap.m_lapTimeInMS < bestLapTime) {
                            bestLapTime = lap.m_lapTimeInMS;
                        }
                    }
                }
                if (bestLapTime > 0) {
                    this.bestLapTimesMap.set(carIndex, bestLapTime);
                }
            }
            // Emit combined telemetry data
            this.emitCombinedTelemetryData();
        }
    }
    // Process Participants Packet (ID: 4)
    processParticipantsPacket(data) {
        if (data.m_participants && Array.isArray(data.m_participants)) {
            data.m_participants.forEach((participant, index) => {
                if (participant && participant.m_name) {
                    this.participantsMap.set(index, {
                        driverName: Buffer.from(participant.m_name).toString('utf8').replace(/\0/g, ''),
                        teamName: this.getTeamName(participant.m_teamId || 0),
                        carNumber: participant.m_raceNumber || 0,
                    });
                }
            });
        }
    }
    // Process Session Packet (ID: 1)
    processSessionPacket(data) {
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
            this.sessionData.sessionTimeLeft = data.m_sessionTimeLeft;
        }
        if (data.m_sessionDuration !== undefined) {
            this.sessionData.sessionDuration = data.m_sessionDuration;
        }
    }
    // Process Event Packet (ID: 3)
    processEventPacket(data) {
        // Handle race events like penalties, retirements, etc.
        this.emit('event', data);
    }
    // Process Final Classification Packet (ID: 8) - Post-session results
    processFinalClassificationPacket(data) {
        if (data.m_classificationData && Array.isArray(data.m_classificationData)) {
            const finalResults = data.m_classificationData.map((result, index) => ({
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
                carIndex: index
            }));
            // Store final classification data
            this.finalClassificationData = finalResults;
            // Emit final classification event
            this.emit('finalClassification', {
                sessionUid: data.m_header?.m_sessionUid,
                numCars: data.m_numCars || 0,
                results: finalResults,
                timestamp: new Date()
            });
            console.log('🏁 Final classification received:', finalResults.length, 'cars');
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
            // Emit car damage event
            this.emit('carDamage', {
                sessionUid: data.m_header?.m_sessionUid,
                damageData: Array.from(this.carDamageMap.values()),
                timestamp: new Date()
            });
            console.log('🔧 Car damage data received for', data.m_car_damage_data.length, 'cars');
        }
    }
    // Emit combined telemetry data for all cars
    emitCombinedTelemetryData() {
        const allCarsData = [];
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
                const combinedData = {
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
                    timestamp: new Date(),
                };
                allCarsData.push(combinedData);
            }
        }
        if (allCarsData.length > 0) {
            this.emit('telemetry', allCarsData);
        }
    }
    // Helper method to get team name from team ID
    getTeamName(teamId) {
        const teamNames = {
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
    // Convert F1 23 UDP motion data to our format
    convertMotionData(data) {
        return {
            sessionType: data.sessionType || 0,
            sessionTimeLeft: data.sessionTimeLeft || 0,
            sessionDuration: data.sessionDuration || 0,
            driverName: data.driverName || 'Unknown',
            teamName: data.teamName || 'Unknown',
            carPosition: data.carPosition || 0,
            numCars: data.numCars || 0,
            carNumber: data.carNumber || 0,
            lapTime: data.lapTime || 0,
            sector1Time: data.sector1Time || 0,
            sector2Time: data.sector2Time || 0,
            sector3Time: data.sector3Time || 0,
            lapNumber: data.lapNumber || 0,
            currentLapTime: data.currentLapTime || 0,
            lastLapTime: data.lastLapTime || 0,
            bestLapTime: data.bestLapTime || 0,
            speed: data.speed || 0,
            throttle: data.throttle || 0,
            brake: data.brake || 0,
            steering: data.steering || 0,
            gear: data.gear || 0,
            engineRPM: data.engineRPM || 0,
            tireWear: {
                frontLeft: data.tireWear?.frontLeft || 0,
                frontRight: data.tireWear?.frontRight || 0,
                rearLeft: data.tireWear?.rearLeft || 0,
                rearRight: data.tireWear?.rearRight || 0
            },
            tireTemperature: {
                frontLeft: data.tireTemperature?.frontLeft || 0,
                frontRight: data.tireTemperature?.frontRight || 0,
                rearLeft: data.tireTemperature?.rearLeft || 0,
                rearRight: data.tireTemperature?.rearRight || 0
            },
            fuelLevel: data.fuelLevel || 0,
            fuelCapacity: data.fuelCapacity || 0,
            energyStore: data.energyStore || 0,
            airTemperature: data.airTemperature || 0,
            trackTemperature: data.trackTemperature || 0,
            rainPercentage: data.rainPercentage || 0,
            drsEnabled: data.drsEnabled || false,
            ersDeployMode: data.ersDeployMode || 0,
            fuelMix: data.fuelMix || 0,
            penalties: data.penalties || 0,
            warnings: data.warnings || 0,
            numUnservedDriveThroughPens: data.numUnservedDriveThroughPens || 0,
            numUnservedStopGoPens: data.numUnservedStopGoPens || 0,
            timestamp: new Date()
        };
    }
    // Convert F1 23 UDP session data
    convertSessionData(data) {
        return {
            sessionType: data.sessionType || 0,
            sessionTimeLeft: data.sessionTimeLeft || 0,
            sessionDuration: data.sessionDuration || 0,
            driverName: data.driverName || 'Unknown',
            teamName: data.teamName || 'Unknown',
            carPosition: data.carPosition || 0,
            numCars: data.numCars || 0,
            carNumber: data.carNumber || 0,
            lapTime: data.lapTime || 0,
            sector1Time: data.sector1Time || 0,
            sector2Time: data.sector2Time || 0,
            sector3Time: data.sector3Time || 0,
            lapNumber: data.lapNumber || 0,
            currentLapTime: data.currentLapTime || 0,
            lastLapTime: data.lastLapTime || 0,
            bestLapTime: data.bestLapTime || 0,
            speed: 0, // Not available in session data
            throttle: 0,
            brake: 0,
            steering: 0,
            gear: 0,
            engineRPM: 0,
            tireWear: { frontLeft: 0, frontRight: 0, rearLeft: 0, rearRight: 0 },
            tireTemperature: { frontLeft: 0, frontRight: 0, rearLeft: 0, rearRight: 0 },
            fuelLevel: 0,
            fuelCapacity: 0,
            energyStore: 0,
            airTemperature: data.airTemperature || 0,
            trackTemperature: data.trackTemperature || 0,
            rainPercentage: data.rainPercentage || 0,
            drsEnabled: false,
            ersDeployMode: 0,
            fuelMix: 0,
            penalties: data.penalties || 0,
            warnings: data.warnings || 0,
            numUnservedDriveThroughPens: data.numUnservedDriveThroughPens || 0,
            numUnservedStopGoPens: data.numUnservedStopGoPens || 0,
            timestamp: new Date()
        };
    }
    // Convert F1 23 UDP car status data
    convertCarStatusData(data) {
        return {
            sessionType: data.sessionType || 0,
            sessionTimeLeft: data.sessionTimeLeft || 0,
            sessionDuration: data.sessionDuration || 0,
            driverName: data.driverName || 'Unknown',
            teamName: data.teamName || 'Unknown',
            carPosition: data.carPosition || 0,
            numCars: data.numCars || 0,
            carNumber: data.carNumber || 0,
            lapTime: data.lapTime || 0,
            sector1Time: data.sector1Time || 0,
            sector2Time: data.sector2Time || 0,
            sector3Time: data.sector3Time || 0,
            lapNumber: data.lapNumber || 0,
            currentLapTime: data.currentLapTime || 0,
            lastLapTime: data.lastLapTime || 0,
            bestLapTime: data.bestLapTime || 0,
            speed: 0,
            throttle: 0,
            brake: 0,
            steering: 0,
            gear: 0,
            engineRPM: 0,
            tireWear: {
                frontLeft: data.tireWear?.frontLeft || 0,
                frontRight: data.tireWear?.frontRight || 0,
                rearLeft: data.tireWear?.rearLeft || 0,
                rearRight: data.tireWear?.rearRight || 0
            },
            tireTemperature: {
                frontLeft: data.tireTemperature?.frontLeft || 0,
                frontRight: data.tireTemperature?.frontRight || 0,
                rearLeft: data.tireTemperature?.rearLeft || 0,
                rearRight: data.tireTemperature?.rearRight || 0
            },
            fuelLevel: data.fuelLevel || 0,
            fuelCapacity: data.fuelCapacity || 0,
            energyStore: data.energyStore || 0,
            airTemperature: data.airTemperature || 0,
            trackTemperature: data.trackTemperature || 0,
            rainPercentage: data.rainPercentage || 0,
            drsEnabled: data.drsEnabled || false,
            ersDeployMode: data.ersDeployMode || 0,
            fuelMix: data.fuelMix || 0,
            penalties: data.penalties || 0,
            warnings: data.warnings || 0,
            numUnservedDriveThroughPens: data.numUnservedDriveThroughPens || 0,
            numUnservedStopGoPens: data.numUnservedStopGoPens || 0,
            timestamp: new Date()
        };
    }
    // Convert F1 23 UDP lap data
    convertLapData(data) {
        return {
            sessionType: data.sessionType || 0,
            sessionTimeLeft: data.sessionTimeLeft || 0,
            sessionDuration: data.sessionDuration || 0,
            driverName: data.driverName || 'Unknown',
            teamName: data.teamName || 'Unknown',
            carPosition: data.carPosition || 0,
            numCars: data.numCars || 0,
            carNumber: data.carNumber || 0,
            lapTime: data.lapTime || 0,
            sector1Time: data.sector1Time || 0,
            sector2Time: data.sector2Time || 0,
            sector3Time: data.sector3Time || 0,
            lapNumber: data.lapNumber || 0,
            currentLapTime: data.currentLapTime || 0,
            lastLapTime: data.lastLapTime || 0,
            bestLapTime: data.bestLapTime || 0,
            speed: 0,
            throttle: 0,
            brake: 0,
            steering: 0,
            gear: 0,
            engineRPM: 0,
            tireWear: { frontLeft: 0, frontRight: 0, rearLeft: 0, rearRight: 0 },
            tireTemperature: { frontLeft: 0, frontRight: 0, rearLeft: 0, rearRight: 0 },
            fuelLevel: 0,
            fuelCapacity: 0,
            energyStore: 0,
            airTemperature: data.airTemperature || 0,
            trackTemperature: data.trackTemperature || 0,
            rainPercentage: data.rainPercentage || 0,
            drsEnabled: false,
            ersDeployMode: 0,
            fuelMix: 0,
            penalties: data.penalties || 0,
            warnings: data.warnings || 0,
            numUnservedDriveThroughPens: data.numUnservedDriveThroughPens || 0,
            numUnservedStopGoPens: data.numUnservedStopGoPens || 0,
            timestamp: new Date()
        };
    }
    // Handle session data changes
    handleSessionData(data) {
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
    processTelemetryData(data) {
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
    addToBuffer(data) {
        this.dataBuffer.push(data);
        if (this.dataBuffer.length > this.BUFFER_SIZE) {
            this.dataBuffer.shift();
        }
    }
    // Get session type name
    getSessionTypeName(sessionType) {
        const sessionTypes = [
            'Unknown', 'Practice 1', 'Practice 2', 'Practice 3',
            'Short Practice', 'Q1', 'Q2', 'Q3', 'Short Qualifying',
            'One Shot Qualifying', 'Race', 'Race 2', 'Time Trial'
        ];
        return sessionTypes[sessionType] || 'Unknown';
    }
    // Auto-export session data when session ends
    async autoExportSessionData() {
        if (this.currentSessionData.length === 0)
            return;
        try {
            console.log('Session ended, exporting data...');
            // Extract final results from session data
            const finalResults = this.extractFinalResults(this.currentSessionData);
            // Calculate gaps to pole
            const poleTime = this.findPoleTime(finalResults);
            if (poleTime) {
                finalResults.forEach(driver => {
                    driver.gapToPole = driver.bestLapTime - poleTime;
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
        }
        catch (error) {
            console.error('Error exporting session data:', error);
        }
    }
    // Extract final results from session data
    extractFinalResults(sessionData) {
        // Get the latest data point for each driver (in this case, just the host)
        const latestData = sessionData[sessionData.length - 1];
        return [latestData];
    }
    // Find pole position time
    findPoleTime(results) {
        const validTimes = results
            .map(r => r.bestLapTime)
            .filter(time => time > 0);
        return validTimes.length > 0 ? Math.min(...validTimes) : null;
    }
    checkCriticalConditions(data) {
        // Low fuel warning
        if (data.fuelLevel < 5) {
            this.emit('alert', { type: 'low_fuel', message: 'Low fuel warning!' });
        }
        // High tire wear warning
        const maxTireWear = Math.max(data.tireWear.frontLeft, data.tireWear.frontRight, data.tireWear.rearLeft, data.tireWear.rearRight);
        if (maxTireWear > 80) {
            this.emit('alert', { type: 'tire_wear', message: 'High tire wear detected!' });
        }
        // High tire temperature warning
        const maxTireTemp = Math.max(data.tireTemperature.frontLeft, data.tireTemperature.frontRight, data.tireTemperature.rearLeft, data.tireTemperature.rearRight);
        if (maxTireTemp > 120) {
            this.emit('alert', { type: 'tire_temp', message: 'High tire temperature!' });
        }
        // Penalty warnings
        if (data.penalties > 0) {
            this.emit('alert', { type: 'penalty', message: `Penalty received: ${data.penalties}` });
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
    getCurrentSessionData() {
        return [...this.currentSessionData];
    }
    // Micro-sector tracking methods
    updateMicroSectorProgress(carIndex, lapData, driverName) {
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
    updateFastestMicroSector(microSectorIndex, time, driverId) {
        const currentFastest = this.microSectorTracker.fastestOverall.get(microSectorIndex);
        if (!currentFastest || time < currentFastest.time) {
            // New fastest micro-sector
            this.microSectorTracker.fastestOverall.set(microSectorIndex, {
                time,
                driverId
            });
        }
    }
    updatePersonalBest(driverId, microSectorIndex, time) {
        if (!this.microSectorTracker.personalBest.has(driverId)) {
            this.microSectorTracker.personalBest.set(driverId, new Map());
        }
        const driverPersonalBest = this.microSectorTracker.personalBest.get(driverId);
        const currentPersonalBest = driverPersonalBest.get(microSectorIndex);
        if (!currentPersonalBest || time < currentPersonalBest) {
            driverPersonalBest.set(microSectorIndex, time);
        }
    }
    getMicroSectorColors(carIndex, driverName) {
        const driverId = driverName;
        const microSectors = [];
        const driverProgress = this.microSectorTracker.currentLapProgress.get(driverId);
        for (let i = 0; i < this.microSectorTracker.microSectorsPerLap; i++) {
            // If micro-sector not completed in current lap, return grey
            if (!driverProgress || !driverProgress.completedMicroSectors.has(i)) {
                microSectors.push('grey');
                continue;
            }
            const time = driverProgress.completedMicroSectors.get(i);
            const fastest = this.microSectorTracker.fastestOverall.get(i);
            const personalBest = this.microSectorTracker.personalBest.get(driverId)?.get(i);
            if (fastest && time === fastest.time && fastest.driverId === driverId) {
                microSectors.push('purple'); // Fastest overall
            }
            else if (personalBest && time === personalBest) {
                microSectors.push('green'); // Personal best
            }
            else {
                microSectors.push('yellow'); // Slower than personal best
            }
        }
        return microSectors;
    }
}
exports.TelemetryService = TelemetryService;
//# sourceMappingURL=TelemetryService.js.map