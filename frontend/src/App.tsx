import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { io } from 'socket.io-client';
import {
  BrowserRouter,
  Routes,
  Route,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
  Navigate,
  useSearchParams,
} from 'react-router-dom';
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
import { HeaderNavigation } from './components/HeaderNavigation';
import { PasswordGate } from './components/PasswordGate';
import { HeroSection } from './components/HeroSection';
import { AdminProvider, useAdmin } from './contexts/AdminContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SeasonProvider, useSeason } from './contexts/SeasonContext';
import { PageTransition } from './components/layout/PageTransition';

type AlertPayload = { id: string; type: string; message: string; timestamp: number };

const TAB_BAR_HEIGHT = 88;

function AppLayout() {
  const [alerts, setAlerts] = useState<AlertPayload[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('f1-app-authenticated') === 'true';
  });
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';
  const handleHeroExplore = () => {
    navigate('/season');
  };

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const socket = io(apiUrl);

    socket.on('connect', () => {
      console.log('Connected to Project Bono backend');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from backend');
    });

    socket.on('alert', (alert: { type: string; message: string }) => {
      setAlerts((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          type: alert.type,
          message: alert.message,
          timestamp: Date.now(),
        },
      ]);
    });

    return () => {
      socket.close();
    };
  }, []);

  const dismissAlert = (alertId: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
  };

  const handleAppAuthentication = () => {
    setIsAuthenticated(true);
    localStorage.setItem('f1-app-authenticated', 'true');
  };

  const showAlerts = location.pathname !== '/admin' && alerts.length > 0;
  const headerVariant = 'overlay' as const;

  const mainContainerClass = useMemo(
    () =>
      clsx('mx-auto min-h-screen w-full max-w-[1600px] px-6 pb-12', {
        'pt-24': true,
      }),
    []
  );

  return (
    <div className="relative min-h-screen bg-[#060b1d] text-white">
      {!isAuthenticated ? (
        <PasswordGate onAuthenticated={handleAppAuthentication} />
      ) : (
        <>
          <div className="absolute inset-x-0 top-0 z-50 bg-transparent transition-colors duration-300">
            <HeaderNavigation variant={headerVariant} />
          </div>

          {isHome && (
            <div>
              <HeroSection
                onExplore={handleHeroExplore}
              />
            </div>
          )}

          {!isHome && (
            <main>
              <section className={mainContainerClass}>
                {showAlerts && (
                  <div className="mb-8">
                    <AlertSystem alerts={alerts} onDismiss={dismissAlert} />
                  </div>
                )}

                <Outlet />
              </section>
            </main>
          )}
        </>
      )}
    </div>
  );
}

function HomePage() {
  return null;
}

function SeasonDashboardPage() {
  const navigate = useNavigate();

  const handleRaceSelect = (raceId: string) => {
    navigate(`/races/${raceId}`);
  };

  const handleDriverSelect = (driverId: string) => {
    navigate(`/history/driver/${driverId}`);
  };

  const handleScheduleView = () => {
    navigate('/races');
  };

  return (
    <PageTransition>
      <SeasonDashboard
        onRaceSelect={handleRaceSelect}
        onDriverSelect={handleDriverSelect}
        onScheduleView={handleScheduleView}
      />
    </PageTransition>
  );
}

function GridPage() {
  const navigate = useNavigate();

  return (
    <PageTransition>
      <Grid onDriverSelect={(driverId) => navigate(`/grid/${driverId}`)} />
    </PageTransition>
  );
}

function DriverSeasonStatsPage() {
  const { driverId } = useParams<{ driverId: string }>();
  const navigate = useNavigate();

  if (!driverId) {
    return <Navigate to="/grid" replace />;
  }

  return (
    <PageTransition>
      <DriverSeasonStats
        driverId={driverId}
        onRaceSelect={(raceId) => navigate(`/races/${raceId}`)}
      />
    </PageTransition>
  );
}

function HistoryLandingPage() {
  const navigate = useNavigate();

  return (
    <PageTransition>
      <HistoryPage
        onSeasonSelect={(seasonId) => navigate(`/races?seasonId=${seasonId}`)}
        onDriverSelect={(driverId) => navigate(`/history/driver/${driverId}`)}
      />
    </PageTransition>
  );
}

function DriverCareerProfilePage() {
  const { driverId } = useParams<{ driverId: string }>();
  const navigate = useNavigate();

  if (!driverId) {
    return <Navigate to="/history" replace />;
  }

  return (
    <PageTransition>
      <DriverCareerProfileComponent
        memberId={driverId}
        onRaceSelect={(raceId) => navigate(`/races/${raceId}`)}
      />
    </PageTransition>
  );
}

function RacesPage() {
  const navigate = useNavigate();
  const { currentSeason } = useSeason();
  const [searchParams] = useSearchParams();
  const requestedSeasonId = searchParams.get('seasonId');
  const seasonId = requestedSeasonId || currentSeason?.id;

  if (!seasonId) {
    return (
      <PageTransition>
        <div className="py-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">No season selected.</p>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <RacesDashboard seasonId={seasonId} onRaceSelect={(raceId) => navigate(`/races/${raceId}`)} />
    </PageTransition>
  );
}

function RaceDetailPage() {
  const { raceId } = useParams<{ raceId: string }>();
  const navigate = useNavigate();

  if (!raceId) {
    return <Navigate to="/races" replace />;
  }

  return (
    <PageTransition>
      <RaceDetail
        raceId={raceId}
        onDriverSelect={(driverId, race, initialSessionType) =>
          navigate(`/races/${race}/driver/${driverId}${initialSessionType ? `?session=${initialSessionType}` : ''}`)
        }
      />
    </PageTransition>
  );
}

function DriverRaceAnalysisPage() {
  const { raceId, driverId } = useParams<{ raceId: string; driverId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionParam = searchParams.get('session');
  const initialSessionType = (sessionParam === 'qualifying' || sessionParam === 'practice') ? sessionParam : 'race';

  if (!raceId || !driverId) {
    return <Navigate to="/races" replace />;
  }

  return (
    <PageTransition>
      <DriverRaceAnalysis
        raceId={raceId}
        driverId={driverId}
        initialSessionType={initialSessionType}
      />
    </PageTransition>
  );
}

function LivePage() {
  return (
    <PageTransition>
      <LiveTimings />
    </PageTransition>
  );
}

function AdminPage() {
  const { isAuthenticated: adminAuthenticated, authenticate } = useAdmin();

  return (
    <PageTransition>
      <AdminPanel isAuthenticated={adminAuthenticated} onAuthenticate={authenticate} />
    </PageTransition>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="season" element={<SeasonDashboardPage />} />
        <Route path="grid" element={<GridPage />} />
        <Route path="grid/:driverId" element={<DriverSeasonStatsPage />} />
        <Route path="history" element={<HistoryLandingPage />} />
        <Route path="history/driver/:driverId" element={<DriverCareerProfilePage />} />
        <Route path="races" element={<RacesPage />} />
        <Route path="races/:raceId" element={<RaceDetailPage />} />
        <Route path="races/:raceId/driver/:driverId" element={<DriverRaceAnalysisPage />} />
        <Route path="live" element={<LivePage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

function AppContent() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
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
