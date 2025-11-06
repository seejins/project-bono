import express from 'express';
import { DatabaseService, DriverData } from '../services/DatabaseService';

export default function createDriversRoutes(dbService: DatabaseService) {
  const router = express.Router();

  // Get all drivers
  router.get('/', async (req, res) => {
    try {
      const drivers = await dbService.getAllDrivers();
      res.json({ success: true, drivers });
    } catch (error) {
      console.error('Error getting drivers:', error);
      res.status(500).json({ error: 'Failed to retrieve drivers' });
    }
  });

  // Create a new driver
  router.post('/', async (req, res) => {
    try {
      const { name, team, number, seasonId, steam_id, isActive } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Driver name is required' });
      }
      const driverId = await dbService.createDriver({ name, team, number, seasonId, steam_id, isActive });
      const newDriver = await dbService.getDriverById(driverId);
      res.status(201).json({ success: true, driver: newDriver });
    } catch (error) {
      console.error('Error creating driver:', error);
      res.status(500).json({ error: 'Failed to create driver' });
    }
  });

  // Get a specific driver
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const driver = await dbService.getDriverById(id);
      if (!driver) {
        return res.status(404).json({ error: 'Driver not found' });
      }
      res.json({ success: true, driver });
    } catch (error) {
      console.error('Error getting driver:', error);
      res.status(500).json({ error: 'Failed to retrieve driver' });
    }
  });

  // Update a driver
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, team, number, seasonId, steam_id, isActive } = req.body;
      
      const driver = await dbService.getDriverById(id);
      if (!driver) {
        return res.status(404).json({ error: 'Driver not found' });
      }

      await dbService.updateDriver(id, { name, team, number, seasonId, steam_id, isActive });
      const updatedDriver = await dbService.getDriverById(id);
      res.json({ success: true, driver: updatedDriver });
    } catch (error) {
      console.error('Error updating driver:', error);
      res.status(500).json({ error: 'Failed to update driver' });
    }
  });

  // Delete a driver
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      const driver = await dbService.getDriverById(id);
      if (!driver) {
        return res.status(404).json({ error: 'Driver not found' });
      }

      await dbService.deleteDriver(id);
      res.json({ success: true, message: 'Driver deleted successfully' });
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
      console.error('Error getting driver season stats:', error);
      res.status(500).json({ error: 'Failed to retrieve driver season stats' });
    }
  });

  // Get driver race history with optional season filtering
  router.get('/:id/race-history', async (req, res) => {
    try {
      const { id } = req.params;
      const { seasonId } = req.query;
      const raceHistory = await dbService.getDriverRaceHistory(id, seasonId as string);
      
      res.json({ success: true, raceHistory });
    } catch (error) {
      console.error('Error getting driver race history:', error);
      res.status(500).json({ error: 'Failed to retrieve driver race history' });
    }
  });

  return router;
}
