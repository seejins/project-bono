import { DatabaseService } from './DatabaseService';
import { Server } from 'socket.io';
import { F123JSONParser } from './F123JSONParser';
import { getSessionTypeName, getResultStatus } from '../utils/f123Constants';
import fs from 'fs';
import path from 'path';

export class RaceJSONImportService {
  private dbService: DatabaseService;
  private io: Server;

  constructor(dbService: DatabaseService, io: Server) {
    this.dbService = dbService;
    this.io = io;
    console.log('📥 RaceJSONImportService initialized');
  }

  /**
   * Validate JSON file structure
   */
  async validateJSONFile(filePath: string): Promise<{ valid: boolean; errors?: string[] }> {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(fileContent);

      const errors: string[] = [];

      // Check for required structure
      if (!data['classification-data'] && !data.participants && !data['participants']) {
        errors.push('No driver results found (missing classification-data or participants)');
      }

      return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Invalid JSON file']
      };
    }
  }

  /**
   * Import race JSON file
   * Processes F1 23 JSON session files and stores them in the database
   */
  async importRaceJSON(
    filePath: string,
    seasonId: string,
    raceId?: string
  ): Promise<{ raceId: string; sessionResultId: string; importedCount: number }> {
    try {
      // Read and parse the JSON file
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(fileContent);
      
      // Extract track-id from JSON (this is the event name, e.g., "Austria")
      const trackId = data['session-info']?.['track-id'] || 
                      data.sessionInfo?.trackId ||
                      data['session-info']?.['track-name'] ||
                      data['track-name'] || 
                      data.trackName || 
                      data.track || 
                      null;
      
      // Event name is the track-id (e.g., "Austria")
      let eventName = trackId || 'Unknown';
      
      // Fallback: Try to extract track name from filename if JSON parsing failed
      if (!eventName || eventName === 'Unknown') {
        const fileName = path.basename(filePath, '.json');
        // Filename format: "One_Shot_Qualifying_Austria_2025_11_04_21_17_47.json"
        // Try to extract track name (look for common track names in filename)
        const trackNameMatches = fileName.match(/(Austria|Bahrain|Monaco|Silverstone|Monza|Spa|Suzuka|Abu_Dhabi|Texas|Brazil|Mexico|Baku|Zandvoort|Imola|Portimão|Jeddah|Miami|Las_Vegas|Losail|Catalunya|Montreal|Hungaroring|Singapore|Hockenheim|Paul_Ricard|Shanghai|Sochi|Hanoi|Sakhir)/i);
        if (trackNameMatches) {
          eventName = trackNameMatches[1].replace(/_/g, ' ');
          // Map variations to standard names
          if (eventName.toLowerCase() === 'austria') eventName = 'Austria';
          else if (eventName.toLowerCase() === 'sakhir') eventName = 'Sakhir (Bahrain)';
          else if (eventName.toLowerCase() === 'texas') eventName = 'Texas';
          else if (eventName.toLowerCase() === 'brazil') eventName = 'Brazil';
          else if (eventName.toLowerCase() === 'mexico') eventName = 'Mexico';
          else if (eventName.toLowerCase() === 'baku') eventName = 'Baku (Azerbaijan)';
          else if (eventName.toLowerCase() === 'abu_dhabi' || eventName.toLowerCase() === 'abu dhabi') eventName = 'Abu Dhabi';
          else if (eventName.toLowerCase() === 'las_vegas' || eventName.toLowerCase() === 'las vegas') eventName = 'Las Vegas';
          else if (eventName.toLowerCase() === 'paul_ricard' || eventName.toLowerCase() === 'paul ricard') eventName = 'Paul Ricard';
        }
      }
      
      // Import track name mapping to get full track name
      const { mapTrackIdToTrackName } = await import('../utils/trackNameMapping');
      
      // Track name is the mapped full name (e.g., "Red Bull Ring")
      const trackName = trackId ? mapTrackIdToTrackName(trackId) : 'Unknown Track';
      
      // Parse session info (for session type)
      const sessionInfo = F123JSONParser.parseSessionFile(filePath).sessionInfo;
      
      // Extract session type from JSON data (preferred) or fallback to parsed info
      let sessionType: any = sessionInfo.sessionType;
      
      // Try to get session type from JSON's session-info object
      if (data['session-info']?.['session-type'] !== undefined) {
        sessionType = data['session-info']['session-type'];
        console.log(`📊 Session type from JSON session-info: ${sessionType} (type: ${typeof sessionType})`);
      } else if (data.sessionInfo?.sessionType !== undefined) {
        sessionType = data.sessionInfo.sessionType;
      } else if (data['session-type'] !== undefined) {
        sessionType = data['session-type'];
      } else if (data.sessionType !== undefined) {
        sessionType = data.sessionType;
      }
      
      console.log(`📊 Raw session type value: ${sessionType} (type: ${typeof sessionType})`);
      
      // Ensure sessionType is a number
      if (typeof sessionType === 'string') {
        // If it's a string, try to map it to a number
        const sessionTypeMap: { [key: string]: number } = {
          'practice': 1,
          'practice1': 1,
          'practice2': 2,
          'practice3': 3,
          'short_practice': 4,
          'short practice': 4,
          'qualifying': 5,
          'qualifying1': 5,
          'qualifying2': 6,
          'qualifying3': 7,
          'short_qualifying': 8,
          'short qualifying': 8,
          'one_shot_qualifying': 9,
          'one shot qualifying': 9,
          'osq': 9,
          'race': 10,
          'race2': 11,
          'race3': 12
        };
        const normalizedKey = sessionType.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
        const originalValue = sessionType;
        sessionType = sessionTypeMap[normalizedKey] || sessionInfo.sessionType || 0;
        console.log(`📊 Mapped string session type "${originalValue}" (normalized: "${normalizedKey}") to number: ${sessionType}`);
      }
      
      // Ensure it's a number
      sessionType = Number(sessionType);
      if (isNaN(sessionType)) {
        console.warn(`⚠️ Session type could not be converted to number, using fallback: ${sessionInfo.sessionType}`);
        sessionType = sessionInfo.sessionType || 0;
      }
      
      console.log(`📊 Final session type: ${sessionType} (type: ${typeof sessionType})`);
      
      const sessionTypeName = getSessionTypeName(sessionType);
      
      // Extract date from JSON or use current date
      let sessionDate: string = new Date().toISOString();
      if (data['session-info']?.['session-date']) {
        sessionDate = new Date(data['session-info']['session-date']).toISOString();
      } else if (data.sessionInfo?.sessionDate) {
        sessionDate = new Date(data.sessionInfo.sessionDate).toISOString();
      } else if (data.date) {
        sessionDate = new Date(data.date).toISOString();
      }
      
      // Extract session UID if available
      let sessionUID: bigint | null = null;
      if (data['session-info']?.['session-uid']) {
        sessionUID = BigInt(data['session-info']['session-uid']);
      } else if (data.sessionInfo?.sessionUID) {
        sessionUID = BigInt(data.sessionInfo.sessionUID);
      } else if (data.sessionUID) {
        sessionUID = BigInt(data.sessionUID);
      }
      
      // Check for duplicate session by session_uid
      if (sessionUID !== null) {
        const existingSession = await this.dbService.getSessionByUID(sessionUID);
        if (existingSession) {
          throw new Error(
            `Session with UID ${sessionUID} already exists. ` +
            `It was imported as "${existingSession.sessionName}" for ${existingSession.trackName} on ${existingSession.raceDate}. ` +
            `Session ID: ${existingSession.id}`
          );
        }
      }
      
      // Extract track length and total laps from session-info
      const trackLengthMeters = data['session-info']?.['track-length'] || data.sessionInfo?.trackLength || null;
      const trackLengthKm = trackLengthMeters ? (trackLengthMeters / 1000).toFixed(3) : null;
      const totalLaps = data['session-info']?.['total-laps'] || data.sessionInfo?.totalLaps || null;
      
      console.log(`📏 Track length: ${trackLengthMeters}m (${trackLengthKm}km), Total laps: ${totalLaps}`);
      
      // Get or create race/event
      let targetRaceId = raceId;
      if (!targetRaceId) {
        // Find or create track with length information (use full track name for track table)
        const trackDbId = await this.dbService.findOrCreateTrack(trackName, trackLengthKm ? parseFloat(trackLengthKm) : undefined);
        
        // Try to find existing event for this event name (use event name, not track name)
        const existingEvent = await this.dbService.findActiveEventByTrack(eventName);
        if (existingEvent) {
          targetRaceId = existingEvent;
          // Update track_name to event name in case it was set to the mapped track name previously
          await this.dbService.updateEventInSeason(existingEvent, {
            track_name: eventName // Ensure event name (track-id) is stored, not mapped track name
          });
          console.log(`✅ Found existing event for ${eventName}: ${existingEvent} (updated track_name)`);
        } else {
          // Create new event (use event name as track_name in races table)
          targetRaceId = await this.dbService.addEventToSeason(seasonId, {
            track_name: eventName, // Event name (e.g., "Austria")
            track_id: trackDbId, // Link to tracks table with full track name
            full_track_name: trackName, // Full track name for reference
            track_length: trackLengthKm ? parseFloat(trackLengthKm) : undefined,
            date: sessionDate,
            status: 'scheduled'
          });
          console.log(`✅ Created new event "${eventName}" (track: ${trackName}): ${targetRaceId}`);
        }
      }
      
      // Debug: Log JSON structure to understand format
      console.log('📄 JSON file structure - top-level keys:', Object.keys(data));
      console.log('📄 Sample data structure:', JSON.stringify(data).substring(0, 500));
      
      // Extract classification data (driver results) - try multiple possible formats
      let classificationData: any[] = [];
      let participants: any[] = [];
      
      // Try UDP-style format first
      if (data['classification-data']) {
        classificationData = Array.isArray(data['classification-data']) ? data['classification-data'] : [];
      } else if (data.classificationData) {
        classificationData = Array.isArray(data.classificationData) ? data.classificationData : [];
      }
      
      // Try participants array
      if (data.participants) {
        participants = Array.isArray(data.participants) ? data.participants : [];
      } else if (data['participants']) {
        participants = Array.isArray(data['participants']) ? data['participants'] : [];
      }
      
      // Try simpler format: drivers array (like F123Parser expects)
      if (classificationData.length === 0 && data.drivers && Array.isArray(data.drivers)) {
        console.log('📄 Using drivers array format');
        classificationData = data.drivers;
        participants = data.drivers; // Use drivers as participants too
      }
      
      // Try results array
      if (classificationData.length === 0 && data.results && Array.isArray(data.results)) {
        console.log('📄 Using results array format');
        classificationData = data.results;
        participants = data.results;
      }
      
      console.log(`📊 Found ${classificationData.length} classification entries and ${participants.length} participants`);
      console.log(`📄 JSON file top-level keys:`, Object.keys(data));
      
      // Log first classification entry to see structure
      if (classificationData.length > 0) {
        console.log(`📄 First classification entry structure:`, JSON.stringify(classificationData[0], null, 2));
        console.log(`📄 First classification entry keys:`, Object.keys(classificationData[0]));
      }
      
      // Log first participant to see structure
      if (participants.length > 0) {
        console.log(`📄 First participant structure:`, JSON.stringify(participants[0], null, 2));
        console.log(`📄 First participant keys:`, Object.keys(participants[0]));
      }
      
      if (classificationData.length === 0) {
        console.error(`❌ No classification data found. Full JSON structure (first 2000 chars):`, JSON.stringify(data).substring(0, 2000));
        throw new Error(`No driver results found in JSON file. Available keys: ${Object.keys(data).join(', ')}`);
      }
      
      // Create a map of participants by index for lookup
      // Store full participant data for comprehensive extraction
      const participantMap = new Map();
      participants.forEach((participant: any, index: number) => {
        participantMap.set(index, {
          // Basic identification
          name: participant.name || participant.driverName || participant['driver-name'] || participant['name'] || '',
          steamId: participant.steamId || participant.steam_id || participant.name || '',
          driverId: participant['driver-id'] || participant.driverId || participant.driver_id || 0,
          teamId: participant['team-id'] || participant.teamId || participant.team_id || 0,
          raceNumber: participant['race-number'] || participant.raceNumber || participant.number || participant.carNumber || 0,
          // Store full participant object for complete data extraction
          fullData: participant
        });
      });
      
      // Prepare results - no driver mapping needed, just store JSON data directly
      const driverResults: any[] = [];
      let importedCount = 0;
      
      for (let i = 0; i < classificationData.length; i++) {
        const result = classificationData[i];
        let participant = participantMap.get(i);
        
        // If no participant map, try to extract from result itself
        if (!participant && result) {
          participant = {
            name: result.name || result.driverName || result['driver-name'] || '',
            steamId: result.steamId || result.steam_id || result.name || '',
            driverId: result['driver-id'] || result.driverId || result.driver_id || 0,
            teamId: result['team-id'] || result.teamId || result.team_id || 0,
            raceNumber: result['race-number'] || result.raceNumber || result.number || result.carNumber || 0,
            // Store full participant data if available from result
            fullData: result['participant-data'] || result.participantData || result
          };
        }
        
        if (!result) {
          continue;
        }
        
        // Log first result to see what we're actually getting
        if (i === 0) {
          console.log(`📄 First result entry (raw):`, JSON.stringify(result, null, 2));
          console.log(`📄 First result entry keys:`, Object.keys(result));
          if (result['final-classification']) {
            console.log(`📄 final-classification keys:`, Object.keys(result['final-classification']));
            console.log(`📄 final-classification values:`, result['final-classification']);
          }
          if (result['lap-time-history']) {
            console.log(`📄 lap-time-history keys:`, Object.keys(result['lap-time-history']));
          }
        }
        
        // Extract from final-classification (this is where the actual race results are!)
        const finalClassification = result['final-classification'] || result.finalClassification || {};
        const lapTimeHistory = result['lap-time-history'] || result.lapTimeHistory || {};
        const lapData = result['lap-data'] || result.lapData || {};
        
        // Extract result data from final-classification
        const position = finalClassification.position || result.position || result['position'] || result.finishPosition || i + 1;
        const gridPosition = finalClassification['grid-position'] || finalClassification.gridPosition || result['grid-position'] || result.gridPosition || result.grid || result.startPosition || position;
        const numLaps = finalClassification['num-laps'] || finalClassification.numLaps || result['num-laps'] || result.numLaps || result.laps || result.lapCount || 0;
        const points = finalClassification.points || finalClassification['points'] || result.points || result['points'] || 0;
        
        // Best lap time - check final-classification first, then lap-time-history
        let bestLapTimeMs = finalClassification['best-lap-time-ms'] || finalClassification.bestLapTimeMs || 0;
        if (!bestLapTimeMs && lapTimeHistory['lap-history-data'] && Array.isArray(lapTimeHistory['lap-history-data'])) {
          // Find best lap from lap history
          const bestLap = lapTimeHistory['lap-history-data'].reduce((best: any, lap: any) => {
            const lapTime = lap['lap-time-in-ms'] || lap.lapTimeInMs || 0;
            if (lapTime > 0 && (!best || lapTime < best)) {
              return lapTime;
            }
            return best;
          }, 0);
          bestLapTimeMs = bestLap;
        }
        // Fallback to other locations
        if (!bestLapTimeMs) {
          bestLapTimeMs = result['best-lap-time-in-ms'] || result.bestLapTimeInMS || result.bestLapTimeMs || 
                         result.bestLapTime || result.fastestLapTime || result['best-lap-time'] || 0;
        }
        
        // Total race time - from final-classification (in SECONDS!)
        const totalRaceTimeSeconds = finalClassification['total-race-time'] || finalClassification.totalRaceTime || 0;
        
        // Result status - convert from string to integer
        const rawResultStatus =
          finalClassification['result-status'] ||
          finalClassification.resultStatus ||
          result['result-status'] ||
          result.resultStatus ||
          result.status ||
          'FINISHED';

        let resultStatus = 2; // Default to FINISHED
        let resultStatusStr = typeof rawResultStatus === 'string' ? rawResultStatus : '';
        if (typeof rawResultStatus === 'number') {
          resultStatus = rawResultStatus;
          resultStatusStr = getResultStatus(resultStatus);
        } else if (typeof rawResultStatus === 'string' && rawResultStatus.trim() !== '') {
          const normalizedStatus = rawResultStatus.trim().toLowerCase().replace(/[\s_-]+/g, '');
          switch (normalizedStatus) {
            case 'finished':
            case 'complete':
            case 'classified':
              resultStatus = 2;
              resultStatusStr = 'FINISHED';
              break;
            case 'dnf':
            case 'didnotfinish':
            case 'didnotfinishrace':
              resultStatus = 4;
              resultStatusStr = 'DNF';
              break;
            case 'dsq':
            case 'disqualified':
              resultStatus = 5;
              resultStatusStr = 'DSQ';
              break;
            case 'ncl':
            case 'didnotclassify':
            case 'notclassified':
              resultStatus = 6;
              resultStatusStr = 'NCL';
              break;
            case 'ret':
            case 'retired':
            case 'retirement':
              resultStatus = 7;
              resultStatusStr = 'RET';
              break;
            default:
              resultStatus = 2;
              resultStatusStr = 'FINISHED';
          }
        } else {
          resultStatusStr = getResultStatus(resultStatus);
        }

        if (!resultStatusStr) {
          resultStatusStr = getResultStatus(resultStatus);
        }

        const numPenalties = finalClassification['num-penalties'] || finalClassification.numPenalties || result['num-penalties'] || result.numPenalties || result.penalties || 0;
        const penaltiesTime = finalClassification['penalties-time'] || finalClassification.penaltiesTime || 0; // Penalty time in seconds
        const numPitStops = finalClassification['num-pit-stops'] || finalClassification.numPitStops || result['num-pit-stops'] || result.numPitStops || result.pitStops || 0;
        
        // Extract sector times from lap-time-history (best sectors)
        let sector1TimeMs = 0;
        let sector2TimeMs = 0;
        let sector3TimeMs = 0;
        
        if (lapTimeHistory['lap-history-data'] && Array.isArray(lapTimeHistory['lap-history-data'])) {
          const lapHistoryData = lapTimeHistory['lap-history-data'];
          
          // Get best lap number and sector lap numbers
          const bestLapNum = lapTimeHistory['best-lap-time-lap-num'];
          const bestS1Lap = lapTimeHistory['best-sector-1-lap-num'];
          const bestS2Lap = lapTimeHistory['best-sector-2-lap-num'];
          const bestS3Lap = lapTimeHistory['best-sector-3-lap-num'];
          
          // Find the best lap - lap numbers are 1-indexed, so subtract 1 for array index
          // Also check if there's a lap-number field or if we need to use array index
          let bestLap: any = null;
          if (bestLapNum !== undefined && bestLapNum !== null) {
            // Try to find by lap-number field first
            bestLap = lapHistoryData.find((lap: any) => lap['lap-number'] === bestLapNum);
            // If not found, try array index (lap numbers are 1-indexed)
            if (!bestLap && bestLapNum > 0 && bestLapNum <= lapHistoryData.length) {
              bestLap = lapHistoryData[bestLapNum - 1];
            }
          }
          
          // If still not found, try to find the lap with the best lap time
          if (!bestLap && lapHistoryData.length > 0) {
            // Find lap with the fastest lap time
            let fastestLapTime = Infinity;
            for (const lap of lapHistoryData) {
              const lapTime = lap['lap-time-in-ms'] || lap.lapTimeInMs || 0;
              if (lapTime > 0 && lapTime < fastestLapTime) {
                fastestLapTime = lapTime;
                bestLap = lap;
              }
            }
          }
          
          // Extract sectors from best lap
          if (bestLap) {
            sector1TimeMs = bestLap['sector-1-time-in-ms'] || bestLap.sector1TimeInMs || 0;
            sector2TimeMs = bestLap['sector-2-time-in-ms'] || bestLap.sector2TimeInMs || 0;
            sector3TimeMs = bestLap['sector-3-time-in-ms'] || bestLap.sector3TimeInMs || 0;
          }
          
          // Fallback: try to get from best sector laps if not found
          if (!sector1TimeMs && bestS1Lap !== undefined && bestS1Lap !== null) {
            let s1Lap = lapHistoryData.find((lap: any) => lap['lap-number'] === bestS1Lap);
            if (!s1Lap && bestS1Lap > 0 && bestS1Lap <= lapHistoryData.length) {
              s1Lap = lapHistoryData[bestS1Lap - 1];
            }
            if (s1Lap) {
              sector1TimeMs = s1Lap['sector-1-time-in-ms'] || s1Lap.sector1TimeInMs || 0;
            }
          }
          
          if (!sector2TimeMs && bestS2Lap !== undefined && bestS2Lap !== null) {
            let s2Lap = lapHistoryData.find((lap: any) => lap['lap-number'] === bestS2Lap);
            if (!s2Lap && bestS2Lap > 0 && bestS2Lap <= lapHistoryData.length) {
              s2Lap = lapHistoryData[bestS2Lap - 1];
            }
            if (s2Lap) {
              sector2TimeMs = s2Lap['sector-2-time-in-ms'] || s2Lap.sector2TimeInMs || 0;
            }
          }
          
          if (!sector3TimeMs && bestS3Lap !== undefined && bestS3Lap !== null) {
            let s3Lap = lapHistoryData.find((lap: any) => lap['lap-number'] === bestS3Lap);
            if (!s3Lap && bestS3Lap > 0 && bestS3Lap <= lapHistoryData.length) {
              s3Lap = lapHistoryData[bestS3Lap - 1];
            }
            if (s3Lap) {
              sector3TimeMs = s3Lap['sector-3-time-in-ms'] || s3Lap.sector3TimeInMs || 0;
            }
          }
          
          // Final fallback: use first valid lap with sector times if still not found
          if ((!sector1TimeMs || !sector2TimeMs || !sector3TimeMs) && lapHistoryData.length > 0) {
            for (const lap of lapHistoryData) {
              const s1 = lap['sector-1-time-in-ms'] || lap.sector1TimeInMs || 0;
              const s2 = lap['sector-2-time-in-ms'] || lap.sector2TimeInMs || 0;
              const s3 = lap['sector-3-time-in-ms'] || lap.sector3TimeInMs || 0;
              if (s1 > 0 && s2 > 0 && s3 > 0) {
                if (!sector1TimeMs) sector1TimeMs = s1;
                if (!sector2TimeMs) sector2TimeMs = s2;
                if (!sector3TimeMs) sector3TimeMs = s3;
                break;
              }
            }
          }
        }
        
        // Fallback to other locations in the result object
        if (!sector1TimeMs) {
          sector1TimeMs = result['sector1-time-in-ms'] || result.sector1TimeInMS || result.sector1TimeMs || 
                         result.sector1Time || result.sector1 || result['sector1-time'] || 0;
        }
        if (!sector2TimeMs) {
          sector2TimeMs = result['sector2-time-in-ms'] || result.sector2TimeInMS || result.sector2TimeMs || 
                         result.sector2Time || result.sector2 || result['sector2-time'] || 0;
        }
        if (!sector3TimeMs) {
          sector3TimeMs = result['sector3-time-in-ms'] || result.sector3TimeInMS || result.sector3TimeMs || 
                         result.sector3Time || result.sector3 || result['sector3-time'] || 0;
        }
        
        // Determine DNF reason (only for non-finished statuses)
        let dnfReason: string | null = null;
        if (resultStatus === 4 || resultStatus === 5 || resultStatus === 6 || resultStatus === 7) { // DNF, DSQ, NCL, RET
          dnfReason = getResultStatus(resultStatus);
        }
        
        // No user mapping - just use JSON data directly
        // user_id will be NULL until admin maps in-game driver to tournament participant
        const userId: string | null = null;
        
        // driver-id is already in participantData, no need to extract/duplicate
        
        // Store best lap time for fastest lap calculation (will calculate once after loop)
        // Note: fastest lap calculation moved outside loop for efficiency
        const polePosition = sessionType === 10 && position === 1 && gridPosition === 1; // Race only
        // For qualifying sessions, pole is position 1
        const isQualifyingPole = (sessionType >= 5 && sessionType <= 9) && position === 1;
        
        // Store best lap time for later fastest lap calculation
        const bestLapTimeForFastestCheck = bestLapTimeMs;
        
        // Extract tyre stints from final-classification
        const tyreStintsActual = finalClassification['tyre-stints-actual'] || finalClassification.tyreStintsActual || [];
        const tyreStintsVisual = finalClassification['tyre-stints-visual'] || finalClassification.tyreStintsVisual || [];
        
        // Log extracted values for first driver
        if (i === 0) {
          console.log(`📊 Extracted values for driver ${i + 1}:`, {
            position,
            gridPosition,
            numLaps,
            points,
            bestLapTimeMs,
            totalRaceTimeSeconds,
            resultStatus,
            numPenalties,
            sector1TimeMs,
            sector2TimeMs,
            sector3TimeMs,
            tyreStintsVisual: tyreStintsVisual,
            tyreStintsVisualLength: Array.isArray(tyreStintsVisual) ? tyreStintsVisual.length : 'not array',
            lapHistoryDataLength: lapTimeHistory['lap-history-data'] ? (lapTimeHistory['lap-history-data'] as any[]).length : 0,
            bestLapNum: lapTimeHistory['best-lap-time-lap-num']
          });
        }
        
        // Store final-classification data in additional_data for easy access
        const finalClassificationData = {
          position,
          numLaps,
          gridPosition,
          points,
          numPitStops,
          resultStatus: resultStatusStr,
          bestLapTimeMs,
          totalRaceTimeSeconds,
          penaltiesTime: finalClassification['penalties-time'] || finalClassification.penaltiesTime || 0,
          numPenalties,
          numTyreStints: finalClassification['num-tyre-stints'] || finalClassification.numTyreStints || 0,
          tyreStintsActual,
          tyreStintsVisual,
          tyreStintsEndLaps: finalClassification['tyre-stints-end-laps'] || finalClassification.tyreStintsEndLaps || []
        };
        
        // Extract ALL available data from classification-data entry
        const additionalDriverData: any = {
          // Final classification data (for easy access to tyre stints, etc.)
          finalClassification: finalClassificationData,
          // Driver identification - driver-id is already in participantData, no need to duplicate
          participantData: participant.fullData,  // Contains 'driver-id' (e.g., 9 for VERSTAPPEN)
          index: result.index || result['index'] || i,
          isPlayer: result['is-player'] || result.isPlayer || false,
          driverName: result['driver-name'] || result.driverName || participant.name,
          team: result.team || participant.teamId,
          telemetrySettings: result['telemetry-settings'] || result.telemetrySettings,
          
          // Position and lap data
          trackPosition: result['track-position'] || result.trackPosition || position,
          currentLap: result['current-lap'] || result.currentLap || numLaps,
          
          // Speed data
          topSpeedKmph: result['top-speed-kmph'] || result.topSpeedKmph || result.topSpeed || null,
          
          // Car damage data (full object with all damage details)
          carDamage: result['car-damage'] || result.carDamage || null,
          
          // Car status data (full object - fuel, tyres, ERS, DRS, etc.)
          carStatus: result['car-status'] || result.carStatus || null,
          
          // Note: participantData is already set above from participant.fullData
          // Contains 'driver-id' (e.g., 9 for VERSTAPPEN), name, team, nationality, etc.
          
          // Tyre sets (full array of all tyre sets available)
          tyreSets: result['tyre-sets'] || result.tyreSets || null,
          
          // Lap time history (full object with all lap records)
          lapTimeHistory: result['lap-time-history'] || result.lapTimeHistory || null,
          
          // Lap data (current lap information)
          lapData: result['lap-data'] || result.lapData || null,
          
          // Session history (full object with lap history and tyre stints)
          sessionHistory: result['session-history'] || result.sessionHistory || null,
          
          // Car setup (full object if available)
          carSetup: result['car-setup'] || result.carSetup || null,
          
          // Warning and penalty history (full object if available)
          warningPenaltyHistory: result['warning-penalty-history'] || result.warningPenaltyHistory || null,
          
          // Tyre set history (full object if available)
          tyreSetHistory: result['tyre-set-history'] || result.tyreSetHistory || null,
          
          // Per-lap info (array of detailed per-lap data)
          perLapInfo: result['per-lap-info'] || result.perLapInfo || null,
          
          // Collisions (array of collision data if available)
          collisions: result.collisions || null,
          
          // Additional timing data
          gapToLeader: result['gap-to-leader'] || result.gapToLeader || result.gap || null,
          gapToPositionAhead: result['gap-to-position-ahead'] || result.gapToPositionAhead || null,
          
          // Pit stop data
          numPitStops: numPitStops,
          
          // Tyre data if available (also in car-status, but keep here for compatibility)
          tyreCompound: result['tyre-compound'] || result.tyreCompound || null,
          tyreVisualCompound: result['tyre-visual-compound'] || result.tyreVisualCompound || null,
          tyreActualCompound: result['tyre-actual-compound'] || result.tyreActualCompound || null,
        };
        
        // Remove null/undefined values to keep JSON clean
        Object.keys(additionalDriverData).forEach(key => {
          if (additionalDriverData[key] === null || additionalDriverData[key] === undefined) {
            delete additionalDriverData[key];
          }
        });
        
        // Extract JSON driver identification data (store as columns, not just in JSONB)
        const jsonDriverId = participant?.driverId || participant?.['driver-id'] || null;
        const jsonDriverName = participant?.name || participant?.driverName || participant?.['driver-name'] || null;
        
        // Extract team name - check multiple sources (team name, not team ID)
        // The team name should be a string like "Ferrari" or "Red Bull Racing"
        const jsonTeamName = 
          result?.team ||  // Team name from result (most reliable)
          participant?.fullData?.team ||  // Team name from participant fullData
          participant?.team ||  // Team name from participant data
          participant?.teamName || 
          additionalDriverData?.team ||  // Team name from additional_data (already set from result.team)
          null;
        
        const jsonCarNumber = participant?.raceNumber || participant?.number || participant?.['race-number'] || null;
        
        // Extract lap-by-lap data from lap-history-data and per-lap-info
        const lapTimesData: Array<{
          lapNumber: number;
          lapTimeMs: number;
          sector1Ms?: number;
          sector2Ms?: number;
          sector3Ms?: number;
          sector1TimeMinutes?: number;
          sector2TimeMinutes?: number;
          sector3TimeMinutes?: number;
          lapValidBitFlags?: number;
          tireCompound?: string;
          trackPosition?: number;
          tireAgeLaps?: number;
          topSpeedKmph?: number;
          maxSafetyCarStatus?: string;
          vehicleFiaFlags?: string;
          pitStop?: boolean;
          ersStoreEnergy?: number;
          ersDeployedThisLap?: number;
          ersDeployMode?: string;
          fuelInTank?: number;
          fuelRemainingLaps?: number;
          gapToLeaderMs?: number;
          gapToPositionAheadMs?: number;
          carDamageData?: any;
          tyreSetsData?: any;
        }> = [];
        
        // Debug: Check if lap-time-history exists
        if (!lapTimeHistory || Object.keys(lapTimeHistory).length === 0) {
          console.log(`⚠️  No lap-time-history found for driver ${jsonDriverName || i} (position ${position})`);
        }
        
        if (lapTimeHistory['lap-history-data'] && Array.isArray(lapTimeHistory['lap-history-data'])) {
          const lapHistoryData = lapTimeHistory['lap-history-data'];
          console.log(`📊 Found ${lapHistoryData.length} laps in lap-history-data for driver ${jsonDriverName || i}`);
          
          // Get tyre stint information for mapping lap numbers to tire compounds
          const tyreStintsEndLaps = finalClassification['tyre-stints-end-laps'] || finalClassification.tyreStintsEndLaps || [];
          const tyreStintsVisual = finalClassification['tyre-stints-visual'] || finalClassification.tyreStintsVisual || [];
          
          // Iterate with index to get lap number (lap-history-data doesn't include lap-number field)
          for (let lapIndex = 0; lapIndex < lapHistoryData.length; lapIndex++) {
            const lap = lapHistoryData[lapIndex];
            // Lap number is 1-indexed (first lap is lap 1, not lap 0)
            const lapNumber = lap['lap-number'] || lap.lapNumber || (lapIndex + 1);
            const lapTimeMs = lap['lap-time-in-ms'] || lap.lapTimeInMs || 0;
            const sector1Ms = lap['sector-1-time-in-ms'] || lap.sector1TimeInMs || 0;
            const sector2Ms = lap['sector-2-time-in-ms'] || lap.sector2TimeInMs || 0;
            const sector3Ms = lap['sector-3-time-in-ms'] || lap.sector3TimeInMs || 0;
            const sector1TimeMinutes = lap['sector-1-time-minutes'] || lap.sector1TimeMinutes || 0;
            const sector2TimeMinutes = lap['sector-2-time-minutes'] || lap.sector2TimeMinutes || 0;
            const sector3TimeMinutes = lap['sector-3-time-minutes'] || lap.sector3TimeMinutes || 0;
            const lapValidBitFlags = lap['lap-valid-bit-flags'] || lap.lapValidBitFlags || 0;
            
            // Only include valid laps (lap time > 0)
            if (lapNumber > 0 && lapTimeMs > 0) {
              // Find matching per-lap-info entry
              let perLapData: any = null;
              if (additionalDriverData.perLapInfo && Array.isArray(additionalDriverData.perLapInfo)) {
                perLapData = additionalDriverData.perLapInfo.find((pl: any) => 
                  (pl['lap-number'] || pl.lapNumber) === lapNumber
                );
              }
              
              // Extract tire compound
              let tireCompound: string | undefined = undefined;
              let tireAgeLaps: number | undefined = undefined;
              
              if (perLapData) {
                tireCompound = perLapData['tyre-compound'] || perLapData.tyreCompound || 
                              perLapData['tyre-visual-compound'] || perLapData.tyreVisualCompound ||
                              perLapData['car-status-data']?.['visual-tyre-compound'] ||
                              perLapData['car-status-data']?.['actual-tyre-compound'];
                tireAgeLaps = perLapData['car-status-data']?.['tyres-age-laps'] || 
                             perLapData['car-status-data']?.['tyresAgeLaps'];
              }
              
              // Fallback: determine from tyre stints
              if (!tireCompound && tyreStintsEndLaps.length > 0 && tyreStintsVisual.length > 0) {
                let stintIndex = 0;
                for (let j = 0; j < tyreStintsEndLaps.length; j++) {
                  if (lapNumber <= tyreStintsEndLaps[j]) {
                    stintIndex = j;
                    break;
                  }
                  stintIndex = j + 1;
                }
                if (stintIndex < tyreStintsVisual.length) {
                  const compound = tyreStintsVisual[stintIndex];
                  if (typeof compound === 'string') {
                    const compoundLower = compound.toLowerCase();
                    if (compoundLower.includes('soft')) tireCompound = 'S';
                    else if (compoundLower.includes('medium')) tireCompound = 'M';
                    else if (compoundLower.includes('hard')) tireCompound = 'H';
                    else if (compoundLower.includes('intermediate')) tireCompound = 'I';
                    else if (compoundLower.includes('wet')) tireCompound = 'W';
                    else tireCompound = compound;
                  } else {
                    tireCompound = compound;
                  }
                }
              }
              
              // Determine if this is a pit stop lap (tire age resets or compound changes)
              let pitStop = false;
              if (lapNumber > 1) {
                const prevLapData = lapTimesData.find(l => l.lapNumber === lapNumber - 1);
                if (prevLapData) {
                  // Pit stop if tire compound changes or tire age resets
                  if (prevLapData.tireCompound && tireCompound && prevLapData.tireCompound !== tireCompound) {
                    pitStop = true;
                  } else if (prevLapData.tireAgeLaps && tireAgeLaps && tireAgeLaps < prevLapData.tireAgeLaps) {
                    pitStop = true;
                  }
                }
              }
              
              // Gap data will be calculated from lap times when needed for analytics
              // (lap-data is UDP current state, not historical per-lap data)
              
              lapTimesData.push({
                lapNumber,
                lapTimeMs,
                sector1Ms: sector1Ms > 0 ? sector1Ms : undefined,
                sector2Ms: sector2Ms > 0 ? sector2Ms : undefined,
                sector3Ms: sector3Ms > 0 ? sector3Ms : undefined,
                sector1TimeMinutes: sector1TimeMinutes > 0 ? sector1TimeMinutes : undefined,
                sector2TimeMinutes: sector2TimeMinutes > 0 ? sector2TimeMinutes : undefined,
                sector3TimeMinutes: sector3TimeMinutes > 0 ? sector3TimeMinutes : undefined,
                lapValidBitFlags: lapValidBitFlags > 0 ? lapValidBitFlags : undefined,
                tireCompound,
                trackPosition: perLapData?.['track-position'] || perLapData?.trackPosition,
                tireAgeLaps,
                topSpeedKmph: perLapData?.['top-speed-kmph'] || perLapData?.topSpeedKmph,
                maxSafetyCarStatus: perLapData?.['max-safety-car-status'] || perLapData?.maxSafetyCarStatus,
                vehicleFiaFlags: perLapData?.['car-status-data']?.['vehicle-fia-flags'] || 
                                perLapData?.['car-status-data']?.['vehicleFiaFlags'],
                pitStop,
                ersStoreEnergy: perLapData?.['car-status-data']?.['ers-store-energy'] || 
                               perLapData?.['car-status-data']?.['ersStoreEnergy'],
                ersDeployedThisLap: perLapData?.['car-status-data']?.['ers-deployed-this-lap'] || 
                                   perLapData?.['car-status-data']?.['ersDeployedThisLap'],
                ersDeployMode: perLapData?.['car-status-data']?.['ers-deploy-mode'] || 
                              perLapData?.['car-status-data']?.['ersDeployMode'],
                fuelInTank: perLapData?.['car-status-data']?.['fuel-in-tank'] || 
                           perLapData?.['car-status-data']?.['fuelInTank'],
                fuelRemainingLaps: perLapData?.['car-status-data']?.['fuel-remaining-laps'] || 
                                  perLapData?.['car-status-data']?.['fuelRemainingLaps'],
                gapToLeaderMs: undefined, // Will be calculated from lap times when needed
                gapToPositionAheadMs: undefined, // Will be calculated from lap times when needed
                carDamageData: perLapData?.['car-damage-data'] || perLapData?.carDamageData || null,
                tyreSetsData: perLapData?.['tyre-sets-data'] || perLapData?.tyreSetsData || null
              });
            }
          }
        } else {
          console.log(`⚠️  No lap-history-data array found for driver ${jsonDriverName || i} (position ${position}). lapTimeHistory keys: ${Object.keys(lapTimeHistory || {}).join(', ')}`);
        }
        
        console.log(`📊 Extracted ${lapTimesData.length} valid lap times for driver ${jsonDriverName || i} (position ${position})`);
        
        driverResults.push({
          user_id: userId,
          json_driver_id: jsonDriverId ? Number(jsonDriverId) : null,
          json_driver_name: jsonDriverName || null,
          json_team_name: jsonTeamName || null,
          json_car_number: jsonCarNumber ? Number(jsonCarNumber) : null,
          position,
          grid_position: gridPosition,
          points,
          num_laps: numLaps,
          best_lap_time_ms: bestLapTimeMs,
          sector1_time_ms: sector1TimeMs,
          sector2_time_ms: sector2TimeMs,
          sector3_time_ms: sector3TimeMs,
          total_race_time_ms: Math.round(totalRaceTimeSeconds * 1000),
          penalties: penaltiesTime || 0, // Store penalty time in seconds (not count), matching manual edit structure
          post_race_penalties: 0, // Post-race penalties start at 0 (admin edits will modify this)
          warnings: 0,
          num_unserved_drive_through_pens: 0,
          num_unserved_stop_go_pens: 0,
          result_status: resultStatus,
          dnf_reason: dnfReason,
          fastest_lap: false, // Will be set after loop
          _best_lap_time_for_fastest: bestLapTimeForFastestCheck, // Store for fastest lap calculation
          pole_position: polePosition || isQualifyingPole,
          additional_data: Object.keys(additionalDriverData).length > 0 ? additionalDriverData : null,
          _lap_times_data: lapTimesData // Store lap data temporarily for later insertion
        });
        
        importedCount++;
      }
      
      if (driverResults.length === 0) {
        throw new Error('No driver results found in JSON file');
      }
      
      // Calculate fastest lap time once (optimization: calculate outside loop)
      const fastestLapTime = Math.min(...driverResults
        .map(r => r._best_lap_time_for_fastest || Infinity)
        .filter(t => t > 0 && t !== Infinity));
      
      // Set fastest_lap flag for all drivers
      driverResults.forEach(result => {
        result.fastest_lap = result._best_lap_time_for_fastest > 0 && 
                            result._best_lap_time_for_fastest === fastestLapTime;
        // Remove temporary field
        delete result._best_lap_time_for_fastest;
      });
      
      // Extract ALL available session-level data
      const sessionAdditionalData: any = {
        // Position history (position changes over time for all drivers)
        positionHistory: data['position-history'] || data.positionHistory || null,
        
        // Tyre stint history (tyre compound changes for all drivers)
        tyreStintHistory: data['tyre-stint-history'] || data.tyreStintHistory || null,
        
        // Speed trap records (speed trap data for all drivers)
        speedTrapRecords: data['speed-trap-records'] || data.speedTrapRecords || null,
        
        // Overtakes (overtaking data)
        overtakes: data.overtakes || null,
        
        // Records (lap records, fastest lap, etc.)
        records: data.records || null,
        
        // Custom markers (custom event markers)
        customMarkers: data['custom-markers'] || data.customMarkers || null,
        
        // Session metadata
        gameYear: data['game-year'] || data.gameYear || null,
        packetFormat: data['packet-format'] || data.packetFormat || null,
        version: data.version || null,
        
        // Full session-info if available (contains weather, track conditions, etc.)
        // Ensure track-length and total-laps are included
        sessionInfo: data['session-info'] || data.sessionInfo || null
      };
      
      // Ensure track length and total laps are in sessionInfo
      if (sessionAdditionalData.sessionInfo) {
        if (trackLengthMeters && !sessionAdditionalData.sessionInfo['track-length']) {
          sessionAdditionalData.sessionInfo['track-length'] = trackLengthMeters;
        }
        if (totalLaps && !sessionAdditionalData.sessionInfo['total-laps']) {
          sessionAdditionalData.sessionInfo['total-laps'] = totalLaps;
        }
      } else if (trackLengthMeters || totalLaps) {
        sessionAdditionalData.sessionInfo = {};
        if (trackLengthMeters) {
          sessionAdditionalData.sessionInfo['track-length'] = trackLengthMeters;
        }
        if (totalLaps) {
          sessionAdditionalData.sessionInfo['total-laps'] = totalLaps;
        }
      }
      
      // Remove null/undefined/empty values to keep JSON clean
      Object.keys(sessionAdditionalData).forEach(key => {
        const value = sessionAdditionalData[key];
        if (value === null || value === undefined || 
            (Array.isArray(value) && value.length === 0) ||
            (typeof value === 'object' && Object.keys(value).length === 0)) {
          delete sessionAdditionalData[key];
        }
      });
      
      // Create or update session result entry (handles existing sessions)
      const sessionResultId = await this.dbService.createSessionResult(
        targetRaceId,
        sessionType,
        sessionTypeName,
        sessionUID,
        Object.keys(sessionAdditionalData).length > 0 ? sessionAdditionalData : undefined
      );
      
      // Delete existing driver results for this session if re-importing
      await this.dbService.deleteDriverSessionResults(sessionResultId);
      await this.dbService.deleteOriginalSessionResults(sessionResultId);
      
      // Store original results snapshot (preserve raw data)
      await this.dbService.storeOriginalSessionResults(sessionResultId, driverResults);
      
      // Store driver session results and get mapping of index to driver_session_result_id
      const driverResultIdMap = await this.dbService.storeDriverSessionResults(sessionResultId, driverResults);
      
      // Store lap times for each driver
      for (let i = 0; i < driverResults.length; i++) {
        const driverResult = driverResults[i];
        const driverSessionResultId = driverResultIdMap.get(i);
        
        if (driverSessionResultId && driverResult._lap_times_data && driverResult._lap_times_data.length > 0) {
          await this.dbService.storeLapTimes(
            driverSessionResultId,
            targetRaceId,
            driverResult._lap_times_data
          );
          console.log(`✅ Stored ${driverResult._lap_times_data.length} lap times for driver ${driverResult.json_driver_name || i}`);
        }
        
        // Clean up temporary field
        delete driverResult._lap_times_data;
      }
      
      // Mark event as completed if this was a race session
      if (sessionType === 10) {
        await this.dbService.updateEventInSeason(targetRaceId, {
          status: 'completed',
          primarySessionResultId: sessionResultId,
          race_date: sessionDate
        });
      } else if (sessionType && sessionType > 0) {
        await this.dbService.updateEventInSeason(targetRaceId, {
          primarySessionResultId: sessionResultId
        });
      }
      
      console.log(`✅ Imported ${importedCount} driver results for session ${sessionTypeName} (${sessionType})`);
      
      return {
        raceId: targetRaceId,
        sessionResultId,
        importedCount
      };
      
    } catch (error) {
      console.error('Error importing race JSON:', error);
      throw error;
    }
  }
  
  /**
   * Check if lap time is the fastest in the session
   */
  private isFastestLap(classificationData: any[], lapTimeMs: number): boolean {
    if (lapTimeMs === 0) return false;
    
    const validLapTimes = classificationData
      .map(r => {
        // Check final-classification first
        const fc = r['final-classification'] || r.finalClassification || {};
        let bestTime = fc['best-lap-time-ms'] || fc.bestLapTimeMs || 0;
        
        // If not found, check lap-time-history
        if (!bestTime) {
          const lth = r['lap-time-history'] || r.lapTimeHistory || {};
          if (lth['lap-history-data'] && Array.isArray(lth['lap-history-data'])) {
            const lapTimes = lth['lap-history-data']
              .map((lap: any) => lap['lap-time-in-ms'] || lap.lapTimeInMs || 0)
              .filter((time: number) => time > 0);
            if (lapTimes.length > 0) {
              bestTime = Math.min(...lapTimes);
            }
          }
        }
        
        // Fallback to old formats
        if (!bestTime) {
          bestTime = r['best-lap-time-in-ms'] || r.bestLapTimeInMS || r.bestLapTimeMs || 0;
        }
        
        return bestTime;
      })
      .filter(time => time > 0);
    
    if (validLapTimes.length === 0) return false;
    
    const fastestTime = Math.min(...validLapTimes);
    return lapTimeMs === fastestTime;
  }
  
}

