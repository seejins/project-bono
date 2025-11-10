import { forwardRef, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Trophy } from 'lucide-react';
import { apiGet } from '../utils/api';
import { useSeason } from '../contexts/SeasonContext';
import { F123DataService } from '../services/F123DataService';

interface HeroSectionProps {
  onExplore: () => void;
}

interface EventSummary {
  id: string;
  name?: string | null;
  track_name?: string | null;
  race_date?: string | null;
  status?: string;
  updated_at?: string | null;
  completed_at?: string | null;
  track?: {
    name?: string | null;
  };
}

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
  1: 'text-2xl sm:text-3xl lg:text-4xl 2xl:text-5xl',
  2: 'text-lg sm:text-xl lg:text-2xl 2xl:text-3xl',
  3: 'text-sm sm:text-base lg:text-lg 2xl:text-xl',
};

const PODIUM_LABEL_MAP: Record<number, string> = {
  1: '1ST',
  2: '2ND',
  3: '3RD',
};

export const HeroSection = forwardRef<HTMLElement, HeroSectionProps>(
  ({ onExplore }, ref) => {
    const { currentSeason } = useSeason();
    const [raceLabel, setRaceLabel] = useState('Latest Grand Prix');
    const [raceDate, setRaceDate] = useState<string | null>(null);
    const [podiumEntries, setPodiumEntries] = useState<PodiumEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [heroContentVisible, setHeroContentVisible] = useState(false);
    const [cardsVisible, setCardsVisible] = useState(false);
    const [buttonVisible, setButtonVisible] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

      const fetchPodium = async () => {
        if (!currentSeason?.id) {
          setPodiumEntries([]);
          setIsLoading(false);
          return;
        }

        try {
          setIsLoading(true);
          setError(null);

          const eventsResponse = await apiGet(`/api/seasons/${currentSeason.id}/events`);
          if (!eventsResponse.ok) {
            throw new Error('Failed to load season events');
          }

          const eventsPayload = await eventsResponse.json();
          const events: EventSummary[] = eventsPayload.events || [];

          const completedEvents = events.filter(
            (event) => event.status === 'completed'
          );

          if (completedEvents.length === 0) {
            if (!isCancelled) {
              setRaceLabel('Next Grand Prix');
              setRaceDate(null);
              setPodiumEntries([]);
            }
            return;
          }

          completedEvents.sort((a, b) => {
            const dateA = a.race_date || a.completed_at || a.updated_at || '';
            const dateB = b.race_date || b.completed_at || b.updated_at || '';
            return new Date(dateB).getTime() - new Date(dateA).getTime();
          });

          const latestEvent = completedEvents[0];

          if (!isCancelled) {
            const trackLabel =
              latestEvent.track_name ||
              latestEvent.track?.name ||
              latestEvent.name ||
              'Latest Grand Prix';

            setRaceLabel(trackLabel);
            setRaceDate(latestEvent.race_date || null);
          }

          const resultsResponse = await apiGet(`/api/races/${latestEvent.id}/results`);
          if (!resultsResponse.ok) {
            throw new Error('Failed to load race results');
          }

          const resultsPayload = await resultsResponse.json();
          const raceSession =
            (resultsPayload.sessions || []).find((session: any) => session.sessionType === 10) ??
            (resultsPayload.sessions || [])[0];

          if (!raceSession?.results) {
            if (!isCancelled) {
              setPodiumEntries([]);
            }
            return;
          }

          const topThree = (raceSession.results as RawDriverResult[])
            .map((driver) => {
              const rawPosition = driver.position ?? driver.race_position;
              const position = rawPosition != null ? Number(rawPosition) : null;

              if (!position) return null;

              const driverName =
                driver.json_driver_name ||
                driver.driver_name ||
                driver.mapping_driver_name ||
                'Unknown Driver';

              const teamName =
                driver.json_team_name ||
                driver.mapping_team_name ||
                driver.driver_team ||
                'Unknown Team';

              return {
                position,
                driver: driverName,
                team: teamName,
                teamColor: F123DataService.getTeamColorHex(teamName),
              };
            })
            .filter((entry): entry is PodiumEntry => !!entry && entry.position <= 3)
            .sort((a, b) => a.position - b.position);

          if (!isCancelled) {
            setPodiumEntries(topThree);
          }
        } catch (err) {
          if (!isCancelled) {
            console.error('Hero podium load error:', err);
            setError(err instanceof Error ? err.message : 'Unable to load race podium');
            setPodiumEntries([]);
          }
        } finally {
          if (!isCancelled) {
            setIsLoading(false);
          }
        }
      };

      fetchPodium();

      return () => {
        isCancelled = true;
      };
    }, [currentSeason?.id]);

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
          teamColor: '#9ca3af',
        };
      });
    }, [podiumEntries]);

    return (
      <section
        ref={ref}
        className="relative flex h-screen w-full flex-col justify-between overflow-hidden pb-12"
      >
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src="/hero/YTDown.com_YouTube_Lewis-Hamilton-s-First-Lap-As-A-Ferrari_Media_8FNO2ZupdZI_001_1080p.mp4"
          poster="/hero/Mexico%20City%20GP%202024%20Desktop%20Wallpaper%202.jpg"
          autoPlay
          muted
          loop
          playsInline
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/60 to-black/20" />

        <div className="relative z-10 flex h-full justify-center">
          <div className="flex h-full w-full max-w-[2560px] flex-col justify-center lg:justify-end gap-4 px-6 md:gap-6 md:px-12 lg:px-20 lg:pb-6">
            <div className="flex flex-col justify-center -translate-y-4 md:-translate-y-10 lg:justify-start lg:-translate-y-20">
              <div
                className={clsx(
                  'max-w-4xl space-y-6 text-white transition-all duration-[1200ms] ease-out',
                  heroContentVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-16'
                )}
              >
                <div>
                  <h1 className="text-2xl font-semibold uppercase tracking-[0.35em] text-white/90 sm:text-3xl">
                    {raceLabel}
                  </h1>
                  {formattedRaceDate && (
                    <p className="mt-2 text-xs uppercase tracking-[0.4em] text-white/60">
                      {formattedRaceDate}
                    </p>
                  )}
                </div>

                {error && <p className="text-sm text-red-300">{error}</p>}

                <div className="space-y-4 md:space-y-5">
                  {displayPodium.map(({ position, driver, teamColor }, index) => (
                    <div
                      key={position}
                      className={clsx(
                        'flex items-baseline gap-6 transition-all duration-[1000ms] ease-out',
                        heroContentVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-5'
                      )}
                      style={{ transitionDelay: `${PODIUM_INITIAL_DELAY_MS + index * PODIUM_STAGGER_MS}ms` }}
                    >
                      <span className="text-xs font-semibold uppercase tracking-[0.4em] text-white/60">
                        {PODIUM_LABEL_MAP[position] ?? `${position}TH`}
                      </span>
                      <div className="flex flex-col">
                        <p
                          className={`${PODIUM_SIZE_MAP[position]} font-bold uppercase tracking-[0.18em]`}
                        >
                          {driver}
                        </p>
                        <span
                          className="mt-2 h-1 border-b-4"
                          style={{
                            borderColor: teamColor,
                            width: position === 1 ? '12rem' : position === 2 ? '8rem' : '6rem',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={onExplore}
                  className={clsx(
                    'group inline-flex items-center gap-3 rounded-full bg-red-600 px-6 py-3 text-xs font-semibold uppercase tracking-[0.4em] text-white transition-all duration-500 ease-out hover:bg-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500 disabled:bg-red-600/70 disabled:text-white/80',
                    buttonVisible
                      ? 'opacity-100 translate-x-0 translate-y-0'
                      : 'pointer-events-none opacity-0 -translate-x-6'
                  )}
                  disabled={isLoading}
                >
                  View Race Results
                  <Trophy className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </button>
              </div>
            </div>

            <div
              className={clsx(
                'flex w-full flex-col gap-4 lg:-mt-2 lg:flex-row lg:gap-6 transition-all duration-[1300ms] ease-out',
                cardsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'
              )}
            >
              {[1, 2, 3].map((item) => (
                <article
                  key={item}
                  className="flex-1 rounded-3xl border border-white/20 bg-black/25 p-6 text-white shadow-lg backdrop-blur"
                >
                  <h3 className="text-xs font-semibold uppercase tracking-[0.4em] text-white/60">
                    Placeholder {item}
                  </h3>
                  <p className="mt-3 text-sm text-white/75">
                    Drop in highlight reels, tyre strategy callouts, or anything else you want to surface post-race. Replace this filler copy when you have the real story.
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }
);

HeroSection.displayName = 'HeroSection';

