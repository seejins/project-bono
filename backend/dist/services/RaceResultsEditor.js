"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RaceResultsEditor = void 0;
const uuid_1 = require("uuid");
class RaceResultsEditor {
    constructor(dbService) {
        this.dbService = dbService;
        console.log('✏️ RaceResultsEditor initialized');
    }
    // Add penalty entry for a driver session result
    async addPenalty(driverSessionResultId, penaltySeconds, reason, editedBy) {
        try {
            const penalty = await this.dbService.addPenalty(driverSessionResultId, penaltySeconds, reason, editedBy);
            console.log(`✅ Added ${penalty.seconds} second penalty to driver session result ${driverSessionResultId}`);
        }
        catch (error) {
            console.error('❌ Error adding penalty:', error);
            throw error;
        }
    }
    // Remove penalty entry
    async removePenalty(driverSessionResultId, penaltyId) {
        try {
            await this.dbService.removePenalty(driverSessionResultId, penaltyId);
            console.log(`✅ Removed penalty ${penaltyId} from driver session result ${driverSessionResultId}`);
        }
        catch (error) {
            console.error('❌ Error removing penalty:', error);
            throw error;
        }
    }
    async updateDriverUserMapping(driverSessionResultId, userId, editedBy, reason) {
        try {
            const cascadedUpdates = await this.dbService.updateDriverUserMapping(driverSessionResultId, userId);
            const now = new Date().toISOString();
            for (const update of cascadedUpdates) {
                await this.dbService.query(`INSERT INTO race_edit_history (
            id,
            session_result_id,
            driver_session_result_id,
            user_id,
            edit_type,
            old_value,
            new_value,
            reason,
            edited_by,
            created_at
          )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [
                    (0, uuid_1.v4)(),
                    update.sessionResultId,
                    update.driverSessionResultId,
                    update.newUserId,
                    'user_mapping',
                    update.oldUserId ? { user_id: update.oldUserId } : null,
                    update.newUserId ? { user_id: update.newUserId } : null,
                    reason ?? (update.newUserId ? 'Mapped race result to user' : 'Cleared race result mapping'),
                    editedBy,
                    now,
                ]);
                console.log(`✅ Updated driver mapping for result ${update.driverSessionResultId}: ${update.oldUserId ?? 'none'} → ${update.newUserId ?? 'none'}`);
            }
            return cascadedUpdates;
        }
        catch (error) {
            console.error('❌ Error updating driver mapping:', error);
            throw error;
        }
    }
    // Change driver position
    async changePosition(sessionResultId, driverId, newPosition, reason, editedBy) {
        try {
            await this.dbService.changePosition(sessionResultId, driverId, newPosition, reason, editedBy);
            console.log(`✅ Changed driver ${driverId} position to ${newPosition} in session ${sessionResultId}`);
        }
        catch (error) {
            console.error('❌ Error changing position:', error);
            throw error;
        }
    }
    // Disqualify driver
    async disqualifyDriver(sessionResultId, driverId, reason, editedBy) {
        try {
            const now = new Date().toISOString();
            // Get current values
            const current = await this.dbService.query('SELECT position, result_status FROM driver_session_results WHERE session_result_id = $1 AND driver_id = $2', [sessionResultId, driverId]);
            if (!current.rows[0]) {
                throw new Error('Driver session result not found');
            }
            const oldStatus = current.rows[0].result_status;
            const oldPosition = current.rows[0].position;
            // Update the result to disqualified (status 5)
            await this.dbService.query('UPDATE driver_session_results SET result_status = $1, dnf_reason = $2, updated_at = $3 WHERE session_result_id = $4 AND driver_id = $5', [5, reason, now, sessionResultId, driverId]);
            // Log the edit
            await this.dbService.query(`INSERT INTO race_edit_history (id, session_result_id, user_id, edit_type, old_value, new_value, reason, edited_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [
                (0, uuid_1.v4)(), sessionResultId, driverId, 'disqualification',
                { result_status: oldStatus, position: oldPosition },
                { result_status: 5, dnf_reason: reason },
                reason, editedBy, now
            ]);
            console.log(`✅ Disqualified driver ${driverId} in session ${sessionResultId}`);
        }
        catch (error) {
            console.error('❌ Error disqualifying driver:', error);
            throw error;
        }
    }
    // Reset specific driver to original state
    async resetDriverToOriginal(sessionResultId, driverId) {
        try {
            await this.dbService.resetDriverToOriginal(sessionResultId, driverId);
            console.log(`✅ Reset driver ${driverId} to original state in session ${sessionResultId}`);
        }
        catch (error) {
            console.error('❌ Error resetting driver to original:', error);
            throw error;
        }
    }
    // Reset entire race to original state
    async resetRaceToOriginal(raceId) {
        try {
            // Get all session results for this race
            const sessions = await this.dbService.getCompletedSessions(raceId);
            for (const session of sessions) {
                // Get all drivers for this session
                const drivers = await this.dbService.getDriverSessionResults(session.id);
                for (const driver of drivers) {
                    await this.resetDriverToOriginal(session.id, driver.driver_id);
                }
            }
            console.log(`✅ Reset entire race ${raceId} to original state`);
        }
        catch (error) {
            console.error('❌ Error resetting race to original:', error);
            throw error;
        }
    }
    // Revert specific edit
    async revertEdit(editId) {
        try {
            await this.dbService.revertEdit(editId);
            console.log(`✅ Reverted edit ${editId}`);
        }
        catch (error) {
            console.error('❌ Error reverting edit:', error);
            throw error;
        }
    }
    // Get edit history for a session
    async getEditHistory(sessionResultId) {
        try {
            const history = await this.dbService.getEditHistory(sessionResultId);
            console.log(`📋 Retrieved edit history for session ${sessionResultId}: ${history.length} edits`);
            return history;
        }
        catch (error) {
            console.error('❌ Error getting edit history:', error);
            throw error;
        }
    }
    // Get edit history for a race (all sessions)
    async getRaceEditHistory(raceId) {
        try {
            const sessions = await this.dbService.getCompletedSessions(raceId);
            const allHistory = [];
            for (const session of sessions) {
                const sessionHistory = await this.getEditHistory(session.id);
                allHistory.push(...sessionHistory.map(edit => ({
                    ...edit,
                    sessionName: session.sessionName,
                    sessionType: session.sessionType
                })));
            }
            // Sort by creation date (most recent first)
            allHistory.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            console.log(`📋 Retrieved race edit history for race ${raceId}: ${allHistory.length} total edits`);
            return allHistory;
        }
        catch (error) {
            console.error('❌ Error getting race edit history:', error);
            throw error;
        }
    }
    // Validate edit before applying
    async validateEdit(sessionResultId, editType, data) {
        try {
            // Check if session exists
            const session = await this.dbService.query('SELECT id FROM session_results WHERE id = $1', [sessionResultId]);
            if (!session.rows[0]) {
                throw new Error('Session not found');
            }
            // Validate based on edit type
            switch (editType) {
                case 'position_change':
                    if (!data.newPosition || data.newPosition < 1) {
                        throw new Error('Position must be 1 or higher');
                    }
                    break;
                case 'disqualification':
                    if (!data.reason || data.reason.trim().length === 0) {
                        throw new Error('Disqualification reason is required');
                    }
                    break;
                default:
                    throw new Error(`Unknown edit type: ${editType}`);
            }
            return true;
        }
        catch (error) {
            console.error('❌ Edit validation failed:', error);
            return false;
        }
    }
    // Create backup of current results
    async createBackup(sessionResultId) {
        try {
            const backupId = (0, uuid_1.v4)();
            const now = new Date().toISOString();
            // Get current results
            const results = await this.dbService.getDriverSessionResults(sessionResultId);
            // Store backup
            await this.dbService.query(`INSERT INTO race_backups (id, session_result_id, backup_data, created_at)
         VALUES ($1, $2, $3, $4)`, [backupId, sessionResultId, JSON.stringify(results), now]);
            console.log(`💾 Created backup ${backupId} for session ${sessionResultId}`);
            return backupId;
        }
        catch (error) {
            console.error('❌ Error creating backup:', error);
            throw error;
        }
    }
    // Restore from backup
    async restoreFromBackup(backupId) {
        try {
            // Get backup data
            const backup = await this.dbService.query('SELECT * FROM race_backups WHERE id = $1', [backupId]);
            if (!backup.rows[0]) {
                throw new Error('Backup not found');
            }
            const backupData = JSON.parse(backup.rows[0].backup_data);
            const sessionResultId = backup.rows[0].session_result_id;
            // Clear current results
            await this.dbService.query('DELETE FROM driver_session_results WHERE session_result_id = $1', [sessionResultId]);
            // Restore from backup
            await this.dbService.storeDriverSessionResults(sessionResultId, backupData); // Return value not needed here
            console.log(`🔄 Restored session ${sessionResultId} from backup ${backupId}`);
        }
        catch (error) {
            console.error('❌ Error restoring from backup:', error);
            throw error;
        }
    }
    // Use DatabaseService public query method
    async query(sql, params = []) {
        return await this.dbService.query(sql, params);
    }
}
exports.RaceResultsEditor = RaceResultsEditor;
//# sourceMappingURL=RaceResultsEditor.js.map