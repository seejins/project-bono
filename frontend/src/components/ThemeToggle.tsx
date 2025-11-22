import React from 'react';
import clsx from 'clsx';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface ThemeToggleProps {
  hasHeroImage?: boolean;
  isOverlay?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  hasHeroImage = false,
  isOverlay = false 
}) => {
  const { toggleTheme, isDark } = useTheme();

  const buttonClasses = clsx(
    'flex items-center justify-center rounded-md p-2 transition-colors',
    isOverlay
      ? hasHeroImage
        ? 'text-white/80 hover:bg-white/15 hover:text-white'
        : isDark
          ? 'text-white/80 hover:bg-white/15 hover:text-white'
          : 'text-gray-900 hover:bg-gray-100/50 hover:text-gray-900'
      : 'bg-white/10 dark:bg-white/5 hover:bg-white/20 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 border border-gray-200/50 dark:border-white/10'
  );

  return (
    <button
      onClick={toggleTheme}
      className={buttonClasses}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? (
        <Sun className="w-5 h-5" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </button>
  );
};
