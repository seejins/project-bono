// Mock data service for Live Timings testing
export interface MockDriverData {
  id: string;
  position: number;
  driverName: string;
  driverAbbreviation: string;
  teamColor: string;
  fastestLap: string;
  fastestLapTire: 'S' | 'M' | 'H';
  gap: string;
  currentLapTime: string;
  lastLapTime: string;
  bestLap: string;
  interval: string;
  status: 'RUNNING' | 'OUT_LAP' | 'IN_LAP' | 'PITTING' | 'PIT' | 'OUT' | 'DNF';
  positionChange: number;
  lapsOnCompound: number;
  tireCompound: 'S' | 'M' | 'H';
  sector1Time?: string;
  sector2Time?: string;
  sector3Time?: string;
  // Personal best sector times
  personalBestS1?: string;
  personalBestS2?: string;
  personalBestS3?: string;
  microSectors: Array<'purple' | 'green' | 'yellow' | 'grey'>;
  stintHistory: Array<{
    compound: 'S' | 'M' | 'H';
    laps: number;
  }>;
  stintLaps: number; // Simplified - direct from UDP tyresAgeLaps
  totalRaceLaps: number;
  // New stint tracking fields
  currentTire: 'S' | 'M' | 'H' | 'I' | 'W';
  lapNumber: number;
  // F1 23 UDP status fields
  resultStatus: number; // 0=invalid, 1=inactive, 2=active, 3=finished, 4=dnf, 5=disqualified, 6=not classified, 7=retired
  driverStatus: number; // 0=in garage, 1=flying lap, 2=in lap, 3=out lap, 4=on track
}

export interface MockSessionData {
  sessionType: 'PRACTICE' | 'QUALIFYING' | 'RACE';
  trackName: string;
  timeRemaining?: number;
  currentLap?: number;
  totalLaps?: number;
  isConnected: boolean;
}

export class MockLiveTimingsService {
  private static instance: MockLiveTimingsService;
  private drivers: MockDriverData[] = [];
  private sessionData: MockSessionData | null = null;
  private updateInterval: NodeJS.Timeout | null = null;

  static getInstance(): MockLiveTimingsService {
    if (!MockLiveTimingsService.instance) {
      MockLiveTimingsService.instance = new MockLiveTimingsService();
    }
    return MockLiveTimingsService.instance;
  }

  // Initialize mock data
  initializeMockData(sessionType: 'PRACTICE' | 'QUALIFYING' | 'RACE' = 'PRACTICE') {
    this.sessionData = {
      sessionType,
      trackName: 'Silverstone',
      timeRemaining: sessionType === 'RACE' ? undefined : 45 * 60 * 1000, // 45 minutes
      currentLap: sessionType === 'RACE' ? 15 : undefined,
      totalLaps: sessionType === 'RACE' ? 52 : undefined,
      isConnected: true
    };

    this.drivers = this.generateMockDrivers(sessionType);
  }

