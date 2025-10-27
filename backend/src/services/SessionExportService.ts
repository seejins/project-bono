import { F123TelemetryData } from './TelemetryService';
import { DatabaseService } from './DatabaseService';

export interface SessionExportData {
  sessionType: number;
  sessionTypeName: string;
  sessionStartTime: Date | null;
  sessionEndTime: Date;
  trackName: string;
  drivers: F123TelemetryData[];
}

export interface SessionResult {
  driverId: string;
  driverName: string;
  teamName: string;
  carNumber: number;
  position: number;
  lapTime: number;
  sector1Time: number;
  sector2Time: number;
  sector3Time: number;
  bestLapTime: number;
  gapToPole: number;
  penalties: number;
  warnings: number;
  dnfReason?: string;
  dataSource: 'UDP' | 'MANUAL' | 'FILE_UPLOAD';
}

export class SessionExportService {
  private dbService: DatabaseService;

  constructor() {
    this.dbService = new DatabaseService();
  }

  /**
   * Export session data when a session ends
   */
  async exportSessionData(sessionData: SessionExportData): Promise<void> {
    try {
      console.log(`Exporting ${sessionData.sessionTypeName} session data...`);

      // Create or update race record
      const raceId = await this.createOrUpdateRace(sessionData);

      // Process driver results
      const sessionResults = this.processDriverResults(sessionData.drivers);

      // Calculate gaps to pole
      const poleTime = this.findPoleTime(sessionResults);
      if (poleTime) {
        sessionResults.forEach(driver => {
          driver.gapToPole = driver.bestLapTime - poleTime;
        });
      }

      // Save session results to database
      await this.saveSessionResults(raceId, sessionResults, sessionData.sessionType);

      // Save telemetry data
      await this.saveTelemetryData(raceId, sessionData.drivers, sessionData.sessionType);

      console.log('Session data exported successfully');
    } catch (error) {
      console.error('Error exporting session data:', error);
      throw error;
    }
  }

  /**
   * Create or update race record
   */
  private async createOrUpdateRace(sessionData: SessionExportData): Promise<string> {
    // For now, we'll create a new race record for each session
    // In a real implementation, you might want to group sessions by race weekend
    
    const raceData = {
      trackName: sessionData.trackName,
      raceDate: sessionData.sessionEndTime.toISOString().split('T')[0],
      sessionType: sessionData.sessionType,
      sessionDuration: sessionData.sessionStartTime 
        ? Math.floor((sessionData.sessionEndTime.getTime() - sessionData.sessionStartTime.getTime()) / 1000)
        : 0,
      weatherAirTemp: sessionData.drivers[0]?.airTemperature || 0,
      weatherTrackTemp: sessionData.drivers[0]?.trackTemperature || 0,
      weatherRainPercentage: sessionData.drivers[0]?.rainPercentage || 0,
      status: 'completed'
    };

    // Get or create track
    const track = await this.dbService.findOrCreateTrack(sessionData.trackName);
    
    // Get current active season
    const seasons = await this.dbService.getAllSeasons();
    const activeSeason = seasons.find(s => s.isActive) || seasons[0];
    
    if (!activeSeason) {
      throw new Error('No active season found');
    }
    
    // Create race in database
    const raceId = await this.dbService.createRace({
      seasonId: activeSeason.id,
      trackId: track.id,
      raceDate: sessionData.sessionEndTime.toISOString(),
      status: 'completed'
    });
    
    return raceId;
  }

  /**
   * Process driver results from telemetry data
   */
  private processDriverResults(drivers: F123TelemetryData[]): SessionResult[] {
    return drivers.map(driver => ({
      driverId: driver.driverName.toLowerCase().replace(/\s+/g, '-'), // Convert name to ID
      driverName: driver.driverName,
      teamName: driver.teamName,
      carNumber: driver.carNumber,
      position: driver.carPosition,
      lapTime: driver.lapTime,
      sector1Time: driver.sector1Time,
      sector2Time: driver.sector2Time,
      sector3Time: driver.sector3Time,
      bestLapTime: driver.bestLapTime,
      gapToPole: 0, // Will be calculated later
      penalties: driver.penalties,
      warnings: driver.warnings,
      dnfReason: driver.penalties > 0 ? 'Penalty' : undefined,
      dataSource: 'UDP' as const
    }));
  }

  /**
   * Find pole position time
   */
  private findPoleTime(results: SessionResult[]): number | null {
    const validTimes = results
      .map(r => r.bestLapTime)
      .filter(time => time > 0);
    
    return validTimes.length > 0 ? Math.min(...validTimes) : null;
  }

