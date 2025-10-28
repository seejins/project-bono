import express from 'express';
import { DatabaseService, MemberData } from '../services/DatabaseService';

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