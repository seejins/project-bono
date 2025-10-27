import React, { useState } from 'react';
import { Upload, Users, Calendar, Settings, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { apiPostFormData } from '../utils/api';

interface AdminPanelProps {
  isAuthenticated: boolean;
  onAuthenticate: (password: string) => boolean;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ isAuthenticated, onAuthenticate }) => {
  const [password, setPassword] = useState('');
  const [activeSection, setActiveSection] = useState<'upload' | 'session-upload' | 'drivers' | 'races' | 'settings'>('upload');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  
  // Driver management state
  const [showAddDriverModal, setShowAddDriverModal] = useState(false);
  const [newDriver, setNewDriver] = useState({ name: '', team: '', number: '' });
  const [drivers, setDrivers] = useState([
    { id: '1', name: 'John Smith', team: 'Mercedes', number: 44 }
  ]);
  
  // Session file upload state
  const [sessionFile, setSessionFile] = useState<File | null>(null);
  const [sessionUploadStatus, setSessionUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [sessionUploadMessage, setSessionUploadMessage] = useState('');
  const [selectedRace, setSelectedRace] = useState('');

  // Race management state
  const [showScheduleRaceModal, setShowScheduleRaceModal] = useState(false);
  const [newRace, setNewRace] = useState({ track: '', date: '', type: 'race' });

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

  const handleAddDriver = async () => {
    if (!newDriver.name) {
      alert('Please enter a driver name');
      return;
    }

    // For now, add to local state (later will call API)
    const driver = {
      id: Date.now().toString(),
      name: newDriver.name,
      team: newDriver.team || 'No Team',
      number: parseInt(newDriver.number) || 0
    };
    
    setDrivers([...drivers, driver]);
    setNewDriver({ name: '', team: '', number: '' });
    setShowAddDriverModal(false);
  };

  const handleRemoveDriver = (driverId: string) => {
    if (confirm('Are you sure you want to remove this driver?')) {
      setDrivers(drivers.filter(d => d.id !== driverId));
    }
  };

  const handleScheduleRace = async () => {
    if (!newRace.track || !newRace.date) {
      alert('Please fill in all required fields');
      return;
    }

    // For now, just close modal (later will call API)
    setNewRace({ track: '', date: '', type: 'race' });
    setShowScheduleRaceModal(false);
    alert('Race scheduled successfully!');
  };

  const handleSessionFileUpload = async () => {
    if (!sessionFile || !selectedRace) {
      alert('Please select a file and race');
      return;
    }

    setSessionUploadStatus('uploading');
    setSessionUploadMessage('Uploading session file...');

    try {
      const formData = new FormData();
      formData.append('sessionFile', sessionFile);
      formData.append('raceId', selectedRace);

      const response = await apiPostFormData('/api/upload/session', formData);

      if (response.ok) {
        setSessionUploadStatus('success');
        setSessionUploadMessage('Session file uploaded successfully!');
        setSessionFile(null);
        setSelectedRace('');
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      setSessionUploadStatus('error');
      setSessionUploadMessage('Failed to upload session file');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadStatus('uploading');
    setUploadMessage('Processing F1 23 session file...');

    try {
      const formData = new FormData();
      formData.append('sessionFile', file);
      formData.append('seasonId', '1'); // TODO: Get from context

      const response = await apiPostFormData('/api/upload/session', formData);

      const result = await response.json();

      if (result.success) {
        setUploadStatus('success');
        setUploadMessage(`Successfully imported ${result.importedResults} results and ${result.importedLapTimes} lap times`);
      } else {
        setUploadStatus('error');
        setUploadMessage(result.error || 'Upload failed');
      }
    } catch (error) {
      setUploadStatus('error');
      setUploadMessage('Upload failed: ' + (error as Error).message);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Settings className="w-6 h-6 text-red-600 dark:text-blue-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Panel</h1>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Season Management
        </div>
      </div>

      {/* Navigation */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        {[
          { id: 'upload', label: 'Upload Data', icon: Upload },
          { id: 'session-upload', label: 'Session Files', icon: FileText },
          { id: 'drivers', label: 'Manage Drivers', icon: Users },
          { id: 'races', label: 'Manage Races', icon: Calendar },
          { id: 'settings', label: 'Settings', icon: Settings }
        ].map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                activeSection === section.id
                  ? 'bg-red-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{section.label}</span>
            </button>
          );
        })}
      </div>

      {/* Upload Section */}
      {activeSection === 'upload' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">F1 23 Data Upload</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Upload F1 23 Session File
                </label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept=".json,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                    disabled={uploadStatus === 'uploading'}
                  />
                  <label
                    htmlFor="file-upload"
                    className={`cursor-pointer inline-flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      uploadStatus === 'uploading'
                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    <Upload className="w-4 h-4" />
                    <span>
                      {uploadStatus === 'uploading' ? 'Processing...' : 'Choose File'}
                    </span>
                  </label>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Supports JSON and CSV files from F1 23
                  </p>
                </div>
              </div>

              {uploadStatus !== 'idle' && (
                <div className={`p-4 rounded-lg flex items-center space-x-2 ${
                  uploadStatus === 'success' ? 'bg-green-500/20 text-green-400' :
                  uploadStatus === 'error' ? 'bg-red-500/20 text-red-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>
                  {uploadStatus === 'success' && <CheckCircle className="w-5 h-5" />}
                  {uploadStatus === 'error' && <AlertCircle className="w-5 h-5" />}
                  {uploadStatus === 'uploading' && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>}
                  <span>{uploadMessage}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Uploads</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-red-600 dark:text-blue-400" />
                  <div>
                    <p className="text-gray-900 dark:text-white font-medium">Monaco GP Session</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">2 hours ago</p>
                  </div>
                </div>
                <div className="text-sm text-green-600 dark:text-green-400">Success</div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-red-600 dark:text-blue-400" />
                  <div>
                    <p className="text-gray-900 dark:text-white font-medium">Silverstone Qualifying</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">1 day ago</p>
                  </div>
                </div>
                <div className="text-sm text-green-600 dark:text-green-400">Success</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Session Upload Section */}
      {activeSection === 'session-upload' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Upload F1 23 Session Files
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Upload session result files from F1 23 to add data for other drivers who aren't the host.
            </p>
            
            <div className="space-y-4">
              {/* Race Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Race
                </label>
                <select
                  value={selectedRace}
                  onChange={(e) => setSelectedRace(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Select a race...</option>
                  <option value="race-1">Bahrain Grand Prix 2024</option>
                  <option value="race-2">Saudi Arabian Grand Prix 2024</option>
                  <option value="race-3">Australian Grand Prix 2024</option>
                </select>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Session File
                </label>
                <input
                  type="file"
                  accept=".json,.csv,.txt"
                  onChange={(e) => setSessionFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Supported formats: JSON, CSV, TXT
                </p>
              </div>

              {/* Upload Button */}
              <button
                onClick={handleSessionFileUpload}
                disabled={!sessionFile || !selectedRace || sessionUploadStatus === 'uploading'}
                className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {sessionUploadStatus === 'uploading' ? 'Uploading...' : 'Upload Session File'}
              </button>

              {/* Status Message */}
              {sessionUploadMessage && (
                <div className={`p-3 rounded-md ${
                  sessionUploadStatus === 'success' 
                    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                    : sessionUploadStatus === 'error'
                    ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                    : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                }`}>
                  <div className="flex items-center space-x-2">
                    {sessionUploadStatus === 'success' && <CheckCircle className="w-4 h-4" />}
                    {sessionUploadStatus === 'error' && <AlertCircle className="w-4 h-4" />}
                    <span className="text-sm">{sessionUploadMessage}</span>
                  </div>
                </div>
              )}

              {/* Information */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                  How it works:
                </h4>
                <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• Host data is automatically captured via UDP</li>
                  <li>• Upload session files for other drivers' results</li>
                  <li>• Files should contain qualifying and race results</li>
                  <li>• Data will be processed and added to the race</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drivers Section */}
      {activeSection === 'drivers' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">League Drivers</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Manage your league participants</p>
              </div>
              <button 
                onClick={() => setShowAddDriverModal(true)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <Users className="w-4 h-4" />
                <span>Add Driver</span>
              </button>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>Note:</strong> Add your league drivers here. After uploading F1 23 session files, you'll map F1 23 drivers (like "Lewis Hamilton") to these league drivers.
              </p>
            </div>

            <div className="space-y-3">
              {drivers.length > 0 ? (
                drivers.map((driver) => (
                  <div key={driver.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white font-bold">
                        {driver.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-gray-900 dark:text-white font-medium">{driver.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{driver.team} • #{driver.number || 'N/A'}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleRemoveDriver(driver.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <span className="text-sm">Remove</span>
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Add your first driver to get started</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Races Section */}
      {activeSection === 'races' && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Manage Races</h3>
            <button 
              onClick={() => setShowScheduleRaceModal(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Schedule Race
            </button>
          </div>
          
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Race management coming soon...</p>
          </div>
        </div>
      )}

      {/* Settings Section */}
      {activeSection === 'settings' && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Settings</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Season Name
              </label>
              <input
                type="text"
                defaultValue="F1 Season 2024"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Points System
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500">
                <option>F1 Standard (25-18-15-12-10-8-6-4-2-1)</option>
                <option>Custom Points System</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="fastest-lap-point"
                className="w-4 h-4 text-red-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-red-500"
              />
              <label htmlFor="fastest-lap-point" className="text-sm text-gray-700 dark:text-gray-300">
                Award point for fastest lap
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Add Driver Modal */}
      {showAddDriverModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Add Driver</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Driver Name *
                </label>
                <input
                  type="text"
                  value={newDriver.name}
                  onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="e.g., John Smith"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Team
                </label>
                <input
                  type="text"
                  value={newDriver.team}
                  onChange={(e) => setNewDriver({ ...newDriver, team: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="e.g., Mercedes"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Car Number
                </label>
                <input
                  type="number"
                  value={newDriver.number}
                  onChange={(e) => setNewDriver({ ...newDriver, number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="e.g., 44"
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowAddDriverModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddDriver}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Add Driver
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Race Modal */}
      {showScheduleRaceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Schedule Race</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Track *
                </label>
                <select
                  value={newRace.track}
                  onChange={(e) => setNewRace({ ...newRace, track: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Select a track</option>
                  <option value="bahrain">Bahrain International Circuit</option>
                  <option value="silverstone">Silverstone Circuit</option>
                  <option value="monaco">Circuit de Monaco</option>
                  <option value="spa">Spa-Francorchamps</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  value={newRace.date}
                  onChange={(e) => setNewRace({ ...newRace, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Session Type
                </label>
                <select
                  value={newRace.type}
                  onChange={(e) => setNewRace({ ...newRace, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="race">Race</option>
                  <option value="qualifying">Qualifying</option>
                  <option value="practice">Practice</option>
                  <option value="sprint">Sprint</option>
                </select>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowScheduleRaceModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleScheduleRace}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Schedule Race
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
