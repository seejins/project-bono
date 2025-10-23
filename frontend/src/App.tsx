import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { TelemetryDashboard } from './components/TelemetryDashboard';
import { StrategyPanel } from './components/StrategyPanel';
import { VoiceComm } from './components/VoiceComm';
import { RaceInfo } from './components/RaceInfo';
import { AlertSystem } from './components/AlertSystem';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { TelemetryData, RaceStrategy } from '../shared/types';

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [strategy, setStrategy] = useState<RaceStrategy | null>(null);
  const [alerts, setAlerts] = useState<Array<{id: string, type: string, message: string, timestamp: number}>>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'strategy' | 'voice' | 'race'>('dashboard');

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    // Connection handlers
    newSocket.on('connect', () => {
      console.log('Connected to Project Bono backend');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from backend');
      setIsConnected(false);
    });

    // Telemetry data handler
    newSocket.on('telemetry', (data: TelemetryData) => {
      setTelemetry(data);
    });

    // Strategy updates
    newSocket.on('strategy', (data: RaceStrategy) => {
      setStrategy(data);
    });

    // Alert handler
    newSocket.on('alert', (alert: {type: string, message: string}) => {
      const newAlert = {
        id: Date.now().toString(),
        type: alert.type,
        message: alert.message,
        timestamp: Date.now()
      };
      setAlerts(prev => [...prev, newAlert]);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header isConnected={isConnected} />
      
      <div className="flex">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        
        <main className="flex-1 p-6">
          <AlertSystem alerts={alerts} onDismiss={dismissAlert} />
          
          {activeTab === 'dashboard' && (
            <TelemetryDashboard telemetry={telemetry} />
          )}
          
          {activeTab === 'strategy' && (
            <StrategyPanel strategy={strategy} telemetry={telemetry} />
          )}
          
          {activeTab === 'voice' && (
            <VoiceComm socket={socket} />
          )}
          
          {activeTab === 'race' && (
            <RaceInfo telemetry={telemetry} strategy={strategy} />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
