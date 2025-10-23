import dgram from 'dgram';
import { EventEmitter } from 'events';

export interface TelemetryData {
  // Car telemetry
  speed: number;
  throttle: number;
  brake: number;
  steering: number;
  gear: number;
  engineRPM: number;
  engineTemperature: number;
  
  // Tire data
  tireWear: {
    frontLeft: number;
    frontRight: number;
    rearLeft: number;
    rearRight: number;
  };
  tireTemperature: {
    frontLeft: number;
    frontRight: number;
    rearLeft: number;
    rearRight: number;
  };
  
  // Fuel and energy
  fuelLevel: number;
  fuelCapacity: number;
  energyStore: number;
  
  // Position and timing
  lapTime: number;
  sector1Time: number;
  sector2Time: number;
  sector3Time: number;
  lapDistance: number;
  totalDistance: number;
  
  // Weather and track conditions
  airTemperature: number;
  trackTemperature: number;
  rainPercentage: number;
  
  // Car status
  drsEnabled: boolean;
  ersDeployMode: number;
  fuelMix: number;
  
  // Session info
  sessionType: string;
  sessionTime: number;
  sessionTimeLeft: number;
  lapNumber: number;
  currentLapTime: number;
  lastLapTime: number;
  bestLapTime: number;
  
  // Driver info
  driverName: string;
  teamName: string;
  carPosition: number;
  numCars: number;
}

export class TelemetryService extends EventEmitter {
  private socket: dgram.Socket;
  private isRunning: boolean = false;
  private lastData: TelemetryData | null = null;
  private dataBuffer: TelemetryData[] = [];
  private readonly BUFFER_SIZE = 1000; // Keep last 1000 data points

  constructor() {
    super();
    this.socket = dgram.createSocket('udp4');
    this.setupSocketHandlers();
  }

  private setupSocketHandlers(): void {
    this.socket.on('message', (msg) => {
      try {
        const data = this.parseTelemetryData(msg);
        this.processTelemetryData(data);
      } catch (error) {
        console.error('Error parsing telemetry data:', error);
      }
    });

    this.socket.on('error', (error) => {
      console.error('Telemetry socket error:', error);
    });
  }

  private parseTelemetryData(buffer: Buffer): TelemetryData {
    // F1 game telemetry packet structure
    // This is a simplified parser - real implementation would need
    // to handle the actual F1 game packet format
    const data: TelemetryData = {
      speed: buffer.readFloatLE(0) || 0,
      throttle: buffer.readFloatLE(4) || 0,
      brake: buffer.readFloatLE(8) || 0,
      steering: buffer.readFloatLE(12) || 0,
      gear: buffer.readInt8(16) || 0,
      engineRPM: buffer.readUInt16LE(17) || 0,
      engineTemperature: buffer.readFloatLE(19) || 0,
      
      tireWear: {
        frontLeft: buffer.readFloatLE(23) || 0,
        frontRight: buffer.readFloatLE(27) || 0,
        rearLeft: buffer.readFloatLE(31) || 0,
        rearRight: buffer.readFloatLE(35) || 0,
      },
      
      tireTemperature: {
        frontLeft: buffer.readFloatLE(39) || 0,
        frontRight: buffer.readFloatLE(43) || 0,
        rearLeft: buffer.readFloatLE(47) || 0,
        rearRight: buffer.readFloatLE(51) || 0,
      },
      
      fuelLevel: buffer.readFloatLE(55) || 0,
      fuelCapacity: buffer.readFloatLE(59) || 0,
      energyStore: buffer.readFloatLE(63) || 0,
      
      lapTime: buffer.readFloatLE(67) || 0,
      sector1Time: buffer.readFloatLE(71) || 0,
      sector2Time: buffer.readFloatLE(75) || 0,
      sector3Time: buffer.readFloatLE(79) || 0,
      lapDistance: buffer.readFloatLE(83) || 0,
      totalDistance: buffer.readFloatLE(87) || 0,
      
      airTemperature: buffer.readFloatLE(91) || 0,
      trackTemperature: buffer.readFloatLE(95) || 0,
      rainPercentage: buffer.readFloatLE(99) || 0,
      
      drsEnabled: buffer.readUInt8(103) === 1,
      ersDeployMode: buffer.readUInt8(104) || 0,
      fuelMix: buffer.readUInt8(105) || 0,
      
      sessionType: this.getSessionType(buffer.readUInt8(106)),
      sessionTime: buffer.readFloatLE(107) || 0,
      sessionTimeLeft: buffer.readFloatLE(111) || 0,
      lapNumber: buffer.readUInt16LE(115) || 0,
      currentLapTime: buffer.readFloatLE(117) || 0,
      lastLapTime: buffer.readFloatLE(121) || 0,
      bestLapTime: buffer.readFloatLE(125) || 0,
      
      driverName: this.extractString(buffer, 129, 32),
      teamName: this.extractString(buffer, 161, 32),
      carPosition: buffer.readUInt8(193) || 0,
      numCars: buffer.readUInt8(194) || 0,
    };

    return data;
  }

