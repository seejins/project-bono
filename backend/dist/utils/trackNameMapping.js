"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackIdToTrackName = void 0;
exports.mapTrackIdToTrackName = mapTrackIdToTrackName;
/**
 * Maps F1 23 track-id values to full track names
 */
exports.trackIdToTrackName = {
    'Austria': 'Red Bull Ring',
    'Bahrain': 'Bahrain International Circuit',
    'Sakhir': 'Sakhir (Bahrain)',
    'Monaco': 'Circuit de Monaco',
    'Silverstone': 'Silverstone Circuit',
    'Monza': 'Autodromo Nazionale di Monza',
    'Spa': 'Circuit de Spa-Francorchamps',
    'Suzuka': 'Suzuka International Racing Course',
    'Abu_Dhabi': 'Yas Marina Circuit',
    'Abu Dhabi': 'Yas Marina Circuit',
    'Texas': 'Circuit of the Americas',
    'Brazil': 'Autódromo José Carlos Pace',
    'Mexico': 'Autódromo Hermanos Rodríguez',
    'Baku': 'Baku City Circuit',
    'Zandvoort': 'Circuit Zandvoort',
    'Imola': 'Autodromo Enzo e Dino Ferrari',
    'Portimão': 'Autódromo Internacional do Algarve',
    'Jeddah': 'Jeddah Corniche Circuit',
    'Miami': 'Miami International Autodrome',
    'Las_Vegas': 'Las Vegas Strip Circuit',
    'Las Vegas': 'Las Vegas Strip Circuit',
    'Losail': 'Lusail International Circuit',
    'Catalunya': 'Circuit de Barcelona-Catalunya',
    'Montreal': 'Circuit Gilles Villeneuve',
    'Hungaroring': 'Hungaroring',
    'Singapore': 'Marina Bay Street Circuit',
    'Hockenheim': 'Hockenheimring',
    'Paul_Ricard': 'Circuit Paul Ricard',
    'Paul Ricard': 'Circuit Paul Ricard',
    'Shanghai': 'Shanghai International Circuit',
    'Sochi': 'Sochi Autodrom',
    'Hanoi': 'Hanoi Street Circuit'
};
/**
 * Maps a track-id to its full track name
 * @param trackId The track-id from F1 23 (e.g., "Austria")
 * @returns The full track name (e.g., "Red Bull Ring") or the original trackId if not found
 */
function mapTrackIdToTrackName(trackId) {
    if (!trackId)
        return 'Unknown Track';
    // Try exact match first
    if (exports.trackIdToTrackName[trackId]) {
        return exports.trackIdToTrackName[trackId];
    }
    // Try case-insensitive match
    const lowerTrackId = trackId.toLowerCase();
    for (const [key, value] of Object.entries(exports.trackIdToTrackName)) {
        if (key.toLowerCase() === lowerTrackId) {
            return value;
        }
    }
    // Return original if no mapping found
    return trackId;
}
//# sourceMappingURL=trackNameMapping.js.map