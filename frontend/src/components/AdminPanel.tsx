import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import { MembersManagement } from './MembersManagement';
import { SeasonsManagement } from './SeasonsManagement';

interface AdminPanelProps {
  isAuthenticated: boolean;
  onAuthenticate: (password: string) => boolean;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ isAuthenticated, onAuthenticate }) => {
  const [password, setPassword] = useState('');
  const [activeSection, setActiveSection] = useState<'members' | 'seasons'>('members');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const success = onAuthenticate(password);
    if (success) {
      setPassword('');
    } else {
      setPassword('');
      alert('Invalid password');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 shadow-sm">
          <div className="text-center mb-6">
            <Settings className="w-12 h-12 text-red-600 dark:text-blue-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Access</h2>
            <p className="text-gray-500 dark:text-gray-400">Enter admin password to continue</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Enter admin password"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 relative z-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Settings className="w-6 h-6 text-red-600 dark:text-blue-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Panel</h1>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          League Management
        </div>
      </div>

      {/* Navigation */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        {[
          { id: 'members', label: 'Members', icon: '👥' },
          { id: 'seasons', label: 'Seasons', icon: '🏆' }
        ].map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                activeSection === section.id
                  ? 'bg-red-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
            <span className="text-lg">{section.icon}</span>
              <span>{section.label}</span>
            </button>
        ))}
      </div>

      {/* Content */}
      {activeSection === 'members' && <MembersManagement />}
      {activeSection === 'seasons' && <SeasonsManagement />}
    </div>
  );
};
