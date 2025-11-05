import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, MapPin, Trophy, Flag, Zap } from 'lucide-react';
import { F123DataService, F123DriverResult } from '../services/F123DataService';
import { getTireCompound } from '../utils/f123DataMapping';

interface RaceDetailProps {
  raceId: string;
  onBack: () => void;
  onDriverSelect: (driverId: string, raceId: string) => void;
}

export const RaceDetail: React.FC<RaceDetailProps> = ({ raceId, onBack, onDriverSelect }) => {
  const [activeSession, setActiveSession] = useState<'practice' | 'qualifying' | 'race'>('race');
  const [raceData, setRaceData] = useState<any>(null);
  const [drivers, setDrivers] = useState<F123DriverResult[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRaceData();
  }, [raceId]);

  useEffect(() => {
    // Update drivers when activeSession changes
    updateDriversFromSessions();
  }, [activeSession, sessions]);

  const updateDriversFromSessions = () => {
    if (!sessions || sessions.length === 0) {
      setDrivers([]);
      return;
    }

    // Debug: Log all sessions to see what we have
    console.log('All sessions:', sessions.map(s => ({ type: s.sessionType, name: s.sessionName, resultsCount: s.results?.length || 0 })));
    console.log('Active session:', activeSession);

    // Find the appropriate session based on activeSession
    // Session types: 1=P1, 2=P2, 3=P3, 4=Short Practice, 5=Q1, 6=Q2, 7=Q3, 8=Short Qualifying, 9=OSQ, 10=Race
    const targetSessionType = activeSession === 'practice' ? [1, 2, 3, 4] : 
                              activeSession === 'qualifying' ? [5, 6, 7, 8, 9] : 
                              [10];
    
    // Find the most recent session if multiple exist (prefer later sessions)
    const matchingSessions = sessions.filter(s => targetSessionType.includes(s.sessionType));
    console.log('Matching sessions for', activeSession, ':', matchingSessions.map(s => ({ type: s.sessionType, name: s.sessionName, resultsCount: s.results?.length || 0 })));
    
    const session = matchingSessions.length > 0 
      ? matchingSessions.sort((a, b) => (b.sessionType || 0) - (a.sessionType || 0))[0] // Prefer later sessions (Q3 > Q2 > Q1, P3 > P2 > P1)
      : null;
    
    if (!session || !session.results) {
      console.log('No session or results found for', activeSession);
      setDrivers([]);
      return;
    }
    
    console.log('Selected session:', { type: session.sessionType, name: session.sessionName, resultsCount: session.results.length });

    // Transform the backend data to match F123DriverResult interface
    const transformedDrivers: F123DriverResult[] = session.results.map((result: any, index: number) => {
      // Debug: Log the result to see what data we're getting
      if (index === 0) {
        console.log('Sample result data:', {
          json_team_name: result.json_team_name,
          driver_team: result.driver_team,
          mapping_team_name: result.mapping_team_name,
          sector1_time_ms: result.sector1_time_ms,
          sector2_time_ms: result.sector2_time_ms,
          sector3_time_ms: result.sector3_time_ms,
          result_status: result.result_status
        });
      }
      
      const driver: any = {
        id: result.driver_id || result.member_id || `driver-${result.position}`,
        name: result.member_name || result.json_driver_name || result.mapping_driver_name || result.driver_name || 'Unknown Driver',
        team: result.json_team_name || result.mapping_team_name || result.driver_team || 'Unknown Team',
        number: result.json_car_number || result.driver_number || result.mapping_driver_number || result.position || 0,
        
        // Race data - store raw time for gap calculation
        racePosition: result.position,
        _totalRaceTimeMs: result.total_race_time_ms, // Store raw value for gap calculation
        raceLapTime: result.best_lap_time_ms,
        raceBestLapTime: result.best_lap_time_ms,
        raceSector1Time: result.sector1_time_ms,
        raceSector2Time: result.sector2_time_ms,
        raceSector3Time: result.sector3_time_ms,
        
        // Qualifying data (if available from other sessions)
        qualifyingPosition: result.position,
        qualifyingTime: result.best_lap_time_ms,
        qualifyingBestLapTime: result.best_lap_time_ms,
        qualifyingSector1Time: result.sector1_time_ms,
        qualifyingSector2Time: result.sector2_time_ms,
        qualifyingSector3Time: result.sector3_time_ms,
        qualifyingTire: result.qualifying_tire || result.best_lap_tire || result.tire_compound || null,
        
        // Race tire data (all tires used throughout race)
        raceTiresUsed: result.race_tires_used || result.tires_used || null,
        
        // Points and achievements
        points: result.points || 0,
        fastestLap: result.fastest_lap || false,
        fastestLapTime: result.best_lap_time_ms,
        
        // Status - F1 23 result_status: 0=INVALID, 1=INACTIVE, 2=FINISHED, 3=?, 4=DNF, 5=DSQ, 6=NCL, 7=RET
        // Based on mapResultStatus: FINISHED=2, DNF=4, DSQ=5, NCL=6, RET=7
        status: result.result_status === 2 ? 'finished' : 
                result.result_status === 4 ? 'dnf' : 
                result.result_status === 5 ? 'dsq' : 
                result.result_status === 7 ? 'dnf' : // RET = retired (DNF)
                result.result_status === 6 ? 'dnq' : // NCL = not classified
                'finished', // Default to finished if status is unknown
        gridPosition: result.grid_position,
        
        // Penalties
        penalties: result.penalties || 0,
        warnings: result.warnings || 0,
        dnf: result.result_status === 4 || result.result_status === 7 || result.dnf_reason ? true : false,
        dnfReason: result.dnf_reason,
        
        // Data source
        dataSource: 'FILE_UPLOAD' as const
      };
      
      return driver;
    });

    // Calculate gaps for race (gap to leader)
    if (activeSession === 'race' && transformedDrivers.length > 0) {
      const leaderTimeMs = (transformedDrivers[0] as any)._totalRaceTimeMs || 0;
      
      transformedDrivers.forEach((driver, index) => {
        const driverTimeMs = (driver as any)._totalRaceTimeMs || 0;
        
        if (index === 0) {
          // Leader shows their time
          driver.raceTime = driverTimeMs > 0 ? F123DataService.formatTimeFromMs(driverTimeMs) : '--:--.--';
        } else {
          // Others show gap to leader
          if (leaderTimeMs > 0 && driverTimeMs > 0) {
            const gapMs = driverTimeMs - leaderTimeMs;
            driver.raceTime = gapMs >= 0 ? `+${F123DataService.formatTimeFromMs(gapMs)}` : '--:--.--';
          } else {
            driver.raceTime = '--:--.--';
          }
        }
      });
    }

    // Calculate gaps for qualifying and practice
    if ((activeSession === 'qualifying' || activeSession === 'practice') && transformedDrivers.length > 0) {
      const poleTime = transformedDrivers[0].qualifyingTime || 0;
      transformedDrivers.forEach(driver => {
        if (driver.qualifyingTime && driver.qualifyingTime > poleTime) {
          driver.qualifyingGap = driver.qualifyingTime - poleTime;
        }
      });
    }

    setDrivers(transformedDrivers);
  };

  const fetchRaceData = async () => {
    try {
      setLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      
      // Fetch race data
      const raceResponse = await fetch(`${apiUrl}/api/races/${raceId}`);
      if (raceResponse.ok) {
        const raceDataResult = await raceResponse.json();
        setRaceData(raceDataResult.race);
      }
      
      // Fetch race results
      const resultsResponse = await fetch(`${apiUrl}/api/races/${raceId}/results`);
      if (resultsResponse.ok) {
        const resultsData = await resultsResponse.json();
        setSessions(resultsData.sessions || []);
      }
      
    } catch (error) {
      console.error('Error fetching race data:', error);
      setError('Failed to load race data');
    } finally {
      setLoading(false);
    }
  };

  const getTeamColor = (team: string) => F123DataService.getTeamColor(team);
  const getTeamColorHex = (team: string) => F123DataService.getTeamColorHex(team);

  /**
   * Determine if a color is light or dark, returns appropriate text color (black or white)
   */
  const getContrastTextColor = (hexColor: string): string => {
    // Remove # if present
    const hex = hexColor.replace('#', '');
    
    // Convert to RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // Calculate relative luminance (using WCAG formula)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return black for light colors, white for dark colors
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  };

  const getPositionColor = (position: number) => F123DataService.getPositionColor(position);

  const handleDriverClick = (driver: F123DriverResult) => {
    onDriverSelect(driver.id, raceId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading race data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (!raceData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">No race data found</div>
      </div>
    );
  }

  // Find fastest sectors for qualifying
  const fastestS1 = Math.min(...drivers.map(d => d.qualifyingSector1Time || Infinity));
  const fastestS2 = Math.min(...drivers.map(d => d.qualifyingSector2Time || Infinity));
  const fastestS3 = Math.min(...drivers.map(d => d.qualifyingSector3Time || Infinity));

  return (
    <div className="max-w-[2048px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={onBack} 
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center space-x-2 text-base font-medium"
        >
          <ArrowLeft className="w-6 h-6" />
          <span>Back</span>
        </button>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">{raceData.trackName || raceData.track?.name || 'Race'}</h1>
        <div className="w-10"></div>
      </div>

      {/* Race Info */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-red-600 rounded-lg flex items-center justify-center">
              <Flag className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{raceData.trackName || raceData.track?.name || 'Race'}</h2>
              <div className="flex items-center space-x-2 mt-1">
                <MapPin className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span className="text-base text-gray-500 dark:text-gray-400">{raceData.track?.country || ''}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-2 text-base text-gray-500 dark:text-gray-400">
              <Calendar className="w-5 h-5" />
              <span>{raceData.raceDate ? new Date(raceData.raceDate).toLocaleDateString() : 'TBD'}</span>
            </div>
            <div className="text-base text-gray-500 dark:text-gray-400 mt-1">
              {raceData.track?.length ? `${raceData.track.length}km` : ''} {raceData.track?.length ? '•' : ''} {raceData.laps || 0} laps
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <div className={`w-4 h-4 rounded-full ${raceData.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
            <span className="text-base font-medium text-gray-700 dark:text-gray-300 capitalize">{raceData.status}</span>
          </div>
          <div className="flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <span className="text-base text-gray-500 dark:text-gray-400">{raceData.track?.country || ''}</span>
          </div>
        </div>
      </div>

      {/* Session Toggle */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveSession('race')}
            className={`px-4 py-2 rounded-lg text-base font-semibold transition-colors ${
              activeSession === 'race'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Race
          </button>
          <button
            onClick={() => setActiveSession('qualifying')}
            className={`px-4 py-2 rounded-lg text-base font-semibold transition-colors ${
              activeSession === 'qualifying'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Qualifying
          </button>
          <button
            onClick={() => setActiveSession('practice')}
            className={`px-4 py-2 rounded-lg text-base font-semibold transition-colors ${
              activeSession === 'practice'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Practice
          </button>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-base font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pos</th>
                <th className="px-4 py-3 text-left text-base font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Driver</th>
                <th className="px-4 py-3 text-left text-base font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Team</th>
                {activeSession === 'qualifying' || activeSession === 'practice' ? (
                  <>
                    <th className="px-4 py-3 text-left text-base font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
                    <th className="px-4 py-3 text-left text-base font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Gap</th>
                    <th className="px-4 py-3 text-left text-base font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">S1</th>
                    <th className="px-4 py-3 text-left text-base font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">S2</th>
                    <th className="px-4 py-3 text-left text-base font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">S3</th>
                    <th className="px-4 py-3 text-left text-base font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tire</th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-3 text-left text-base font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Best Lap</th>
                    <th className="px-4 py-3 text-left text-base font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Time</th>
                    <th className="px-4 py-3 text-left text-base font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-base font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tires Used</th>
                    <th className="px-4 py-3 text-left text-base font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Points</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {drivers.length === 0 ? (
                <tr>
                  <td colSpan={activeSession === 'qualifying' || activeSession === 'practice' ? 10 : 8} className="px-4 py-8 text-center text-base text-gray-500 dark:text-gray-400">
                    No {activeSession === 'qualifying' ? 'qualifying' : activeSession === 'practice' ? 'practice' : 'race'} results available
                  </td>
                </tr>
              ) : (
                drivers.map((driver) => (
                <tr 
                  key={driver.id} 
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  onClick={() => handleDriverClick(driver)}
                >
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-bold ${getPositionColor((activeSession === 'qualifying' || activeSession === 'practice' ? driver.qualifyingPosition : driver.racePosition) || 1)}`}>
                      {activeSession === 'qualifying' || activeSession === 'practice' ? (driver.qualifyingPosition || 0) : (driver.racePosition || 0)}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-base font-bold text-gray-700 dark:text-gray-300 mr-3">
                        {driver.number}
                      </div>
                      <div>
                        <div className="text-base font-medium text-gray-900 dark:text-white">{driver.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {(() => {
                      const teamColor = getTeamColorHex(driver.team);
                      const textColor = getContrastTextColor(teamColor);
                      return (
                        <span 
                          className="text-base font-semibold px-2 py-1 rounded inline-block"
                          style={{ 
                            backgroundColor: teamColor,
                            color: textColor
                          }}
                        >
                          {driver.team}
                        </span>
                      );
                    })()}
                  </td>
                  {activeSession === 'qualifying' || activeSession === 'practice' ? (
                    <>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {driver.qualifyingTime ? (
                          <span className="font-mono text-lg font-semibold w-20 inline-block text-right text-gray-900 dark:text-white">{F123DataService.formatTimeFromMs(driver.qualifyingTime)}</span>
                        ) : <span className="font-mono text-lg w-20 inline-block text-right text-gray-500 dark:text-gray-400">--:--.--</span>}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {driver.qualifyingGap ? (
                          <span className="font-mono text-lg font-semibold w-20 inline-block text-right text-gray-900 dark:text-white">+{F123DataService.formatTimeFromMs(driver.qualifyingGap)}</span>
                        ) : <span className="font-mono text-lg w-20 inline-block text-right text-gray-900 dark:text-white">Pole</span>}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {driver.qualifyingSector1Time ? (
                          <span className={`font-mono text-lg font-semibold w-16 inline-block text-right text-gray-900 dark:text-white ${driver.qualifyingSector1Time === fastestS1 ? 'text-purple-600 dark:text-purple-400' : ''}`}>
                            {F123DataService.formatSectorTimeFromMs(driver.qualifyingSector1Time)}
                          </span>
                        ) : <span className="font-mono text-lg w-16 inline-block text-right text-gray-500 dark:text-gray-400">--.---</span>}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {driver.qualifyingSector2Time ? (
                          <span className={`font-mono text-lg font-semibold w-16 inline-block text-right text-gray-900 dark:text-white ${driver.qualifyingSector2Time === fastestS2 ? 'text-purple-600 dark:text-purple-400' : ''}`}>
                            {F123DataService.formatSectorTimeFromMs(driver.qualifyingSector2Time)}
                          </span>
                        ) : <span className="font-mono text-lg w-16 inline-block text-right text-gray-500 dark:text-gray-400">--.---</span>}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {driver.qualifyingSector3Time ? (
                          <span className={`font-mono text-lg font-semibold w-16 inline-block text-right text-gray-900 dark:text-white ${driver.qualifyingSector3Time === fastestS3 ? 'text-purple-600 dark:text-purple-400' : ''}`}>
                            {F123DataService.formatSectorTimeFromMs(driver.qualifyingSector3Time)}
                          </span>
                        ) : <span className="font-mono text-lg w-16 inline-block text-right text-gray-500 dark:text-gray-400">--.---</span>}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {(() => {
                          const tire = (driver as any).qualifyingTire;
                          if (!tire) return <span className="text-base text-gray-500 dark:text-gray-400">-</span>;
                          const tireStr = typeof tire === 'number' ? getTireCompound(tire) : tire;
                          const tireColor = tireStr === 'S' ? 'text-red-600 dark:text-red-400' :
                                          tireStr === 'M' ? 'text-yellow-600 dark:text-yellow-400' :
                                          tireStr === 'H' ? 'text-white dark:text-gray-300' :
                                          tireStr === 'I' ? 'text-green-600 dark:text-green-400' :
                                          tireStr === 'W' ? 'text-blue-600 dark:text-blue-400' :
                                          'text-gray-600 dark:text-gray-400';
                          return (
                            <span className={`text-base font-bold ${tireColor}`}>
                              {tireStr}
                            </span>
                          );
                        })()}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {driver.raceBestLapTime ? (
                          <div className="flex items-center space-x-1">
                            <span className="font-mono text-lg font-semibold w-20 inline-block text-right text-gray-900 dark:text-white">{F123DataService.formatTimeFromMs(driver.raceBestLapTime)}</span>
                            {driver.fastestLap && <Zap className="w-5 h-5 text-purple-600 flex-shrink-0" />}
                          </div>
                        ) : <span className="font-mono text-lg w-20 inline-block text-right text-gray-500 dark:text-gray-400">--:--.--</span>}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {driver.raceTime ? (
                          <span className="font-mono text-lg font-semibold w-24 inline-block text-right text-gray-900 dark:text-white">{driver.raceTime}</span>
                        ) : <span className="font-mono text-lg w-24 inline-block text-right text-gray-500 dark:text-gray-400">--:--.--</span>}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                          driver.status === 'finished' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          driver.status === 'dnf' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}>
                          {driver.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {(() => {
                          const tiresUsed = (driver as any).raceTiresUsed;
                          if (!tiresUsed || tiresUsed.length === 0) {
                            return <span className="text-base text-gray-500 dark:text-gray-400">-</span>;
                          }
                          // If it's an array of tire compounds, format them
                          if (Array.isArray(tiresUsed)) {
                            const tireStrings = tiresUsed.map(t => typeof t === 'number' ? getTireCompound(t) : t);
                            return (
                              <div className="flex items-center space-x-1">
                                {tireStrings.map((tireStr, idx) => {
                                  const tireColor = tireStr === 'S' ? 'text-red-600 dark:text-red-400' :
                                                  tireStr === 'M' ? 'text-yellow-600 dark:text-yellow-400' :
                                                  tireStr === 'H' ? 'text-white dark:text-gray-300' :
                                                  tireStr === 'I' ? 'text-green-600 dark:text-green-400' :
                                                  tireStr === 'W' ? 'text-blue-600 dark:text-blue-400' :
                                                  'text-gray-600 dark:text-gray-400';
                                  return (
                                    <span key={idx} className={`text-base font-bold ${tireColor}`}>
                                      {tireStr}
                                    </span>
                                  );
                                })}
                              </div>
                            );
                          }
                          // If it's a string, just display it
                          return <span className="text-base text-gray-900 dark:text-white">{tiresUsed}</span>;
                        })()}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-base text-gray-900 dark:text-white">
                        {driver.points}
                      </td>
                    </>
                  )}
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};