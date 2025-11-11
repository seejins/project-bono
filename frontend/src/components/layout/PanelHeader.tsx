import { ReactNode } from 'react';
import clsx from 'clsx';

interface PanelHeaderProps {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  description?: string;
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode[];
  metaBadge?: ReactNode;
  breadcrumbs?: ReactNode;
  contextTabs?: ReactNode;
  backgroundImage?: string;
  className?: string;
}

export function PanelHeader({
  icon,
  title,
  subtitle,
  description,
  primaryAction,
  secondaryActions = [],
  metaBadge,
  breadcrumbs,
  contextTabs,
  backgroundImage,
  className,
}: PanelHeaderProps) {
  return (
    <header
      className={clsx(
        'relative overflow-hidden rounded-3xl border border-white/10 bg-white/80 p-6 shadow-[0_18px_55px_-28px_rgba(15,23,42,0.65)] backdrop-blur-lg transition-all duration-300 dark:border-white/10 dark:bg-slate-900/80',
        'sm:p-8',
        className,
      )}
    >
      {backgroundImage && (
        <div
          className="absolute inset-0 -z-10 bg-cover bg-center opacity-70 dark:opacity-50"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
      )}

      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-accent via-brand-highlight to-brand-electric" />

      <div className="flex flex-col gap-6 sm:gap-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
          <div className="flex flex-1 items-start gap-4">
            {icon && (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-accent to-brand-electric text-white shadow-brand-glow">
                {icon}
              </div>
            )}

            <div className="min-w-0 space-y-2">
              {breadcrumbs && <div className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{breadcrumbs}</div>}

              <div className="flex flex-wrap items-center gap-3">
                <h1 className="truncate text-2xl font-semibold text-slate-900 dark:text-white sm:text-3xl">{title}</h1>
                {metaBadge}
              </div>

              {subtitle && <p className="text-base text-slate-600 dark:text-slate-300">{subtitle}</p>}
              {description && <p className="text-sm text-slate-500 dark:text-slate-400 sm:text-base">{description}</p>}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-start gap-3 sm:justify-end">
            {secondaryActions.map((action, index) => (
              <div key={index} className="shrink-0">
                {action}
              </div>
            ))}
            {primaryAction && <div className="shrink-0">{primaryAction}</div>}
          </div>
        </div>

        {contextTabs && <div className="flex flex-wrap gap-2">{contextTabs}</div>}
      </div>
    </header>
  );
}
