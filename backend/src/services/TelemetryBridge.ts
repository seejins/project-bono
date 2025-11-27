import { Server, Socket } from 'socket.io';
import { TelemetryService } from './TelemetryService';
import logger from '../utils/logger';

export class TelemetryBridge {
  private io: Server;
  private telemetryService: TelemetryService;
  private connectedClients: Map<string, Socket> = new Map();
  private apiKey: string;

  constructor(io: Server, telemetryService: TelemetryService) {
    this.io = io;
    this.telemetryService = telemetryService;
    this.apiKey = process.env.API_KEY || '';
    
    if (!this.apiKey) {
      logger.warn('⚠️  API_KEY not set - TelemetryBridge authentication disabled');
    }
  }

  public setupHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      // Check authentication
      const auth = socket.handshake.auth;
      const providedApiKey = auth?.apiKey;

      // Only handle connections with API key (telemetry sources)
      // Regular frontend clients (no API key) are handled by socket/index.ts
      if (this.apiKey && providedApiKey === this.apiKey) {
        this.handleTelemetrySourceConnection(socket);
      } else if (providedApiKey && providedApiKey !== this.apiKey) {
        // Invalid API key provided - reject
        logger.warn(`⚠️  Rejected connection from ${socket.id} - invalid API key`);
        socket.emit('error', { message: 'Authentication failed' });
        socket.disconnect();
      }
      // If no API key provided, it's a regular frontend client - let socket/index.ts handle it
    });
  }

  private handleTelemetrySourceConnection(socket: Socket): void {
    logger.log(`📡 Telemetry source connected: ${socket.id}`);
    this.connectedClients.set(socket.id, socket);
    this.telemetryService.setRemoteSource(true);

    // Set up packet handlers
    socket.on('packet:lapData', (data: any) => {
      this.telemetryService.processRemotePacket('lapData', data);
    });

    socket.on('packet:carStatus', (data: any) => {
      this.telemetryService.processRemotePacket('carStatus', data);
    });

    socket.on('packet:sessionHistory', (data: any) => {
      this.telemetryService.processRemotePacket('sessionHistory', data);
    });

    socket.on('packet:participants', (data: any) => {
      this.telemetryService.processRemotePacket('participants', data);
    });

    socket.on('packet:session', (data: any) => {
      this.telemetryService.processRemotePacket('session', data);
    });

    socket.on('packet:event', (data: any) => {
      this.telemetryService.processRemotePacket('event', data);
    });

    socket.on('packet:finalClassification', (data: any) => {
      this.telemetryService.processRemotePacket('finalClassification', data);
    });

    socket.on('packet:carDamage', (data: any) => {
      this.telemetryService.processRemotePacket('carDamage', data);
    });

    socket.on('disconnect', (reason: string) => {
      logger.log(`📡 Telemetry source disconnected: ${socket.id} (${reason})`);
      this.connectedClients.delete(socket.id);
      
      // If no more telemetry sources, reset remote source flag
      if (this.connectedClients.size === 0) {
        this.telemetryService.setRemoteSource(false);
      }
    });

    socket.on('error', (error: Error) => {
      logger.error(`❌ Telemetry source error (${socket.id}):`, error);
    });

    // Send confirmation
    socket.emit('connected', { message: 'Telemetry bridge connected' });
  }

  public isConnected(): boolean {
    return this.connectedClients.size > 0;
  }

  public getConnectedCount(): number {
    return this.connectedClients.size;
  }
}

