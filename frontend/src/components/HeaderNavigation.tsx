import React, { useMemo, useState } from 'react';
import clsx from 'clsx';
import { NavLink, useLocation } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { Trophy, Users, Calendar, Settings, Home, Clock, Menu, X } from 'lucide-react';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
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

  // Close mobile menu when route changes
  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

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
      <nav className="relative mx-auto flex h-full w-full max-w-5xl items-center px-4 transition-all duration-300">
        {/* Mobile Menu Button - Left side */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={clsx(
            'md:hidden flex h-11 w-11 items-center justify-center rounded-md transition-colors',
            (isOverlay && hasHeroImage) || isDark
              ? 'text-white hover:bg-white/15'
              : 'text-gray-900 hover:bg-gray-100'
          )}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>

        {/* Desktop Navigation - Centered */}
        <div className="hidden md:flex items-center space-x-1 absolute left-1/2 -translate-x-1/2">
          {LINKS.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                clsx(
                  'flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold uppercase tracking-[0.18em] transition-colors whitespace-nowrap',
                  label === 'Live Timings' ? 'min-w-[140px]' : 'min-w-[100px]',
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
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>

        {/* Theme Toggle - Right side */}
        <div className={clsx(
          'absolute right-4 flex items-center',
          isOverlay ? textColor : ''
        )}>
          <ThemeToggle 
            hasHeroImage={hasHeroImage}
            isOverlay={isOverlay}
          />
        </div>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div
              className={clsx(
                'fixed left-0 top-[88px] z-50 w-full border-b transition-transform duration-300 md:hidden',
                isOverlay && hasHeroImage
                  ? 'border-white/20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg'
                  : 'border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900'
              )}
            >
              <nav className="mx-auto max-w-5xl px-4 py-4">
                <div className="flex flex-col space-y-1">
                  {LINKS.map(({ to, label, icon: Icon, exact }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={exact}
                      className={({ isActive }) =>
                        clsx(
                          'flex min-h-[44px] items-center gap-3 rounded-md px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] transition-colors',
                          isActive
                            ? 'bg-red-600 text-white'
                            : isOverlay && hasHeroImage
                              ? 'text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-slate-800'
                              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800'
                        )
                      }
                    >
                      <Icon className="h-5 w-5" />
                      <span>{label}</span>
                    </NavLink>
                  ))}
                </div>
              </nav>
            </div>
          </>
        )}
      </nav>
    </header>
  );
};
