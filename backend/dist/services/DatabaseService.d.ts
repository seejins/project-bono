export declare class DatabaseService {
    private db;
    constructor();
    private initializeTables;
    saveTelemetry(data: any): void;
    saveStrategy(strategy: any): void;
    saveAlert(alert: any): void;
    getTelemetryHistory(limit?: number): Promise<any[]>;
    getStrategyHistory(limit?: number): Promise<any[]>;
    getAlerts(limit?: number): Promise<any[]>;
    close(): void;
}
//# sourceMappingURL=DatabaseService.d.ts.map