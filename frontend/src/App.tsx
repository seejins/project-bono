import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { SeasonDashboard } from './components/SeasonDashboard';
import { DriverList } from './components/DriverList';
import { DriverProfile } from './components/DriverProfile';
import { TrackList } from './components/TrackList';
import { TrackDetail } from './components/TrackDetail';
import { AdminPanel } from './components/AdminPanel';
import { AlertSystem } from './components/AlertSystem';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { AdminProvider, useAdmin } from './contexts/AdminContext';
import { ThemeProvider } from './contexts/ThemeContext';

function AppContent() {
  const [alerts, setAlerts] = useState<Array<{id: string, type: string, message: string, timestamp: number}>>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<'season' | 'drivers' | 'tracks' | 'admin'>('season');
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);
  const { isAuthenticated, authenticate } = useAdmin();

  const handleTabChange = (tab: 'season' | 'drivers' | 'tracks' | 'admin') => {
    setActiveTab(tab);
    setSelectedDriver(null);
    setSelectedTrack(null);
  };

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io('http://localhost:3001');

    // Connection handlers
    newSocket.on('connect', () => {
      console.log('Connected to Project Bono backend');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from backend');
      setIsConnected(false);
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header isConnected={isConnected} />
      
      <div className="flex">
        <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />
        
        <main className="flex-1 p-6">
          <AlertSystem alerts={alerts} onDismiss={dismissAlert} />
          
          {activeTab === 'season' && (
            <SeasonDashboard />
          )}
          
          {activeTab === 'drivers' && (
            <>
              {selectedDriver ? (
                <DriverProfile 
                  driverId={selectedDriver} 
                  onBack={() => setSelectedDriver(null)} 
                />
              ) : (
                <DriverList onDriverSelect={setSelectedDriver} />
              )}
            </>
          )}
          
          {activeTab === 'tracks' && (
            <>
              {selectedTrack ? (
                <TrackDetail 
                  trackId={selectedTrack} 
                  onBack={() => setSelectedTrack(null)} 
                />
              ) : (
                <TrackList onTrackSelect={setSelectedTrack} />
              )}
            </>
          )}
          
          {activeTab === 'admin' && (
            <AdminPanel 
              isAuthenticated={isAuthenticated}
              onAuthenticate={authenticate}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AdminProvider>
        <AppContent />
      </AdminProvider>
    </ThemeProvider>
  );
}

export default App;