import { Router } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import { RaceResultsEditor } from '../services/RaceResultsEditor';

const router = Router();

// Initialize services
let dbService: DatabaseService;
let raceResultsEditor: RaceResultsEditor;

const setupRacesRoutes = (databaseService: DatabaseService, raceEditor: RaceResultsEditor) => {
  dbService = databaseService;
  raceResultsEditor = raceEditor;
};

export { setupRacesRoutes };

// Get race results for a specific race
router.get('/:raceId/results', async (req, res) => {
  try {
    const { raceId } = req.params;
    
    await dbService.ensureInitialized();
    
    // Get all completed sessions for this race
    const sessions = await dbService.getCompletedSessions(raceId);
    
    const results = await Promise.all(sessions.map(async (session) => {
      const driverResults = await dbService.getDriverSessionResults(session.id);
      return {
        sessionId: session.id,
        sessionType: session.sessionType,
        sessionName: session.sessionName,
        completedAt: session.completedAt,
        results: driverResults
      };
    }));
    
    res.json({
      success: true,
      raceId,
      sessions: results
    });
  } catch (error) {
    console.error('Get race results error:', error);
    res.status(500).json({ 
      error: 'Failed to get race results',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get edit history for a race
router.get('/:raceId/edit-history', async (req, res) => {
  try {
    const { raceId } = req.params;
    
    await dbService.ensureInitialized();
    
    const editHistory = await raceResultsEditor.getRaceEditHistory(raceId);
    
    res.json({
      success: true,
      raceId,
      editHistory
    });
  } catch (error) {
    console.error('Get edit history error:', error);
    res.status(500).json({ 
      error: 'Failed to get edit history',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get edit history for a specific session
router.get('/sessions/:sessionId/edit-history', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    await dbService.ensureInitialized();
    
    const editHistory = await raceResultsEditor.getEditHistory(sessionId);
    
    res.json({
      success: true,
      sessionId,
      editHistory
    });
  } catch (error) {
    console.error('Get session edit history error:', error);
    res.status(500).json({ 
      error: 'Failed to get session edit history',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Add penalty to a driver
router.post('/sessions/:sessionId/penalties', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { driverId, penaltyPoints, reason, editedBy } = req.body;
    
    if (!driverId || !penaltyPoints || !reason || !editedBy) {
      return res.status(400).json({ 
        error: 'Missing required fields: driverId, penaltyPoints, reason, editedBy' 
      });
    }
    
    await dbService.ensureInitialized();
    
    // Validate the edit
    const isValid = await raceResultsEditor.validateEdit(sessionId, 'penalty', { penaltyPoints });
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid penalty data' });
    }
    
    await raceResultsEditor.addPenalty(sessionId, driverId, penaltyPoints, reason, editedBy);
    
    res.json({
      success: true,
      message: `Added ${penaltyPoints} penalty points to driver ${driverId}`
    });
  } catch (error) {
    console.error('Add penalty error:', error);
    res.status(500).json({ 
      error: 'Failed to add penalty',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Change driver position
router.put('/sessions/:sessionId/positions/:driverId', async (req, res) => {
  try {
    const { sessionId, driverId } = req.params;
    const { newPosition, reason, editedBy } = req.body;
    
    if (!newPosition || !reason || !editedBy) {
      return res.status(400).json({ 
        error: 'Missing required fields: newPosition, reason, editedBy' 
      });
    }
    
    await dbService.ensureInitialized();
    
    // Validate the edit
    const isValid = await raceResultsEditor.validateEdit(sessionId, 'position_change', { newPosition });
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid position data' });
    }
    
    await raceResultsEditor.changePosition(sessionId, driverId, newPosition, reason, editedBy);
    
    res.json({
      success: true,
      message: `Changed driver ${driverId} position to ${newPosition}`
    });
  } catch (error) {
    console.error('Change position error:', error);
    res.status(500).json({ 
      error: 'Failed to change position',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Disqualify driver
router.post('/sessions/:sessionId/disqualify/:driverId', async (req, res) => {
  try {
    const { sessionId, driverId } = req.params;
    const { reason, editedBy } = req.body;
    
    if (!reason || !editedBy) {
      return res.status(400).json({ 
        error: 'Missing required fields: reason, editedBy' 
      });
    }
    
    await dbService.ensureInitialized();
    
    // Validate the edit
    const isValid = await raceResultsEditor.validateEdit(sessionId, 'disqualification', { reason });
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid disqualification data' });
    }
    
    await raceResultsEditor.disqualifyDriver(sessionId, driverId, reason, editedBy);
    
    res.json({
      success: true,
      message: `Disqualified driver ${driverId}`
    });
  } catch (error) {
    console.error('Disqualify driver error:', error);
    res.status(500).json({ 
      error: 'Failed to disqualify driver',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Reset specific driver to original state
router.post('/sessions/:sessionId/reset-driver/:driverId', async (req, res) => {
  try {
    const { sessionId, driverId } = req.params;
    
    await dbService.ensureInitialized();
    
    await raceResultsEditor.resetDriverToOriginal(sessionId, driverId);
    
    res.json({
      success: true,
      message: `Reset driver ${driverId} to original state`
    });
  } catch (error) {
    console.error('Reset driver error:', error);
    res.status(500).json({ 
      error: 'Failed to reset driver',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Reset entire race to original state
router.post('/:raceId/reset', async (req, res) => {
  try {
    const { raceId } = req.params;
    
    await dbService.ensureInitialized();
    
    await raceResultsEditor.resetRaceToOriginal(raceId);
    
    res.json({
      success: true,
      message: `Reset entire race ${raceId} to original state`
    });
  } catch (error) {
    console.error('Reset race error:', error);
    res.status(500).json({ 
      error: 'Failed to reset race',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Revert specific edit
router.post('/race-edits/:editId/revert', async (req, res) => {
  try {
    const { editId } = req.params;
    
    await dbService.ensureInitialized();
    
    await raceResultsEditor.revertEdit(editId);
    
    res.json({
      success: true,
      message: `Reverted edit ${editId}`
    });
  } catch (error) {
    console.error('Revert edit error:', error);
    res.status(500).json({ 
      error: 'Failed to revert edit',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create backup of current results
router.post('/sessions/:sessionId/backup', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    await dbService.ensureInitialized();
    
    const backupId = await raceResultsEditor.createBackup(sessionId);
    
    res.json({
      success: true,
      backupId,
      message: `Created backup ${backupId} for session ${sessionId}`
    });
  } catch (error) {
    console.error('Create backup error:', error);
    res.status(500).json({ 
      error: 'Failed to create backup',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Restore from backup
router.post('/backups/:backupId/restore', async (req, res) => {
  try {
    const { backupId } = req.params;
    
    await dbService.ensureInitialized();
    
    await raceResultsEditor.restoreFromBackup(backupId);
    
    res.json({
      success: true,
      message: `Restored from backup ${backupId}`
    });
  } catch (error) {
    console.error('Restore backup error:', error);
    res.status(500).json({ 
      error: 'Failed to restore from backup',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get orphaned sessions (for admin review)
router.get('/admin/orphaned-sessions', async (req, res) => {
  try {
    await dbService.ensureInitialized();
    
    const result = await dbService.query(
      'SELECT * FROM orphaned_sessions WHERE status = $1 ORDER BY created_at DESC',
      ['pending']
    );
    
    res.json({
      success: true,
      orphanedSessions: result.rows
    });
  } catch (error) {
    console.error('Get orphaned sessions error:', error);
    res.status(500).json({ 
      error: 'Failed to get orphaned sessions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Process orphaned session (link to existing event)
router.post('/admin/orphaned-sessions/:orphanedId/process', async (req, res) => {
  try {
    const { orphanedId } = req.params;
    const { eventId } = req.body;
    
    if (!eventId) {
      return res.status(400).json({ error: 'Missing eventId' });
    }
    
    await dbService.ensureInitialized();
    
    // Update orphaned session status
    await dbService.query(
      'UPDATE orphaned_sessions SET status = $1, processed_event_id = $2 WHERE id = $3',
      ['processed', eventId, orphanedId]
    );
    
    res.json({
      success: true,
      message: `Processed orphaned session ${orphanedId} and linked to event ${eventId}`
    });
  } catch (error) {
    console.error('Process orphaned session error:', error);
    res.status(500).json({ 
      error: 'Failed to process orphaned session',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Ignore orphaned session
router.post('/admin/orphaned-sessions/:orphanedId/ignore', async (req, res) => {
  try {
    const { orphanedId } = req.params;
    
    await dbService.ensureInitialized();
    
    // Update orphaned session status
    await dbService.query(
      'UPDATE orphaned_sessions SET status = $1 WHERE id = $2',
      ['ignored', orphanedId]
    );
    
    res.json({
      success: true,
      message: `Ignored orphaned session ${orphanedId}`
    });
  } catch (error) {
    console.error('Ignore orphaned session error:', error);
    res.status(500).json({ 
      error: 'Failed to ignore orphaned session',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
