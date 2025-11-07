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
        'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm',
        className
      )}
    >
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h4>
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
          )}
        </div>
        {headerSlot && <div className="sm:text-right">{headerSlot}</div>}
      </div>
      <div className={bodyClassName}>{children}</div>
    </div>
  );
};

export default ChartCard;

