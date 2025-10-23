import React from 'react';
import { Activity, Target, Mic, Info } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: 'dashboard' | 'strategy' | 'voice' | 'race') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'dashboard', label: 'Telemetry', icon: Activity },
    { id: 'strategy', label: 'Strategy', icon: Target },
    { id: 'voice', label: 'Voice Comm', icon: Mic },
    { id: 'race', label: 'Race Info', icon: Info },
  ] as const;

  return (
    <aside className="w-64 bg-gray-800 border-r border-gray-700">
      <nav className="p-4">
        <ul className="space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <li key={tab.id}>
                <button
                  onClick={() => onTabChange(tab.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-red-600 text-white'
                      : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};
