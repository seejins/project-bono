import { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import logger from '../utils/logger';

interface PasswordGateProps {
  onAuthenticated: () => void;
}

export function PasswordGate({ onAuthenticated }: PasswordGateProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Check if already authenticated
  useEffect(() => {
    const isAuthenticated = localStorage.getItem('f1-app-authenticated');
    if (isAuthenticated === 'true') {
      onAuthenticated();
    }
  }, [onAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Get the expected password from environment variable
      const expectedPassword = import.meta.env.VITE_APP_PASSWORD || 'dinof1';
      
      // Debug logging
      logger.debug('Expected password:', expectedPassword);
      logger.debug('Entered password:', password);
      
      if (password === expectedPassword) {
        localStorage.setItem('f1-app-authenticated', 'true');
        onAuthenticated();
      } else {
        setError('Incorrect password. Please try again.');
      }
    } catch (err) {
      setError('Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-gray-900 to-black flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* F1 Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 rounded-full mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Project Bono</h1>
          <p className="text-gray-300">F1 Race Engineer & Data Analysis</p>
        </div>

        {/* Password Form */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8 border border-white/20">
          <h2 className="text-xl font-semibold text-white mb-6 text-center">
            Enter Access Password
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Enter password"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !password.trim()}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
            >
              {isLoading ? 'Authenticating...' : 'Access App'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              Contact the administrator for access credentials
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-gray-500 text-sm">
            © 2024 Project Bono - F1 Race Engineering Platform
          </p>
        </div>
      </div>
    </div>
  );
}
