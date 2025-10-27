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
            if (!name || !year || !startDate || !endDate) {
                return res.status(400).json({ error: 'Missing required fields' });
            }
            await dbService.ensureInitialized();
            const season = await dbService.createSeason({
                name,
                year: parseInt(year),
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                status: 'upcoming', // Add missing status property
                pointsSystem: pointsSystem || 'f1_standard',
                fastestLapPoint: fastestLapPoint !== undefined ? fastestLapPoint : true,
                isActive: false
            });
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
            if (!name || !year || !startDate || !endDate) {
                return res.status(400).json({ error: 'Missing required fields' });
            }
            await dbService.ensureInitialized();
            const season = await dbService.updateSeason(id, {
                name,
                year: parseInt(year),
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                status: 'upcoming',
                pointsSystem: pointsSystem || 'f1_standard',
                fastestLapPoint: fastestLapPoint !== undefined ? fastestLapPoint : true,
                isActive: isActive !== undefined ? isActive : false
            });
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
    // Get drivers for a season
    router.get('/:id/drivers', async (req, res) => {
        try {
            const { id } = req.params;
            await dbService.ensureInitialized();
            const drivers = await dbService.getDriversBySeason(id);
            res.json({
                success: true,
                drivers
            });
        }
        catch (error) {
            console.error('Get season drivers error:', error);
            res.status(500).json({
                error: 'Failed to get season drivers',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
    // Add driver to season
    router.post('/:id/drivers', async (req, res) => {
        try {
            const { id } = req.params;
            const { name, team, number } = req.body;
            if (!name) {
                return res.status(400).json({ error: 'Driver name is required' });
            }
            await dbService.ensureInitialized();
            const driver = await dbService.createDriverAndAddToSeason(id, {
                name,
                team: team || 'No Team',
                number: number ? parseInt(number) : 0
            });
            res.json({
                success: true,
                driver
            });
        }
        catch (error) {
            console.error('Add driver to season error:', error);
            res.status(500).json({
                error: 'Failed to add driver to season',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
    // Remove driver from season
    router.delete('/:id/drivers/:driverId', async (req, res) => {
        try {
            const { id, driverId } = req.params;
            await dbService.ensureInitialized();
            await dbService.removeDriverFromSeason(id, driverId);
            res.json({
                success: true,
                message: 'Driver removed from season successfully'
            });
        }
        catch (error) {
            console.error('Remove driver from season error:', error);
            res.status(500).json({
                error: 'Failed to remove driver from season',
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
                length: length ? parseFloat(length) : 0,
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
            const { trackId, date, time, type } = req.body;
            if (!trackId || !date || !time) {
                return res.status(400).json({ error: 'Track, date, and time are required' });
            }
            await dbService.ensureInitialized();
            const raceId = await dbService.createRaceAndAddToSeason(id, {
                trackId,
                date: new Date(date),
                time,
                type: type || 'race',
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
    return router;
}
//# sourceMappingURL=seasons.js.map