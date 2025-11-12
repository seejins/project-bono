import React, { useMemo } from 'react';

interface SessionSummary {
  sessionId: string;
  sessionName?: string | null;
  sessionTypeName?: string | null;
  sessionType: number;
  driver?: any;
}

type SessionKind = 'practice' | 'qualifying' | 'race';

const SESSION_KIND_ORDER: Record<SessionKind, number> = {
  race: 0,
  qualifying: 1,
  practice: 2,
};

interface DriverSummaryCardProps {
  driverNumberLabel: string | number;
  driverNameLabel: string;
  driverTeamLabel: string;
  teamColorHex: string;
  driverPositionLabel: string | number;
  driverTimeLabel: string;
  sessionLabel: string;
  sessions: SessionSummary[];
  selectedSessionId: string | null;
  determineSessionKind: (sessionType: number) => SessionKind;
  onSelectSession: (sessionId: string | null) => void;
}

export const DriverSummaryCard: React.FC<DriverSummaryCardProps> = ({
  driverNumberLabel,
  driverNameLabel,
  driverTeamLabel,
  teamColorHex,
  driverPositionLabel,
  driverTimeLabel,
  sessionLabel,
  sessions,
  selectedSessionId,
  determineSessionKind,
  onSelectSession,
}) => {
  const hasMultipleSessions = sessions.length > 1;

  const sessionOptions = useMemo(() => {
    return [...sessions]
      .filter((session) => !!session?.sessionId)
      .sort((a, b) => {
        const kindA = determineSessionKind(a.sessionType);
        const kindB = determineSessionKind(b.sessionType);

        if (SESSION_KIND_ORDER[kindA] !== SESSION_KIND_ORDER[kindB]) {
          return SESSION_KIND_ORDER[kindA] - SESSION_KIND_ORDER[kindB];
        }

        if (a.sessionType !== b.sessionType) {
          return b.sessionType - a.sessionType;
        }

        return 0;
      })
      .map((session) => ({
        id: session.sessionId,
        label: session.sessionName || session.sessionTypeName || 'Session',
        disabled: !session.driver,
      }));
  }, [sessions, determineSessionKind]);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white px-8 py-10 text-slate-900 shadow-[0_30px_80px_-50px_rgba(16,24,40,0.35)] dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(225,6,0,0.08),_transparent_72%)]" />

      <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
          <div className="space-y-3">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Driver</p>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">{driverNameLabel}</h2>
            </div>
            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
              <span
                className="inline-flex h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: teamColorHex || '#f87171' }}
              />
              <span className="text-sm font-medium uppercase tracking-[0.2em]">{driverTeamLabel}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-4 text-right">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Session Result</p>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">P{driverPositionLabel}</span>
              <span className="text-sm text-slate-500 dark:text-slate-300">{driverTimeLabel}</span>
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">Viewing Session</p>
            {hasMultipleSessions ? (
              <select
                className="mt-2 w-56 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition focus:border-[#E10600]/40 focus:outline-none focus:ring-2 focus:ring-[#E10600]/25 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-[#FF76A0]/40 dark:focus:ring-[#FF76A0]/25"
                value={selectedSessionId ?? ''}
                onChange={(event) => onSelectSession(event.target.value || null)}
              >
                {sessionOptions.map((option) => (
                  <option key={option.id} value={option.id} disabled={option.disabled}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <span className="mt-2 inline-flex rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
                {sessionLabel}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
