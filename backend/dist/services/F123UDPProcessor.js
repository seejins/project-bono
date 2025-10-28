"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.F123UDPProcessor = void 0;
const f1_23_udp_1 = require("f1-23-udp");
class F123UDPProcessor {
    constructor(dbService) {
        this.isRunning = false;
        this.activeSeasonId = null;
        this.currentEventId = null;
        this.participantMappings = new Map(); // vehicleIndex -> memberId
        this.sessionUid = null;
        this.dbService = dbService;
        this.f123 = new f1_23_udp_1.F123UDP();
    }
    async start() {
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
        }
        catch (error) {
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
    async stop() {
        if (!this.isRunning) {
            return;
        }
        try {
            this.f123.stop();
            this.isRunning = false;
            this.participantMappings.clear();
            this.sessionUid = null;
            console.log('🛑 F123UDPProcessor stopped');
        }
        catch (error) {
            console.error('❌ Error stopping F123UDPProcessor:', error);
        }
    }
    async loadActiveSeason() {
        try {
            const activeSeason = await this.dbService.getActiveSeason();
            if (activeSeason) {
                this.activeSeasonId = activeSeason.id;
                console.log(`📊 Active season loaded: ${activeSeason.name} (${activeSeason.year})`);
            }
            else {
                console.log('⚠️ No active season found - UDP data will not be processed');
            }
        }
        catch (error) {
            console.error('❌ Failed to load active season:', error);
        }
    }
    setupEventListeners() {
        // Participants packet (ID: 4) - Maps Steam IDs to members
        this.f123.on('participants', async (data) => {
            try {
                await this.handleParticipantsPacket(data);
            }
            catch (error) {
                console.error('❌ Error handling participants packet:', error);
            }
        });
        // Final Classification packet (ID: 8) - Session results
        this.f123.on('finalClassification', async (data) => {
            try {
                await this.handleFinalClassificationPacket(data);
            }
            catch (error) {
                console.error('❌ Error handling final classification packet:', error);
            }
        });
        // Session History packet (ID: 11) - Lap-by-lap data
        this.f123.on('sessionHistory', async (data) => {
            try {
                await this.handleSessionHistoryPacket(data);
            }
            catch (error) {
                console.error('❌ Error handling session history packet:', error);
            }
        });
        // Session packet (ID: 1) - Track and session info
        this.f123.on('session', async (data) => {
            try {
                await this.handleSessionPacket(data);
            }
            catch (error) {
                console.error('❌ Error handling session packet:', error);
            }
        });
    }
    async handleParticipantsPacket(data) {
        if (!this.activeSeasonId) {
            console.log('⚠️ No active season - skipping participants packet');
            return;
        }
        const header = data.m_header;
        this.sessionUid = header.sessionUid;
        console.log(`👥 Processing participants packet for session ${header.sessionUid}`);
        const participants = data.m_participants;
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
                }
                else {
                    console.log(`⚠️ No member found for Steam ID: ${participant.name}`);
                }
            }
            catch (error) {
                console.error(`❌ Error processing participant ${i}:`, error);
            }
        }
    }
    async handleFinalClassificationPacket(data) {
        if (!this.activeSeasonId || !this.currentEventId) {
            console.log('⚠️ No active season or event - skipping final classification packet');
            return;
        }
        const header = data.m_header;
        const classificationData = data.m_classificationData;
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
            }
            catch (error) {
                console.error(`❌ Error storing final classification for vehicle ${i}:`, error);
            }
        }
    }
    async handleSessionHistoryPacket(data) {
        if (!this.activeSeasonId) {
            console.log('⚠️ No active season - skipping session history packet');
            return;
        }
        const header = data.m_header;
        const carIdx = data.m_carIdx;
        const lapHistoryData = data.m_lapHistoryData;
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
        }
        catch (error) {
            console.error(`❌ Error storing session history for car ${carIdx}:`, error);
        }
    }
    async handleSessionPacket(data) {
        const header = data.m_header;
        // Extract track and session information
        const trackId = data.m_trackId;
        const sessionType = data.m_sessionType;
        const totalLaps = data.m_totalLaps;
        const trackLength = data.m_trackLength;
        console.log(`🏁 Session packet received - Track ID: ${trackId}, Session Type: ${sessionType}, Total Laps: ${totalLaps}`);
        // If we have an active season, we could create or update the current event
        // For now, we'll just log the session info
        if (this.activeSeasonId) {
            console.log(`📊 Session info for active season ${this.activeSeasonId}: Track ${trackId}, Type ${sessionType}`);
        }
    }
    // Public methods for external control
    async setActiveSeason(seasonId) {
        this.activeSeasonId = seasonId;
        console.log(`📊 Active season set to: ${seasonId}`);
    }
    async setCurrentEvent(eventId) {
        this.currentEventId = eventId;
        console.log(`🏁 Current event set to: ${eventId}`);
    }
    getParticipantMappings() {
        return new Map(this.participantMappings);
    }
    isProcessorRunning() {
        return this.isRunning;
    }
    getSessionUid() {
        return this.sessionUid;
    }
}
exports.F123UDPProcessor = F123UDPProcessor;
//# sourceMappingURL=F123UDPProcessor.js.map