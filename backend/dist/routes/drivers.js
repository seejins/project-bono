"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = createDriversRoutes;
const express_1 = __importDefault(require("express"));
function createDriversRoutes(dbService) {
    const router = express_1.default.Router();
    // Get all drivers for a season
    router.get('/', async (req, res) => {
        try {
            const { seasonId } = req.query;
            if (!seasonId) {
                return res.status(400).json({ error: 'Season ID is required' });
            }
            await dbService.ensureInitialized();
            const drivers = await dbService.getDriversBySeason(seasonId);
            res.json({
                success: true,
                drivers
            });
        }
        catch (error) {
            console.error('Get drivers error:', error);
            res.status(500).json({
                error: 'Failed to get drivers',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
    // Create a new driver
    router.post('/', async (req, res) => {
        try {
            const { seasonId, name, team, number } = req.body;
            if (!seasonId || !name) {
                return res.status(400).json({ error: 'Season ID and name are required' });
            }
            await dbService.ensureInitialized();
            const driverId = await dbService.createDriver({
                seasonId,
                name,
                team,
                number
            });
            res.json({
                success: true,
                driverId
            });
        }
        catch (error) {
            console.error('Create driver error:', error);
            res.status(500).json({
                error: 'Failed to create driver',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
    // Update a driver
    router.put('/:driverId', async (req, res) => {
        try {
            const { driverId } = req.params;
            const { name, team, number } = req.body;
            await dbService.ensureInitialized();
            await dbService.updateDriver(driverId, {
                name,
                team,
                number
            });
            res.json({
                success: true,
                message: 'Driver updated successfully'
            });
        }
        catch (error) {
            console.error('Update driver error:', error);
            res.status(500).json({
                error: 'Failed to update driver',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
    // Delete a driver
    router.delete('/:driverId', async (req, res) => {
        try {
            const { driverId } = req.params;
            await dbService.ensureInitialized();
            await dbService.deleteDriver(driverId);
            res.json({
                success: true,
                message: 'Driver deleted successfully'
            });
        }
        catch (error) {
            console.error('Delete driver error:', error);
            res.status(500).json({
                error: 'Failed to delete driver',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
    return router;
}
//# sourceMappingURL=drivers.js.map