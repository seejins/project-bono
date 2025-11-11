import express from 'express';
import { DatabaseService } from '../services/DatabaseService';
import type { AppRepositories } from '../services/database/repositories';

export default function createTracksRoutes(
  _dbService: DatabaseService,
  repositories: AppRepositories,
) {
  const router = express.Router();
  const { tracks } = repositories;

  // Get all tracks
  router.get('/', async (req, res) => {
    try {
      await tracks.ensureInitialized();
      const allTracks = await tracks.getAllTracks();
      res.json({
        success: true,
        tracks: allTracks
      });
    } catch (error) {
      console.error('Get tracks error:', error);
      res.status(500).json({ 
        error: 'Failed to get tracks',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Create a new track
  router.post('/', async (req, res) => {
    try {
      const { name, country, city, circuitLength, laps } = req.body;
      
      if (!name || !country) {
        return res.status(400).json({ error: 'Name and country are required' });
      }

      await tracks.ensureInitialized();
      const trackId = await tracks.createTrack({
        name,
        country,
        city: city || '',
        circuitLength: circuitLength || 0,
        laps: laps || 0
      });
      
      res.json({
        success: true,
        trackId: trackId,
        message: 'Track created successfully'
      });
    } catch (error) {
      console.error('Create track error:', error);
      res.status(500).json({ 
        error: 'Failed to create track',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get track by ID
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      await tracks.ensureInitialized();
      // Note: We don't have a getTrackById method yet, so this will return 404 for now
      res.status(404).json({ error: 'Track not found' });
    } catch (error) {
      console.error('Get track error:', error);
      res.status(500).json({ 
        error: 'Failed to get track',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Update track
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      await tracks.ensureInitialized();
      // Note: We don't have an updateTrack method yet, so this will return 404 for now
      res.status(404).json({ error: 'Track not found' });
    } catch (error) {
      console.error('Update track error:', error);
      res.status(500).json({ 
        error: 'Failed to update track',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Delete track
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      await tracks.ensureInitialized();
      // Note: We don't have a deleteTrack method yet, so this will return 404 for now
      res.status(404).json({ error: 'Track not found' });
    } catch (error) {
      console.error('Delete track error:', error);
      res.status(500).json({ 
        error: 'Failed to delete track',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}
