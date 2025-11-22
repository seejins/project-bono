import React from 'react';
import { Wifi, WifiOff, Trophy } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { SeasonSelector } from './SeasonSelector';

interface HeaderProps {
  isConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({ isConnected }) => {
  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">F1 Season Manager</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Friend group racing championship</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <SeasonSelector />
          <div className="flex items-center space-x-2 text-sm">
            {isConnected ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
            <span className={isConnected ? 'text-green-500' : 'text-red-500'}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <ThemeToggle hasHeroImage={false} isOverlay={false} />
        </div>
      </div>
    </header>
  );
};
