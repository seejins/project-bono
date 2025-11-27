import { F123UDP } from 'f1-23-udp';
import dotenv from 'dotenv';
import { io, Socket } from 'socket.io-client';

dotenv.config();

const DEBUG = process.env.DEBUG === 'true';

class LocalHostApp {
  private udp: F123UDP;
  private cloudApiUrl: string;
  private apiKey: string;
  private socket: Socket | null = null;
  private isStreaming = false;

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
    this.setupSocketConnection();
    this.setupEventHandlers();
  }

  private setupSocketConnection() {
    // Connect to cloud backend via Socket.IO
    const socketUrl = this.cloudApiUrl.replace(/\/$/, ''); // Remove trailing slash
    this.socket = io(socketUrl, {
      auth: {
        apiKey: this.apiKey
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
      reconnectionDelayMax: 5000
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to cloud backend via Socket.IO');
      this.isStreaming = true;
      if (DEBUG) {
        console.log('📡 Socket.IO connection established');
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('⚠️  Disconnected from cloud backend:', reason);
      this.isStreaming = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket.IO connection error:', error.message);
      this.isStreaming = false;
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`✅ Reconnected to cloud backend (attempt ${attemptNumber})`);
      this.isStreaming = true;
    });
  }

  // Helper function to serialize BigInt values for Socket.IO
  private serializeBigInt(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'bigint') return obj.toString();
    if (Array.isArray(obj)) return obj.map(this.serializeBigInt.bind(this));
    if (typeof obj === 'object') {
      const result: any = {};
      for (const key in obj) {
        result[key] = this.serializeBigInt(obj[key]);
      }
      return result;
    }
    return obj;
  }

  // Forward UDP packet to backend via Socket.IO
  private forwardPacket(packetType: string, data: any) {
    if (!this.socket || !this.socket.connected) {
      return; // Don't try to send if not connected
    }

    try {
      const serializedData = this.serializeBigInt(data);
      this.socket.emit(`packet:${packetType}`, serializedData);
    } catch (error) {
      if (DEBUG) {
        console.error(`❌ Error forwarding ${packetType} packet:`, error);
      }
    }
  }

  private setupEventHandlers() {
    // Lap Data Packet (ID: 2) - Core timing data
    this.udp.on('lapData', (data: any) => {
      this.forwardPacket('lapData', data);
    });

    // Car Status Packet (ID: 7) - Tire and fuel data
    this.udp.on('carStatus', (data: any) => {
      this.forwardPacket('carStatus', data);
    });

    // Session History Packet (ID: 11) - Stint data
    this.udp.on('sessionHistory', (data: any) => {
      this.forwardPacket('sessionHistory', data);
    });

    // Participants Packet (ID: 4) - Driver information
    this.udp.on('participants', (data: any) => {
      this.forwardPacket('participants', data);
    });

    // Session Packet (ID: 1) - Session information
    this.udp.on('session', (data: any) => {
      this.forwardPacket('session', data);
    });

    // Event Packet (ID: 3) - Race events
    this.udp.on('event', (data: any) => {
      this.forwardPacket('event', data);
    });

    // Final Classification Packet (ID: 8) - Post-session results
    this.udp.on('finalClassification', (data: any) => {
      this.forwardPacket('finalClassification', data);
    });

    // Car Damage Packet (ID: 10) - Tire wear and damage data
    this.udp.on('carDamage', (data: any) => {
      this.forwardPacket('carDamage', data);
    });

    // Handle any errors
    try {
      this.udp.on('error' as any, (error: any) => {
        console.error('❌ UDP Error:', error);
      });
    } catch (e) {
      if (DEBUG) {
        console.log('Note: Error event not available in this version');
      }
    }
  }

  public async start() {
    console.log('🚀 Starting F1 23 UDP Capture...');
    console.log(`📡 Cloud API: ${this.cloudApiUrl}`);
    console.log('🔌 Connecting to cloud backend...');
    console.log('🎮 Waiting for F1 23 session...');
    console.log('   Make sure F1 23 is running and UDP is enabled');
    console.log('   UDP Port: 20777');
    console.log('');

    try {
      await this.udp.start();
      console.log('✅ UDP listener started successfully');
      console.log('📡 Streaming packets to cloud backend...');
    } catch (error) {
      console.error('❌ Failed to start UDP listener:', error);
      process.exit(1);
    }
  }

  public async stop() {
    console.log('\n🛑 Stopping UDP capture...');
    
    // Disconnect Socket.IO connection
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isStreaming = false;
    }
    
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
