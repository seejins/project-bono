import { F123UDP } from 'f1-23-udp';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

interface SessionData {
  trackName: string;
  sessionType: string;
  date: string;
  results: Array<{
    driverName: string;
    driverNumber: number;
    position: number;
    lapTime: number;
    sector1Time: number;
    sector2Time: number;
    sector3Time: number;
    fastestLap: boolean;
    status: string;
    gridPosition: number;
    pitStops: number;
    tireCompound: string;
  }>;
  drivers: Array<{
    driverName: string;
    driverNumber: number;
  }>;
}

class LocalHostApp {
  private udp: F123UDP;
  private cloudApiUrl: string;
  private apiKey: string;
  private currentSession: SessionData | null = null;
  private sessionStartTime: Date | null = null;
  private isUploading = false;

  constructor() {
    this.cloudApiUrl = process.env.CLOUD_API_URL || '';
    this.apiKey = process.env.API_KEY || '';
    
    if (!this.cloudApiUrl || !this.apiKey) {
      console.error('❌ Missing required environment variables:');
      console.error('   CLOUD_API_URL:', this.cloudApiUrl ? '✅' : '❌');
      console.error('   API_KEY:', this.apiKey ? '✅' : '❌');
      process.exit(1);
    }

    this.udp = new F123UDP();
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // Session start
    this.udp.on('sessionStarted', (data) => {
      console.log('🏁 Session started:', data.sessionType, 'at', data.trackName);
      this.sessionStartTime = new Date();
      this.currentSession = {
        trackName: data.trackName,
        sessionType: data.sessionType,
        date: this.sessionStartTime.toISOString(),
        results: [],
        drivers: []
      };
    });

    // Session end
    this.udp.on('sessionEnded', async (data) => {
      console.log('🏁 Session ended:', data.sessionType);
      if (this.currentSession) {
        await this.uploadSessionData();
      }
    });

    // Lap data
    this.udp.on('lapData', (data) => {
      if (!this.currentSession) return;
      
      // Process lap data and update session results
      this.processLapData(data);
    });

    // Car status (for tire compounds, pit stops)
    this.udp.on('carStatus', (data) => {
      if (!this.currentSession) return;
      
      // Update car status information
      this.processCarStatus(data);
    });

    // Session data (for grid positions, session info)
    this.udp.on('session', (data) => {
      if (!this.currentSession) return;
      
      // Update session information
      this.processSessionData(data);
    });

    // Error handling
    this.udp.on('error', (error) => {
      console.error('❌ UDP Error:', error);
    });
  }

  private processLapData(data: any) {
    if (!this.currentSession) return;

    // Find or create driver entry
    let driverIndex = this.currentSession.results.findIndex(
      r => r.driverNumber === data.driverNumber
    );

    if (driverIndex === -1) {
      // New driver
      this.currentSession.results.push({
        driverName: data.driverName || `Driver ${data.driverNumber}`,
        driverNumber: data.driverNumber,
        position: data.position,
        lapTime: data.lapTime,
        sector1Time: data.sector1Time || 0,
        sector2Time: data.sector2Time || 0,
        sector3Time: data.sector3Time || 0,
        fastestLap: false,
        status: 'running',
        gridPosition: data.position,
        pitStops: 0,
        tireCompound: 'unknown'
      });
    } else {
      // Update existing driver
      const driver = this.currentSession.results[driverIndex];
      driver.position = data.position;
      driver.lapTime = data.lapTime;
      driver.sector1Time = data.sector1Time || driver.sector1Time;
      driver.sector2Time = data.sector2Time || driver.sector2Time;
      driver.sector3Time = data.sector3Time || driver.sector3Time;
    }

    // Update drivers list
    if (!this.currentSession.drivers.find(d => d.driverNumber === data.driverNumber)) {
      this.currentSession.drivers.push({
        driverName: data.driverName || `Driver ${data.driverNumber}`,
        driverNumber: data.driverNumber
      });
    }
  }

  private processCarStatus(data: any) {
    if (!this.currentSession) return;

    const driverIndex = this.currentSession.results.findIndex(
      r => r.driverNumber === data.driverNumber
    );

    if (driverIndex !== -1) {
      this.currentSession.results[driverIndex].tireCompound = data.tireCompound || 'unknown';
      this.currentSession.results[driverIndex].pitStops = data.pitStops || 0;
    }
  }

  private processSessionData(data: any) {
    if (!this.currentSession) return;

    // Update grid positions
    if (data.gridPositions) {
      data.gridPositions.forEach((pos: any, index: number) => {
        const driverIndex = this.currentSession!.results.findIndex(
          r => r.driverNumber === pos.driverNumber
        );
        if (driverIndex !== -1) {
          this.currentSession!.results[driverIndex].gridPosition = pos.position;
        }
      });
    }
  }

  private async uploadSessionData() {
    if (!this.currentSession || this.isUploading) return;

    this.isUploading = true;
    console.log('📤 Uploading session data to cloud...');

    try {
      // Find fastest lap
      const fastestLapTime = Math.min(
        ...this.currentSession.results
          .filter(r => r.lapTime > 0)
          .map(r => r.lapTime)
      );

      // Mark fastest lap
      this.currentSession.results.forEach(result => {
        result.fastestLap = result.lapTime === fastestLapTime;
      });

      const response = await axios.post(
        `${this.cloudApiUrl}/api/sessions/upload`,
        {
          sessionData: this.currentSession,
          seasonId: process.env.SEASON_ID || 'default-season',
          raceId: null // Let the backend create a new race
        },
        {
          headers: {
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 second timeout
        }
      );

      if (response.data.success) {
        console.log('✅ Session data uploaded successfully!');
        console.log(`   Race ID: ${response.data.raceId}`);
        console.log(`   Results: ${response.data.importedResults}`);
        console.log(`   Lap Times: ${response.data.importedLapTimes}`);
      } else {
        console.log('⚠️  Upload completed with warnings:', response.data.message);
        if (response.data.unmappedDrivers) {
          console.log('   Unmapped drivers:', response.data.unmappedDrivers.join(', '));
        }
      }

    } catch (error) {
      console.error('❌ Failed to upload session data:', error);
      if (axios.isAxiosError(error)) {
        console.error('   Status:', error.response?.status);
        console.error('   Message:', error.response?.data?.error);
      }
    } finally {
      this.isUploading = false;
      this.currentSession = null;
      this.sessionStartTime = null;
    }
  }

  public async start() {
    console.log('🚀 Starting F1 23 UDP Capture...');
    console.log(`📡 Cloud API: ${this.cloudApiUrl}`);
    console.log('🎮 Waiting for F1 23 session...');
    console.log('   Make sure F1 23 is running and UDP is enabled');
    console.log('   UDP Port: 20777');
    console.log('');

    try {
      await this.udp.start();
      console.log('✅ UDP listener started successfully');
    } catch (error) {
      console.error('❌ Failed to start UDP listener:', error);
      process.exit(1);
    }
  }

  public async stop() {
    console.log('\n🛑 Stopping UDP capture...');
    await this.udp.stop();
    console.log('✅ UDP capture stopped');
  }
}

// Start the application
const app = new LocalHostApp();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await app.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await app.stop();
  process.exit(0);
});

// Start the app
app.start().catch((error) => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});
