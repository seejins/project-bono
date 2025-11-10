import React, { useState, useEffect, ReactNode } from 'react';
import { Trophy, Calendar, Award, Star, Zap } from 'lucide-react';
import { useSeason } from '../contexts/SeasonContext';
import { PreviousRaceResultsComponent } from './PreviousRaceResults';
import { PanelHeader } from './layout/PanelHeader';

interface Driver {
  id: string;
  name: string;
  team: string;
  number: number;
  points?: number;
  wins?: number;
  podiums?: number;
  fastestLaps?: number;
  position?: number;
}

interface Race {
  id: string;
  trackName: string;
  date: string;
  time?: string;
  status: string;
  winner?: string;
  fastestLap?: string;
}

interface Achievement {
  id: string;
  driverName: string;
  driverTeam: string;
  achievement: string;
  raceName: string;
  date: string;
  type: 'first_win' | 'first_podium' | 'first_pole' | 'fastest_lap' | 'championship_lead' | 'milestone';
}

interface SeasonStats {
  totalRaces: number;
  completedRaces: number;
  totalDrivers: number;
  currentLeader: string;
  mostWins: string;
  fastestLapHolder: string;
  driverOfTheDay: string;
}

interface SeasonDashboardProps {
  onRaceSelect?: (raceId: string) => void;
  onDriverSelect?: (driverId: string) => void;
  onScheduleView?: () => void;
}

