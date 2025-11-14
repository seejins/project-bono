import { DatabaseService } from './DatabaseService';
export declare class RaceResultsEditor {
    private dbService;
    constructor(dbService: DatabaseService);
    addPenalty(driverSessionResultId: string, penaltySeconds: number, reason: string, editedBy: string): Promise<void>;
    removePenalty(driverSessionResultId: string, penaltyId: string): Promise<void>;
    updateDriverUserMapping(driverSessionResultId: string, userId: string | null, editedBy: string, reason?: string): Promise<Array<{
        driverSessionResultId: string;
        sessionResultId: string;
        oldUserId: string | null;
        newUserId: string | null;
    }>>;
    changePosition(sessionResultId: string, driverId: string, newPosition: number, reason: string, editedBy: string): Promise<void>;
    disqualifyDriver(sessionResultId: string, driverId: string, reason: string, editedBy: string): Promise<void>;
    resetDriverToOriginal(sessionResultId: string, driverId: string): Promise<void>;
    resetRaceToOriginal(raceId: string): Promise<void>;
    revertEdit(editId: string): Promise<void>;
    getEditHistory(sessionResultId: string): Promise<any[]>;
    getRaceEditHistory(raceId: string): Promise<any[]>;
    validateEdit(sessionResultId: string, editType: string, data: any): Promise<boolean>;
    createBackup(sessionResultId: string): Promise<string>;
    restoreFromBackup(backupId: string): Promise<void>;
    private query;
}
//# sourceMappingURL=RaceResultsEditor.d.ts.map