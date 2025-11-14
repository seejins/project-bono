import { forwardRef, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../utils/api';
import logger from '../utils/logger';
import { useSeason } from '../contexts/SeasonContext';
import { F123DataService } from '../services/F123DataService';
import { STATUS_COLORS } from '../theme/colors';

interface HeroSectionProps {
  onExplore: () => void;
}

interface EventSummary {
  id: string;
  name?: string | null;
  track_name?: string | null;
  event_name?: string | null;
  short_event_name?: string | null;
  race_date?: string | null;
  status?: string;
  updated_at?: string | null;
  completed_at?: string | null;
  order_index?: number | null;
  track_length?: number | null;
  track?: {
    name?: string | null;
    length?: number | null;
  };
}

const getEventDisplayName = (event?: EventSummary | null) =>
  event?.short_event_name ||
  event?.event_name ||
  event?.track?.name ||
  event?.track_name ||
  event?.name ||
  null;

interface RawDriverResult {
  position?: number | string | null;
  race_position?: number | string | null;
  json_driver_name?: string | null;
  driver_name?: string | null;
  mapping_driver_name?: string | null;
  json_team_name?: string | null;
  mapping_team_name?: string | null;
  driver_team?: string | null;
}

interface PodiumEntry {
  position: number;
  driver: string;
  team: string;
  teamColor: string;
}

const PODIUM_SIZE_MAP: Record<number, string> = {
  1: 'text-xl sm:text-2xl md:text-[26px] lg:text-4xl 2xl:text-5xl',
  2: 'text-base sm:text-lg md:text-xl lg:text-2xl 2xl:text-3xl',
  3: 'text-sm sm:text-base md:text-lg lg:text-xl 2xl:text-2xl',
};

const PODIUM_LABEL_MAP: Record<number, string> = {
  1: '1ST',
  2: '2ND',
  3: '3RD',
};

const PODIUM_TEXT_COLOR_MAP: Record<number, string> = {
  1: 'text-white/85',
  2: 'text-white/70',
  3: 'text-white/60',
};

export const HeroSection = forwardRef<HTMLElement, HeroSectionProps>(
  ({ onExplore }, ref) => {
    // Video playlist - randomly selects one on each page refresh
    const HERO_VIDEOS = [
      {
        src: '/raw/videos/aus-edit.mp4',
        poster: '/hero/Mexico%20City%20GP%202024%20Desktop%20Wallpaper%202.jpg',
      },
      {
        src: '/raw/videos/bahrainstar.mp4',
        poster: '/hero/Mexico%20City%20GP%202024%20Desktop%20Wallpaper%202.jpg',
      },
      {
        src: '/raw/videos/f1-edit.mp4',
        poster: '/hero/Mexico%20City%20GP%202024%20Desktop%20Wallpaper%202.jpg',
      },
      {
        src: '/raw/videos/lewfinal.mp4',
        poster: '/hero/Mexico%20City%20GP%202024%20Desktop%20Wallpaper%202.jpg',
      },
    ];

    // Pick a random video on mount (only runs once per page load)
    const getRandomVideo = () => {
      return HERO_VIDEOS[Math.floor(Math.random() * HERO_VIDEOS.length)];
    };

    const { currentSeason } = useSeason();
    const navigate = useNavigate();
    const [raceLabel, setRaceLabel] = useState('Season Leaders');
    const [seasonTag, setSeasonTag] = useState<string | null>(null);
    const [raceDate, setRaceDate] = useState<string | null>(null);
    const [podiumEntries, setPodiumEntries] = useState<PodiumEntry[]>([]);
    const [previousRacePodium, setPreviousRacePodium] = useState<PodiumEntry[]>([]);
    const [nextEvent, setNextEvent] = useState<EventSummary | null>(null);
    const [previousEvent, setPreviousEvent] = useState<EventSummary | null>(null);
    const [seasonSummary, setSeasonSummary] = useState<{ completed: number; total: number }>({
      completed: 0,
      total: 0,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [heroContentVisible, setHeroContentVisible] = useState(false);
    const [cardsVisible, setCardsVisible] = useState(false);
    const [buttonVisible, setButtonVisible] = useState(false);
    const [videoRevealed, setVideoRevealed] = useState(false);
    const [videoLoaded, setVideoLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedVideo] = useState(() => getRandomVideo()); // Random video selected once on mount

    const HERO_DELAY_MS = 350;
    const PODIUM_ANIMATION_DURATION_MS = 1000;
    const PODIUM_STAGGER_MS = 200;
    const PODIUM_COUNT = 3;
    const PODIUM_INITIAL_DELAY_MS = 400;
    const PODIUM_TOTAL_DURATION_MS =
      PODIUM_INITIAL_DELAY_MS + PODIUM_ANIMATION_DURATION_MS + PODIUM_STAGGER_MS * (PODIUM_COUNT - 1);
    const CARDS_DELAY_OFFSET_MS = 200;
    const PODIUM_BUTTON_DELAY_MS = PODIUM_INITIAL_DELAY_MS + PODIUM_STAGGER_MS * PODIUM_COUNT;

    useEffect(() => {
      let isCancelled = false;

      const fetchHeroData = async () => {
        if (!currentSeason?.id) {
          setPodiumEntries([]);
          setPreviousRacePodium([]);
          setNextEvent(null);
          setPreviousEvent(null);
          setSeasonSummary({ completed: 0, total: 0 });
          setIsLoading(false);
          return;
        }

        try {
          setIsLoading(true);
          setError(null);

          const [standingsResponse, eventsResponse] = await Promise.all([
            apiGet(`/api/seasons/${currentSeason.id}/standings`),
            apiGet(`/api/seasons/${currentSeason.id}/events`),
          ]);

          if (!standingsResponse.ok) {
            throw new Error('Failed to load season standings');
          }

          const standingsPayload = await standingsResponse.json();
          const standings: Array<{ position?: number; name: string; team?: string }> =
            standingsPayload.standings || [];

          const leaders = standings.slice(0, 3).map((driver, index) => {
            const position = driver.position ?? index + 1;
            const rawTeamName = driver.team || 'Unknown Team';
            const teamName = F123DataService.getTeamDisplayName(rawTeamName);
            return {
              position,
              driver: driver.name || `Driver ${position}`,
              team: teamName,
              teamColor: F123DataService.getTeamColorHex(rawTeamName),
            };
          });

          setPodiumEntries(leaders);
          setRaceLabel('Season Leaders');
          setSeasonTag(currentSeason?.name ?? null);
          setRaceDate(null);

          if (!eventsResponse.ok) {
            throw new Error('Failed to load season events');
          }

          const eventsPayload = await eventsResponse.json();
          const events: EventSummary[] = eventsPayload.events || [];
          const nowTimestamp = Date.now();

          const indexedEvents = events.map((event, index) => ({ event, index }));
          const normalizeStatus = (status?: string | null) => (status ?? '').toLowerCase();
          const getOrderIndex = (entry: { event: EventSummary; index: number }) => {
            if (typeof entry.event.order_index === 'number' && Number.isFinite(entry.event.order_index)) {
              return entry.event.order_index as number;
            }
            return entry.index;
          };
          const getTimestamp = (value?: string | null) => {
            if (!value) return Number.POSITIVE_INFINITY;
            const parsed = Date.parse(value);
            return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
          };
          const getCompletedTimestamp = (event: EventSummary) => {
            const candidates = [event.completed_at, event.race_date, event.updated_at];
            let best = Number.NEGATIVE_INFINITY;
            for (const candidate of candidates) {
              if (!candidate) continue;
              const parsed = Date.parse(candidate);
              if (!Number.isNaN(parsed)) {
                best = Math.max(best, parsed);
              }
            }
            return best;
          };

          const upcomingEvents = indexedEvents
            .filter(({ event }) => normalizeStatus(event.status) === 'scheduled')
            .sort((a, b) => {
              const timeA = getTimestamp(a.event.race_date);
              const timeB = getTimestamp(b.event.race_date);
              if (timeA !== timeB) {
                return timeA - timeB;
              }
              return getOrderIndex(a) - getOrderIndex(b);
            })
            .map(({ event }) => event);

          const nextScheduledEvent =
            upcomingEvents.find((event) => {
              if (!event.race_date) return false;
              const parsed = Date.parse(event.race_date);
              return !Number.isNaN(parsed) && parsed >= nowTimestamp;
            }) ?? upcomingEvents[0] ?? null;

          const completedEvents = indexedEvents
            .filter(({ event }) => normalizeStatus(event.status) === 'completed')
            .sort((a, b) => {
              const timeA = getCompletedTimestamp(a.event);
              const timeB = getCompletedTimestamp(b.event);
              if (timeA !== timeB) {
                return timeB - timeA;
              }
              return getOrderIndex(a) - getOrderIndex(b);
            })
            .map(({ event }) => event);

          const latestCompletedEvent = completedEvents[0] ?? null;

          setPreviousEvent(latestCompletedEvent);
          setNextEvent(nextScheduledEvent);
          setSeasonSummary({ completed: completedEvents.length, total: events.length });

          if (latestCompletedEvent) {
            const resultsResponse = await apiGet(`/api/races/${latestCompletedEvent.id}/results`);
            if (resultsResponse.ok) {
              const resultsPayload = await resultsResponse.json();
              const raceSession =
                (resultsPayload.sessions || []).find((session: any) => session.sessionType === 10) ??
                (resultsPayload.sessions || [])[0];

              if (raceSession?.results) {
                const podium = (raceSession.results as RawDriverResult[])
                  .map((driver) => {
                    const rawPosition = driver.position ?? driver.race_position;
                    const position = rawPosition != null ? Number(rawPosition) : null;
                    if (!position || position > 3) return null;

                    const driverName =
                      driver.json_driver_name ||
                      driver.driver_name ||
                      driver.mapping_driver_name ||
                      'Unknown Driver';

                    const rawTeamName =
                      driver.json_team_name ||
                      driver.mapping_team_name ||
                      driver.driver_team ||
                      'Unknown Team';
                    const teamName = F123DataService.getTeamDisplayName(rawTeamName);

                    return {
                      position,
                      driver: driverName,
                      team: teamName,
                      teamColor: F123DataService.getTeamColorHex(rawTeamName),
                    };
                  })
                  .filter((entry): entry is PodiumEntry => !!entry)
                  .sort((a, b) => a.position - b.position);

                setPreviousRacePodium(podium);
              } else {
                setPreviousRacePodium([]);
              }
            } else {
              setPreviousRacePodium([]);
            }
          } else {
            setPreviousRacePodium([]);
          }
        } catch (err) {
          if (!isCancelled) {
            logger.error('Hero podium load error:', err);
            setError(err instanceof Error ? err.message : 'Unable to load race podium');
            setPodiumEntries([]);
            setPreviousRacePodium([]);
            setNextEvent(null);
            setPreviousEvent(null);
            setSeasonSummary({ completed: 0, total: 0 });
          }
        } finally {
          if (!isCancelled) {
            setIsLoading(false);
          }
        }
      };

      fetchHeroData();

      return () => {
        isCancelled = true;
      };
    }, [currentSeason?.id]);

    useEffect(() => {
      if (!isLoading) {
        const frame = requestAnimationFrame(() => {
          setVideoRevealed(true);
        });
        return () => cancelAnimationFrame(frame);
      }

      setVideoRevealed(false);
    }, [isLoading]);

    useEffect(() => {
      let frame: number | null = null;
      let heroTimeout: number | null = null;
      let cardsTimeout: number | null = null;
      let buttonTimeout: number | null = null;

      if (!isLoading) {
        frame = requestAnimationFrame(() => {
          heroTimeout = window.setTimeout(() => {
            setHeroContentVisible(true);
            cardsTimeout = window.setTimeout(() => {
              setCardsVisible(true);
            }, Math.max(PODIUM_TOTAL_DURATION_MS - CARDS_DELAY_OFFSET_MS, 0));
            buttonTimeout = window.setTimeout(() => {
              setButtonVisible(true);
            }, PODIUM_BUTTON_DELAY_MS);
          }, HERO_DELAY_MS);
        });
      } else {
        setHeroContentVisible(false);
        setCardsVisible(false);
        setButtonVisible(false);
      }

      return () => {
        if (frame !== null) {
          cancelAnimationFrame(frame);
        }
        if (heroTimeout !== null) {
          window.clearTimeout(heroTimeout);
        }
        if (cardsTimeout !== null) {
          window.clearTimeout(cardsTimeout);
        }
        if (buttonTimeout !== null) {
          window.clearTimeout(buttonTimeout);
        }
      };
    }, [isLoading]);

    const formattedRaceDate = useMemo(() => {
      if (!raceDate) return null;
      const parsed = new Date(raceDate);
      if (Number.isNaN(parsed.getTime())) return null;

      return parsed.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }, [raceDate]);

    const subtitle = seasonTag ?? formattedRaceDate ?? null;

    const nextEventName = useMemo(
      () => getEventDisplayName(nextEvent) ?? 'TBD',
      [nextEvent],
    );

    const nextEventDateLabel = useMemo(() => {
      if (!nextEvent?.race_date) {
        return 'Date TBD';
      }

      const parsed = new Date(nextEvent.race_date);
      if (Number.isNaN(parsed.getTime())) {
        return 'Date TBD';
      }

      return parsed.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }, [nextEvent]);

    const formatTrackDistanceKm = (length?: number | string | null) => {
      if (length === null || length === undefined) {
        return null;
      }

      const numericLength =
        typeof length === 'string' ? parseFloat(length) : typeof length === 'number' ? length : NaN;

      if (!Number.isFinite(numericLength) || numericLength <= 0) {
        return null;
      }

      let kmValue = numericLength;
      if (kmValue > 50) {
        kmValue = kmValue / 1000;
      }

      return `${kmValue.toFixed(kmValue >= 10 ? 1 : 2)} km`;
    };

    const nextEventTrackLabel = useMemo(() => {
      if (!nextEvent) {
        return {
          circuit: 'Track TBD',
          distance: null as string | null,
        };
      }

      const circuitName =
        nextEvent.track?.name ||
        nextEvent.track_name ||
        (nextEvent.track as any)?.eventName ||
        getEventDisplayName(nextEvent);

      const trackDistance =
        nextEvent.track?.length ??
        (nextEvent as any).track_length ??
        (nextEvent as any).track_length_km ??
        (nextEvent as any).track_length_meters ??
        null;

      return {
        circuit: circuitName || 'Track TBD',
        distance: formatTrackDistanceKm(trackDistance),
      };
    }, [nextEvent]);

    const displayPodium = useMemo(() => {
      return [1, 2, 3].map((position) => {
        const match = podiumEntries.find((entry) => entry.position === position);

        if (match) {
          return match;
        }

        return {
          position,
          driver: 'TBD',
          team: 'Awaiting Results',
          teamColor: STATUS_COLORS.neutral,
        };
      });
    }, [podiumEntries]);

    return (
      <section
        ref={ref}
        className="relative flex min-h-[100dvh] w-full flex-col justify-between overflow-hidden"
      >
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={selectedVideo.src}
          poster={selectedVideo.poster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onLoadedData={() => setVideoLoaded(true)}
          onCanPlay={() => setVideoLoaded(true)}
        />
        <div
          className={clsx(
            'absolute inset-0 bg-black transition-opacity duration-700 ease-out',
            videoRevealed ? 'opacity-0' : 'opacity-100'
          )}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/50 to-black/15" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />

        <div className="relative z-10 flex min-h-[100dvh] w-full justify-center">
          <div className="flex w-full max-w-[2560px] flex-col px-6 py-10 md:px-12 md:py-12 lg:px-20 lg:py-16">
            <div className="flex flex-1 flex-col justify-end">
              <div
                className={clsx(
                  'max-w-4xl space-y-6 text-white transition-all duration-[1200ms] ease-out',
                  heroContentVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-16'
                )}
              >
                <div>
                  <h1 className="text-lg font-semibold uppercase tracking-[0.35em] text-white/90 sm:text-xl">
                    {raceLabel}
                  </h1>
                  {subtitle && (
                    <p className="mt-2 text-sm sm:text-base uppercase tracking-[0.4em] text-white/60">
                      {subtitle}
                    </p>
                  )}
                </div>

                {error && <p className="text-sm text-red-300">{error}</p>}

                <div className="space-y-6 md:space-y-8">
                  {displayPodium.map(({ position, driver, teamColor }, index) => (
                    <div
                      key={position}
                      className={clsx(
                        'flex items-center gap-8 transition-all duration-[1000ms] ease-out',
                        heroContentVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-5'
                      )}
                      style={{ transitionDelay: `${PODIUM_INITIAL_DELAY_MS + index * PODIUM_STAGGER_MS}ms` }}
                    >
                      <span className="inline-flex w-20 justify-center text-sm sm:text-base md:text-lg font-semibold uppercase tracking-[0.45em] text-white/70">
                        {PODIUM_LABEL_MAP[position] ?? `${position}TH`}
                      </span>
                      <div className="flex items-stretch gap-5">
                        <span
                          className="inline-block w-1 rounded-full self-stretch"
                          style={{ backgroundColor: teamColor }}
                        />
                        <p
                          className={`${PODIUM_SIZE_MAP[position]} ${PODIUM_TEXT_COLOR_MAP[position]} font-bold uppercase tracking-[0.18em] leading-none`}
                        >
                          {driver}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={onExplore}
                  className={clsx(
                    'group mt-1 inline-flex items-center gap-3 rounded-full bg-red-600 px-6 py-3 text-xs font-semibold uppercase tracking-[0.4em] text-white transition-all duration-500 ease-out hover:bg-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500 disabled:bg-red-600/70 disabled:text-white/80',
                    buttonVisible
                      ? 'opacity-100 translate-x-0 translate-y-0'
                      : 'pointer-events-none opacity-0 -translate-x-6'
                  )}
                  disabled={isLoading}
                >
                  Season Dashboard
                  <Trophy className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </button>
              </div>
            </div>

            <div
              className={clsx(
                'hidden w-full gap-4 transition-all duration-[1300ms] ease-out lg:mt-14 lg:grid lg:grid-cols-3 lg:gap-6',
                cardsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'
              )}
            >
              <article
                onClick={() => navigate('/races')}
                className="rounded-3xl border border-white/20 bg-black/25 p-6 text-white shadow-lg backdrop-blur cursor-pointer transition-colors hover:bg-black/35"
              >
                <h3 className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
                  Next Event
                </h3>
                {nextEvent ? (
                  <div className="mt-3 space-y-1.5">
                    <p className="text-base font-medium leading-tight text-white/90">
                      {nextEventName}
                    </p>
                    <p className="text-sm text-white/70 leading-tight">{nextEventDateLabel}</p>
                    <p className="text-sm text-white/60 leading-tight">
                      {nextEventTrackLabel.circuit}
                      {nextEventTrackLabel.distance ? (
                        <span className="text-white/55"> • {nextEventTrackLabel.distance}</span>
                      ) : null}
                    </p>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-white/70">No upcoming events scheduled.</p>
                )}
              </article>

              <article
                onClick={() => previousEvent?.id && navigate(`/races/${previousEvent.id}`)}
                className={clsx(
                  'rounded-3xl border border-white/20 bg-black/25 p-6 text-white shadow-lg backdrop-blur transition-colors',
                  previousEvent?.id ? 'cursor-pointer hover:bg-black/35' : ''
                )}
              >
                <h3 className="text-xs font-semibold uppercase tracking-[0.4em] text-white/60">
                  Last Race Podium
                </h3>
                {previousEvent ? (
                  <p className="mt-2 text-base text-white/75">
                    {getEventDisplayName(previousEvent) ?? 'Previous Race'}
                  </p>
                ) : null}
                <ul className="mt-1 space-y-2">
                  {previousRacePodium.length > 0 ? (
                    previousRacePodium.map((entry) => (
                      <li key={entry.position} className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex min-w-[2.5rem] justify-center text-xs font-medium uppercase tracking-[0.3em] text-white/70">
                            {PODIUM_LABEL_MAP[entry.position] ?? `${entry.position}TH`}
                          </span>
                          <span
                            className="inline-block h-5 w-0.5 rounded-full"
                            style={{ backgroundColor: entry.teamColor }}
                          />
                          <span className="text-sm font-medium leading-tight text-white/85">
                            {entry.driver}
                          </span>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-white/70 leading-tight">No completed race yet.</li>
                  )}
                </ul>
              </article>

              <article
                onClick={() => navigate('/season')}
                className="rounded-3xl border border-white/20 bg-black/25 p-6 text-white shadow-lg backdrop-blur cursor-pointer transition-colors hover:bg-black/35"
              >
                <h3 className="text-xs font-semibold uppercase tracking-[0.4em] text-white/60">
                  Season Progress
                </h3>
                <div className="mt-4 space-y-2 text-sm text-white/75">
                  <p>
                    Completed Races:{' '}
                    <span className="font-semibold text-white">{seasonSummary.completed}</span>
                  </p>
                  <p>
                    Total Events:{' '}
                    <span className="font-semibold text-white">{seasonSummary.total}</span>
                  </p>
                  <p>
                    Remaining:{' '}
                    <span className="font-semibold text-white">
                      {Math.max(seasonSummary.total - seasonSummary.completed, 0)}
                    </span>
                  </p>
                </div>
              </article>
            </div>
          </div>
        </div>

      </section>
    );
  }
);

HeroSection.displayName = 'HeroSection';

