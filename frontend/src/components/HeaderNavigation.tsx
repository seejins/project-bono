import React, { useMemo } from 'react';
import clsx from 'clsx';
import { NavLink, useLocation } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { Trophy, Users, Calendar, Settings, Home, Clock } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useTheme } from '../contexts/ThemeContext';

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
  const location = useLocation();
  const { isDark } = useTheme();
  
  // Detect if current page has a hero image
  const hasHeroImage = useMemo(() => {
    const path = location.pathname;
    const heroRoutes = ['/', '/season', '/races', '/grid'];
    
    // Check exact matches first
    if (heroRoutes.includes(path)) {
      return true;
    }
    
    // Check admin routes (exact /admin or /admin/*)
    if (path === '/admin' || path.startsWith('/admin/')) {
      return true;
    }
    
    // Check race detail routes (/races/:raceId but not /races or /races/:raceId/driver/:driverId)
    if (path.startsWith('/races/') && path !== '/races' && !path.includes('/driver/')) {
      return true;
    }
    
    return false;
  }, [location.pathname]);
  
  const isOverlay = variant === 'overlay';
  // Use white text on hero pages, theme-aware text on other pages
  const textColor = hasHeroImage ? 'text-white' : (isDark ? 'text-white' : 'text-gray-900');

  return (
    <header
      className={clsx(
        'z-40 h-[88px] border-b transition-colors duration-300',
        isOverlay 
          ? 'border-transparent bg-transparent' 
          : 'border-gray-200/50 dark:border-transparent bg-white/80 dark:bg-transparent backdrop-blur-sm',
        className
      )}
    >
      <nav className="relative mx-auto flex h-full w-full max-w-5xl items-center justify-center gap-4 px-4 transition-all duration-300">
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
                      ? hasHeroImage
                        ? 'text-white/80 hover:bg-white/15 hover:text-white'
                        : isDark
                          ? 'text-white/80 hover:bg-white/15 hover:text-white'
                          : 'text-gray-900 hover:bg-gray-100/50 hover:text-gray-900'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                )
              }
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
        <div className={clsx(
          'absolute right-4 flex items-center',
          isOverlay ? textColor : ''
        )}>
          <ThemeToggle 
            hasHeroImage={hasHeroImage}
            isOverlay={isOverlay}
          />
        </div>
      </nav>
    </header>
  );
};