  private generateMockDrivers(sessionType: 'PRACTICE' | 'QUALIFYING' | 'RACE'): MockDriverData[] {
    const baseDrivers = [
      { name: 'Lewis Hamilton', abbreviation: 'HAM', team: 'Mercedes', color: '#00D2BE' },
      { name: 'Max Verstappen', abbreviation: 'VER', team: 'Red Bull', color: '#0600EF' },
      { name: 'Charles Leclerc', abbreviation: 'LEC', team: 'Ferrari', color: '#DC143C' },
      { name: 'Lando Norris', abbreviation: 'NOR', team: 'McLaren', color: '#FF8700' },
      { name: 'George Russell', abbreviation: 'RUS', team: 'Mercedes', color: '#00D2BE' },
      { name: 'Carlos Sainz', abbreviation: 'SAI', team: 'Ferrari', color: '#DC143C' },
      { name: 'Oscar Piastri', abbreviation: 'PIA', team: 'McLaren', color: '#FF8700' },
      { name: 'Fernando Alonso', abbreviation: 'ALO', team: 'Aston Martin', color: '#006F62' },
      { name: 'Sergio Perez', abbreviation: 'PER', team: 'Red Bull', color: '#0600EF' },
      { name: 'Lance Stroll', abbreviation: 'STR', team: 'Aston Martin', color: '#006F62' },
      { name: 'Pierre Gasly', abbreviation: 'GAS', team: 'Alpine', color: '#0090FF' },
      { name: 'Esteban Ocon', abbreviation: 'OCO', team: 'Alpine', color: '#0090FF' },
      { name: 'Yuki Tsunoda', abbreviation: 'TSU', team: 'AlphaTauri', color: '#2B4562' },
      { name: 'Daniel Ricciardo', abbreviation: 'RIC', team: 'AlphaTauri', color: '#2B4562' },
      { name: 'Valtteri Bottas', abbreviation: 'BOT', team: 'Alfa Romeo', color: '#900000' },
      { name: 'Zhou Guanyu', abbreviation: 'ZHO', team: 'Alfa Romeo', color: '#900000' },
      { name: 'Nico Hulkenberg', abbreviation: 'HUL', team: 'Haas', color: '#FFFFFF' },
      { name: 'Kevin Magnussen', abbreviation: 'MAG', team: 'Haas', color: '#FFFFFF' },
      { name: 'Alex Albon', abbreviation: 'ALB', team: 'Williams', color: '#005AFF' },
      { name: 'Logan Sargeant', abbreviation: 'SAR', team: 'Williams', color: '#005AFF' }
    ];

    return baseDrivers.map((driver, index) => {
      const position = index + 1;
      const baseTime = 87.5; // Base lap time in seconds
      const variation = (Math.random() - 0.5) * 2; // ±1 second variation
      const lapTime = baseTime + variation + (index * 0.1); // Position-based time difference
      
      const fastestLap = this.formatLapTime(lapTime);
      const currentLap = this.formatLapTime(lapTime + Math.random() * 0.5);
      const lastLap = this.formatLapTime(lapTime + (Math.random() - 0.5) * 0.3);
      
      const gap = position === 1 ? 'LEADER' : `+${this.formatGap((position - 1) * 0.1 + Math.random() * 0.2)}`;
      const interval = position === 1 ? '' : `+${this.formatGap(0.1 + Math.random() * 0.1)}`;
      
      const tireCompounds: ('S' | 'M' | 'H')[] = ['S', 'M', 'H'];
      const fastestTire = tireCompounds[Math.floor(Math.random() * 3)];
      const currentTire = tireCompounds[Math.floor(Math.random() * 3)];
      
      const statuses: MockDriverData['status'][] = ['RUNNING', 'OUT_LAP', 'IN_LAP', 'PITTING', 'PIT', 'OUT'];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      // Generate result status - mostly active drivers, some retired
      const resultStatuses = [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 4, 7]; // Mostly active (2), some DNF (4) and Retired (7)
      const resultStatus = resultStatuses[Math.floor(Math.random() * resultStatuses.length)];
      
      // Generate driver status based on result status
      const driverStatus = resultStatus === 2 ? 4 : 0; // Active = on track (4), Retired = in garage (0)
      
      const positionChange = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
      
      const lapsOnCompound = Math.floor(Math.random() * 15) + 1;
      
      const sectorTimes = this.generateSectorTimes(lapTime);
      const personalBestSectors = this.generateSectorTimes(lapTime * 0.95); // Personal bests are 5% faster
      
      const microSectors = this.generateMicroSectors();
      
      const stintHistory = this.generateStintHistory(sessionType);
      const currentStintLaps = Math.floor(Math.random() * 15) + 1; // Random current stint laps
      const totalRaceLaps = this.getTotalLapsForSession(sessionType);

      return {
        id: driver.abbreviation.toLowerCase(),
        position,
        driverName: driver.name,
        driverAbbreviation: driver.abbreviation,
        teamColor: driver.color,
        fastestLap,
        fastestLapTire: fastestTire,
        gap,
        currentLapTime: status === 'OUT_LAP' ? 'OUT LAP' : currentLap,
        lastLapTime: lastLap,
        bestLap: fastestLap,
        interval,
        status,
        positionChange,
        lapsOnCompound,
        tireCompound: currentTire,
        sector1Time: sectorTimes.s1,
        sector2Time: sectorTimes.s2,
        sector3Time: sectorTimes.s3,
        personalBestS1: personalBestSectors.s1,
        personalBestS2: personalBestSectors.s2,
        personalBestS3: personalBestSectors.s3,
        microSectors,
        stintHistory,
        stintLaps: lapsOnCompound, // Direct from UDP m_tyres_age_laps
        totalRaceLaps,
        // New stint tracking fields
        currentTire: currentTire as 'S' | 'M' | 'H' | 'I' | 'W',
        lapNumber: Math.floor(Math.random() * 52) + 1,
        // F1 23 UDP status fields
        resultStatus,
        driverStatus
      };
    });
  }

