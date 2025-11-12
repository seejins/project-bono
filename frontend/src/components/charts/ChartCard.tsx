import React from 'react';
import clsx from 'clsx';

interface ChartCardProps {
  title: string;
  description?: string;
  headerSlot?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  description,
  headerSlot,
  children,
  className,
  bodyClassName = 'px-6 py-4',
}) => {
  return (
    <div
      className={clsx(
        'rounded-3xl border border-slate-200 bg-white shadow-md dark:border-slate-800 dark:bg-slate-950/70',
        className
      )}
    >
      <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h4>
          {description && (
            <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
          )}
        </div>
        {headerSlot && <div className="sm:text-right">{headerSlot}</div>}
      </div>
      <div className={bodyClassName}>{children}</div>
    </div>
  );
};

export default ChartCard;

