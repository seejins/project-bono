import { Server } from 'socket.io';
import { TelemetryService } from '../services/TelemetryService';
import { StrategyEngine } from '../services/StrategyEngine';

export function setupSocketHandlers(
  io: Server,
  services: {
    telemetryService: TelemetryService;
    strategyEngine: StrategyEngine;
  }
) {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Send current telemetry data to new client
    const currentData = services.telemetryService.getLastData();
    if (currentData) {
      socket.emit('telemetry', currentData);
    }

    // Handle voice commands
    socket.on('voice_command', (command) => {
      console.log('Voice command received:', command);
      
      // Process voice command and generate response
      const response = processVoiceCommand(command);
      socket.emit('voice_response', response);
    });

    // Handle strategy requests
    socket.on('request_strategy', () => {
      const currentData = services.telemetryService.getLastData();
      if (currentData) {
        const strategy = services.strategyEngine.generateStrategy(
          currentData,
          50, // Default race length
          {
            airTemperature: currentData.airTemperature,
            trackTemperature: currentData.trackTemperature,
            rainPercentage: currentData.rainPercentage,
            humidity: 50, // Default values
            windSpeed: 0,
            windDirection: 0
          }
        );
        socket.emit('strategy', strategy);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  // Set up telemetry data broadcasting
  services.telemetryService.on('telemetry', (data) => {
    io.emit('telemetry', data);
    
    // Analyze lap and generate strategy
    const analysis = services.strategyEngine.analyzeLap(data);
    const strategy = services.strategyEngine.generateStrategy(
      data,
      50, // Default race length
      {
        airTemperature: data.airTemperature,
        trackTemperature: data.trackTemperature,
        rainPercentage: data.rainPercentage,
        humidity: 50,
        windSpeed: 0,
        windDirection: 0
      }
    );
    
    io.emit('strategy', strategy);
  });

  // Set up alert broadcasting
  services.telemetryService.on('alert', (alert) => {
    io.emit('alert', alert);
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
    position: "You're currently P3, 2.5 seconds behind P2. Keep pushing!"
  };

  return {
    type: command.type,
    message: responses[command.type] || "Command received and processed.",
    timestamp: Date.now()
  };
}
