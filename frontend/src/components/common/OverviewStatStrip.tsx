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
      ? 'group rounded-2xl border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900/70 p-3 text-left shadow-md transition duration-200 hover:bg-slate-50 dark:hover:bg-slate-900/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 sm:p-4'
      : 'group rounded-2xl border border-slate-200 dark:border-slate-800/50 bg-white dark:bg-slate-900/70 p-3 text-left shadow-[0_12px_30px_-18px_rgba(15,23,42,0.55)] backdrop-blur-lg transition duration-200 hover:bg-slate-50 dark:hover:bg-slate-800/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 sm:p-4';

  // Helper function to get icon background class from accent class
  const getIconBgClass = (accentClass?: string) => {
    if (!accentClass) return 'bg-slate-100 dark:bg-slate-800';
    if (accentClass.includes('purple')) return 'bg-purple-500/15';
    if (accentClass.includes('amber')) return 'bg-amber-500/15';
    if (accentClass.includes('blue')) return 'bg-blue-500/15';
    if (accentClass.includes('red')) return 'bg-red-500/15';
    if (accentClass.includes('emerald')) return 'bg-emerald-500/15';
    if (accentClass.includes('sky')) return 'bg-sky-500/15';
    return 'bg-slate-100 dark:bg-slate-800';
  };

  const iconBaseClasses =
    variant === 'muted'
      ? 'flex h-9 w-9 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-105 sm:h-10 sm:w-10'
      : 'flex h-9 w-9 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-105 sm:h-10 sm:w-10';

  const titleClasses =
    variant === 'muted'
      ? 'text-xs font-semibold uppercase tracking-[0.28em] text-slate-600 dark:text-slate-400'
      : 'text-xs font-semibold uppercase tracking-[0.28em] text-slate-600 dark:text-slate-500';

  const valueClasses = variant === 'muted' ? 'text-base font-semibold text-slate-900 dark:text-slate-100 sm:text-lg' : 'text-base font-semibold text-slate-900 dark:text-white sm:text-lg';

  const metaClasses = variant === 'muted' ? 'text-xs text-slate-600 dark:text-slate-400' : 'text-xs text-slate-600 dark:text-slate-500';

  return (
    <div className={clsx('grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4', className)}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={item.onClick}
          className={clsx(cardBaseClasses, !item.onClick && 'cursor-default', item.onClick && 'min-h-[44px]')}
        >
          <div className="flex items-center gap-3">
            <span className={clsx(iconBaseClasses, getIconBgClass(item.accentClass), item.accentClass)}>
              {item.icon}
            </span>
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

