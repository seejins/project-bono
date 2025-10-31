/**
 * F1 23 UDP Specification Constants
 * Based on official F1 23 UDP specification document
 * All mappings match the official specification exactly
 */

// Track ID to Name Mapping (from spec appendix)
export const TRACK_ID_TO_NAME: Map<number, string> = new Map([
  [0, 'Melbourne'],
  [1, 'Paul Ricard'],
  [2, 'Shanghai'],
  [3, 'Sakhir (Bahrain)'],
  [4, 'Catalunya'],
  [5, 'Monaco'],
  [6, 'Montreal'],
  [7, 'Silverstone'],
  [8, 'Hockenheim'],
  [9, 'Hungaroring'],
  [10, 'Spa'],
  [11, 'Monza'],
  [12, 'Singapore'],
  [13, 'Suzuka'],
  [14, 'Abu Dhabi'],
  [15, 'Texas'],
  [16, 'Brazil'],
  [17, 'Austria'],
  [18, 'Sochi'],
  [19, 'Mexico'],
  [20, 'Baku (Azerbaijan)'],
  [21, 'Sakhir Short'],
  [22, 'Silverstone Short'],
  [23, 'Texas Short'],
  [24, 'Suzuka Short'],
  [25, 'Hanoi'],
  [26, 'Zandvoort'],
  [27, 'Imola'],
  [28, 'Portimão'],
  [29, 'Jeddah'],
  [30, 'Miami'],
  [31, 'Las Vegas'],
  [32, 'Losail']
]);

// Team ID to Name Mapping (from spec appendix)
export const TEAM_ID_TO_NAME: Map<number, string> = new Map([
  [0, 'Mercedes'],
  [1, 'Ferrari'],
  [2, 'Red Bull Racing'],
  [3, 'Williams'],
  [4, 'Aston Martin'],
  [5, 'Alpine'],
  [6, 'Alpha Tauri'],
  [7, 'Haas'],
  [8, 'McLaren'],
  [9, 'Alfa Romeo'],
  // Legacy/Classic teams
  [85, 'Mercedes 2020'],
  [86, 'Ferrari 2020'],
  [87, 'Red Bull 2020'],
  [88, 'Williams 2020'],
  [89, 'Racing Point 2020'],
  [90, 'Renault 2020'],
  [91, 'Alpha Tauri 2020'],
  [92, 'Haas 2020'],
  [93, 'McLaren 2020'],
  [94, 'Alfa Romeo 2020'],
  [118, 'Mercedes 2022'],
  [119, 'Ferrari 2022'],
  [120, 'Red Bull Racing 2022'],
  [121, 'Williams 2022'],
  [122, 'Aston Martin 2022'],
  [123, 'Alpine 2022'],
  [124, 'Alpha Tauri 2022'],
  [125, 'Haas 2022'],
  [126, 'McLaren 2022'],
  [127, 'Alfa Romeo 2022'],
  // F2 Teams
  [106, 'Prema 2021'],
  [107, 'Uni-Virtuosi 2021'],
  [108, 'Carlin 2021'],
  [109, 'Hitech 2021'],
  [110, 'Art GP 2021'],
  [111, 'MP Motorsport 2021'],
  [112, 'Charouz 2021'],
  [113, 'Dams 2021'],
  [114, 'BWT 2021'],
  [115, 'Trident 2021'],
  [130, 'Prema 2022'],
  [131, 'Virtuosi 2022'],
  [132, 'Carlin 2022'],
  [133, 'MP Motorsport 2022'],
  [134, 'Charouz 2022'],
  [135, 'Dams 2022'],
  [136, 'Campos 2022'],
  [137, 'Van Amersfoort Racing 2022'],
  [138, 'Trident 2022'],
  [139, 'Hitech 2022'],
  [140, 'Art GP 2022'],
  // Safety Cars & Other
  [95, 'Aston Martin DB11 V12'],
  [96, 'Aston Martin Vantage F1 Edition'],
  [97, 'Aston Martin Vantage Safety Car'],
  [98, 'Ferrari F8 Tributo'],
  [99, 'Ferrari Roma'],
  [100, 'McLaren 720S'],
  [101, 'McLaren Artura'],
  [102, 'Mercedes AMG GT Black Series Safety Car'],
  [103, 'Mercedes AMG GTR Pro'],
  [117, 'Mercedes AMG GT Black Series'],
  [104, 'F1 Custom Team'],
  [128, 'Konnersport 2022'],
  [129, 'Konnersport']
]);

// Session Type to Name Mapping (from spec)
export const SESSION_TYPE_NAMES: Map<number, string> = new Map([
  [0, 'Unknown'],
  [1, 'Practice 1'],
  [2, 'Practice 2'],
  [3, 'Practice 3'],
  [4, 'Short Practice'],
  [5, 'Q1'],
  [6, 'Q2'],
  [7, 'Q3'],
  [8, 'Short Qualifying'],
  [9, 'One Shot Qualifying'],
  [10, 'Race'],
  [11, 'Race 2'],
  [12, 'Race 3'],
  [13, 'Time Trial']
]);

