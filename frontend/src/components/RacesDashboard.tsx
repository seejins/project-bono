import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import clsx from 'clsx';
import { apiGet, apiPostFormData } from '../utils/api';
import { Grid3X3, List, Calendar, MapPin, Flag } from 'lucide-react';
import { DashboardTable, type DashboardTableColumn } from './layout/DashboardTable';
import { DashboardPage } from './layout/DashboardPage';
import { useAdmin } from '../contexts/AdminContext';

interface Event {
  id: string;
  season_id: string;
  track_id: string;
  track_name: string;
  event_name?: string | null;
  short_event_name?: string | null;
  race_date: string | null;
  status: 'scheduled' | 'completed' | 'cancelled';
  session_type: number;
  session_types: string | null;
  session_duration: number;
  weather_air_temp: number;
  weather_track_temp: number;
  weather_rain_percentage: number;
  created_at: string;
  updated_at: string;
  session_config: any;
  order_index?: number | null;
  track: {
    id: string;
    name: string;
    country: string;
    length: number;
    eventName?: string | null;
    shortEventName?: string | null;
  };
  total_laps?: number | null;
  track_length?: number | null;
  primary_session_result_id?: string | null;
}

interface RacesDashboardProps {
  seasonId: string;
  onRaceSelect?: (raceId: string) => void;
}

type ViewMode = 'cards' | 'list';