  private extractString(buffer: Buffer, offset: number, length: number): string {
    const stringBuffer = buffer.slice(offset, offset + length);
    const nullIndex = stringBuffer.indexOf(0);
    return stringBuffer.slice(0, nullIndex > -1 ? nullIndex : length).toString('utf8');
  }

  private getSessionType(type: number): string {
    const sessionTypes = [
      'Unknown', 'Practice 1', 'Practice 2', 'Practice 3',
      'Short Practice', 'Q1', 'Q2', 'Q3', 'Short Qualifying',
      'One Shot Qualifying', 'Race', 'Race 2', 'Time Trial'
    ];
    return sessionTypes[type] || 'Unknown';
  }

  private processTelemetryData(data: TelemetryData): void {
    this.lastData = data;
    this.addToBuffer(data);
    
    // Emit events for different data types
    this.emit('telemetry', data);
    this.emit('speed', data.speed);
    this.emit('tireWear', data.tireWear);
    this.emit('fuel', data.fuelLevel);
    this.emit('lap', data.lapNumber);
    
    // Emit alerts for critical conditions
    this.checkCriticalConditions(data);
  }

  private addToBuffer(data: TelemetryData): void {
    this.dataBuffer.push(data);
    if (this.dataBuffer.length > this.BUFFER_SIZE) {
      this.dataBuffer.shift();
    }
  }

  private checkCriticalConditions(data: TelemetryData): void {
    // Low fuel warning
    if (data.fuelLevel < 5) {
      this.emit('alert', { type: 'low_fuel', message: 'Low fuel warning!' });
    }
    
    // High tire wear
    const maxTireWear = Math.max(...Object.values(data.tireWear));
    if (maxTireWear > 0.8) {
      this.emit('alert', { type: 'tire_wear', message: 'High tire wear detected!' });
    }
    
    // Engine temperature
    if (data.engineTemperature > 120) {
      this.emit('alert', { type: 'engine_temp', message: 'High engine temperature!' });
    }
  }

  public start(): void {
    if (this.isRunning) return;
    
    const port = parseInt(process.env.TELEMETRY_PORT || '20777');
    this.socket.bind(port, () => {
      this.isRunning = true;
      console.log(`📡 Telemetry service listening on port ${port}`);
    });
  }

  public stop(): void {
    if (!this.isRunning) return;
    
    this.socket.close();
    this.isRunning = false;
    console.log('📡 Telemetry service stopped');
  }

  public getLastData(): TelemetryData | null {
    return this.lastData;
  }

  public getDataBuffer(): TelemetryData[] {
    return [...this.dataBuffer];
  }

  public getAverageData(points: number = 10): TelemetryData | null {
    if (this.dataBuffer.length === 0) return null;
    
    const recentData = this.dataBuffer.slice(-points);
    const avg = recentData.reduce((acc, data) => ({
      speed: acc.speed + data.speed,
      throttle: acc.throttle + data.throttle,
      brake: acc.brake + data.brake,
      // ... other fields
    }), {
      speed: 0, throttle: 0, brake: 0,
      // ... initialize other fields
    });

    // Divide by count to get average
    Object.keys(avg).forEach(key => {
      avg[key] = avg[key] / recentData.length;
    });

    return avg as TelemetryData;
  }
}
