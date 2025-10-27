"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const DatabaseService_1 = require("../services/DatabaseService");
const router = express_1.default.Router();
// Get all drivers for a season
router.get('/season/:seasonId', async (req, res) => {
    try {
        const { seasonId } = req.params;
        const dbService = new DatabaseService_1.DatabaseService();
        // TODO: Implement getDriversBySeason
        const drivers = await dbService.getDriversBySeason(seasonId);
        res.json({ drivers });
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
        const dbService = new DatabaseService_1.DatabaseService();
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
        const dbService = new DatabaseService_1.DatabaseService();
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
        const dbService = new DatabaseService_1.DatabaseService();
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
exports.default = router;
//# sourceMappingURL=drivers.js.map