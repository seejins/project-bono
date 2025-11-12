import React from 'react';
import clsx from 'clsx';
import { NavLink } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { Trophy, Users, Calendar, Settings, Home, Clock } from 'lucide-react';

type HeaderVariant = 'overlay' | 'surface';

interface HeaderNavigationProps {
  variant?: HeaderVariant;
  className?: string;
}

const LINKS: Array<{
  to: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}> = [
  { to: '/', label: 'Home', icon: Home, exact: true },
  { to: '/season', label: 'Season', icon: Trophy },
  { to: '/grid', label: 'Grid', icon: Users },
  { to: '/races', label: 'Schedule', icon: Calendar },
  { to: '/live', label: 'Live Timings', icon: Clock },
  { to: '/admin', label: 'Admin', icon: Settings },
];

export const HeaderNavigation: React.FC<HeaderNavigationProps> = ({
  variant = 'surface',
  className,
}) => {
  const isOverlay = variant === 'overlay';

  return (
    <header
      className={clsx(
        'z-40 h-[88px] border-b border-transparent bg-transparent transition-colors duration-300',
        isOverlay ? 'text-white' : 'text-gray-900 dark:text-white',
        className
      )}
    >
      <nav
        className={clsx(
          'mx-auto flex h-full w-full max-w-5xl items-center justify-center gap-4 px-4 transition-all duration-300',
          isOverlay ? 'text-white' : ''
        )}
      >
        <div className="flex items-center space-x-1">
          {LINKS.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                clsx(
                  'flex min-w-[116px] items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold uppercase tracking-[0.18em] transition-colors',
                  isActive
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/35'
                    : isOverlay
                      ? 'text-white/80 hover:bg-white/15 hover:text-white'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                )
              }
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </header>
  );
};
