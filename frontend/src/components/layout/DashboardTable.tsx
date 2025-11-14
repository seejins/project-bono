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
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex items-center gap-3">
            {icon}
            <div>
              {title && <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>}
              {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
            </div>
          </div>
          {headerActions}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm 2xl:text-base text-slate-600 dark:text-slate-200">
          <thead className="bg-slate-100 text-xs 2xl:text-sm uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key as string}
                  className={clsx(
                    'px-4 py-3 2xl:px-5 2xl:py-4',
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
                      'transition hover:bg-slate-50 dark:hover:bg-slate-900',
                      onRowClick && 'cursor-pointer'
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {columns.map((column) => {
                      const value = (row as any)[column.key as string];
                      return (
                        <td
                          key={`${key}-${column.key as string}`}
                          className={clsx(
                            'px-4 py-4 2xl:px-5 2xl:py-5',
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

