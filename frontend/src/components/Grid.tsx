import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import clsx from 'clsx';
import { useSeason } from '../contexts/SeasonContext';
import { useSeasonAnalysis, type DriverSeasonSummary } from '../hooks/useSeasonAnalysis';
import { F123DataService } from '../services/F123DataService';
import { DashboardPage } from './layout/DashboardPage';
import { DashboardTable } from './layout/DashboardTable';
// @ts-expect-error - vite-imagetools query parameters aren't recognized by TypeScript
import gridHeroImage from '../assets/images/wp10068761-f1-rain-wallpapers.jpg?w=1920&format=webp&q=85';

interface DriverListProps {
  onDriverSelect?: (driverId: string) => void;
}

const formatNumber = (value: number) => value.toLocaleString();

export const Grid: React.FC<DriverListProps> = ({ onDriverSelect }) => {
  const { currentSeason } = useSeason();
  const { analysis, loading, error } = useSeasonAnalysis(currentSeason?.id);

  const drivers: DriverSeasonSummary[] = useMemo(() => {
    if (!analysis) {
      return [];
    }

    return [...analysis.drivers].sort(
      (a, b) =>
        (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER),
    );
  }, [analysis]);

  const getPositionColor = (position?: number | null) => {
    if (position === 1) return 'text-yellow-500';
    if (position === 2) return 'text-gray-300';
    if (position === 3) return 'text-orange-400';
    return 'text-slate-400';
  };

  const getPositionBadgeClass = (position?: number | null) => {
    if (position === 1) {
      return 'inline-flex items-center rounded-full bg-amber-500/15 px-3 py-1 text-xs 2xl:text-sm font-semibold text-amber-500';
    }
    if (position === 2) {
      return 'inline-flex items-center rounded-full bg-slate-400/15 px-3 py-1 text-xs 2xl:text-sm font-semibold text-slate-400';
    }
    if (position === 3) {
      return 'inline-flex items-center rounded-full bg-orange-400/15 px-3 py-1 text-xs 2xl:text-sm font-semibold text-orange-400';
    }
    return 'inline-flex items-center rounded-full bg-slate-900/10 px-3 py-1 text-xs 2xl:text-sm font-semibold text-slate-600 dark:bg-slate-700/40 dark:text-slate-300';
  };

  const tableColumns = useMemo(
    () => [
      {
        key: 'position',
        label: 'Pos',
        render: (_: number | undefined, row: DriverSeasonSummary) => (
          <span className={getPositionBadgeClass(row.position)}>P{row.position ?? '—'}</span>
        ),
        className: 'font-semibold text-slate-800 dark:text-slate-100',
      },
      {
        key: 'name',
        label: 'Driver',
        align: 'left' as const,
        headerClassName: 'text-left',
        className: 'font-medium text-slate-900 dark:text-slate-100',
      },
      {
        key: 'team',
        label: 'Team',
        align: 'left' as const,
        headerClassName: 'text-left',
        render: (_: string | undefined, row: DriverSeasonSummary) => (
          <span className={clsx('font-medium', F123DataService.getTeamColor(row.team ?? ''))}>
            {row.team ?? '—'}
          </span>
        ),
      },
      {
        key: 'points',
        label: 'Points',
        render: (_: number, row: DriverSeasonSummary) => (
          <span className="font-semibold text-slate-900 dark:text-slate-100">{formatNumber(row.points)} pts</span>
        ),
      },
      {
        key: 'wins',
        label: 'Wins',
        className: 'text-slate-500 dark:text-slate-400',
      },
      {
        key: 'podiums',
        label: 'Podiums',
        className: 'text-slate-500 dark:text-slate-400',
      },
      {
        key: 'averageFinish',
        label: 'Avg Finish',
        render: (_: number | undefined, row: DriverSeasonSummary) =>
          row.averageFinish ? `P${row.averageFinish.toFixed(1)}` : '—',
        className: 'text-slate-500 dark:text-slate-400',
      },
      {
        key: 'consistency',
        label: 'Consistency',
        render: (_: number, row: DriverSeasonSummary) => `${row.consistency.toFixed(1)}%`,
        className: 'text-slate-500 dark:text-slate-400',
      },
    ],
    []
  );

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Users className="mx-auto mb-4 h-16 w-16 animate-pulse text-slate-600" />
          <p className="text-xl text-slate-500">Loading drivers…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center text-red-500">
          <p className="text-lg">Unable to load grid.</p>
          <p className="text-sm text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!analysis || drivers.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center text-slate-500 dark:text-slate-400">
          <p className="text-lg">No drivers found for this season.</p>
        </div>
      </div>
    );
  }

  const easing: [number, number, number, number] = [0.22, 1, 0.36, 1];

  return (
    <DashboardPage
      hero={{
        imageSrc: gridHeroImage,
        title: 'Driver Grid',
        subtitle: currentSeason?.name ?? 'F1 25',
        description: 'Analyze the full driver lineup, compare stats, and explore season performance at a glance.',
      }}
      contentClassName="space-y-6"
    >
      <motion.div
        className="flex items-center space-x-3"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: easing, delay: 0.1 }}
      >
        <div className="flex h-10 w-10 items-center justify-center text-slate-900 dark:text-slate-100">
          <Users className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Grid Overview</h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: easing, delay: 0.18 }}
      >
        <DashboardTable
          columns={tableColumns}
          rows={drivers}
          rowKey={(row, index) => row.id ?? `${row.name}-${index}`}
          onRowClick={onDriverSelect ? (row) => row.id && onDriverSelect(row.id) : undefined}
          emptyMessage="No drivers registered for this season yet."
        />
      </motion.div>
    </DashboardPage>
  );
};