const formatEventDate = (dateString: string | null) => {
  if (!dateString) return 'TBD';
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return 'TBD';
  return parsed.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getSessionTypes = (sessionTypes: string | null) => {
  if (!sessionTypes) return ['Race'];
  return sessionTypes.split(', ');
};

const getSessionTypeBadgeClass = (sessionType: string) => {
  const type = sessionType.toLowerCase();
  if (type.includes('practice')) {
    return 'bg-emerald-500/15 text-emerald-400';
  }
  if (type.includes('qualifying')) {
    return 'bg-sky-500/15 text-sky-400';
  }
  if (type.includes('race')) {
    return 'bg-red-500/15 text-red-400';
  }
  return 'bg-slate-500/10 text-slate-500';
};

const EVENT_STATUS_META: Record<Event['status'] | 'scheduled', {
  label: string;
  textClass: string;
  dotClass: string;
}> = {
  completed: {
    label: 'Completed',
    textClass: 'text-emerald-400',
    dotClass: 'bg-emerald-400',
  },
  cancelled: {
    label: 'Cancelled',
    textClass: 'text-red-400',
    dotClass: 'bg-red-400',
  },
  scheduled: {
    label: 'Scheduled',
    textClass: 'text-amber-400',
    dotClass: 'bg-amber-400',
  },
};

const getEventStatusMeta = (status: Event['status'] | undefined) =>
  EVENT_STATUS_META[status ?? 'scheduled'];

export const RacesDashboard: React.FC<RacesDashboardProps> = ({ seasonId, onRaceSelect }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const { isAuthenticated } = useAdmin();
  const [isEditing, setIsEditing] = useState(false);
  const [pendingUploadEventId, setPendingUploadEventId] = useState<string | null>(null);
  const [uploadingEventId, setUploadingEventId] = useState<string | null>(null);
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (!isAuthenticated) {
      setIsEditing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isEditing) {
      setPendingUploadEventId(null);
      setUploadingEventId(null);
    }
  }, [isEditing]);

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiGet(`/api/seasons/${seasonId}/events`);
      if (response.ok) {
        const data = await response.json();
        const fetchedEvents: Event[] = data.events || [];
        const sortedEvents = fetchedEvents
          .slice()
          .sort((a, b) => {
            const aOrder = a.order_index ?? Number.MAX_SAFE_INTEGER;
            const bOrder = b.order_index ?? Number.MAX_SAFE_INTEGER;
            if (aOrder !== bOrder) return aOrder - bOrder;
            const aDate = a.race_date ? Date.parse(a.race_date) : Number.POSITIVE_INFINITY;
            const bDate = b.race_date ? Date.parse(b.race_date) : Number.POSITIVE_INFINITY;
            if (aDate !== bDate) return aDate - bDate;
            return a.created_at.localeCompare(b.created_at);
          });
        setEvents(sortedEvents);
        setUploadErrors({});
      } else {
        throw new Error('Failed to load events');
      }
    } catch (err) {
      console.error('Error loading events:', err);
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [seasonId]);

  useEffect(() => {
    loadEvents();
  }, [seasonId, loadEvents]);

  const { latestCompleted, remainingCompleted, scheduledEvents, orderedEvents } = useMemo(() => {
    const upcoming: Event[] = [];
    const finished: Event[] = [];

    events.forEach((event) => {
      if (event.status === 'completed') {
        finished.push(event);
      } else {
        upcoming.push(event);
      }
    });

    const completedSorted = finished
      .slice()
      .sort((a, b) => {
        const aDate = a.race_date ? Date.parse(a.race_date) : Number.NEGATIVE_INFINITY;
        const bDate = b.race_date ? Date.parse(b.race_date) : Number.NEGATIVE_INFINITY;
        if (aDate !== bDate) return bDate - aDate;
        const aOrder = a.order_index ?? Number.MAX_SAFE_INTEGER;
        const bOrder = b.order_index ?? Number.MAX_SAFE_INTEGER;
        return aOrder - bOrder;
      });

    const [latestCompletedEvent, ...earlierCompleted] = completedSorted;

    const listOrder = latestCompletedEvent
      ? [latestCompletedEvent, ...upcoming, ...earlierCompleted]
      : [...upcoming, ...earlierCompleted];

    return {
      latestCompleted: latestCompletedEvent ?? null,
      remainingCompleted: earlierCompleted,
      scheduledEvents: upcoming,
      orderedEvents: listOrder,
    };
  }, [events]);

  const handleUploadTrigger = useCallback(
    (eventId: string) => {
      if (uploadingEventId) {
        return;
      }

      setUploadErrors((prev) => {
        if (!prev[eventId]) {
          return prev;
        }
        const next = { ...prev };
        delete next[eventId];
        return next;
      });

      setPendingUploadEventId(eventId);
      fileInputRef.current?.click();
    },
    [uploadingEventId],
  );

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const target = event.target;
      const selectedFile = target.files?.[0];
      const targetEventId = pendingUploadEventId;

      if (!selectedFile || !targetEventId) {
        target.value = '';
        return;
      }

      setUploadingEventId(targetEventId);

      try {
        const formData = new FormData();
        formData.append('resultsFile', selectedFile);

        const response = await apiPostFormData(
          `/api/seasons/${seasonId}/events/${targetEventId}/upload`,
          formData,
        );

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          const errorMessage =
            data?.error ||
            (Array.isArray(data?.details) ? data.details.join(', ') : data?.details) ||
            'Failed to upload results';
          throw new Error(errorMessage);
        }

        await loadEvents();
      } catch (uploadError) {
        setUploadErrors((prev) => ({
          ...prev,
          [targetEventId]:
            uploadError instanceof Error ? uploadError.message : 'Failed to upload results',
        }));
      } finally {
        setUploadingEventId(null);
        setPendingUploadEventId(null);
        target.value = '';
      }
    },
    [pendingUploadEventId, seasonId, loadEvents],
  );

  const tableColumns = useMemo<DashboardTableColumn<Event>[]>(() => {
    const columns: DashboardTableColumn<Event>[] = [
      {
        key: 'track_name',
        label: 'Event',
        align: 'left' as const,
        headerClassName: 'text-left',
        className: 'font-semibold text-slate-900 dark:text-slate-100',
        render: (_: unknown, row) =>
          row.short_event_name || row.event_name || row.track_name || 'TBD',
      },
      {
        key: 'track-info',
        label: 'Circuit',
        align: 'left' as const,
        headerClassName: 'text-left',
        render: (_: unknown, row) => (
          <div className="text-sm text-slate-500 dark:text-slate-400">
            <div>{row.track?.name || 'Venue TBD'}</div>
            <div>{row.track?.length ? `${row.track.length} km` : 'Distance TBD'}</div>
          </div>
        ),
      },
      {
        key: 'laps',
        label: 'Total Laps',
        render: (_: unknown, row) => (
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {row.total_laps != null
              ? row.total_laps
              : row.session_duration
              ? `${row.session_duration} laps`
              : 'Laps TBD'}
          </span>
        ),
      },
      {
        key: 'race_date',
        label: 'Date',
        render: (_: string | null, row) => (
          <span className="text-sm text-slate-400 dark:text-slate-500">
            {formatEventDate(row.race_date)}
          </span>
        ),
      },
      {
        key: 'session_types',
        label: 'Sessions',
        render: (_: string | null, row) => (
          <div className="flex flex-wrap gap-2">
            {getSessionTypes(row.session_types).map((session) => (
              <span
                key={session}
                className={clsx(
                  'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] 2xl:text-sm font-semibold',
                  getSessionTypeBadgeClass(session),
                )}
              >
                {session}
              </span>
            ))}
          </div>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        render: (_: string, row) => {
          const statusMeta = getEventStatusMeta(row.status);
          return (
            <span
              className={clsx(
                'inline-flex items-center gap-2 text-sm font-semibold',
                statusMeta.textClass,
              )}
            >
              <span className={clsx('h-2 w-2 rounded-full', statusMeta.dotClass)} />
              {statusMeta.label}
            </span>
          );
        },
      },
    ];

    if (isEditing) {
      columns.push({
        key: 'upload_action',
        label: 'Upload',
        align: 'right',
        headerClassName: 'text-right',
        render: (_: unknown, row) => (
          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                handleUploadTrigger(row.id);
              }}
              disabled={uploadingEventId === row.id}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {uploadingEventId === row.id ? 'Uploading…' : 'Upload Results'}
            </button>
            {uploadErrors[row.id] && (
              <span className="max-w-[220px] text-xs text-red-500 dark:text-red-400">
                {uploadErrors[row.id]}
              </span>
            )}
          </div>
        ),
      });
    }

    return columns;
  }, [isEditing, handleUploadTrigger, uploadingEventId, uploadErrors]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Schedule</h2>
          <div className="flex space-x-2">
            <div className="h-10 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
            <div className="h-10 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <DashboardPage
      hero={{
        imageSrc: '/hero/94mliza3aat71.jpg',
        title: 'Season Schedule',
        subtitle: events.length ? `${events.length} Events` : 'Season Calendar',
        description: 'Track every race weekend, session type, and status update across the entire campaign.',
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center text-slate-900 dark:text-slate-100">
            <Calendar className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Season Schedule</h1>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex rounded-lg bg-slate-100 p-1 text-sm dark:bg-slate-900">
            <button
              onClick={() => setViewMode('cards')}
              className={clsx(
                'rounded-md px-3 py-1 transition-colors',
                viewMode === 'cards'
                  ? 'bg-red-600 text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              )}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={clsx(
                'rounded-md px-3 py-1 transition-colors',
                viewMode === 'list'
                  ? 'bg-red-600 text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              )}
            >
              List
            </button>
          </div>
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => setIsEditing((prev) => !prev)}
              disabled={!!uploadingEventId}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {isEditing ? 'Done' : 'Edit'}
            </button>
          )}
        </div>
      </div>

      {/* Events */}
      {events.length === 0 ? (
        <div className="text-center py-12">
          <Flag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No events scheduled</h3>
          <p className="text-gray-600 dark:text-gray-400">Events will appear here once they are added to the season.</p>
        </div>
      ) : (
        <>
          {viewMode === 'cards' ? (
            <div className="space-y-10">
              {latestCompleted && (
                <section>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                      Latest Result
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {(() => {
                        const label = formatEventDate(latestCompleted.race_date);
                        return label === 'TBD' ? 'Awaiting final date' : `Wrapped up ${label}`;
                      })()}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <EventCard
                      key={latestCompleted.id}
                      event={latestCompleted}
                      onRaceSelect={onRaceSelect}
                      isEditing={isEditing}
                      onUploadResults={handleUploadTrigger}
                      uploading={uploadingEventId === latestCompleted.id}
                      uploadError={uploadErrors[latestCompleted.id]}
                    />
                  </div>
                </section>
              )}

              {scheduledEvents.length > 0 && (
                <section>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                      Upcoming & Scheduled
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {scheduledEvents.length} event{scheduledEvents.length === 1 ? '' : 's'} remaining
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {scheduledEvents.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        onRaceSelect={onRaceSelect}
                        isEditing={isEditing}
                        onUploadResults={handleUploadTrigger}
                        uploading={uploadingEventId === event.id}
                        uploadError={uploadErrors[event.id]}
                      />
                    ))}
                  </div>
                </section>
              )}

              {remainingCompleted.length > 0 && (
                <section>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                      Earlier Completed Events
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {remainingCompleted.length + (latestCompleted ? 1 : 0)} completed
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {remainingCompleted.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        onRaceSelect={onRaceSelect}
                        isEditing={isEditing}
                        onUploadResults={handleUploadTrigger}
                        uploading={uploadingEventId === event.id}
                        uploadError={uploadErrors[event.id]}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          ) : (
            <DashboardTable
              columns={tableColumns}
              rows={orderedEvents}
              rowKey={(row) => row.id}
              onRowClick={!isEditing && onRaceSelect ? (row) => onRaceSelect(row.id) : undefined}
              emptyMessage="No events scheduled."
            />
          )}
        </>
      )}
    </DashboardPage>
  );
};