// Session Type Abbreviated Names (for compact display)
export const SESSION_TYPE_ABBREVIATIONS: Map<number, string> = new Map([
  [0, 'Unknown'],
  [1, 'P1'],
  [2, 'P2'],
  [3, 'P3'],
  [4, 'Short P'],
  [5, 'Q1'],
  [6, 'Q2'],
  [7, 'Q3'],
  [8, 'Short Q'],
  [9, 'OSQ'],
  [10, 'Race'],
  [11, 'R2'],
  [12, 'R3'],
  [13, 'Time Trial']
]);

// Helper function to get track name
export function getTrackName(trackId: number): string {
  return TRACK_ID_TO_NAME.get(trackId) || 'Unknown Track';
}

// Helper function to get team name
export function getTeamName(teamId: number): string {
  return TEAM_ID_TO_NAME.get(teamId) || 'Unknown Team';
}

// Helper function to get session type name
export function getSessionTypeName(sessionType: number): string {
  return SESSION_TYPE_NAMES.get(sessionType) || 'Unknown';
}

// Helper function to get session type abbreviation
export function getSessionTypeAbbreviation(sessionType: number): string {
  return SESSION_TYPE_ABBREVIATIONS.get(sessionType) || 'Unknown';
}

// Tire Compound Mapping
export const TIRE_COMPOUND_TO_LETTER: Map<number, 'S' | 'M' | 'H' | 'I' | 'W'> = new Map([
  [16, 'S'], // C5 (softest)
  [17, 'S'], // C4
  [18, 'M'], // C3
  [19, 'H'], // C2
  [20, 'H'], // C1
  [21, 'H'], // C0
  [7, 'I'],  // Intermediate
  [8, 'W']   // Wet
]);

// Helper function to get tire compound letter
export function getTireCompound(compound: number): 'S' | 'M' | 'H' | 'I' | 'W' {
  return TIRE_COMPOUND_TO_LETTER.get(compound) || 'M';
}

// Driver Status Mapping (from Lap Data Packet)
export const DRIVER_STATUS: Map<number, string> = new Map([
  [0, 'IN_GARAGE'],
  [1, 'RUNNING'],  // FLYING_LAP
  [2, 'IN_LAP'],
  [3, 'OUT_LAP'],
  [4, 'RUNNING']   // ON_TRACK
]);

// Result Status Mapping (from Lap Data Packet)
export const RESULT_STATUS: Map<number, string> = new Map([
  [0, 'INVALID'],
  [1, 'INACTIVE'],
  [2, 'RUNNING'],  // ACTIVE
  [3, 'FINISHED'],
  [4, 'DNF'],      // DID NOT FINISH
  [5, 'DSQ'],      // DISQUALIFIED
  [6, 'NCL'],      // NOT CLASSIFIED
  [7, 'RET']       // RETIRED
]);

// Helper function to get driver status
export function getDriverStatus(status: number): string {
  return DRIVER_STATUS.get(status) || 'RUNNING';
}

// Helper function to get result status
export function getResultStatus(resultStatus: number): string {
  return RESULT_STATUS.get(resultStatus) || 'RUNNING';
}

// Platform IDs (from spec)
export const PLATFORM_NAMES: Map<number, string> = new Map([
  [1, 'Steam'],
  [3, 'PlayStation'],
  [4, 'Xbox'],
  [6, 'Origin'],
  [255, 'Unknown']
]);

// Helper function to get platform name
export function getPlatformName(platform: number): string {
  return PLATFORM_NAMES.get(platform) || 'Unknown';
}

// Penalty Types (from spec)
export const PENALTY_TYPES: Map<number, string> = new Map([
  [0, 'Drive through'],
  [1, 'Stop Go'],
  [2, 'Grid penalty'],
  [3, 'Penalty reminder'],
  [4, 'Time penalty'],
  [5, 'Warning'],
  [6, 'Disqualified'],
  [7, 'Removed from formation lap'],
  [8, 'Parked too long timer'],
  [9, 'Tyre regulations'],
  [10, 'This lap invalidated'],
  [11, 'This and next lap invalidated'],
  [12, 'This lap invalidated without reason'],
  [13, 'This and next lap invalidated without reason'],
  [14, 'This and previous lap invalidated'],
  [15, 'This and previous lap invalidated without reason'],
  [16, 'Retired'],
  [17, 'Black flag timer']
]);

// Packet IDs (for reference)
export const PACKET_IDS = {
  MOTION: 0,
  SESSION: 1,
  LAP_DATA: 2,
  EVENT: 3,
  PARTICIPANTS: 4,
  CAR_SETUPS: 5,
  CAR_TELEMETRY: 6,
  CAR_STATUS: 7,
  FINAL_CLASSIFICATION: 8,
  LOBBY_INFO: 9,
  CAR_DAMAGE: 10,
  SESSION_HISTORY: 11,
  TYRE_SETS: 12,
  MOTION_EX: 13
} as const;

