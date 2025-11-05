"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = createSeasonsRoutes;
const express_1 = __importDefault(require("express"));
function createSeasonsRoutes(dbService) {
    const router = express_1.default.Router();
    // Get all seasons
    router.get('/', async (req, res) => {
        try {
            await dbService.ensureInitialized();
            const seasons = await dbService.getAllSeasons();
            res.json({
                success: true,
                seasons
            });
        }
        catch (error) {
            console.error('Get seasons error:', error);
            res.status(500).json({
                error: 'Failed to get seasons',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
    // Get historic insights (league-wide statistics)
    router.get('/history/insights', async (req, res) => {
        try {
            await dbService.ensureInitialized();
            const insights = await dbService.getHistoricInsights();
            res.json({
                success: true,
                insights
            });
        }
        catch (error) {
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
            await dbService.ensureInitialized();
            const seasons = await dbService.getSeasonsForHistory();
            res.json({
                success: true,
                seasons
            });
        }
        catch (error) {
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
            await dbService.ensureInitialized();
            const previousRace = await dbService.getPreviousRaceResults(id);
            res.json({
                success: true,
                previousRace
            });
        }
        catch (error) {
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
            await dbService.ensureInitialized();
            const season = await dbService.getSeasonById(id);
            if (!season) {
                return res.status(404).json({
                    error: 'Season not found'
                });
            }
            res.json({
                success: true,
                season
            });
        }
        catch (error) {
            console.error('Get season error:', error);
            res.status(500).json({
                error: 'Failed to get season',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
    // Create a new season
    router.post('/', async (req, res) => {
        try {
            const { name, year, startDate, endDate, pointsSystem, fastestLapPoint } = req.body;
            if (!name || !year) {
                return res.status(400).json({ error: 'Missing required fields' });
            }
            await dbService.ensureInitialized();
            const seasonId = await dbService.createSeason({
                name,
                year: parseInt(year),
                startDate: startDate ? new Date(startDate).toISOString() : undefined,
                endDate: endDate ? new Date(endDate).toISOString() : undefined,
                isActive: false
            });
            console.log('Created season ID:', seasonId);
            // Get the full season object
            const season = await dbService.getSeasonById(seasonId);
            console.log('Retrieved season:', season);
            if (!season) {
                console.error('Failed to retrieve season after creation');
                return res.status(500).json({ error: 'Failed to retrieve created season' });
            }
            res.json({
                success: true,
                season
            });
        }
        catch (error) {
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
            const { name, year, startDate, endDate, pointsSystem, fastestLapPoint, isActive } = req.body;
            // Only require name and year if they're being updated
            if (name !== undefined && !name) {
                return res.status(400).json({ error: 'Name cannot be empty' });
            }
            if (year !== undefined && (!year || isNaN(parseInt(year)))) {
                return res.status(400).json({ error: 'Year must be a valid number' });
            }
            await dbService.ensureInitialized();
            // If this season is being activated, deactivate all other seasons
            if (isActive === 1) {
                await dbService.deactivateAllOtherSeasons(id);
            }
            await dbService.updateSeason(id, {
                name,
                year: year !== undefined ? parseInt(year) : undefined,
                startDate: startDate ? new Date(startDate).toISOString() : undefined,
                endDate: endDate ? new Date(endDate).toISOString() : undefined,
                isActive: isActive !== undefined ? isActive : undefined
            });
            const season = await dbService.getSeasonById(id);
            if (!season) {
                return res.status(404).json({
                    error: 'Season not found'
                });
            }
            res.json({
                success: true,
                season
            });
        }
        catch (error) {
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
            await dbService.ensureInitialized();
            await dbService.deleteSeason(id);
            res.json({
                success: true,
                message: 'Season deleted successfully'
            });
        }
        catch (error) {
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
            await dbService.ensureInitialized();
            // Get participants and driver mappings
            const participants = await dbService.getDriversBySeason(id);
            const driverMappings = await dbService.getDriverMappings(id);
            // Merge team information from driver mappings
            const participantsWithTeams = participants.map(participant => {
                const mapping = driverMappings.find(m => m.memberId === participant.id);
                return {
                    ...participant,
                    team: mapping?.f123TeamName || 'TBD',
                    number: mapping?.f123DriverNumber || 0
                };
            });
            res.json({
                success: true,
                participants: participantsWithTeams
            });
        }
        catch (error) {
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
            const { memberId } = req.body;
            if (!memberId) {
                return res.status(400).json({ error: 'Member ID is required' });
            }
            await dbService.ensureInitialized();
            await dbService.addDriverToSeason(id, memberId);
            res.json({
                success: true,
                message: 'Member added to season successfully'
            });
        }
        catch (error) {
            console.error('Add member to season error:', error);
            res.status(500).json({
                error: 'Failed to add member to season',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
    // Remove member from season
    router.delete('/:id/participants/:memberId', async (req, res) => {
        try {
            const { id, memberId } = req.params;
            await dbService.ensureInitialized();
            await dbService.removeDriverFromSeason(id, memberId);
            res.json({
                success: true,
                message: 'Member removed from season successfully'
            });
        }
        catch (error) {
            console.error('Remove member from season error:', error);
            res.status(500).json({
                error: 'Failed to remove member from season',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
    // Update participant in season
    router.put('/:id/participants/:memberId', async (req, res) => {
        try {
            const { id, memberId } = req.params;
            const { team, number } = req.body;
            await dbService.ensureInitialized();
            // For now, we'll just return success since we don't have a specific update method
            // In a real implementation, you'd update the participant's team/number in the database
            res.json({
                success: true,
                message: 'Participant updated successfully'
            });
        }
        catch (error) {
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
            await dbService.ensureInitialized();
            const tracks = await dbService.getTracksBySeason(id);
            res.json({
                success: true,
                tracks
            });
        }
        catch (error) {
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
            await dbService.ensureInitialized();
            const track = await dbService.createTrackAndAddToSeason(id, {
                name,
                country,
                circuitLength: length ? parseFloat(length) : 0,
                laps: laps ? parseInt(laps) : 0
            });
            res.json({
                success: true,
                track
            });
        }
        catch (error) {
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
            await dbService.ensureInitialized();
            await dbService.removeTrackFromSeason(id, trackId);
            res.json({
                success: true,
                message: 'Track removed from season successfully'
            });
        }
        catch (error) {
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
            await dbService.ensureInitialized();
            const races = await dbService.getRacesBySeason(id);
            res.json({
                success: true,
                races
            });
        }
        catch (error) {
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
            await dbService.ensureInitialized();
            const raceId = await dbService.addRaceToSeason(id, {
                seasonId: id,
                trackId,
                raceDate: date ? new Date(date).toISOString() : new Date().toISOString(),
                status: 'scheduled'
            });
            res.json({
                success: true,
                raceId
            });
        }
        catch (error) {
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
            await dbService.ensureInitialized();
            await dbService.removeRaceFromSeason(id, raceId);
            res.json({
                success: true,
                message: 'Race removed from season successfully'
            });
        }
        catch (error) {
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
            await dbService.ensureInitialized();
            const events = await dbService.getEventsBySeason(id);
            res.json({
                success: true,
                events: events
            });
        }
        catch (error) {
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
            await dbService.ensureInitialized();
            const eventId = await dbService.addEventToSeason(id, {
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
        }
        catch (error) {
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
            await dbService.ensureInitialized();
            await dbService.updateEventInSeason(eventId, updateData);
            res.json({
                success: true,
                message: 'Event updated successfully'
            });
        }
        catch (error) {
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
            await dbService.ensureInitialized();
            await dbService.removeEventFromSeason(eventId);
            res.json({
                success: true,
                message: 'Event removed from season successfully'
            });
        }
        catch (error) {
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
            await dbService.ensureInitialized();
            const activeSeason = await dbService.getActiveSeason();
            if (!activeSeason) {
                return res.status(404).json({
                    error: 'No active season found'
                });
            }
            res.json({
                success: true,
                season: activeSeason
            });
        }
        catch (error) {
            console.error('Get active season error:', error);
            res.status(500).json({
                error: 'Failed to get active season',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
    return router;
}
//# sourceMappingURL=seasons.js.map