  /**
   * Save session results to database
   */
  private async saveSessionResults(
    raceId: string, 
    results: SessionResult[], 
    sessionType: number
  ): Promise<void> {
    // Convert SessionResult[] to format expected by importRaceResults
    const sessionData = {
      trackName: 'Unknown Track', // TODO: Get from session data
      sessionType: sessionType,
      date: new Date().toISOString(),
      results: results.map(result => ({
        driverName: result.driverName,
        driverNumber: result.carNumber,
        position: result.position,
        lapTime: result.lapTime,
        sector1Time: result.sector1Time,
        sector2Time: result.sector2Time,
        sector3Time: result.sector3Time,
        bestLapTime: result.bestLapTime,
        gapToPole: result.gapToPole,
        penalties: result.penalties,
        warnings: result.warnings,
        dnfReason: result.dnfReason
      })),
      drivers: results.map(result => ({
        driverName: result.driverName,
        driverNumber: result.carNumber,
        teamName: result.teamName
      }))
    };
    
    await this.dbService.importRaceResults(raceId, sessionData);
    console.log(`Saved ${results.length} driver results for session type ${sessionType}`);
  }

  /**
   * Save telemetry data to database
   */
  private async saveTelemetryData(
    raceId: string, 
    drivers: F123TelemetryData[], 
    sessionType: number
  ): Promise<void> {
    // Convert F123TelemetryData[] to format expected by importRaceResults
    const sessionData = {
      trackName: 'Unknown Track', // TODO: Get from session data
      sessionType: sessionType,
      date: new Date().toISOString(),
      results: drivers.map(driver => ({
        driverName: driver.driverName,
        driverNumber: driver.carNumber,
        position: driver.carPosition,
        lapTime: driver.lapTime,
        sector1Time: driver.sector1Time,
        sector2Time: driver.sector2Time,
        sector3Time: driver.sector3Time,
        bestLapTime: driver.bestLapTime,
        gapToPole: driver.gapToPole || 0,
        penalties: driver.penalties,
        warnings: driver.warnings,
        lapTimes: [{
          lapNumber: driver.lapNumber,
          sector1Time: driver.sector1Time,
          sector2Time: driver.sector2Time,
          sector3Time: driver.sector3Time,
          lapTime: driver.lapTime
        }]
      })),
      drivers: drivers.map(driver => ({
        driverName: driver.driverName,
        driverNumber: driver.carNumber,
        teamName: driver.teamName
      }))
    };
    
    await this.dbService.importRaceResults(raceId, sessionData);
    console.log(`Saved telemetry data for ${drivers.length} drivers`);
  }

  /**
   * Import session data from uploaded file
   */
  async importSessionFile(
    raceId: string,
    filename: string,
    fileContent: string,
    fileType: 'JSON' | 'CSV' | 'TXT'
  ): Promise<void> {
    try {
      console.log(`Importing session file: ${filename}`);

      // Parse file content based on type
      let sessionData: any;
      
      switch (fileType) {
        case 'JSON':
          sessionData = JSON.parse(fileContent);
          break;
        case 'CSV':
          sessionData = this.parseCSV(fileContent);
          break;
        case 'TXT':
          sessionData = this.parseTXT(fileContent);
          break;
        default:
          throw new Error(`Unsupported file type: ${fileType}`);
      }

      // Process and save the data
      await this.processImportedData(raceId, sessionData);

      console.log('Session file imported successfully');
    } catch (error) {
      console.error('Error importing session file:', error);
      throw error;
    }
  }

  /**
   * Parse CSV file content
   */
  private parseCSV(content: string): any {
    const lines = content.split('\n');
    const headers = lines[0].split(',');
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(',');
        const row: any = {};
        
        headers.forEach((header, index) => {
          row[header.trim()] = values[index]?.trim();
        });
        
        data.push(row);
      }
    }

    return data;
  }

  /**
   * Parse TXT file content
   */
  private parseTXT(content: string): any {
    // Simple text parsing - this would need to be customized based on F1 23 export format
    const lines = content.split('\n');
    const data = [];

    for (const line of lines) {
      if (line.trim()) {
        // Parse line format (this is a placeholder)
        const parts = line.split(/\s+/);
        if (parts.length >= 3) {
          data.push({
            position: parts[0],
            driver: parts[1],
            time: parts[2]
          });
        }
      }
    }

    return data;
  }

  /**
   * Process imported data
   */
  private async processImportedData(raceId: string, data: any): Promise<void> {
    // TODO: Implement data processing logic
    console.log(`Processing imported data for race ${raceId}:`, data);
  }

  /**
   * Get session statistics
   */
  async getSessionStatistics(raceId: string): Promise<any> {
    // TODO: Implement session statistics
    return {
      totalDrivers: 0,
      averageLapTime: 0,
      fastestLap: 0,
      slowestLap: 0,
      totalPenalties: 0
    };
  }
}
