import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { DatabaseService } from '../services/DatabaseService';
import { RaceResultsEditor } from '../services/RaceResultsEditor';
import { RaceJSONImportService } from '../services/RaceJSONImportService';
import { F123JSONParser } from '../services/F123JSONParser';
import { Server } from 'socket.io';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../data/race-json-files');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `import-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.json'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Only JSON files are allowed'));
    }
  }
});

// Initialize services
let dbService: DatabaseService;
let raceResultsEditor: RaceResultsEditor;
let raceJSONImportService: RaceJSONImportService;

const setupRacesRoutes = (
  databaseService: DatabaseService,
  raceEditor: RaceResultsEditor,
  io: Server
) => {
  dbService = databaseService;
  raceResultsEditor = raceEditor;
  raceJSONImportService = new RaceJSONImportService(databaseService, io);
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

// Import multiple race JSON files (groups by track)
router.post('/import-json-batch', upload.array('raceFiles', 10), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const { seasonId } = req.body;

    if (!seasonId) {
      // Clean up uploaded files
      files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
      return res.status(400).json({ error: 'Season ID is required' });
    }

    await dbService.ensureInitialized();

    // Parse all files to determine track grouping
    const fileData: Array<{ file: Express.Multer.File; trackName: string; sessionType: number; sessionTypeName: string }> = [];
    
    for (const file of files) {
      try {
        const validation = await raceJSONImportService.validateJSONFile(file.path);
        if (!validation.valid) {
          fileData.push({
            file,
            trackName: 'Unknown',
            sessionType: 0,
            sessionTypeName: 'Unknown'
          });
          continue;
        }

        // Quick parse to get track name and session type
        const parsedData = F123JSONParser.parseSessionFile(file.path);
        fileData.push({
          file,
          trackName: parsedData.sessionInfo.trackName,
          sessionType: parsedData.sessionInfo.sessionType,
          sessionTypeName: parsedData.sessionInfo.sessionTypeName
        });
      } catch (error) {
        console.error(`Error parsing file ${file.originalname}:`, error);
        fileData.push({
          file,
          trackName: 'Unknown',
          sessionType: 0,
          sessionTypeName: 'Unknown'
        });
      }
    }

    // Group files by track name (case-insensitive)
    const trackGroups = new Map<string, typeof fileData>();
    fileData.forEach(data => {
      const trackKey = data.trackName.toLowerCase().trim();
      if (!trackGroups.has(trackKey)) {
        trackGroups.set(trackKey, []);
      }
      trackGroups.get(trackKey)!.push(data);
    });

    // Process each track group
    const results: Array<{ file: string; success: boolean; importedCount?: number; error?: string; sessionType?: string }> = [];
    let groupRaceId: string | null = null;

    for (const [trackName, groupFiles] of trackGroups.entries()) {
      let raceId: string | null = null;
      
      // Process files in order (practice -> qualifying -> race)
      const sortedFiles = groupFiles.sort((a, b) => {
        // Sort by session type: practice (1-4) < qualifying (5-9) < race (10-11)
        return a.sessionType - b.sessionType;
      });

      for (const fileData of sortedFiles) {
        try {
          // Use the same raceId for all files in the group
          const result = await raceJSONImportService.importRaceJSON(
            fileData.file.path,
            seasonId,
            raceId || undefined
          );

          if (!raceId) {
            raceId = result.raceId;
            groupRaceId = raceId;
          }

          results.push({
            file: fileData.file.originalname,
            success: true,
            importedCount: result.importedCount,
            sessionType: fileData.sessionTypeName
          });

          // Clean up file
          if (fs.existsSync(fileData.file.path)) {
            fs.unlinkSync(fileData.file.path);
          }
        } catch (error) {
          results.push({
            file: fileData.file.originalname,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });

          // Clean up file
          if (fs.existsSync(fileData.file.path)) {
            fs.unlinkSync(fileData.file.path);
          }
        }
      }
    }

    res.json({
      success: true,
      message: `Processed ${files.length} file(s)`,
      raceId: groupRaceId,
      results
    });
  } catch (error) {
    console.error('Import race JSON batch error:', error);

    // Clean up any remaining files
    if (req.files) {
      const files = req.files as Express.Multer.File[];
      files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }

    res.status(500).json({
      error: 'Failed to import race JSON files',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Import race JSON file (single file - kept for backward compatibility)
router.post('/import-json', upload.single('raceFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { seasonId, raceId } = req.body;

    if (!seasonId) {
      // Clean up uploaded file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: 'Season ID is required' });
    }

    await dbService.ensureInitialized();

    // Validate file before import
    const validation = await raceJSONImportService.validateJSONFile(req.file.path);
    if (!validation.valid) {
      // Clean up uploaded file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        error: 'Invalid JSON file',
        details: validation.errors
      });
    }

    // Import the race JSON
    const result = await raceJSONImportService.importRaceJSON(
      req.file.path,
      seasonId,
      raceId
    );

    // Clean up uploaded file after successful import
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.json({
      success: true,
      message: 'Race JSON imported successfully',
      raceId: result.raceId,
      sessionResultId: result.sessionResultId,
      importedCount: result.importedCount
    });
  } catch (error) {
    console.error('Import race JSON error:', error);

    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      error: 'Failed to import race JSON',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Import race JSON from existing file path
router.post('/import-json-path', async (req, res) => {
  try {
    const { filePath, seasonId, raceId } = req.body;

    if (!filePath || !seasonId) {
      return res.status(400).json({ error: 'File path and season ID are required' });
    }

    // Validate file exists
    if (!fs.existsSync(filePath)) {
      return res.status(400).json({ error: 'File does not exist' });
    }

    await dbService.ensureInitialized();

    // Validate file before import
    const validation = await raceJSONImportService.validateJSONFile(filePath);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Invalid JSON file',
        details: validation.errors
      });
    }

    // Import the race JSON
    const result = await raceJSONImportService.importRaceJSON(
      filePath,
      seasonId,
      raceId
    );

    res.json({
      success: true,
      message: 'Race JSON imported successfully',
      raceId: result.raceId,
      sessionResultId: result.sessionResultId,
      importedCount: result.importedCount
    });
  } catch (error) {
    console.error('Import race JSON from path error:', error);
    res.status(500).json({
      error: 'Failed to import race JSON',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get a single race by ID (must be last to avoid conflicts with other routes)
router.get('/:raceId', async (req, res) => {
  try {
    const { raceId } = req.params;
    
    await dbService.ensureInitialized();
    
    const race = await dbService.getRaceById(raceId);
    
    if (!race) {
      return res.status(404).json({
        error: 'Race not found'
      });
    }
    
    res.json({
      success: true,
      race
    });
  } catch (error) {
    console.error('Get race error:', error);
    res.status(500).json({
      error: 'Failed to get race',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
