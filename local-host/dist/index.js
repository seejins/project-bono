"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const f1_23_udp_1 = require("f1-23-udp");
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
class LocalHostApp {
    constructor() {
        this.currentSession = null;
        this.sessionStartTime = null;
        this.isUploading = false;
        this.cloudApiUrl = process.env.CLOUD_API_URL || '';
        this.apiKey = process.env.API_KEY || '';
        if (!this.cloudApiUrl || !this.apiKey) {
            console.error('❌ Missing required environment variables:');
            console.error('   CLOUD_API_URL:', this.cloudApiUrl ? '✅' : '❌');
            console.error('   API_KEY:', this.apiKey ? '✅' : '❌');
            process.exit(1);
        }
        this.udp = new f1_23_udp_1.F123UDP();
        this.setupEventHandlers();
    }
    setupEventHandlers() {
        // Use motionEx event as the main data source
        this.udp.on('motionEx', (data) => {
            if (!this.currentSession) {
                // Initialize session on first data
                this.sessionStartTime = new Date();
                this.currentSession = {
                    trackName: 'Unknown Track',
                    sessionType: 'Race',
                    date: this.sessionStartTime.toISOString(),
                    results: [],
                    drivers: []
                };
                console.log('🏁 Session started');
            }
            // Process motion data
            this.processMotionData(data);
        });
        // Handle any errors
        try {
            this.udp.on('error', (error) => {
                console.error('❌ UDP Error:', error);
            });
        }
        catch (e) {
            console.log('Note: Error event not available in this version');
        }
    }
    processMotionData(data) {
        if (!this.currentSession)
            return;
        // Simple motion data processing
        // This is a basic implementation - in reality you'd process
        // the motion data to extract lap times, positions, etc.
        console.log('📊 Processing motion data...');
    }
    processLapData(data) {
        if (!this.currentSession)
            return;
        // Find or create driver entry
        let driverIndex = this.currentSession.results.findIndex(r => r.driverNumber === data.driverNumber);
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
        }
        else {
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
    processCarStatus(data) {
        if (!this.currentSession)
            return;
        const driverIndex = this.currentSession.results.findIndex(r => r.driverNumber === data.driverNumber);
        if (driverIndex !== -1) {
            this.currentSession.results[driverIndex].tireCompound = data.tireCompound || 'unknown';
            this.currentSession.results[driverIndex].pitStops = data.pitStops || 0;
        }
    }
    processSessionData(data) {
        if (!this.currentSession)
            return;
        // Update grid positions
        if (data.gridPositions) {
            data.gridPositions.forEach((pos, index) => {
                const driverIndex = this.currentSession.results.findIndex(r => r.driverNumber === pos.driverNumber);
                if (driverIndex !== -1) {
                    this.currentSession.results[driverIndex].gridPosition = pos.position;
                }
            });
        }
    }
    async uploadSessionData() {
        if (!this.currentSession || this.isUploading)
            return;
        this.isUploading = true;
        console.log('📤 Uploading session data to cloud...');
        try {
            // Find fastest lap
            const fastestLapTime = Math.min(...this.currentSession.results
                .filter(r => r.lapTime > 0)
                .map(r => r.lapTime));
            // Mark fastest lap
            this.currentSession.results.forEach(result => {
                result.fastestLap = result.lapTime === fastestLapTime;
            });
            const response = await axios_1.default.post(`${this.cloudApiUrl}/api/sessions/upload`, {
                sessionData: this.currentSession,
                seasonId: process.env.SEASON_ID || 'default-season',
                raceId: null // Let the backend create a new race
            }, {
                headers: {
                    'X-API-Key': this.apiKey,
                    'Content-Type': 'application/json'
                },
                timeout: 30000 // 30 second timeout
            });
            if (response.data.success) {
                console.log('✅ Session data uploaded successfully!');
                console.log(`   Race ID: ${response.data.raceId}`);
                console.log(`   Results: ${response.data.importedResults}`);
                console.log(`   Lap Times: ${response.data.importedLapTimes}`);
            }
            else {
                console.log('⚠️  Upload completed with warnings:', response.data.message);
                if (response.data.unmappedDrivers) {
                    console.log('   Unmapped drivers:', response.data.unmappedDrivers.join(', '));
                }
            }
        }
        catch (error) {
            console.error('❌ Failed to upload session data:', error);
            if (axios_1.default.isAxiosError(error)) {
                console.error('   Status:', error.response?.status);
                console.error('   Message:', error.response?.data?.error);
            }
        }
        finally {
            this.isUploading = false;
            this.currentSession = null;
            this.sessionStartTime = null;
        }
    }
    async start() {
        console.log('🚀 Starting F1 23 UDP Capture...');
        console.log(`📡 Cloud API: ${this.cloudApiUrl}`);
        console.log('🎮 Waiting for F1 23 session...');
        console.log('   Make sure F1 23 is running and UDP is enabled');
        console.log('   UDP Port: 20777');
        console.log('');
        try {
            await this.udp.start();
            console.log('✅ UDP listener started successfully');
        }
        catch (error) {
            console.error('❌ Failed to start UDP listener:', error);
            process.exit(1);
        }
    }
    async stop() {
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
//# sourceMappingURL=index.js.map