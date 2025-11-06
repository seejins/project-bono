import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { SeasonDashboard } from './components/SeasonDashboard';
import { Grid } from './components/Grid';
import { DriverSeasonStats } from './components/DriverSeasonStats';
import { HistoryPage } from './components/HistoryPage';
import { DriverCareerProfileComponent } from './components/DriverCareerProfile';
import { RacesDashboard } from './components/RacesDashboard';
import { RaceDetail } from './components/RaceDetail';
import { DriverRaceAnalysis } from './components/DriverRaceAnalysis';
import { LiveTimings } from './components/LiveTimings';
import { AdminPanel } from './components/AdminPanel';
import { AlertSystem } from './components/AlertSystem';
import { Header } from './components/Header';
import { HeaderNavigation } from './components/HeaderNavigation';
import { PasswordGate } from './components/PasswordGate';
import { AdminProvider, useAdmin } from './contexts/AdminContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SeasonProvider, useSeason } from './contexts/SeasonContext';

function AppContent() {
  const [alerts, setAlerts] = useState<Array<{id: string, type: string, message: string, timestamp: number}>>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('f1-app-authenticated') === 'true';
  });
  const [activeTab, setActiveTab] = useState<'season' | 'grid' | 'races' | 'history' | 'admin' | 'live'>(() => {
    const savedTab = localStorage.getItem('f1-active-tab') as 'season' | 'grid' | 'races' | 'history' | 'admin' | 'live';
    return savedTab || 'season';
  });
  const [selectedDriver, setSelectedDriver] = useState<string | null>(() => {
    const savedDriver = localStorage.getItem('f1-selected-driver');
    return savedDriver || null;
  });
  const [selectedRace, setSelectedRace] = useState<string | null>(() => {
    const savedRace = localStorage.getItem('f1-selected-race');
    return savedRace || null;
  });
  const [selectedDriverRace, setSelectedDriverRace] = useState<{driverId: string, raceId: string} | null>(() => {
    const savedDriverRace = localStorage.getItem('f1-selected-driver-race');
    return savedDriverRace ? JSON.parse(savedDriverRace) : null;
  });
  const [navigationHistory, setNavigationHistory] = useState<Array<{tab: string, view?: string}>>(() => {
    const savedHistory = localStorage.getItem('f1-navigation-history');
    return savedHistory ? JSON.parse(savedHistory) : [];
  });
  const { isAuthenticated: isAdminAuthenticated, authenticate } = useAdmin();
  const { currentSeason } = useSeason();

  const handleAppAuthentication = () => {
    setIsAuthenticated(true);
  };

  const handleTabChange = (tab: 'season' | 'grid' | 'races' | 'history' | 'admin' | 'live') => {
    setActiveTab(tab);
    setSelectedDriver(null);
    setSelectedRace(null);
    setSelectedDriverRace(null);
    localStorage.setItem('f1-active-tab', tab);
    localStorage.removeItem('f1-selected-driver');
    localStorage.removeItem('f1-selected-race');
    localStorage.removeItem('f1-selected-driver-race');
  };

  const handleDriverSelect = (driverId: string) => {
    pushToHistory(activeTab, 'list'); // Save current view
    setActiveTab('history'); // Switch to history tab
    setSelectedDriver(driverId);
    localStorage.setItem('f1-active-tab', 'history');
    localStorage.setItem('f1-selected-driver', driverId);
  };

  const handleGridDriverSelect = (driverId: string) => {
    pushToHistory(activeTab, 'list'); // Save current view
    setActiveTab('grid'); // Stay on grid tab
    setSelectedDriver(driverId);
    localStorage.setItem('f1-active-tab', 'grid');
    localStorage.setItem('f1-selected-driver', driverId);
  };

  const handleDriverBack = () => {
    const previous = popFromHistory();
    if (previous) {
      setActiveTab(previous.tab as any);
      localStorage.setItem('f1-active-tab', previous.tab);
      if (previous.view === 'race' && selectedRace) {
        // Stay on race detail
      } else {
        setSelectedDriver(null);
        localStorage.removeItem('f1-selected-driver');
      }
    } else {
      setSelectedDriver(null);
      localStorage.removeItem('f1-selected-driver');
    }
  };

  const handleDriverSelectFromHistory = (driverId: string) => {
    pushToHistory(activeTab, 'list'); // Save current view
    setSelectedDriver(driverId);
    localStorage.setItem('f1-selected-driver', driverId);
  };

  const handleSeasonSelect = (seasonId: string) => {
    pushToHistory(activeTab, 'list'); // Save current view
    setActiveTab('races'); // Switch to races tab
    setSelectedRace(seasonId);
    localStorage.setItem('f1-active-tab', 'races');
    localStorage.setItem('f1-selected-race', seasonId);
  };

  const handleRaceSelect = (raceId: string) => {
    pushToHistory(activeTab, 'list'); // Save current view
    setActiveTab('races'); // Switch to races tab
    setSelectedRace(raceId);
    localStorage.setItem('f1-active-tab', 'races');
    localStorage.setItem('f1-selected-race', raceId);
  };

  const handleRaceBack = () => {
    const previous = popFromHistory();
    if (previous) {
      setActiveTab(previous.tab as any);
      localStorage.setItem('f1-active-tab', previous.tab);
      if (previous.view === 'driver') {
        // Stay on driver profile
      } else {
        setSelectedRace(null);
        localStorage.removeItem('f1-selected-race');
      }
    } else {
      setSelectedRace(null);
      localStorage.removeItem('f1-selected-race');
    }
  };

  const handleDriverRaceSelect = (driverId: string, raceId: string) => {
    pushToHistory(activeTab, 'race'); // Save current view (race detail)
    setSelectedDriverRace({ driverId, raceId });
    localStorage.setItem('f1-selected-driver-race', JSON.stringify({ driverId, raceId }));
  };

  const handleDriverRaceBack = () => {
    const previous = popFromHistory();
    if (previous) {
      setActiveTab(previous.tab as any);
      localStorage.setItem('f1-active-tab', previous.tab);
      if (previous.view === 'race') {
        setSelectedRace(previous.tab === 'races' ? 'race-1' : null);
      } else if (previous.view === 'driver') {
        // Handle driver view navigation
      }
    }
    setSelectedDriverRace(null);
    localStorage.removeItem('f1-selected-driver-race');
  };

  // Navigation history helpers
  const pushToHistory = (tab: string, view?: string) => {
    const newHistory = [...navigationHistory, { tab, view }];
    setNavigationHistory(newHistory);
    localStorage.setItem('f1-navigation-history', JSON.stringify(newHistory));
  };

  const popFromHistory = () => {
    if (navigationHistory.length === 0) return null;
    const newHistory = [...navigationHistory];
    const previous = newHistory.pop();
    setNavigationHistory(newHistory);
    localStorage.setItem('f1-navigation-history', JSON.stringify(newHistory));
    return previous;
  };

  useEffect(() => {
    // Initialize socket connection
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const newSocket = io(apiUrl);

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
      {!isAuthenticated ? (
        <PasswordGate onAuthenticated={handleAppAuthentication} />
      ) : (
        <>
          <HeaderNavigation activeTab={activeTab} onTabChange={handleTabChange} />
          
          <main className="flex-1 p-6">
            {activeTab !== 'admin' && <AlertSystem alerts={alerts} onDismiss={dismissAlert} />}
              
              {activeTab === 'season' && (
                <SeasonDashboard 
                  onRaceSelect={handleRaceSelect} 
                  onDriverSelect={handleDriverSelect}
                />
              )}
              
              {activeTab === 'grid' && (
                <>
                  {selectedDriver ? (
                    <DriverSeasonStats 
                      driverId={selectedDriver} 
                      onBack={handleDriverBack}
                    />
                  ) : (
                    <Grid onDriverSelect={handleGridDriverSelect} />
                  )}
                </>
              )}
              
              {activeTab === 'history' && (
                <>
                  {selectedDriver ? (
                    <DriverCareerProfileComponent 
                      memberId={selectedDriver} 
                      onBack={handleDriverBack}
                      onRaceSelect={handleRaceSelect}
                    />
                  ) : (
                    <HistoryPage 
                      onSeasonSelect={handleSeasonSelect}
                      onDriverSelect={handleDriverSelectFromHistory}
                    />
                  )}
                </>
              )}
              
              {activeTab === 'races' && (
                <>
                  {selectedDriverRace ? (
                    <DriverRaceAnalysis 
                      driverId={selectedDriverRace.driverId}
                      raceId={selectedDriverRace.raceId}
                      onBack={handleDriverRaceBack} 
                    />
                  ) : selectedRace ? (
                    <RaceDetail 
                      raceId={selectedRace} 
                      onBack={handleRaceBack}
                      onDriverSelect={handleDriverRaceSelect}
                    />
                  ) : (
                    currentSeason ? (
                      <RacesDashboard seasonId={currentSeason.id} onRaceSelect={handleRaceSelect} />
                    ) : (
                      <div className="text-center py-12">
                        <p className="text-gray-500 dark:text-gray-400">No active season selected</p>
                      </div>
                    )
                  )}
                </>
              )}
              
              {activeTab === 'live' && (
                <LiveTimings />
              )}
              
              {activeTab === 'admin' && (
                <AdminPanel 
                  isAuthenticated={isAdminAuthenticated}
                  onAuthenticate={authenticate}
                />
              )}
          </main>
        </>
      )}
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <SeasonProvider>
        <AdminProvider>
          <AppContent />
        </AdminProvider>
      </SeasonProvider>
    </ThemeProvider>
  );
}

export default App;