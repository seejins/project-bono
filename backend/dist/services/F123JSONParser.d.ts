export interface F123SessionInfo {
    trackName: string;
    sessionType: number;
    sessionTypeName: string;
}
export declare class F123JSONParser {
    /**
     * Parse F1 23 JSON session file and extract session info
     * Returns minimal info needed for grouping files
     */
    static parseSessionFile(filePath: string): {
        sessionInfo: F123SessionInfo;
    };
}
//# sourceMappingURL=F123JSONParser.d.ts.map