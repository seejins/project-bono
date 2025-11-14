import { ReactNode } from 'react';
import clsx from 'clsx';

export interface OverviewStatConfig {
  id: string;
  title: string;
  value?: ReactNode;
  meta?: ReactNode;
  icon: ReactNode;
  accentClass?: string;
  onClick?: () => void;
}

interface OverviewStatStripProps {
  items: OverviewStatConfig[];
  className?: string;
  variant?: 'default' | 'muted';
}

export function OverviewStatStrip({ items, className, variant = 'default' }: OverviewStatStripProps) {
  const cardBaseClasses =
    variant === 'muted'
      ? 'group rounded-2xl border border-slate-800/60 bg-slate-900/70 p-4 text-left shadow-md transition duration-200 hover:bg-slate-900/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 dark:border-slate-700'
      : 'group rounded-2xl border border-slate-800/50 bg-slate-900/70 p-4 text-left shadow-[0_12px_30px_-18px_rgba(15,23,42,0.55)] backdrop-blur-lg transition duration-200 hover:bg-slate-800/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40';

  const iconBaseClasses =
    variant === 'muted'
      ? 'flex h-10 w-10 items-center justify-center text-slate-200 transition-transform duration-300 group-hover:scale-105'
      : 'flex h-10 w-10 items-center justify-center text-slate-900 transition-transform duration-300 group-hover:scale-105 dark:text-white';

  const titleClasses =
    variant === 'muted'
      ? 'text-xs font-semibold uppercase tracking-[0.28em] text-slate-400'
      : 'text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400';

  const valueClasses = variant === 'muted' ? 'text-lg font-semibold text-slate-100' : 'text-lg font-semibold text-slate-900 dark:text-white';

  const metaClasses = variant === 'muted' ? 'text-xs text-slate-400' : 'text-xs text-slate-500 dark:text-slate-400';

  return (
    <div className={clsx('grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4', className)}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={item.onClick}
          className={clsx(cardBaseClasses, !item.onClick && 'cursor-default')}
        >
          <div className="flex items-center gap-3">
            <span className={clsx(iconBaseClasses, item.accentClass)}>{item.icon}</span>
            <div className="space-y-1">
              <p className={titleClasses}>{item.title}</p>
              <div className={valueClasses}>{item.value ?? '—'}</div>
              {item.meta && <div className={metaClasses}>{item.meta}</div>}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

