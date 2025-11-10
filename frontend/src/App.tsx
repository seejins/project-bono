import { useEffect, useMemo, useRef, useState } from 'react';
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
  const contentAnchorRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLElement | null>(null);
  const [isHeroInView, setIsHeroInView] = useState(true);
  const location = useLocation();
  const isHome = location.pathname === '/';
  const scrollToMainContent = () => {
    contentAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleHeroExplore = () => {
    if (isHome) {
      scrollToMainContent();
    }
  };

  useEffect(() => {
    if (!isHome) {
      setIsHeroInView(false);
      return;
    }

    const element = heroRef.current;
    if (!element) {
      setIsHeroInView(false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsHeroInView(entry.intersectionRatio >= 0.35);
      },
      { threshold: [0.15, 0.35, 0.6] }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [isHome]);

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
  const headerVariant = isHome && isHeroInView ? 'overlay' : 'surface';

  const mainContainerClass = useMemo(
    () =>
      clsx('mx-auto min-h-screen w-full max-w-[1600px] px-6 pb-12', {
        'pt-24': true,
      }),
    []
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {!isAuthenticated ? (
        <PasswordGate onAuthenticated={handleAppAuthentication} />
      ) : (
        <>
          <div
            className={clsx(
              'sticky top-0 z-50 transition-colors duration-300',
              headerVariant === 'overlay'
                ? 'bg-transparent'
                : 'bg-white/95 shadow-sm dark:bg-gray-900/95'
            )}
          >
            <HeaderNavigation variant={headerVariant} />
          </div>

          {isHome && (
            <div style={{ marginTop: -TAB_BAR_HEIGHT }}>
              <HeroSection ref={heroRef} onExplore={handleHeroExplore} />
            </div>
          )}

          <main ref={contentAnchorRef}>
            <section className={mainContainerClass}>
              {showAlerts && (
                <div className="mb-8">
                  <AlertSystem alerts={alerts} onDismiss={dismissAlert} />
                </div>
              )}

              <Outlet />
            </section>
          </main>
        </>
      )}
    </div>
  );
}

function HomePage() {
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

  if (!driverId) {
    return <Navigate to="/grid" replace />;
  }

  return (
    <PageTransition>
      <DriverSeasonStats driverId={driverId} backHref="/grid" />
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
        backHref="/history"
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
        backHref="/races"
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
        backHref={`/races/${raceId}`}
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
