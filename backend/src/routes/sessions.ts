import express from 'express';
import { DatabaseService } from '../services/DatabaseService';

export default function createSessionsRoutes(dbService: DatabaseService) {
  const router = express.Router();

  // Upload session data from local host app
  router.post('/upload', async (req, res) => {
    try {
      const { sessionData, seasonId } = req.body;
      
      if (!sessionData || !seasonId) {
        return res.status(400).json({ error: 'Session data and season ID are required' });
      }

      await dbService.ensureInitialized();
      
      // Find or create track
      const track = await dbService.findOrCreateTrack(sessionData.trackName);
      
      // Create race
      const raceId = await dbService.createRace({
        seasonId,
        trackId: track.id,
        raceDate: new Date(sessionData.date).toISOString(),
        status: 'completed'
      });

      // Get driver mappings for this season
      const driverMappings = await dbService.getDriverMappings(seasonId);
      
      // Map F1 23 drivers to your league drivers
      const mappedResults = sessionData.results.map((result: any) => {
        const mapping = driverMappings.find((m: any) => 
          m.f123DriverName === result.driverName && 
          m.f123DriverNumber === result.driverNumber
        );
        
        return {
          ...result,
          yourDriverId: mapping?.memberId || null
        };
      });

      // Import race results
      const importResult = await dbService.importRaceResults(raceId, {
        ...sessionData,
        results: mappedResults
      });
      
      res.json({
        success: true,
        message: 'Session data uploaded successfully',
        raceId,
        importedResults: importResult.resultsCount,
        importedLapTimes: importResult.lapTimesCount
      });
    } catch (error) {
      console.error('Session upload error:', error);
      res.status(500).json({ 
        error: 'Failed to upload session data',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}