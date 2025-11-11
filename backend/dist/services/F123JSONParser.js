"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.F123JSONParser = void 0;
const fs_1 = __importDefault(require("fs"));
const f123Constants_1 = require("../utils/f123Constants");
const trackNameMapping_1 = require("../utils/trackNameMapping");
class F123JSONParser {
    /**
     * Parse F1 23 JSON session file and extract session info
     * Returns minimal info needed for grouping files
     */
    static parseSessionFile(filePath) {
        try {
            const fileContent = fs_1.default.readFileSync(filePath, 'utf-8');
            const data = JSON.parse(fileContent);
            // Extract track name from session-info (track-id is the actual field name)
            const trackId = data['session-info']?.['track-id'] ||
                data.sessionInfo?.trackId ||
                data['session-info']?.['track-name'] ||
                data['track-name'] ||
                data.trackName ||
                data.track ||
                null;
            // Map track-id to full track name (e.g., "Austria" -> "Red Bull Ring")
            const trackName = trackId ? (0, trackNameMapping_1.mapTrackIdToTrackName)(trackId) : 'Unknown Track';
            // Extract session type
            let sessionType = 0;
            if (data['session-type'] !== undefined) {
                sessionType = data['session-type'];
            }
            else if (data.sessionType !== undefined) {
                sessionType = data.sessionType;
            }
            else if (data['session-info']?.['session-type'] !== undefined) {
                sessionType = data['session-info']['session-type'];
            }
            else if (data.sessionInfo?.sessionType !== undefined) {
                sessionType = data.sessionInfo.sessionType;
            }
            else {
                // Try to infer from filename
                const fileName = filePath.toLowerCase();
                if (fileName.includes('race')) {
                    sessionType = 10;
                }
                else if (fileName.includes('qualifying') || fileName.includes('qual')) {
                    sessionType = 5;
                }
                else if (fileName.includes('practice')) {
                    sessionType = 1;
                }
            }
            const sessionTypeName = (0, f123Constants_1.getSessionTypeName)(sessionType);
            return {
                sessionInfo: {
                    trackName,
                    sessionType,
                    sessionTypeName
                }
            };
        }
        catch (error) {
            console.error('Error parsing JSON file:', error);
            throw new Error(`Failed to parse F1 23 JSON file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
exports.F123JSONParser = F123JSONParser;
//# sourceMappingURL=F123JSONParser.js.map