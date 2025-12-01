import { ReactNode } from 'react';
import clsx from 'clsx';

export interface DashboardTableColumn<TRow> {
  key: keyof TRow | string;
  label: ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
  headerClassName?: string;
  render?: (value: any, row: TRow, index: number) => ReactNode;
}

interface DashboardTableProps<TRow> {
  title?: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  columns: DashboardTableColumn<TRow>[];
  rows: TRow[];
  rowKey: (row: TRow, index: number) => string | number;
  onRowClick?: (row: TRow) => void;
  emptyMessage?: ReactNode;
  className?: string;
  headerActions?: ReactNode;
  rowsVisible?: boolean;
  rowStaggerMs?: number;
  rowInitialDelayMs?: number;
}

export function DashboardTable<TRow>({
  title,
  subtitle,
  icon,
  columns,
  rows,
  rowKey,
  onRowClick,
  emptyMessage = 'No results available.',
  className,
  headerActions,
  rowsVisible = true,
  rowStaggerMs = 0,
  rowInitialDelayMs = 0,
}: DashboardTableProps<TRow>) {
  const hasHeader = title || subtitle || icon || headerActions;

  return (
    <div
      className={clsx(
        'overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-md dark:border-slate-800 dark:bg-slate-950/70',
        className
      )}
    >
      {hasHeader && (
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
          <div className="flex items-center gap-3">
            {icon}
            <div>
              {title && <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 sm:text-lg">{title}</h2>}
              {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 sm:text-sm">{subtitle}</p>}
            </div>
          </div>
          {headerActions && <div className="flex items-center">{headerActions}</div>}
        </div>
      )}

      {/* Mobile Card View */}
      <div className="block md:hidden">
        {rows.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            {emptyMessage}
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {rows.map((row, index) => {
              const key = rowKey(row, index);
              const primaryColumns = columns.slice(0, 2); // First 2 columns as primary
              const secondaryColumns = columns.slice(2); // Rest as secondary
              
              return (
                <div
                  key={key}
                  onClick={() => onRowClick?.(row)}
                  className={clsx(
                    rowsVisible ? 'opacity-100' : 'opacity-0',
                    rowsVisible && 'transition-opacity duration-500 linear',
                    'px-4 py-4',
                    onRowClick && 'cursor-pointer active:bg-slate-50 dark:active:bg-slate-900'
                  )}
                  style={{
                    transitionProperty: rowsVisible ? 'opacity' : undefined,
                    transitionDelay: rowsVisible && rowStaggerMs && rowInitialDelayMs
                      ? `${rowInitialDelayMs + index * rowStaggerMs}ms`
                      : undefined
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {primaryColumns.map((column) => {
                        const value = (row as any)[column.key as string];
                        return (
                          <div key={`${key}-${column.key as string}-mobile`} className="mb-2 last:mb-0">
                            {column.render ? column.render(value, row, index) : value}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {secondaryColumns.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                      {secondaryColumns.map((column) => {
                        const value = (row as any)[column.key as string];
                        return (
                          <div key={`${key}-${column.key as string}-mobile-secondary`} className="flex flex-col">
                            <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
                              {typeof column.label === 'string' ? column.label : ''}
                            </span>
                            <span className="text-sm text-slate-700 dark:text-slate-300">
                              {column.render ? column.render(value, row, index) : value}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm 2xl:text-base text-slate-600 dark:text-slate-200">
          <thead className="bg-slate-100 text-xs 2xl:text-sm uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key as string}
                  className={clsx(
                    'px-3 py-3 text-xs sm:px-4 2xl:px-5 2xl:py-4 2xl:text-sm',
                    column.align === 'right'
                      ? 'text-right'
                      : column.align === 'left'
                        ? 'text-left'
                        : 'text-center',
                    column.headerClassName
                  )}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-sm 2xl:text-base text-slate-500 dark:text-slate-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const key = rowKey(row, index);
                return (
                  <tr
                    key={key}
                    className={clsx(
                      rowsVisible ? 'opacity-100' : 'opacity-0',
                      rowsVisible && 'transition-opacity duration-500 linear',
                      'hover:bg-slate-50 dark:hover:bg-slate-900',
                      onRowClick && 'cursor-pointer',
                    )}
                    style={{
                      transitionProperty: rowsVisible ? 'opacity' : undefined,
                      transitionDelay: rowsVisible && rowStaggerMs && rowInitialDelayMs
                        ? `${rowInitialDelayMs + index * rowStaggerMs}ms`
                        : undefined
                    }}
                    onClick={() => onRowClick?.(row)}
                  >
                    {columns.map((column) => {
                      const value = (row as any)[column.key as string];
                      return (
                        <td
                          key={`${key}-${column.key as string}`}
                          className={clsx(
                            'px-3 py-3 text-xs sm:px-4 sm:py-4 sm:text-sm 2xl:px-5 2xl:py-5 2xl:text-base',
                            column.align === 'right'
                              ? 'text-right'
                              : column.align === 'left'
                                ? 'text-left'
                                : 'text-center',
                            column.className
                          )}
                        >
                          {column.render ? column.render(value, row, index) : value}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

