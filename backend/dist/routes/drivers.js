"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = createDriversRoutes;
const express_1 = __importDefault(require("express"));
function createDriversRoutes(dbService) {
    const router = express_1.default.Router();
    // Get all drivers
    router.get('/', async (req, res) => {
        try {
            const drivers = await dbService.getAllDrivers();
            res.json({ success: true, drivers });
        }
        catch (error) {
            console.error('Error getting drivers:', error);
            res.status(500).json({ error: 'Failed to retrieve drivers' });
        }
    });
    // Create a new driver
    router.post('/', async (req, res) => {
        try {
            const { firstName, lastName, name, team, number, seasonId, steam_id, isActive } = req.body;
            const trimmedFirst = typeof firstName === 'string' ? firstName.trim() : '';
            const trimmedLast = typeof lastName === 'string' ? lastName.trim() : '';
            const providedName = typeof name === 'string' ? name.trim() : '';
            const fullName = providedName || [trimmedFirst, trimmedLast].filter((part) => part.length > 0).join(' ').trim();
            if (!fullName) {
                return res.status(400).json({ error: 'Member name is required' });
            }
            const driverId = await dbService.createDriver({
                name: fullName,
                team,
                number,
                seasonId,
                steam_id,
                isActive
            });
            const newDriver = await dbService.getDriverById(driverId);
            res.status(201).json({ success: true, driver: newDriver });
        }
        catch (error) {
            console.error('Error creating member:', error);
            res.status(500).json({ error: 'Failed to create member' });
        }
    });
    // Get a specific driver
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const driver = await dbService.getDriverById(id);
            if (!driver) {
                return res.status(404).json({ error: 'Member not found' });
            }
            res.json({ success: true, driver });
        }
        catch (error) {
            console.error('Error getting driver:', error);
            res.status(500).json({ error: 'Failed to retrieve driver' });
        }
    });
    // Update a driver
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { firstName, lastName, name, team, number, seasonId, steam_id, isActive } = req.body;
            const driver = await dbService.getDriverById(id);
            if (!driver) {
                return res.status(404).json({ error: 'Driver not found' });
            }
            const trimmedFirst = typeof firstName === 'string' ? firstName.trim() : undefined;
            const trimmedLast = typeof lastName === 'string' ? lastName.trim() : undefined;
            const providedName = typeof name === 'string' ? name.trim() : '';
            const combinedName = providedName || [trimmedFirst, trimmedLast].filter((part) => !!part && part.length > 0).join(' ').trim();
            await dbService.updateDriver(id, {
                name: combinedName || undefined,
                team,
                number,
                seasonId,
                steam_id,
                isActive
            });
            const updatedDriver = await dbService.getDriverById(id);
            res.json({ success: true, driver: updatedDriver });
        }
        catch (error) {
            console.error('Error updating member:', error);
            res.status(500).json({ error: 'Failed to update member' });
        }
    });
    // Delete a driver
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const driver = await dbService.getDriverById(id);
            if (!driver) {
                return res.status(404).json({ error: 'Member not found' });
            }
            await dbService.deleteDriver(id);
            res.json({ success: true, message: 'Driver deleted successfully' });
        }
        catch (error) {
            console.error('Error deleting driver:', error);
            res.status(500).json({ error: 'Failed to delete driver' });
        }
    });
    // Get driver career profile
    router.get('/:id/career-profile', async (req, res) => {
        try {
            const { id } = req.params;
            const careerProfile = await dbService.getDriverCareerProfile(id);
            if (!careerProfile) {
                return res.status(404).json({ error: 'Driver not found' });
            }
            res.json({ success: true, careerProfile });
        }
        catch (error) {
            console.error('Error getting driver career profile:', error);
            res.status(500).json({ error: 'Failed to retrieve driver career profile' });
        }
    });
    // Get driver statistics for specific season
    router.get('/:id/seasons/:seasonId/stats', async (req, res) => {
        try {
            const { id, seasonId } = req.params;
            const seasonStats = await dbService.getDriverSeasonStats(id, seasonId);
            res.json({ success: true, stats: seasonStats });
        }
        catch (error) {
            console.error('Error getting driver season stats:', error);
            res.status(500).json({ error: 'Failed to retrieve driver season stats' });
        }
    });
    // Get driver race history with optional season filtering
    router.get('/:id/race-history', async (req, res) => {
        try {
            const { id } = req.params;
            const { seasonId } = req.query;
            const raceHistory = await dbService.getDriverRaceHistory(id, seasonId);
            res.json({ success: true, raceHistory });
        }
        catch (error) {
            console.error('Error getting driver race history:', error);
            res.status(500).json({ error: 'Failed to retrieve driver race history' });
        }
    });
    return router;
}
//# sourceMappingURL=drivers.js.map