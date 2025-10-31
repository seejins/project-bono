import { Server } from 'socket.io';
import { TelemetryService, F123TelemetryData } from '../services/TelemetryService';
import { SessionExportService } from '../services/SessionExportService';

export function setupSocketHandlers(
  io: Server,
  services: {
    telemetryService: TelemetryService;
    sessionExportService: SessionExportService;
  }
) {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Send current telemetry data to new client (serialize BigInt values)
    const currentData = services.telemetryService.getLastData();
    if (currentData) {
      socket.emit('telemetry', serializeBigInt(currentData));
    }

    // Handle voice commands
    socket.on('voice_command', (command) => {
      console.log('Voice command received:', command);
      
      // Process voice command and generate response
      const response = processVoiceCommand(command);
      socket.emit('voice_response', response);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  // Helper function to convert BigInt to number for JSON serialization
  const serializeBigInt = (obj: any): any => {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'bigint') return Number(obj);
    if (Array.isArray(obj)) return obj.map(serializeBigInt);
    if (typeof obj === 'object') {
      const result: any = {};
      for (const key in obj) {
        result[key] = serializeBigInt(obj[key]);
      }
      return result;
    }
    return obj;
  };

  // Set up telemetry data broadcasting (serialize BigInt values for JSON)
  services.telemetryService.on('telemetry', (data) => {
    const serializedData = serializeBigInt(data);
    io.emit('telemetry', serializedData);
  });

  // Set up alert broadcasting
  services.telemetryService.on('alert', (alert) => {
    io.emit('alert', alert);
  });

  // Set up session completion handling
  services.telemetryService.on('sessionCompleted', async (sessionData) => {
    try {
      console.log('Session completed, exporting data...');
      
      // Export session data
      await services.sessionExportService.exportSessionData(sessionData);
      
      // Notify all clients
      io.emit('sessionCompleted', {
        sessionType: sessionData.sessionType,
        sessionTypeName: sessionData.sessionTypeName,
        trackName: sessionData.trackName || 'Unknown Track',
        drivers: sessionData.drivers.length,
        message: `${sessionData.sessionTypeName} session completed and data exported`
      });
      
      console.log('Session data exported and clients notified');
    } catch (error) {
      console.error('Error handling session completion:', error);
      
      // Notify clients of error
      io.emit('sessionError', {
        message: 'Failed to export session data',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Set up session change/restart forwarding to clients
  services.telemetryService.on('sessionChanged', (data) => {
    io.emit('sessionChanged', data);
  });

  services.telemetryService.on('sessionRestarted', (data) => {
    io.emit('sessionRestarted', data);
  });
}

function processVoiceCommand(command: any): any {
  // Process voice commands and generate appropriate responses
  const responses = {
    pit_stop: "Box box! Coming in for pit stop. Switch to medium tires and add 20 liters of fuel.",
    push: "Push mode activated! Push hard for the next 5 laps.",
    fuel_save: "Fuel saving mode activated. Lift and coast in braking zones.",
    tire_info: "Tire wear is at 65%. You can push for another 10 laps.",
    weather: "Weather is stable. No rain expected for the next 20 minutes.",
    position: "You're currently P3, 2.5 seconds behind P2. Keep pushing!",
    analysis: "Analyzing your lap data... I can see you're losing 0.3 seconds in sector 2. Your braking points are too early - try braking 10 meters later into turn 8.",
    improvement: "Based on your telemetry, here's how to improve: 1) Brake later into turn 3 - you're losing 0.2s there. 2) Use ERS more aggressively on the straight. 3) Your throttle application is too gradual - be more decisive.",
    brake_analysis: "Your braking analysis: You're braking 15 meters too early into turn 6, losing 0.15s. Your brake pressure is good, but try releasing the brake 5 meters earlier for better corner exit speed.",
    ers_analysis: "ERS analysis: You're only using 60% of available energy. Deploy ERS earlier on the main straight - you're losing 0.1s per lap. Also, save more energy for sector 2 where you need the extra power.",
    quiet_mode: "Understood. Switching to quiet mode. Only critical updates.",
    minimal_mode: "Switching to minimal updates. Only essential information.",
    hands_off: "Understood. Hands off. You're in control. I'll only speak for emergencies.",
    no_braking_talk: "Got it. No communication during braking zones. I'll wait for straights.",
    verbose_mode: "Switching to detailed mode. I'll provide comprehensive updates."
  };

  return {
    type: command.type,
    message: responses[command.type as keyof typeof responses] || "Command received and processed.",
    timestamp: Date.now()
  };
}
