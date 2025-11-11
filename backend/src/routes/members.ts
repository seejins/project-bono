import express from 'express';
import { DatabaseService } from '../services/DatabaseService';
import { MemberData } from '../services/database/types';

export default function createMembersRoutes(dbService: DatabaseService) {
  const router = express.Router();

  // Get all members
  router.get('/', async (req, res) => {
    try {
      const members = await dbService.getAllMembers();
      res.json({ success: true, members });
    } catch (error) {
      console.error('Error getting members:', error);
      res.status(500).json({ error: 'Failed to retrieve members' });
    }
  });

  // Create a new member
  router.post('/', async (req, res) => {
    try {
      const { name, steam_id, isActive } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Member name is required' });
      }
      const memberId = await dbService.createMember({ name, steam_id, isActive });
      const newMember = await dbService.getMemberById(memberId);
      res.status(201).json({ success: true, member: newMember });
    } catch (error) {
      console.error('Error creating member:', error);
      res.status(500).json({ error: 'Failed to create member' });
    }
  });

  // Get career stats for all members
  router.get('/career-stats', async (req, res) => {
    try {
      const members = await dbService.getAllMembers();
      const membersWithStats = await Promise.all(
        members.map(async (member) => {
          // For now, return basic stats - these would be calculated from race results
          const careerStats = {
            wins: 0,
            poles: 0,
            points: 0,
            podiums: 0,
            fastestLaps: 0,
            championships: 0,
            seasons: 0,
            bestFinish: 0,
            consistency: 0
          };
          
          return {
            ...member,
            career_stats: careerStats
          };
        })
      );
      
      res.json({ success: true, members: membersWithStats });
    } catch (error) {
      console.error('Error getting career stats:', error);
      res.status(500).json({ error: 'Failed to retrieve career stats' });
    }
  });

  // Get member career profile with comprehensive data
  router.get('/:id/career-profile', async (req, res) => {
    try {
      const { id } = req.params;
      const careerProfile = await dbService.getMemberCareerProfile(id);
      
      if (!careerProfile) {
        return res.status(404).json({ error: 'Member not found' });
      }
      
      res.json({ success: true, careerProfile });
    } catch (error) {
      console.error('Error getting member career profile:', error);
      res.status(500).json({ error: 'Failed to retrieve member career profile' });
    }
  });

  // Get member statistics for specific season
  router.get('/:id/seasons/:seasonId/stats', async (req, res) => {
    try {
      const { id, seasonId } = req.params;
      const seasonStats = await dbService.getMemberSeasonStats(id, seasonId);
      
      res.json({ success: true, stats: seasonStats });
    } catch (error) {
      console.error('Error getting member season stats:', error);
      res.status(500).json({ error: 'Failed to retrieve member season stats' });
    }
  });

  // Get member race history with optional season filtering
  router.get('/:id/race-history', async (req, res) => {
    try {
      const { id } = req.params;
      const { seasonId } = req.query;
      const raceHistory = await dbService.getMemberRaceHistory(id, seasonId as string);
      
      res.json({ success: true, raceHistory });
    } catch (error) {
      console.error('Error getting member race history:', error);
      res.status(500).json({ error: 'Failed to retrieve member race history' });
    }
  });

  // Get a specific member
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const member = await dbService.getMemberById(id);
      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }
      res.json({ success: true, member });
    } catch (error) {
      console.error('Error getting member:', error);
      res.status(500).json({ error: 'Failed to retrieve member' });
    }
  });

  // Update a member
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, steam_id, isActive } = req.body;
      
      const member = await dbService.getMemberById(id);
      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }

      await dbService.updateMember(id, { name, steam_id, isActive });
      const updatedMember = await dbService.getMemberById(id);
      res.json({ success: true, member: updatedMember });
    } catch (error) {
      console.error('Error updating member:', error);
      res.status(500).json({ error: 'Failed to update member' });
    }
  });

  // Delete a member
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      const member = await dbService.getMemberById(id);
      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }

      await dbService.deleteMember(id);
      res.json({ success: true, message: 'Member deleted successfully' });
    } catch (error) {
      console.error('Error deleting member:', error);
      res.status(500).json({ error: 'Failed to delete member' });
    }
  });

  return router;
}