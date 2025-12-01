import React from 'react';
import { TrendingUp, Clock, Target, Flag, Zap, AlertTriangle } from 'lucide-react';
import { F123DataService } from '../../../services/F123DataService';

const CARD_CLASS = 'rounded-3xl border border-slate-200 bg-white shadow-md dark:border-slate-800 dark:bg-slate-950/70 p-6';
const TITLE_CLASS = 'text-base font-semibold text-slate-900 dark:text-slate-100';
const LABEL_CLASS = 'text-sm text-slate-500 dark:text-slate-400';
const VALUE_CLASS = 'text-base font-bold text-slate-900 dark:text-slate-100';

interface OverviewTabProps {
  raceStats: any;
  sessionLabel: string;
  sessionKind: 'practice' | 'qualifying' | 'race' | null;
  formatGapTime: (ms?: number | null) => string;
  formatSectorTime: (ms?: number | null) => string;
  getTireCompoundColor: (compound?: string) => string;
  sessionFastestSectors?: { sector1: number | null; sector2: number | null; sector3: number | null };
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  raceStats,
  sessionLabel,
  sessionKind,
  formatGapTime,
  formatSectorTime,
  getTireCompoundColor,
  sessionFastestSectors,
}) => {
  if (!raceStats) {
    return (
      <div className="text-center py-12 text-slate-500 dark:text-slate-400">
        No race statistics available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={CARD_CLASS}>
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-500">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h3 className={TITLE_CLASS}>{sessionLabel} Pace</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className={LABEL_CLASS}>Fastest Lap</span>
              <span className={VALUE_CLASS}>
                {F123DataService.formatTimeFromMs(raceStats.fastestLap)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className={LABEL_CLASS}>Avg Lap</span>
              <span className={VALUE_CLASS}>
                {raceStats.avgLap > 0 ? F123DataService.formatTimeFromMs(raceStats.avgLap) : '--:--.---'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className={LABEL_CLASS}>Consistency</span>
              <span className={VALUE_CLASS}>{raceStats.consistencyPercent}%</span>
            </div>
          </div>
        </div>

        <div className={CARD_CLASS}>
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-500">
              <Clock className="h-5 w-5" />
            </div>
            <h3 className={TITLE_CLASS}>{sessionLabel} Summary</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className={LABEL_CLASS}>Total Time</span>
              <span className={VALUE_CLASS}>
                {F123DataService.formatTimeFromMs(raceStats.totalTime)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className={LABEL_CLASS}>Gap to Leader</span>
              <span className={VALUE_CLASS}>
                {raceStats.gapToLeaderMs !== null && raceStats.gapToLeaderMs !== undefined
                  ? raceStats.gapToLeaderMs > 0
                    ? formatGapTime(raceStats.gapToLeaderMs)
                    : 'Leader'
                  : 'Leader'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className={LABEL_CLASS}>Total Laps</span>
              <span className={VALUE_CLASS}>{raceStats.totalLaps}</span>
            </div>
          </div>
        </div>

        <div className={CARD_CLASS}>
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-500">
              <Target className="h-5 w-5" />
            </div>
            <h3 className={TITLE_CLASS}>Session Strategy</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className={LABEL_CLASS}>Pit Stops</span>
              <span className={VALUE_CLASS}>{raceStats.pitStops}</span>
            </div>
            <div>
              <span className={`${LABEL_CLASS} block mb-2`}>Compounds Used</span>
              <div className="flex flex-wrap items-center gap-2">
                {raceStats.tireCompounds.length > 0 ? (
                  raceStats.tireCompounds.map((compound: string, idx: number) => (
                    <div key={`${compound ?? 'unknown'}-${idx}`} className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
                      {(() => {
                        const icon = F123DataService.getTireCompoundIcon(compound);
                        const label = F123DataService.getTireCompoundText(compound);
                        return icon ? (
                          <img src={icon} alt={`${label} tire`} className="h-5 w-5" />
                        ) : (
                          <span className={getTireCompoundColor(compound)}>{label}</span>
                        );
                      })()}
                    </div>
                  ))
                ) : (
                  <span className="text-sm text-slate-500 dark:text-slate-400">--</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={CARD_CLASS}>
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500">
              <Flag className="h-5 w-5" />
            </div>
            <h3 className={TITLE_CLASS}>{sessionLabel} Positions</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className={LABEL_CLASS}>Grid</span>
              <span className={VALUE_CLASS}>
                {sessionKind === 'practice'
                  ? '--'
                  : `P${raceStats.gridPosition != null ? raceStats.gridPosition : '--'}`}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className={LABEL_CLASS}>Finish</span>
              <span className={VALUE_CLASS}>
                {sessionKind === 'practice'
                  ? '--'
                  : `P${raceStats.finishPosition != null ? raceStats.finishPosition : '--'}`}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className={LABEL_CLASS}>Change</span>
              <span
                className={`${VALUE_CLASS} ${
                  sessionKind === 'practice'
                    ? 'text-slate-400 dark:text-slate-500'
                    : raceStats.positionsGained !== null
                        ? raceStats.positionsGained > 0
                          ? 'text-emerald-500'
                          : raceStats.positionsGained < 0
                            ? 'text-rose-500'
                            : 'text-slate-500 dark:text-slate-400'
                        : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {sessionKind === 'practice'
                  ? '--'
                  : raceStats.positionsGained !== null
                    ? raceStats.positionsGained > 0
                      ? `+${raceStats.positionsGained}`
                      : raceStats.positionsGained < 0
                        ? `${raceStats.positionsGained}`
                        : '0'
                    : '--'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={CARD_CLASS}>
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-500">
              <Zap className="h-5 w-5" />
            </div>
            <h3 className={TITLE_CLASS}>Best Sectors</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className={`${LABEL_CLASS} mb-1`}>Sector 1</div>
              <div className={`text-base font-semibold ${
                raceStats.bestSector1 !== undefined && raceStats.bestSector1 !== null
                  ? sessionFastestSectors?.sector1 != null && raceStats.bestSector1 === sessionFastestSectors.sector1
                    ? 'text-purple-600 dark:text-purple-400' // Session fastest - purple
                    : 'text-slate-900 dark:text-slate-100' // Personal best - default color
                  : 'text-slate-900 dark:text-slate-100'
              }`}>
                {raceStats.bestSector1 !== undefined && raceStats.bestSector1 !== null
                  ? formatSectorTime(raceStats.bestSector1)
                  : '--.---'}
              </div>
            </div>
            <div className="text-center">
              <div className={`${LABEL_CLASS} mb-1`}>Sector 2</div>
              <div className={`text-base font-semibold ${
                raceStats.bestSector2 !== undefined && raceStats.bestSector2 !== null
                  ? sessionFastestSectors?.sector2 != null && raceStats.bestSector2 === sessionFastestSectors.sector2
                    ? 'text-purple-600 dark:text-purple-400' // Session fastest - purple
                    : 'text-slate-900 dark:text-slate-100' // Personal best - default color
                  : 'text-slate-900 dark:text-slate-100'
              }`}>
                {raceStats.bestSector2 !== undefined && raceStats.bestSector2 !== null
                  ? formatSectorTime(raceStats.bestSector2)
                  : '--.---'}
              </div>
            </div>
            <div className="text-center">
              <div className={`${LABEL_CLASS} mb-1`}>Sector 3</div>
              <div className={`text-base font-semibold ${
                raceStats.bestSector3 !== undefined && raceStats.bestSector3 !== null
                  ? sessionFastestSectors?.sector3 != null && raceStats.bestSector3 === sessionFastestSectors.sector3
                    ? 'text-purple-600 dark:text-purple-400' // Session fastest - purple
                    : 'text-slate-900 dark:text-slate-100' // Personal best - default color
                  : 'text-slate-900 dark:text-slate-100'
              }`}>
                {raceStats.bestSector3 !== undefined && raceStats.bestSector3 !== null
                  ? formatSectorTime(raceStats.bestSector3)
                  : '--.---'}
              </div>
            </div>
          </div>
          {raceStats.fastestLapNumber && (
            <div className="mt-4 border-t border-slate-200 pt-3 text-center dark:border-slate-800">
              <span className={LABEL_CLASS}>Fastest Lap: Lap {raceStats.fastestLapNumber}</span>
            </div>
          )}
        </div>

        <div className={CARD_CLASS}>
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h3 className={TITLE_CLASS}>Track Status</h3>
          </div>
          <div className="space-y-3">
            {raceStats.scLaps > 0 && (
              <div className="flex items-center justify-between">
                <span className={LABEL_CLASS}>Safety Car Laps</span>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-400/15 dark:text-amber-200">
                  {raceStats.scLaps}
                </span>
              </div>
            )}
            {raceStats.vscLaps > 0 && (
              <div className="flex items-center justify-between">
                <span className={LABEL_CLASS}>Virtual Safety Car</span>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-400/15 dark:text-amber-200">
                  {raceStats.vscLaps}
                </span>
              </div>
            )}
            {raceStats.yellowFlags > 0 && (
              <div className="flex items-center justify-between">
                <span className={LABEL_CLASS}>Yellow Flags</span>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-400/15 dark:text-amber-200">
                  {raceStats.yellowFlags}
                </span>
              </div>
            )}
            {raceStats.scLaps === 0 && raceStats.vscLaps === 0 && raceStats.yellowFlags === 0 && (
              <div className="text-center py-2">
                <span className={LABEL_CLASS}>Clean race – no incidents</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
