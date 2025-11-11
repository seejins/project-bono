import express from 'express';
import { DatabaseService } from '../services/DatabaseService';
import type { AppRepositories } from '../services/database/repositories';
import type { SeasonData, SeasonStatus } from '../services/database/types';

const normalizeSeasonStatus = (value: any): SeasonStatus | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const lowered = value.toLowerCase();
  if (lowered === 'active' || lowered === 'draft' || lowered === 'completed') {
    return lowered as SeasonStatus;
  }

  return undefined;
};

export default function createSeasonsRoutes(
  _dbService: DatabaseService,
  repositories: AppRepositories,
) {
  const router = express.Router();
  const { seasons, drivers, tracks, races } = repositories;

  // Get all seasons
  router.get('/', async (req, res) => {
    try {
      await seasons.ensureInitialized();
      const seasonList = await seasons.getAllSeasons();
      
      res.json({
        success: true,
        seasons: seasonList
      });
    } catch (error) {
      console.error('Get seasons error:', error);
      res.status(500).json({ 
        error: 'Failed to get seasons',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  router.post('/:id/activate', async (req, res) => {
    try {
      const { id } = req.params;
      await seasons.ensureInitialized();

      const season = await seasons.getSeasonById(id);
      if (!season) {
        return res.status(404).json({ error: 'Season not found' });
      }

      await seasons.setCurrentSeason(id);
      const updatedSeason = await seasons.getSeasonById(id);

      res.json({
        success: true,
        season: updatedSeason,
      });
    } catch (error) {
      console.error('Activate season error:', error);
      res.status(500).json({
        error: 'Failed to activate season',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Get historic insights (league-wide statistics)
  router.get('/history/insights', async (req, res) => {
    try {
      await seasons.ensureInitialized();
      const insights = await seasons.getHistoricInsights();
      
      res.json({
        success: true,
        insights
      });
    } catch (error) {
      console.error('Get historic insights error:', error);
      res.status(500).json({ 
        error: 'Failed to get historic insights',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get seasons for history (completed and active)
  router.get('/history', async (req, res) => {
    try {
      await seasons.ensureInitialized();
      const seasonHistory = await seasons.getSeasonsForHistory();
      
      res.json({
        success: true,
        seasons: seasonHistory
      });
    } catch (error) {
      console.error('Get seasons history error:', error);
      res.status(500).json({ 
        error: 'Failed to get seasons history',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get previous race results for a season
  router.get('/:id/previous-race', async (req, res) => {
    try {
      const { id } = req.params;
      await seasons.ensureInitialized();
      const previousRace = await seasons.getPreviousRaceResults(id);
      
      res.json({
        success: true,
        previousRace
      });
    } catch (error) {
      console.error('Get previous race error:', error);
      res.status(500).json({ 
        error: 'Failed to get previous race results',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get season by ID
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await seasons.ensureInitialized();
      const season = await seasons.getSeasonById(id);
      
      if (!season) {
        return res.status(404).json({ 
          error: 'Season not found' 
        });
      }
      
      res.json({
        success: true,
        season
      });
    } catch (error) {
      console.error('Get season error:', error);
      res.status(500).json({ 
        error: 'Failed to get season',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  router.get('/:id/standings', async (req, res) => {
    try {
      const { id } = req.params;
      await seasons.ensureInitialized();

      const standings = await drivers.getSeasonStandings(id);
      res.json({ success: true, standings });
    } catch (error) {
      console.error('Season standings error:', error);
      res.status(500).json({
        error: 'Failed to load season standings',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Create a new season
  router.post('/', async (req, res) => {
    try {
      const { name, year, startDate, endDate, status, isActive, setAsCurrent } = req.body;
      
      if (!name || !year) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      await seasons.ensureInitialized();

      const normalizedStatus = normalizeSeasonStatus(status);
      const shouldActivate =
        normalizedStatus === 'active' ||
        isActive === 1 ||
        isActive === true ||
        setAsCurrent === true;

      const seasonId = await seasons.createSeason({
        name,
        year: parseInt(year),
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        status:
          shouldActivate
            ? 'active'
            : normalizedStatus && normalizedStatus !== 'active'
              ? normalizedStatus
              : 'draft',
      });

      if (shouldActivate) {
        await seasons.setCurrentSeason(seasonId);
      }
      
      const season = await seasons.getSeasonById(seasonId);
      
      if (!season) {
        return res.status(500).json({ error: 'Failed to retrieve created season' });
      }
      
      res.status(201).json({
        success: true,
        season
      });
    } catch (error) {
      console.error('Create season error:', error);
      res.status(500).json({ 
        error: 'Failed to create season',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Update a season
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, year, startDate, endDate, status, isActive } = req.body;
      
      if (name !== undefined && !name) {
        return res.status(400).json({ error: 'Name cannot be empty' });
      }
      if (year !== undefined && (!year || isNaN(parseInt(year)))) {
        return res.status(400).json({ error: 'Year must be a valid number' });
      }

      await seasons.ensureInitialized();

      const normalizedStatus = normalizeSeasonStatus(status);
      const shouldActivate =
        normalizedStatus === 'active' || isActive === 1 || isActive === true;
      const shouldDeactivate = isActive === 0 || normalizedStatus === 'draft';

      const updatePayload: Partial<SeasonData> = {
        name,
        year: year !== undefined ? parseInt(year) : undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
      };

      if (shouldActivate) {
        await seasons.setCurrentSeason(id);
      }

      if (normalizedStatus && normalizedStatus !== 'active') {
        updatePayload.status = normalizedStatus;
      } else if (shouldDeactivate) {
        updatePayload.status = 'draft';
      }

      const hasUpdates = Object.values(updatePayload).some((value) => value !== undefined);
      if (hasUpdates) {
        await seasons.updateSeason(id, updatePayload);
      }
      
      const season = await seasons.getSeasonById(id);
      if (!season) {
        return res.status(404).json({ 
          error: 'Season not found' 
        });
      }
      
      res.json({
        success: true,
        season
      });
    } catch (error) {
      console.error('Update season error:', error);
      res.status(500).json({ 
        error: 'Failed to update season',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Delete a season
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await seasons.ensureInitialized();
      await seasons.deleteSeason(id);
      
      res.json({
        success: true,
        message: 'Season deleted successfully'
      });
    } catch (error) {
      console.error('Delete season error:', error);
      res.status(500).json({ 
        error: 'Failed to delete season',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get participants for a season
  router.get('/:id/participants', async (req, res) => {
    try {
      const { id } = req.params;
      await seasons.ensureInitialized();
      
      // Get participants and driver mappings
      const participants = await drivers.getDriversBySeason(id);
      const driverMappings = await drivers.getDriverMappings(id);
      
      // Merge team information from driver mappings
      const participantsWithTeams = participants.map(participant => {
        const mapping = driverMappings.find(m => m.yourDriverId === participant.id);
        return {
          ...participant,
          team: mapping?.f123TeamName || participant.team || 'TBD',
          number: mapping?.f123DriverNumber || participant.number || 0
        };
      });
      
      res.json({
        success: true,
        participants: participantsWithTeams
      });
    } catch (error) {
      console.error('Get season participants error:', error);
      res.status(500).json({ 
        error: 'Failed to get season participants',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Add member to season
  router.post('/:id/participants', async (req, res) => {
    try {
      const { id } = req.params;
      const { driverId, team, number } = req.body;
      
      if (!driverId) {
        return res.status(400).json({ error: 'Member ID is required' });
      }

      await seasons.ensureInitialized();
      await drivers.addDriverToSeason(id, driverId);

      if (team !== undefined || number !== undefined) {
        await drivers.updateSeasonParticipant(driverId, {
          team: typeof team === 'string' ? team.trim() || undefined : team,
          number: number !== undefined && number !== null ? Number(number) : undefined
        });
      }

      const participant = await drivers.getDriverById(driverId);

      res.json({
        success: true,
        message: 'Member added to season successfully',
        participant
      });
    } catch (error) {
      console.error('Add member to season error:', error);
      res.status(500).json({ 
        error: 'Failed to add member to season',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Remove driver from season
  router.delete('/:id/participants/:driverId', async (req, res) => {
    try {
      const { id, driverId } = req.params;
      await seasons.ensureInitialized();
      await drivers.removeDriverFromSeason(id, driverId);
      
      res.json({
        success: true,
        message: 'Driver removed from season successfully'
      });
    } catch (error) {
      console.error('Remove driver from season error:', error);
      res.status(500).json({ 
        error: 'Failed to remove driver from season',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Update participant in season
  router.put('/:id/participants/:driverId', async (req, res) => {
    try {
      const { id, driverId } = req.params;
      const { team, number } = req.body;
      
      await seasons.ensureInitialized();

      if (team === undefined && number === undefined) {
        return res.status(400).json({ error: 'No updates provided for season participant' });
      }

      await drivers.updateSeasonParticipant(driverId, {
        team: typeof team === 'string' ? team.trim() : team,
        number: number !== undefined && number !== null ? Number(number) : undefined
      });

      const participant = await drivers.getDriverById(driverId);

      res.json({
        success: true,
        message: 'Participant updated successfully',
        participant
      });
    } catch (error) {
      console.error('Update participant error:', error);
      res.status(500).json({ 
        error: 'Failed to update participant',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get tracks for a season
  router.get('/:id/tracks', async (req, res) => {
    try {
      const { id } = req.params;
      await seasons.ensureInitialized();
      const seasonTracks = await tracks.getTracksBySeason(id);
      
      res.json({
        success: true,
        tracks: seasonTracks
      });
    } catch (error) {
      console.error('Get season tracks error:', error);
      res.status(500).json({ 
        error: 'Failed to get season tracks',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Add track to season
  router.post('/:id/tracks', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, country, length, laps } = req.body;
      
      if (!name || !country) {
        return res.status(400).json({ error: 'Track name and country are required' });
      }

      await seasons.ensureInitialized();
      const trackId = await tracks.createTrackAndAddToSeason({
        name,
        country,
        circuitLength: length ? parseFloat(length) : 0,
        laps: laps ? parseInt(laps) : 0
      }, id);
      
      res.json({
        success: true,
        trackId
      });
    } catch (error) {
      console.error('Add track to season error:', error);
      res.status(500).json({ 
        error: 'Failed to add track to season',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Remove track from season
  router.delete('/:id/tracks/:trackId', async (req, res) => {
    try {
      const { id, trackId } = req.params;
      await seasons.ensureInitialized();
      await tracks.removeTrackFromSeason(id, trackId);
      
      res.json({
        success: true,
        message: 'Track removed from season successfully'
      });
    } catch (error) {
      console.error('Remove track from season error:', error);
      res.status(500).json({ 
        error: 'Failed to remove track from season',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get races for a season
  router.get('/:id/races', async (req, res) => {
    try {
      const { id } = req.params;
      await seasons.ensureInitialized();
      const seasonRaces = await races.getRacesBySeason(id);
      
      res.json({
        success: true,
        races: seasonRaces
      });
    } catch (error) {
      console.error('Get season races error:', error);
      res.status(500).json({ 
        error: 'Failed to get season races',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Add race to season
  router.post('/:id/races', async (req, res) => {
    try {
      const { id } = req.params;
      const { trackId, date, time, sessionTypes } = req.body;
      
      if (!trackId) {
        return res.status(400).json({ error: 'Track is required' });
      }

      await seasons.ensureInitialized();
      const raceId = await races.addRaceToSeason({
        seasonId: id,
        trackId,
        raceDate: date ? new Date(date).toISOString() : new Date().toISOString(),
        status: 'scheduled'
      });
      
      res.json({
        success: true,
        raceId
      });
    } catch (error) {
      console.error('Add race to season error:', error);
      res.status(500).json({ 
        error: 'Failed to add race to season',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Remove race from season
  router.delete('/:id/races/:raceId', async (req, res) => {
    try {
      const { id, raceId } = req.params;
      await seasons.ensureInitialized();
      await races.removeRaceFromSeason(raceId);
      
      res.json({
        success: true,
        message: 'Race removed from season successfully'
      });
    } catch (error) {
      console.error('Remove race from season error:', error);
      res.status(500).json({ 
        error: 'Failed to remove race from season',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get events for a season
  router.get('/:id/events', async (req, res) => {
    try {
      const { id } = req.params;
      await seasons.ensureInitialized();
      
      const events = await races.getEventsBySeason(id);
      
      res.json({
        success: true,
        events: events
      });
    } catch (error) {
      console.error('Get season events error:', error);
      res.status(500).json({ 
        error: 'Failed to get season events',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Add event to season
  router.post('/:id/events', async (req, res) => {
    try {
      const { id } = req.params;
      const { track_name, date, session_type, session_types, session_duration, weather_air_temp, weather_track_temp, weather_rain_percentage } = req.body;
      
      if (!track_name) {
        return res.status(400).json({ error: 'Track name is required' });
      }

      await seasons.ensureInitialized();
      const eventId = await races.addEventToSeason(id, {
        track_name,
        date: date || new Date().toISOString(), // Default to current date if not provided
        session_type: session_type || 10, // Default to Race
        session_types: session_types || null, // Store the comma-separated session types
        session_duration: session_duration || 0,
        weather_air_temp: weather_air_temp || 0,
        weather_track_temp: weather_track_temp || 0,
        weather_rain_percentage: weather_rain_percentage || 0
      });
      
      res.json({
        success: true,
        eventId: eventId,
        message: 'Event added to season successfully'
      });
    } catch (error) {
      console.error('Add event to season error:', error);
      res.status(500).json({ 
        error: 'Failed to add event to season',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Update event in season
  router.put('/:id/events/:eventId', async (req, res) => {
    try {
      const { id, eventId } = req.params;
      const updateData = req.body;
      
      await seasons.ensureInitialized();
      await races.updateEventInSeason(eventId, updateData);
      
      res.json({
        success: true,
        message: 'Event updated successfully'
      });
    } catch (error) {
      console.error('Update event error:', error);
      res.status(500).json({ 
        error: 'Failed to update event',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Delete event from season
  router.delete('/:id/events/:eventId', async (req, res) => {
    try {
      const { id, eventId } = req.params;
      await seasons.ensureInitialized();
      await races.removeEventFromSeason(eventId);
      
      res.json({
        success: true,
        message: 'Event removed from season successfully'
      });
    } catch (error) {
      console.error('Remove event from season error:', error);
      res.status(500).json({ 
        error: 'Failed to remove event from season',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get active season
  router.get('/active', async (req, res) => {
    try {
      await seasons.ensureInitialized();
      const activeSeason = await seasons.getActiveSeason();
      
      if (!activeSeason) {
        return res.status(404).json({ 
          error: 'No active season found' 
        });
      }
      
      res.json({
        success: true,
        season: activeSeason
      });
    } catch (error) {
      console.error('Get active season error:', error);
      res.status(500).json({ 
        error: 'Failed to get active season',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}