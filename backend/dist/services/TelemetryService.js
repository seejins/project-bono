"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelemetryService = void 0;
const f1_23_udp_1 = require("f1-23-udp");
const events_1 = require("events");
class TelemetryService extends events_1.EventEmitter {
    constructor() {
        super();
        this.isRunning = false;
        this.lastData = null;
        this.dataBuffer = [];
        this.BUFFER_SIZE = 1000; // Keep last 1000 data points
        this.sessionStartTime = null;
        this.currentSessionData = [];
        this.f123 = new f1_23_udp_1.F123UDP();
        this.setupF123Handlers();
    }
    setupF123Handlers() {
        // Motion data (car telemetry)
        this.f123.on('motion', (data) => {
            try {
                const telemetryData = this.convertMotionData(data);
                this.processTelemetryData(telemetryData);
            }
            catch (error) {
                console.error('Error processing motion data:', error);
            }
        });
        // Session data
        this.f123.on('session', (data) => {
            try {
                const sessionData = this.convertSessionData(data);
                this.handleSessionData(sessionData);
            }
            catch (error) {
                console.error('Error processing session data:', error);
            }
        });
        // Car status data
        this.f123.on('carStatus', (data) => {
            try {
                const statusData = this.convertCarStatusData(data);
                this.processTelemetryData(statusData);
            }
            catch (error) {
                console.error('Error processing car status data:', error);
            }
        });
        // Lap data
        this.f123.on('lapData', (data) => {
            try {
                const lapData = this.convertLapData(data);
                this.processTelemetryData(lapData);
            }
            catch (error) {
                console.error('Error processing lap data:', error);
            }
        });
    }
    // Convert F1 23 UDP motion data to our format
    convertMotionData(data) {
        return {
            sessionType: data.sessionType || 0,
            sessionTimeLeft: data.sessionTimeLeft || 0,
            sessionDuration: data.sessionDuration || 0,
            driverName: data.driverName || 'Unknown',
            teamName: data.teamName || 'Unknown',
            carPosition: data.carPosition || 0,
            numCars: data.numCars || 0,
            carNumber: data.carNumber || 0,
            lapTime: data.lapTime || 0,
            sector1Time: data.sector1Time || 0,
            sector2Time: data.sector2Time || 0,
            sector3Time: data.sector3Time || 0,
            lapNumber: data.lapNumber || 0,
            currentLapTime: data.currentLapTime || 0,
            lastLapTime: data.lastLapTime || 0,
            bestLapTime: data.bestLapTime || 0,
            speed: data.speed || 0,
            throttle: data.throttle || 0,
            brake: data.brake || 0,
            steering: data.steering || 0,
            gear: data.gear || 0,
            engineRPM: data.engineRPM || 0,
            tireWear: {
                frontLeft: data.tireWear?.frontLeft || 0,
                frontRight: data.tireWear?.frontRight || 0,
                rearLeft: data.tireWear?.rearLeft || 0,
                rearRight: data.tireWear?.rearRight || 0
            },
            tireTemperature: {
                frontLeft: data.tireTemperature?.frontLeft || 0,
                frontRight: data.tireTemperature?.frontRight || 0,
                rearLeft: data.tireTemperature?.rearLeft || 0,
                rearRight: data.tireTemperature?.rearRight || 0
            },
            fuelLevel: data.fuelLevel || 0,
            fuelCapacity: data.fuelCapacity || 0,
            energyStore: data.energyStore || 0,
            airTemperature: data.airTemperature || 0,
            trackTemperature: data.trackTemperature || 0,
            rainPercentage: data.rainPercentage || 0,
            drsEnabled: data.drsEnabled || false,
            ersDeployMode: data.ersDeployMode || 0,
            fuelMix: data.fuelMix || 0,
            penalties: data.penalties || 0,
            warnings: data.warnings || 0,
            numUnservedDriveThroughPens: data.numUnservedDriveThroughPens || 0,
            numUnservedStopGoPens: data.numUnservedStopGoPens || 0,
            timestamp: new Date()
        };
    }
    // Convert F1 23 UDP session data
    convertSessionData(data) {
        return {
            sessionType: data.sessionType || 0,
            sessionTimeLeft: data.sessionTimeLeft || 0,
            sessionDuration: data.sessionDuration || 0,
            driverName: data.driverName || 'Unknown',
            teamName: data.teamName || 'Unknown',
            carPosition: data.carPosition || 0,
            numCars: data.numCars || 0,
            carNumber: data.carNumber || 0,
            lapTime: data.lapTime || 0,
            sector1Time: data.sector1Time || 0,
            sector2Time: data.sector2Time || 0,
            sector3Time: data.sector3Time || 0,
            lapNumber: data.lapNumber || 0,
            currentLapTime: data.currentLapTime || 0,
            lastLapTime: data.lastLapTime || 0,
            bestLapTime: data.bestLapTime || 0,
            speed: 0, // Not available in session data
            throttle: 0,
            brake: 0,
            steering: 0,
            gear: 0,
            engineRPM: 0,
            tireWear: { frontLeft: 0, frontRight: 0, rearLeft: 0, rearRight: 0 },
            tireTemperature: { frontLeft: 0, frontRight: 0, rearLeft: 0, rearRight: 0 },
            fuelLevel: 0,
            fuelCapacity: 0,
            energyStore: 0,
            airTemperature: data.airTemperature || 0,
            trackTemperature: data.trackTemperature || 0,
            rainPercentage: data.rainPercentage || 0,
            drsEnabled: false,
            ersDeployMode: 0,
            fuelMix: 0,
            penalties: data.penalties || 0,
            warnings: data.warnings || 0,
            numUnservedDriveThroughPens: data.numUnservedDriveThroughPens || 0,
            numUnservedStopGoPens: data.numUnservedStopGoPens || 0,
            timestamp: new Date()
        };
    }
    // Convert F1 23 UDP car status data
    convertCarStatusData(data) {
        return {
            sessionType: data.sessionType || 0,
            sessionTimeLeft: data.sessionTimeLeft || 0,
            sessionDuration: data.sessionDuration || 0,
            driverName: data.driverName || 'Unknown',
            teamName: data.teamName || 'Unknown',
            carPosition: data.carPosition || 0,
            numCars: data.numCars || 0,
            carNumber: data.carNumber || 0,
            lapTime: data.lapTime || 0,
            sector1Time: data.sector1Time || 0,
            sector2Time: data.sector2Time || 0,
            sector3Time: data.sector3Time || 0,
            lapNumber: data.lapNumber || 0,
            currentLapTime: data.currentLapTime || 0,
            lastLapTime: data.lastLapTime || 0,
            bestLapTime: data.bestLapTime || 0,
            speed: 0,
            throttle: 0,
            brake: 0,
            steering: 0,
            gear: 0,
            engineRPM: 0,
            tireWear: {
                frontLeft: data.tireWear?.frontLeft || 0,
                frontRight: data.tireWear?.frontRight || 0,
                rearLeft: data.tireWear?.rearLeft || 0,
                rearRight: data.tireWear?.rearRight || 0
            },
            tireTemperature: {
                frontLeft: data.tireTemperature?.frontLeft || 0,
                frontRight: data.tireTemperature?.frontRight || 0,
                rearLeft: data.tireTemperature?.rearLeft || 0,
                rearRight: data.tireTemperature?.rearRight || 0
            },
            fuelLevel: data.fuelLevel || 0,
            fuelCapacity: data.fuelCapacity || 0,
            energyStore: data.energyStore || 0,
            airTemperature: data.airTemperature || 0,
            trackTemperature: data.trackTemperature || 0,
            rainPercentage: data.rainPercentage || 0,
            drsEnabled: data.drsEnabled || false,
            ersDeployMode: data.ersDeployMode || 0,
            fuelMix: data.fuelMix || 0,
            penalties: data.penalties || 0,
            warnings: data.warnings || 0,
            numUnservedDriveThroughPens: data.numUnservedDriveThroughPens || 0,
            numUnservedStopGoPens: data.numUnservedStopGoPens || 0,
            timestamp: new Date()
        };
    }
    // Convert F1 23 UDP lap data
    convertLapData(data) {
        return {
            sessionType: data.sessionType || 0,
            sessionTimeLeft: data.sessionTimeLeft || 0,
            sessionDuration: data.sessionDuration || 0,
            driverName: data.driverName || 'Unknown',
            teamName: data.teamName || 'Unknown',
            carPosition: data.carPosition || 0,
            numCars: data.numCars || 0,
            carNumber: data.carNumber || 0,
            lapTime: data.lapTime || 0,
            sector1Time: data.sector1Time || 0,
            sector2Time: data.sector2Time || 0,
            sector3Time: data.sector3Time || 0,
            lapNumber: data.lapNumber || 0,
            currentLapTime: data.currentLapTime || 0,
            lastLapTime: data.lastLapTime || 0,
            bestLapTime: data.bestLapTime || 0,
            speed: 0,
            throttle: 0,
            brake: 0,
            steering: 0,
            gear: 0,
            engineRPM: 0,
            tireWear: { frontLeft: 0, frontRight: 0, rearLeft: 0, rearRight: 0 },
            tireTemperature: { frontLeft: 0, frontRight: 0, rearLeft: 0, rearRight: 0 },
            fuelLevel: 0,
            fuelCapacity: 0,
            energyStore: 0,
            airTemperature: data.airTemperature || 0,
            trackTemperature: data.trackTemperature || 0,
            rainPercentage: data.rainPercentage || 0,
            drsEnabled: false,
            ersDeployMode: 0,
            fuelMix: 0,
            penalties: data.penalties || 0,
            warnings: data.warnings || 0,
            numUnservedDriveThroughPens: data.numUnservedDriveThroughPens || 0,
            numUnservedStopGoPens: data.numUnservedStopGoPens || 0,
            timestamp: new Date()
        };
    }
    // Handle session data changes
    handleSessionData(data) {
        // Detect session start
        if (data.sessionTimeLeft === data.sessionDuration) {
            this.sessionStartTime = new Date();
            this.currentSessionData = [];
            console.log('Session started:', this.getSessionTypeName(data.sessionType));
        }
        // Detect session end
        if (data.sessionTimeLeft === 0 && this.currentSessionData.length > 0) {
            this.autoExportSessionData();
        }
        // Emit session data
        this.emit('session', data);
    }
    processTelemetryData(data) {
        this.lastData = data;
        this.addToBuffer(data);
        this.currentSessionData.push(data);
        // Emit events for different data types
        this.emit('telemetry', data);
        this.emit('speed', data.speed);
        this.emit('tireWear', data.tireWear);
        this.emit('fuel', data.fuelLevel);
        this.emit('lap', data.lapNumber);
        // Emit alerts for critical conditions
        this.checkCriticalConditions(data);
    }
    addToBuffer(data) {
        this.dataBuffer.push(data);
        if (this.dataBuffer.length > this.BUFFER_SIZE) {
            this.dataBuffer.shift();
        }
    }
    // Get session type name
    getSessionTypeName(sessionType) {
        const sessionTypes = [
            'Unknown', 'Practice 1', 'Practice 2', 'Practice 3',
            'Short Practice', 'Q1', 'Q2', 'Q3', 'Short Qualifying',
            'One Shot Qualifying', 'Race', 'Race 2', 'Time Trial'
        ];
        return sessionTypes[sessionType] || 'Unknown';
    }
    // Auto-export session data when session ends
    async autoExportSessionData() {
        if (this.currentSessionData.length === 0)
            return;
        try {
            console.log('Session ended, exporting data...');
            // Extract final results from session data
            const finalResults = this.extractFinalResults(this.currentSessionData);
            // Calculate gaps to pole
            const poleTime = this.findPoleTime(finalResults);
            if (poleTime) {
                finalResults.forEach(driver => {
                    driver.gapToPole = driver.bestLapTime - poleTime;
                });
            }
            // Emit session completed event
            this.emit('sessionCompleted', {
                sessionType: this.currentSessionData[0].sessionType,
                sessionTypeName: this.getSessionTypeName(this.currentSessionData[0].sessionType),
                sessionStartTime: this.sessionStartTime,
                sessionEndTime: new Date(),
                drivers: finalResults
            });
            console.log('Session data exported successfully');
        }
        catch (error) {
            console.error('Error exporting session data:', error);
        }
    }
    // Extract final results from session data
    extractFinalResults(sessionData) {
        // Get the latest data point for each driver (in this case, just the host)
        const latestData = sessionData[sessionData.length - 1];
        return [latestData];
    }
    // Find pole position time
    findPoleTime(results) {
        const validTimes = results
            .map(r => r.bestLapTime)
            .filter(time => time > 0);
        return validTimes.length > 0 ? Math.min(...validTimes) : null;
    }
    checkCriticalConditions(data) {
        // Low fuel warning
        if (data.fuelLevel < 5) {
            this.emit('alert', { type: 'low_fuel', message: 'Low fuel warning!' });
        }
        // High tire wear warning
        const maxTireWear = Math.max(data.tireWear.frontLeft, data.tireWear.frontRight, data.tireWear.rearLeft, data.tireWear.rearRight);
        if (maxTireWear > 80) {
            this.emit('alert', { type: 'tire_wear', message: 'High tire wear detected!' });
        }
        // High tire temperature warning
        const maxTireTemp = Math.max(data.tireTemperature.frontLeft, data.tireTemperature.frontRight, data.tireTemperature.rearLeft, data.tireTemperature.rearRight);
        if (maxTireTemp > 120) {
            this.emit('alert', { type: 'tire_temp', message: 'High tire temperature!' });
        }
        // Penalty warnings
        if (data.penalties > 0) {
            this.emit('alert', { type: 'penalty', message: `Penalty received: ${data.penalties}` });
        }
    }
    start() {
        if (this.isRunning) {
            console.log('Telemetry service already running');
            return;
        }
        try {
            this.f123.start();
            this.isRunning = true;
            console.log('F1 23 UDP telemetry service started');
        }
        catch (error) {
            console.error('Failed to start telemetry service:', error);
            this.isRunning = false;
        }
    }
    stop() {
        if (!this.isRunning) {
            console.log('Telemetry service not running');
            return;
        }
        try {
            this.f123.stop();
            this.isRunning = false;
            console.log('F1 23 UDP telemetry service stopped');
        }
        catch (error) {
            console.error('Failed to stop telemetry service:', error);
        }
    }
    getLastData() {
        return this.lastData;
    }
    getDataBuffer() {
        return [...this.dataBuffer];
    }
    getCurrentSessionData() {
        return [...this.currentSessionData];
    }
}
exports.TelemetryService = TelemetryService;
//# sourceMappingURL=TelemetryService.js.map