  private formatLapTime(timeInSeconds: number): string {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = (timeInSeconds % 60).toFixed(3);
    return `${minutes}:${seconds}`;
  }

  private formatGap(gapInSeconds: number): string {
    return gapInSeconds.toFixed(3);
  }

  private getTotalLapsForSession(sessionType: 'PRACTICE' | 'QUALIFYING' | 'RACE'): number {
    // Simulate different track lengths and lap counts
    switch (sessionType) {
      case 'RACE':
        // Simulate different race distances based on track
        const raceLaps = [52, 58, 44, 71, 50, 66, 53, 57, 49, 63, 55, 59, 51, 67, 48, 61, 54, 56, 50, 65, 53, 58];
        return raceLaps[Math.floor(Math.random() * raceLaps.length)];
      case 'QUALIFYING':
        return 18; // Typical qualifying session
      case 'PRACTICE':
        return 25; // Typical practice session
      default:
        return 52;
    }
  }

  private generateSectorTimes(totalTime: number): { s1: string; s2: string; s3: string } {
    const s1Time = (totalTime * 0.3) + (Math.random() - 0.5) * 0.5;
    const s2Time = (totalTime * 0.4) + (Math.random() - 0.5) * 0.5;
    const s3Time = totalTime - s1Time - s2Time;
    
    return {
      s1: s1Time.toFixed(3),
      s2: s2Time.toFixed(3),
      s3: s3Time.toFixed(3)
    };
  }

  private generateMicroSectors(): Array<'purple' | 'green' | 'yellow' | 'grey'> {
    const microSectors: Array<'purple' | 'green' | 'yellow' | 'grey'> = [];
    
    // Simulate progressive lap progress (0-24 micro-sectors)
    const completedSectors = Math.floor(Math.random() * 25); // 0-24 completed sectors
    
    for (let i = 0; i < 24; i++) {
      if (i < completedSectors) {
        // Completed micro-sectors get colors based on performance
        const rand = Math.random();
        if (rand < 0.1) {
          microSectors.push('purple'); // 10% chance for fastest overall
        } else if (rand < 0.3) {
          microSectors.push('green'); // 20% chance for personal best
        } else {
          microSectors.push('yellow'); // 70% chance for average/slower
        }
      } else {
        // Uncompleted micro-sectors are grey
        microSectors.push('grey');
      }
    }
    
    return microSectors;
  }

  private generateProgressiveMicroSectors(completedSectors: number): Array<'purple' | 'green' | 'yellow' | 'grey'> {
    const microSectors: Array<'purple' | 'green' | 'yellow' | 'grey'> = [];
    
    for (let i = 0; i < 24; i++) {
      if (i < completedSectors) {
        // Completed micro-sectors get colors based on performance
        const rand = Math.random();
        if (rand < 0.1) {
          microSectors.push('purple'); // 10% chance for fastest overall
        } else if (rand < 0.3) {
          microSectors.push('green'); // 20% chance for personal best
        } else {
          microSectors.push('yellow'); // 70% chance for average/slower
        }
      } else {
        // Uncompleted micro-sectors are grey
        microSectors.push('grey');
      }
    }
    
    return microSectors;
  }

  private generateStintHistory(sessionType: 'PRACTICE' | 'QUALIFYING' | 'RACE'): Array<{ compound: 'S' | 'M' | 'H'; laps: number }> {
    if (sessionType === 'RACE') {
      const stints: Array<{ compound: 'S' | 'M' | 'H'; laps: number }> = [];
      const totalLaps = 52;
      let remainingLaps = totalLaps;
      let currentLap = Math.floor(Math.random() * 30) + 10; // Random current lap between 10-40
      
      // Generate completed stints
      while (remainingLaps > 0 && stints.length < 3) { // Max 3 stints for simplicity
        const stintLaps = Math.min(Math.floor(Math.random() * 15) + 8, remainingLaps);
        const compound: 'S' | 'M' | 'H' = ['S', 'M', 'H'][Math.floor(Math.random() * 3)] as 'S' | 'M' | 'H';
        
        if (stints.length === 0 || stints[stints.length - 1].compound !== compound) {
          stints.push({ compound, laps: stintLaps });
          remainingLaps -= stintLaps;
        }
      }
      
      return stints;
    } else {
      // Practice/Qualifying - single stint
      return [{ compound: 'M', laps: 15 }];
    }
  }

