/**
 * F1 23 UDP Specification Constants
 * Based on official F1 23 UDP specification document
 * All mappings match the official specification exactly
 */
export declare const TRACK_ID_TO_NAME: Map<number, string>;
export declare const TEAM_ID_TO_NAME: Map<number, string>;
export declare const SESSION_TYPE_NAMES: Map<number, string>;
export declare const SESSION_TYPE_ABBREVIATIONS: Map<number, string>;
export declare function getTrackName(trackId: number): string;
export declare function getTeamName(teamId: number): string;
export declare function getSessionTypeName(sessionType: number): string;
export declare function getSessionTypeAbbreviation(sessionType: number): string;
export declare const TIRE_COMPOUND_TO_LETTER: Map<number, 'S' | 'M' | 'H' | 'I' | 'W'>;
export declare function getTireCompound(compound: number): 'S' | 'M' | 'H' | 'I' | 'W';
export declare const DRIVER_STATUS: Map<number, string>;
export declare const RESULT_STATUS: Map<number, string>;
export declare function getDriverStatus(status: number): string;
export declare function getResultStatus(resultStatus: number): string;
export declare const PLATFORM_NAMES: Map<number, string>;
export declare function getPlatformName(platform: number): string;
export declare const PENALTY_TYPES: Map<number, string>;
export declare const PACKET_IDS: {
    readonly MOTION: 0;
    readonly SESSION: 1;
    readonly LAP_DATA: 2;
    readonly EVENT: 3;
    readonly PARTICIPANTS: 4;
    readonly CAR_SETUPS: 5;
    readonly CAR_TELEMETRY: 6;
    readonly CAR_STATUS: 7;
    readonly FINAL_CLASSIFICATION: 8;
    readonly LOBBY_INFO: 9;
    readonly CAR_DAMAGE: 10;
    readonly SESSION_HISTORY: 11;
    readonly TYRE_SETS: 12;
    readonly MOTION_EX: 13;
};
//# sourceMappingURL=f123Constants.d.ts.map