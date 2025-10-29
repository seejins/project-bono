import React from 'react';
import { Trophy, Users, Calendar, History, Settings, Clock } from 'lucide-react';

interface HeaderNavigationProps {
  activeTab: string;
  onTabChange: (tab: 'season' | 'grid' | 'races' | 'history' | 'admin' | 'live') => void;
}

export const HeaderNavigation: React.FC<HeaderNavigationProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'season', label: 'Season', icon: Trophy },
    { id: 'grid', label: 'Grid', icon: Users },
    { id: 'races', label: 'Schedule', icon: Calendar },
    { id: 'history', label: 'History', icon: History },
    { id: 'live', label: 'Live Timings', icon: Clock },
    { id: 'admin', label: 'Admin', icon: Settings },
  ] as const;

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
      <nav className="flex items-center justify-between">
        {/* Logo/Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Project Bono</h1>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-red-600 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right side - could add user info, settings, etc. */}
        <div className="flex items-center space-x-4">
          {/* Connection status indicator */}
          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Connected</span>
          </div>
        </div>
      </nav>
    </header>
  );
};