// Event Card Component
interface EventCardProps {
  event: Event;
  onRaceSelect?: (raceId: string) => void;
  isEditing?: boolean;
  onUploadResults?: (eventId: string) => void;
  uploading?: boolean;
  uploadError?: string;
}

const EventCard: React.FC<EventCardProps> = ({
  event,
  onRaceSelect,
  isEditing = false,
  onUploadResults,
  uploading = false,
  uploadError,
}) => {
  const statusMeta = getEventStatusMeta(event.status);
  const sessionTypes = getSessionTypes(event.session_types);

  const handleCardClick = () => {
    if (isEditing) {
      return;
    }
    onRaceSelect?.(event.id);
  };

  return (
    <div
      className={clsx(
        'flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-md dark:border-slate-800 dark:bg-slate-950/70',
        isEditing
          ? 'cursor-default opacity-100'
          : 'cursor-pointer transition hover:-translate-y-1 hover:shadow-xl',
      )}
      onClick={handleCardClick}
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex items-center justify-between w-full gap-3">
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-red-500" />
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {event.short_event_name || event.event_name || event.track_name || 'TBD'}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {formatEventDate(event.race_date)}
              </p>
            </div>
          </div>
          <span
            className={clsx(
              'inline-flex items-center gap-2 text-[11px] 2xl:text-xs font-semibold uppercase tracking-[0.28em]',
              statusMeta.textClass
            )}
          >
            <span className={clsx('h-2 w-2 rounded-full', statusMeta.dotClass)} />
            {statusMeta.label}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-4 px-6 py-5 text-sm 2xl:text-base text-slate-600 dark:text-slate-300">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Track Information</p>
          <ul className="mt-2 space-y-1 text-sm 2xl:text-base text-slate-600 dark:text-slate-300">
            <li>{event.track?.name || 'Venue TBD'}</li>
            <li>{event.track?.length ? `${event.track.length} km` : 'Distance TBD'}</li>
            <li>{event.total_laps != null ? `${event.total_laps} laps` : event.session_duration ? `${event.session_duration} laps` : 'Laps TBD'}</li>
          </ul>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Session Types</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {sessionTypes.map((sessionType) => (
              <span
                key={sessionType}
                className={clsx(
                  'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] 2xl:text-xs font-semibold uppercase tracking-[0.2em]',
                  getSessionTypeBadgeClass(sessionType)
                )}
              >
                {sessionType}
              </span>
            ))}
          </div>
        </div>
      </div>

      {isEditing && (
        <div className="border-t border-slate-200 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/60">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onUploadResults?.(event.id);
            }}
            disabled={uploading}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {uploading ? 'Uploading…' : 'Upload Results'}
          </button>
          {uploadError && (
            <p className="mt-2 text-xs text-red-500 dark:text-red-400">{uploadError}</p>
          )}
        </div>
      )}
    </div>
  );
};