export const SeasonDashboard: React.FC<SeasonDashboardProps> = ({ onRaceSelect, onDriverSelect, onScheduleView }) => {
  const { currentSeason } = useSeason();
  const [standings, setStandings] = useState<Driver[]>([]);
  const [nextRace, setNextRace] = useState<Race | null>(null);
  const [previousRace, setPreviousRace] = useState<Race | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<SeasonStats | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentSeason) {
      fetchSeasonData();
    }
  }, [currentSeason]);

  const fetchSeasonData = async () => {
    try {
      if (!currentSeason) return;
      
      setLoading(true);
      
      // Fetch real season data from API
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      
      // Fetch season participants (drivers)
      const participantsResponse = await fetch(`${apiUrl}/api/seasons/${currentSeason.id}/participants`);
      if (participantsResponse.ok) {
        const participantsData = await participantsResponse.json();
        setStandings(participantsData.participants || []);
      }
      
      // Fetch season events/races
      const eventsResponse = await fetch(`${apiUrl}/api/seasons/${currentSeason.id}/events`);
      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json();
        const events = eventsData.events || [];
        setEvents(events);
        
        // Find next and previous races
        const now = new Date();
        const upcomingRaces = events.filter((event: any) => 
          event.status === 'scheduled' && 
          (!event.race_date || new Date(event.race_date) > now)
        ).sort((a: any, b: any) => 
          new Date(a.race_date || '').getTime() - new Date(b.race_date || '').getTime()
        );
        
        const completedRaces = events.filter((event: any) => 
          event.status === 'completed'
        ).sort((a: any, b: any) => 
          new Date(b.race_date || '').getTime() - new Date(a.race_date || '').getTime()
        );
        
        setNextRace(upcomingRaces[0] || null);
        setPreviousRace(completedRaces[0] || null);
      }
      
      // Fetch season statistics (endpoint doesn't exist yet, handle 404 gracefully)
      try {
        const statsResponse = await fetch(`${apiUrl}/api/seasons/${currentSeason.id}/stats`);
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData.stats || null);
        } else if (statsResponse.status !== 404) {
          // Only log non-404 errors (404 is expected if endpoint doesn't exist)
          console.warn('Failed to fetch season stats:', statsResponse.status);
        }
      } catch (error) {
        // Silently handle stats fetch errors (endpoint may not exist)
        console.warn('Season stats endpoint not available');
      }
      
      // For now, set empty achievements - will be populated from race results
      setAchievements([]);
      
    } catch (error) {
      console.error('Error fetching season data:', error);
      // Set empty data on error
      setStandings([]);
      setNextRace(null);
      setPreviousRace(null);
      setAchievements([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const getAchievementIcon = (type: string) => {
    switch (type) {
      case 'first_win': return <Trophy className="w-4 h-4" />;
      case 'first_podium': return <Award className="w-4 h-4" />;
      case 'first_pole': return <Star className="w-4 h-4" />;
      case 'fastest_lap': return <Zap className="w-4 h-4" />;
      case 'championship_lead': return <Trophy className="w-4 h-4" />;
      default: return <Award className="w-4 h-4" />;
    }
  };

  const getAchievementColor = (type: string) => {
    switch (type) {
      case 'first_win': return 'text-yellow-600 dark:text-yellow-400';
      case 'first_podium': return 'text-gray-400 dark:text-gray-300';
      case 'first_pole': return 'text-purple-600 dark:text-purple-400';
      case 'fastest_lap': return 'text-green-600 dark:text-green-400';
      case 'championship_lead': return 'text-red-600 dark:text-red-400';
      default: return 'text-blue-600 dark:text-blue-400';
    }
  };

  const handlePreviousRaceClick = () => {
    if (previousRace && onRaceSelect) {
      onRaceSelect(previousRace.id);
    }
  };

  const handleNextRaceClick = () => {
    if (nextRace && onRaceSelect) {
      onRaceSelect(nextRace.id);
    }
  };

  const handleMostWinsClick = () => {
    if (stats?.mostWins && onDriverSelect) {
      // Find driver ID by name
      const driver = standings.find(d => d.name === stats.mostWins);
      if (driver) {
        onDriverSelect(driver.id);
      }
    }
  };

  const handleDriverOfTheDayClick = () => {
    if (stats?.driverOfTheDay && onDriverSelect) {
      // Find driver ID by name
      const driver = standings.find(d => d.name === stats.driverOfTheDay);
      if (driver) {
        onDriverSelect(driver.id);
      }
    }
  };

  const totalEvents = events.length;
  const completedEventsCount = events.filter(event => event.status === 'completed').length;
  const upcomingEventsCount = Math.max(totalEvents - completedEventsCount, 0);
  const driverCount = standings.length;

  const statusStyles: Record<string, string> = {
    active: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-600 dark:border-emerald-400/30 dark:text-emerald-300',
    completed: 'border-sky-400/40 bg-sky-500/10 text-sky-600 dark:border-sky-400/30 dark:text-sky-300',
    draft: 'border-slate-400/40 bg-slate-500/10 text-slate-600 dark:border-slate-500/30 dark:text-slate-200',
    scheduled: 'border-amber-400/40 bg-amber-500/10 text-amber-600 dark:border-amber-400/30 dark:text-amber-300',
    upcoming: 'border-amber-400/40 bg-amber-500/10 text-amber-600 dark:border-amber-400/30 dark:text-amber-300',
  };

  const seasonStatus = (currentSeason?.status || 'draft').toLowerCase();

  const metaBadge = (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusStyles[seasonStatus] ?? statusStyles.scheduled}`}
    >
      <span className="h-2 w-2 rounded-full bg-current" />
      {seasonStatus}
    </span>
  );

  const headerSecondaryActions: ReactNode[] = [];

  if (previousRace) {
    headerSecondaryActions.push(
      <button
        key="previous-race"
        onClick={handlePreviousRaceClick}
        className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-white/90 hover:text-slate-900 dark:bg-slate-900/50 dark:text-slate-100 dark:hover:bg-slate-900/70 dark:hover:text-white"
      >
        <Trophy className="h-4 w-4" />
        Previous race
      </button>
    );
  }

  if (nextRace) {
    headerSecondaryActions.push(
      <button
        key="next-race"
        onClick={handleNextRaceClick}
        className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-white/90 hover:text-slate-900 dark:bg-slate-900/50 dark:text-slate-100 dark:hover:bg-slate-900/70 dark:hover:text-white"
      >
        <Calendar className="h-4 w-4" />
        Next race
      </button>
    );
  }

  const primaryAction = onScheduleView ? (
    <button
      onClick={onScheduleView}
      className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#FF1E56] via-[#FFAC33] to-[#3A86FF] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-[#FF1E56]/30 transition hover:shadow-[0_18px_40px_-24px_rgba(255,30,86,0.6)] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#FF1E56]"
    >
      <Calendar className="h-4 w-4" />
      View schedule
    </button>
  ) : undefined;

  const eventProgressText = totalEvents > 0
    ? `${completedEventsCount}/${totalEvents} races complete`
    : 'No races scheduled yet';

  const upcomingText = upcomingEventsCount > 0
    ? `${upcomingEventsCount} upcoming`
    : completedEventsCount === totalEvents && totalEvents > 0
      ? 'Season complete'
      : 'Awaiting next update';

  const overviewDescription = currentSeason
    ? `Season ${currentSeason.year} • ${eventProgressText} • ${driverCount} drivers • ${upcomingText}`
    : undefined;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-[2048px] mx-auto space-y-6">
      <PanelHeader
        icon={<Calendar className="h-6 w-6" />}
        title={currentSeason?.name || 'Season Overview'}
        subtitle={currentSeason ? `Season ${currentSeason.year}` : undefined}
        description={overviewDescription}
        metaBadge={metaBadge}
        primaryAction={primaryAction}
        secondaryActions={headerSecondaryActions}
        breadcrumbs={<span>Season Panel</span>}
      />
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div 
          className="group relative overflow-hidden rounded-2xl bg-white/70 p-5 shadow-[0_22px_45px_-30px_rgba(15,23,42,0.65)] backdrop-blur-lg cursor-pointer transition hover:bg-white/85 dark:bg-slate-900/60 dark:hover:bg-slate-900/70"
          onClick={handleMostWinsClick}
        >
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white shadow-lg shadow-purple-500/30 transition-transform duration-300 group-hover:scale-105 group-hover:shadow-purple-500/40">
              <Award className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Most Wins</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{stats?.mostWins}</p>
            </div>
          </div>
        </div>

        <div 
          className="group relative overflow-hidden rounded-2xl bg-white/70 p-5 shadow-[0_22px_45px_-30px_rgba(15,23,42,0.65)] backdrop-blur-lg cursor-pointer transition hover:bg-white/85 dark:bg-slate-900/60 dark:hover:bg-slate-900/70"
          onClick={handleDriverOfTheDayClick}
        >
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 text-white shadow-lg shadow-orange-400/30 transition-transform duration-300 group-hover:scale-105 group-hover:shadow-orange-400/40">
              <Star className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Driver of the Day</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{stats?.driverOfTheDay || 'TBD'}</p>
            </div>
          </div>
        </div>

        <div 
          className="group relative overflow-hidden rounded-2xl bg-white/70 p-5 shadow-[0_22px_45px_-30px_rgba(15,23,42,0.65)] backdrop-blur-lg cursor-pointer transition hover:bg-white/85 dark:bg-slate-900/60 dark:hover:bg-slate-900/70"
          onClick={handleNextRaceClick}
        >
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-lg shadow-sky-500/30 transition-transform duration-300 group-hover:scale-105 group-hover:shadow-sky-500/40">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Next Race</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{nextRace?.trackName || 'TBD'}</p>
              {nextRace?.date && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(nextRace.date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  })}
                  {nextRace.time && ` at ${new Date(`2000-01-01T${nextRace.time}`).toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: false
                  })}`}
                </p>
              )}
            </div>
          </div>
        </div>

        <div 
          className="group relative overflow-hidden rounded-2xl bg-white/70 p-5 shadow-[0_22px_45px_-30px_rgba(15,23,42,0.65)] backdrop-blur-lg cursor-pointer transition hover:bg-white/85 dark:bg-slate-900/60 dark:hover:bg-slate-900/70"
          onClick={handlePreviousRaceClick}
        >
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-lime-500 text-white shadow-lg shadow-emerald-500/30 transition-transform duration-300 group-hover:scale-105 group-hover:shadow-emerald-500/40">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Previous Race</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{previousRace?.trackName || 'TBD'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Championship Standings - Main Display */}
        <div className="relative lg:col-span-2 overflow-hidden rounded-3xl bg-white/70 shadow-[0_30px_65px_-40px_rgba(15,23,42,0.7)] backdrop-blur-xl transition hover:shadow-[0_36px_80px_-48px_rgba(15,23,42,0.75)] dark:bg-slate-900/70">
          <div className="relative p-6 after:absolute after:inset-x-6 after:bottom-0 after:h-px after:bg-black/5 dark:after:bg-white/10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 via-red-600 to-rose-500 text-white shadow-lg shadow-red-500/30">
                <Trophy className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Championship Standings</h2>
            </div>
          </div>
          
          <div className="p-6">
            <div className="space-y-3">
              {standings.map((driver) => (
                <div 
                  key={driver.id} 
                  className="flex items-center justify-between rounded-2xl bg-white/50 p-3 backdrop-blur-lg transition hover:bg-white/70 dark:bg-slate-800/60 dark:hover:bg-slate-800/80"
                  onClick={() => onDriverSelect?.(driver.id)}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      driver.position === 1 ? 'position-1' :
                      driver.position === 2 ? 'position-2' :
                      driver.position === 3 ? 'position-3' :
                      'bg-gray-600 text-white'
                    }`}>
                      {driver.position || '#'}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{driver.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{driver.team}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{driver.points || 0} pts</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{driver.wins || 0}W {driver.podiums || 0}P</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Previous Race Results - Right Sidebar */}
        <div className="space-y-6">
          <PreviousRaceResultsComponent 
            seasonId={currentSeason?.id || ''} 
            onRaceSelect={onRaceSelect}
          />
          
          {/* Achievements - Below Previous Race */}
        <div className="relative overflow-hidden rounded-3xl bg-white/70 shadow-[0_30px_65px_-40px_rgba(15,23,42,0.7)] backdrop-blur-xl transition hover:shadow-[0_36px_80px_-48px_rgba(15,23,42,0.75)] dark:bg-slate-900/70">
          <div className="relative p-6 after:absolute after:inset-x-6 after:bottom-0 after:h-px after:bg-black/5 dark:after:bg-white/10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 via-purple-600 to-fuchsia-500 text-white shadow-lg shadow-purple-500/30">
                <Star className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Achievements</h2>
            </div>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              {achievements.map((achievement) => (
                <div key={achievement.id} className="flex items-start gap-3 rounded-2xl bg-white/45 p-4 backdrop-blur-lg transition hover:bg-white/65 dark:bg-slate-800/60 dark:hover:bg-slate-800/80">
                  <div className={`flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-full ${getAchievementColor(achievement.type)} bg-white/40 dark:bg-white/10`}>
                    {getAchievementIcon(achievement.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{achievement.achievement}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {achievement.driverName} ({achievement.driverTeam})
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {achievement.raceName} • {new Date(achievement.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              {achievements.length === 0 && (
                <div className="rounded-2xl bg-white/40 py-8 text-center text-gray-500 backdrop-blur-lg dark:bg-slate-800/60 dark:text-gray-400">
                  <Star className="w-12 h-12 mx-auto mb-4 opacity-60" />
                  <p>No new achievements this season</p>
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};
