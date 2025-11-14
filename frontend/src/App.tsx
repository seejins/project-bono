import { useEffect, useMemo, useState, Suspense, lazy } from 'react';
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
  useNavigationType,
} from 'react-router-dom';
import { getApiUrl } from './utils/api';
import { SeasonDashboard } from './components/SeasonDashboard';
import { Grid } from './components/Grid';
import { HistoryPage } from './components/HistoryPage';
// Lazy load heavy components for code splitting
const DriverSeasonStats = lazy(() => import('./components/DriverSeasonStats').then(m => ({ default: m.DriverSeasonStats })));
const DriverCareerProfileComponent = lazy(() => import('./components/DriverCareerProfile').then(m => ({ default: m.DriverCareerProfileComponent })));
const RacesDashboard = lazy(() => import('./components/RacesDashboard').then(m => ({ default: m.RacesDashboard })));
const RaceDetail = lazy(() => import('./components/RaceDetail').then(m => ({ default: m.RaceDetail })));
const DriverRaceAnalysis = lazy(() => import('./components/DriverRaceAnalysis').then(m => ({ default: m.DriverRaceAnalysis })));
const LiveTimings = lazy(() => import('./components/LiveTimings').then(m => ({ default: m.LiveTimings })));
const AdminPanel = lazy(() => import('./components/AdminPanel').then(m => ({ default: m.AdminPanel })));
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

function ScrollToTop() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType(); // 'POP' = back/forward, 'PUSH'/'REPLACE' = new navigation

  useEffect(() => {
    // Only scroll to top on new navigation (PUSH/REPLACE), not on back/forward (POP)
    if (navigationType !== 'POP') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, [pathname, navigationType]);

  return null;
}

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
    const apiUrl = getApiUrl();
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
    navigate(`/grid/${driverId}`);
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

// Loading fallback component for lazy-loaded routes
const RouteLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
  </div>
);

function DriverSeasonStatsPage() {
  const { driverId } = useParams<{ driverId: string }>();
  const navigate = useNavigate();

  if (!driverId) {
    return <Navigate to="/grid" replace />;
  }

  return (
    <PageTransition>
      <Suspense fallback={<RouteLoadingFallback />}>
        <DriverSeasonStats
          driverId={driverId}
          onRaceSelect={(raceId) => navigate(`/races/${raceId}`)}
        />
      </Suspense>
    </PageTransition>
  );
}

function HistoryLandingPage() {
  const navigate = useNavigate();

  return (
    <PageTransition>
      <HistoryPage />
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
      <Suspense fallback={<RouteLoadingFallback />}>
        <DriverCareerProfileComponent
          memberId={driverId}
          onRaceSelect={(raceId) => navigate(`/races/${raceId}`)}
        />
      </Suspense>
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
      <Suspense fallback={<RouteLoadingFallback />}>
        <RacesDashboard seasonId={seasonId} onRaceSelect={(raceId) => navigate(`/races/${raceId}`)} />
      </Suspense>
    </PageTransition>
  );
}

function RaceDetailPage() {
  const { raceId } = useParams<{ raceId: string }>();
  const navigate = useNavigate();

  if (!raceId) {
    return <Navigate to="/races" replace />;
  }

  const handleDriverSelect = (
    driverId: string,
    raceId: string,
    initialSessionType?: 'race' | 'qualifying' | 'practice',
  ) => {
    navigate(`/races/${raceId}/driver/${driverId}${initialSessionType ? `?session=${initialSessionType}` : ''}`);
  };

  return (
    <PageTransition>
      <Suspense fallback={<RouteLoadingFallback />}>
        <RaceDetail raceId={raceId} onDriverSelect={handleDriverSelect} />
      </Suspense>
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
      <Suspense fallback={<RouteLoadingFallback />}>
        <DriverRaceAnalysis
          raceId={raceId}
          driverId={driverId}
          initialSessionType={initialSessionType}
        />
      </Suspense>
    </PageTransition>
  );
}

function LivePage() {
  return (
    <PageTransition>
      <Suspense fallback={<RouteLoadingFallback />}>
        <LiveTimings />
      </Suspense>
    </PageTransition>
  );
}

function AdminPage() {
  const { isAuthenticated: adminAuthenticated, authenticate } = useAdmin();

  return (
    <PageTransition>
      <Suspense fallback={<RouteLoadingFallback />}>
        <AdminPanel isAuthenticated={adminAuthenticated} onAuthenticate={authenticate} />
      </Suspense>
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

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <ThemeProvider>
        <SeasonProvider>
          <AdminProvider>
            <AppRoutes />
          </AdminProvider>
        </SeasonProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
