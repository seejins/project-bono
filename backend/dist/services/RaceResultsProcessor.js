"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RaceResultsProcessor = void 0;
const uuid_1 = require("uuid");
class RaceResultsProcessor {
    constructor(dbService, io) {
        this.dbService = dbService;
        this.io = io;
        console.log('🔄 RaceResultsProcessor initialized');
    }
    // Use DatabaseService public query method
    async query(sql, params = []) {
        return await this.dbService.query(sql, params);
    }
    /**
     * Process session results and store in database
     */
    async processSessionResults(sessionInfo, driverResults, raceId) {
        try {
            console.log('🏁 Processing session results...');
            console.log('📊 Session info:', sessionInfo);
            // 1. Find or create race event
            let eventId = raceId;
            if (!eventId) {
                eventId = await this.findOrCreateRace(sessionInfo);
            }
            else {
                // Verify race exists
                const race = await this.dbService.query('SELECT id FROM races WHERE id = $1', [eventId]);
                if (race.rows.length === 0) {
                    throw new Error(`Race with ID ${eventId} not found`);
                }
            }
            if (!eventId) {
                console.log('⚠️ No matching event found, storing as orphaned session');
                await this.handleOrphanedSession(sessionInfo, driverResults);
                throw new Error('No matching race found and could not create one');
            }
            console.log(`✅ Using race: ${eventId}`);
            // 2. Map F1 23 drivers to league members
            const mappedResults = await this.mapDriversToLeague(driverResults, eventId);
            // 3. Create session result entry
            const sessionResultId = await this.dbService.createSessionResult(eventId, sessionInfo.sessionType, this.dbService.getSessionTypeName(sessionInfo.sessionType), sessionInfo.sessionUID || null);
            // 4. Store original results snapshot (preserve source data)
            await this.dbService.storeOriginalSessionResults(sessionResultId, mappedResults);
            // 5. Store session results
            await this.dbService.storeDriverSessionResults(sessionResultId, mappedResults);
            // 6. Mark event as completed if this was a race session
            if (sessionInfo.sessionType === 10) { // Race session
                await this.markEventAsCompleted(eventId);
            }
            // 7. Recalculate season standings
            await this.recalculateSeasonStandings(eventId);
            // 8. Notify frontend via WebSocket
            this.io.emit('sessionCompleted', {
                eventId,
                sessionResultId,
                sessionType: sessionInfo.sessionType,
                sessionName: this.dbService.getSessionTypeName(sessionInfo.sessionType),
                results: mappedResults
            });
            console.log('✅ Session processing completed successfully');
            return { raceId: eventId, sessionResultId };
        }
        catch (error) {
            console.error('❌ Error processing session results:', error);
            await this.logSessionError(error, driverResults);
            throw error;
        }
    }
    async findOrCreateRace(sessionInfo) {
        // Try to find existing race by track name
        let eventId = await this.dbService.findActiveEventByTrack(sessionInfo.trackName);
        if (eventId) {
            return eventId;
        }
        // Try flexible matching
        const trackNameVariations = this.generateTrackNameVariations(sessionInfo.trackName);
        for (const variation of trackNameVariations) {
            eventId = await this.dbService.findActiveEventByTrack(variation);
            if (eventId) {
                console.log(`✅ Found flexible match: ${variation} -> ${eventId}`);
                return eventId;
            }
        }
        // If no match found, try to create a new race
        // This requires seasonId - we'll need to get it from sessionInfo or throw error
        if (!sessionInfo.seasonId) {
            console.log('⚠️ No seasonId provided, cannot create new race');
            return null;
        }
        // Create track if it doesn't exist
        const trackId = await this.dbService.findOrCreateTrack(sessionInfo.trackName);
        // Create race (basic fields)
        const raceId = await this.dbService.createRace({
            seasonId: sessionInfo.seasonId,
            trackId: trackId,
            raceDate: sessionInfo.date || new Date().toISOString(),
            status: 'completed'
        });
        // Update race with additional session info
        await this.dbService.query(`UPDATE races SET 
        track_name = $1,
        session_type = $2,
        weather_air_temp = $3,
        weather_track_temp = $4,
        weather_rain_percentage = $5,
        updated_at = $6
       WHERE id = $7`, [
            sessionInfo.trackName,
            sessionInfo.sessionType,
            sessionInfo.airTemperature,
            sessionInfo.trackTemperature,
            sessionInfo.rainPercentage,
            new Date().toISOString(),
            raceId
        ]);
        return raceId;
    }
    generateTrackNameVariations(trackName) {
        const variations = [trackName];
        // Common variations
        const commonVariations = {
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
    async mapDriversToLeague(driverResults, eventId) {
        const seasonId = await this.dbService.getSeasonIdFromEvent(eventId);
        // Extract identifiers for mapping
        const networkIds = driverResults.map(r => r.networkId || r.network_id).filter(Boolean);
        const steamIds = driverResults.map(r => r.steamId || r.steam_id).filter(Boolean);
        const driverNames = driverResults.map(r => r.driverName || r.name || r.driver_name).filter(Boolean);
        const carNumbers = driverResults.map(r => r.carNumber || r.car_number || r.driverNumber || r.driver_number).filter(Boolean);
        // Query all mappings in one go (batch queries)
        const networkIdMappings = networkIds.length > 0 ? await this.dbService.query(`SELECT member_id, f123_driver_name, f123_driver_number, f123_network_id 
       FROM f123_driver_mappings 
       WHERE season_id = $1 AND f123_network_id = ANY($2)`, [seasonId, networkIds]) : { rows: [] };
        const steamIdMappings = steamIds.length > 0 ? await this.dbService.query(`SELECT member_id, f123_driver_name, f123_driver_number, f123_steam_id 
       FROM f123_driver_mappings 
       WHERE season_id = $1 AND f123_steam_id = ANY($2)`, [seasonId, steamIds]) : { rows: [] };
        const nameMappings = driverNames.length > 0 ? await this.dbService.query(`SELECT member_id, f123_driver_name, f123_driver_number, f123_driver_name as driver_name
       FROM f123_driver_mappings 
       WHERE season_id = $1 AND f123_driver_name = ANY($2)`, [seasonId, driverNames]) : { rows: [] };
        // Create lookup maps for O(1) access
        const networkIdMap = new Map(networkIdMappings.rows.map(r => [r.f123_network_id, r]));
        const steamIdMap = new Map(steamIdMappings.rows.map(r => [r.f123_steam_id, r]));
        const nameMap = new Map(nameMappings.rows.map(r => [r.driver_name, r]));
        // Map results using pre-fetched data
        return driverResults.map((result) => {
            // Priority 1: Network ID (most reliable for JSON files)
            const networkId = result.networkId || result.network_id;
            if (networkId) {
                const networkMapping = networkIdMap.get(networkId);
                if (networkMapping) {
                    return {
                        ...result,
                        member_id: networkMapping.member_id,
                        driver_id: null, // Will be set by storeDriverSessionResults if needed
                        mapped_driver_name: networkMapping.f123_driver_name,
                        mapped_driver_number: networkMapping.f123_driver_number
                    };
                }
            }
            // Priority 2: Steam ID
            const steamId = result.steamId || result.steam_id;
            if (steamId) {
                const steamMapping = steamIdMap.get(steamId);
                if (steamMapping) {
                    return {
                        ...result,
                        member_id: steamMapping.member_id,
                        driver_id: null,
                        mapped_driver_name: steamMapping.f123_driver_name,
                        mapped_driver_number: steamMapping.f123_driver_number
                    };
                }
            }
            // Priority 3: Driver name + team
            const driverName = result.driverName || result.name || result.driver_name;
            const teamName = result.teamName || result.team || result.team_name;
            if (driverName && teamName) {
                // Try name + team matching
                const nameMapping = nameMap.get(driverName);
                if (nameMapping) {
                    return {
                        ...result,
                        member_id: nameMapping.member_id,
                        driver_id: null,
                        mapped_driver_name: nameMapping.f123_driver_name,
                        mapped_driver_number: nameMapping.f123_driver_number
                    };
                }
            }
            // Priority 4: Driver name only
            if (driverName) {
                const nameMapping = nameMap.get(driverName);
                if (nameMapping) {
                    return {
                        ...result,
                        member_id: nameMapping.member_id,
                        driver_id: null,
                        mapped_driver_name: nameMapping.f123_driver_name,
                        mapped_driver_number: nameMapping.f123_driver_number
                    };
                }
            }
            // No mapping found
            return {
                ...result,
                member_id: null,
                driver_id: null,
                mapped_driver_name: driverName || 'Unknown',
                mapped_driver_number: result.carNumber || result.car_number || result.driverNumber || result.driver_number || 0
            };
        });
    }
    async markEventAsCompleted(eventId) {
        await this.dbService.query('UPDATE races SET status = $1, updated_at = $2 WHERE id = $3', ['completed', new Date().toISOString(), eventId]);
        console.log(`✅ Event ${eventId} marked as completed`);
    }
    async recalculateSeasonStandings(eventId) {
        try {
            console.log(`📊 Recalculating season standings for event ${eventId}`);
            const seasonId = await this.dbService.getSeasonIdFromEvent(eventId);
            if (!seasonId) {
                console.log('⚠️ Could not find season for event, skipping standings recalculation');
                return;
            }
            const standingsResult = await this.dbService.query(`
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
            console.log('✅ Season standings recalculation completed');
        }
        catch (error) {
            console.error('❌ Error recalculating season standings:', error);
        }
    }
    async handleOrphanedSession(sessionInfo, driverResults) {
        await this.dbService.query(`INSERT INTO orphaned_sessions (id, track_name, session_type, session_data, session_time, status)
         VALUES ($1, $2, $3, $4, $5, $6)`, [
            (0, uuid_1.v4)(),
            sessionInfo.trackName,
            sessionInfo.sessionType,
            JSON.stringify({ sessionInfo, driverResults }),
            new Date().toISOString(),
            'pending'
        ]);
        this.io.emit('orphanedSession', {
            trackName: sessionInfo.trackName,
            sessionType: sessionInfo.sessionType,
            sessionName: this.dbService.getSessionTypeName(sessionInfo.sessionType),
            timestamp: new Date().toISOString()
        });
        console.log('📝 Orphaned session stored for admin review');
    }
    async logSessionError(error, driverResults) {
        await this.dbService.query(`INSERT INTO session_errors (id, error_message, session_data, created_at)
       VALUES ($1, $2, $3, $4)`, [
            (0, uuid_1.v4)(),
            error.message || 'Unknown error',
            JSON.stringify({ error: error.toString(), driverResults }),
            new Date().toISOString()
        ]);
    }
}
exports.RaceResultsProcessor = RaceResultsProcessor;
//# sourceMappingURL=RaceResultsProcessor.js.map