  // Start real-time updates
  startRealTimeUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(() => {
      this.updateDriverData();
    }, 2000); // Update every 2 seconds
  }

  // Stop real-time updates
  stopRealTimeUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  private updateDriverData() {
    // Simulate real-time updates
    this.drivers = this.drivers.map(driver => {
      // Randomly update current lap time
      if (driver.status === 'RUNNING') {
        const baseTime = parseFloat(driver.fastestLap.replace(':', '.'));
        const variation = (Math.random() - 0.5) * 0.5;
        const newTime = baseTime + variation;
        driver.currentLapTime = this.formatLapTime(newTime);
      }

      // Randomly update sector times (40% chance for more frequent updates)
      if (Math.random() < 0.4) {
        const sectorTimes = this.generateSectorTimes(parseFloat(driver.fastestLap.replace(':', '.')));
        
        // Check if new sector times are personal bests
        const currentS1 = parseFloat(sectorTimes.s1);
        const currentS2 = parseFloat(sectorTimes.s2);
        const currentS3 = parseFloat(sectorTimes.s3);
        const personalBestS1 = parseFloat(driver.personalBestS1 || '0');
        const personalBestS2 = parseFloat(driver.personalBestS2 || '0');
        const personalBestS3 = parseFloat(driver.personalBestS3 || '0');
        
        // Update sector times
        driver.sector1Time = sectorTimes.s1;
        driver.sector2Time = sectorTimes.s2;
        driver.sector3Time = sectorTimes.s3;
        
        // Update personal bests if new times are better (20% chance to simulate improvement)
        if (Math.random() < 0.2) {
          if (currentS1 < personalBestS1 || personalBestS1 === 0) {
            driver.personalBestS1 = sectorTimes.s1;
          }
          if (currentS2 < personalBestS2 || personalBestS2 === 0) {
            driver.personalBestS2 = sectorTimes.s2;
          }
          if (currentS3 < personalBestS3 || personalBestS3 === 0) {
            driver.personalBestS3 = sectorTimes.s3;
          }
        }
      }

      // Simulate progressive micro-sector completion and lap resets
      if (driver.status === 'RUNNING' && Math.random() < 0.4) {
        const currentCompleted = driver.microSectors.filter(s => s !== 'grey').length;
        
        // Simulate lap completion (reset to 0) or progression
        if (currentCompleted >= 24 && Math.random() < 0.1) {
          // New lap started - reset micro-sectors to all grey
          driver.microSectors = this.generateProgressiveMicroSectors(0);
        } else if (currentCompleted < 24) {
          // Progress through micro-sectors progressively
          const newCompleted = Math.min(currentCompleted + 1, 24);
          driver.microSectors = this.generateProgressiveMicroSectors(newCompleted);
        }
      }

      // Randomly update position changes (10% chance)
      if (Math.random() < 0.1) {
        driver.positionChange = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
      }

      // Update laps on compound for race
      if (this.sessionData?.sessionType === 'RACE' && driver.status === 'RUNNING') {
        driver.lapsOnCompound += 1;
      }

      return driver;
    });
  }

  // Get current drivers data
  getDrivers(): MockDriverData[] {
    return [...this.drivers];
  }

  // Get current session data
  getSessionData(): MockSessionData | null {
    return this.sessionData;
  }

  // Switch session type
  switchSessionType(sessionType: 'PRACTICE' | 'QUALIFYING' | 'RACE') {
    this.stopRealTimeUpdates();
    this.initializeMockData(sessionType);
    this.startRealTimeUpdates();
  }

  // Simulate connection status
  toggleConnection() {
    if (this.sessionData) {
      this.sessionData.isConnected = !this.sessionData.isConnected;
    }
  }

  // Cleanup
  destroy() {
    this.stopRealTimeUpdates();
    this.drivers = [];
    this.sessionData = null;
  }
}

export default MockLiveTimingsService;
