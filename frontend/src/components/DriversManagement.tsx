import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, CheckCircle, AlertCircle, X } from 'lucide-react';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';

interface Driver {
  id: string;
  name: string;
  steam_id?: string;
  createdAt: string;
  updatedAt: string;
}

interface DriversManagementProps {
  // No props needed for now
}

export const DriversManagement: React.FC<DriversManagementProps> = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [newDriver, setNewDriver] = useState({ name: '', steam_id: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [formErrors, setFormErrors] = useState<{name?: string, steam_id?: string}>({});
  const [editFormErrors, setEditFormErrors] = useState<{name?: string, steam_id?: string}>({});

  // Load drivers on component mount
  useEffect(() => {
    loadDrivers();
  }, []);

  const loadDrivers = async () => {
    try {
      setLoading(true);
      const response = await apiGet('/api/drivers');
      if (response.ok) {
        const data = await response.json();
        setDrivers(data.drivers || []);
      } else {
        throw new Error('Failed to load drivers');
      }
    } catch (error) {
      console.error('Error loading drivers:', error);
      setStatus('error');
      setStatusMessage('Failed to load drivers');
    } finally {
      setLoading(false);
    }
  };

  const validateSteamId = (steamId: string): boolean => {
    if (!steamId) return true; // Optional field
    // Steam ID should be 17 digits
    return /^\d{17}$/.test(steamId);
  };

  const formatSteamId = (steamId: string): string => {
    // Remove any non-digit characters and limit to 17 digits
    const cleaned = steamId.replace(/\D/g, '').slice(0, 17);
    return cleaned;
  };

  const handleAddDriver = async () => {
    const errors: {name?: string, steam_id?: string} = {};
    
    if (!newDriver.name.trim()) {
      errors.name = 'Name is required';
    }

    if (newDriver.steam_id && !validateSteamId(newDriver.steam_id)) {
      errors.steam_id = 'Steam ID must be 17 digits';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});

    try {
      setStatus('loading');
      setStatusMessage('Adding driver...');

      const response = await apiPost('/api/drivers', {
        name: newDriver.name.trim(),
        steam_id: newDriver.steam_id ? formatSteamId(newDriver.steam_id) : undefined,
      });

      if (response.ok) {
        setStatus('success');
        setStatusMessage('Driver added successfully');
        setNewDriver({ name: '', steam_id: '' });
        setFormErrors({});
        setShowAddModal(false);
        loadDrivers(); // Reload the list
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add driver');
      }
    } catch (error) {
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Failed to add driver');
    }
  };

  const handleEditDriver = (driver: Driver) => {
    setEditingDriver(driver);
    setShowEditModal(true);
  };

  const handleUpdateDriver = async () => {
    if (!editingDriver) return;

    const errors: {name?: string, steam_id?: string} = {};
    
    if (!editingDriver.name.trim()) {
      errors.name = 'Name is required';
    }

    if (editingDriver.steam_id && !validateSteamId(editingDriver.steam_id)) {
      errors.steam_id = 'Steam ID must be 17 digits';
    }

    if (Object.keys(errors).length > 0) {
      setEditFormErrors(errors);
      return;
    }

    setEditFormErrors({});

    try {
      setStatus('loading');
      setStatusMessage('Updating driver...');

      const response = await apiPut(`/api/drivers/${editingDriver.id}`, {
        name: editingDriver.name.trim(),
        steam_id: editingDriver.steam_id ? formatSteamId(editingDriver.steam_id) : undefined,
      });

      if (response.ok) {
        setStatus('success');
        setStatusMessage('Driver updated successfully');
        setEditFormErrors({});
        setShowEditModal(false);
        setEditingDriver(null);
        loadDrivers(); // Reload the list
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update driver');
      }
    } catch (error) {
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Failed to update driver');
    }
  };

  const handleDeleteDriver = async (driverId: string) => {
    if (!confirm('Are you sure you want to delete this driver? This action cannot be undone.')) {
      return;
    }

    try {
      setStatus('loading');
      setStatusMessage('Deleting driver...');

      const response = await apiDelete(`/api/drivers/${driverId}`);

      if (response.ok) {
        setStatus('success');
        setStatusMessage('Driver deleted successfully');
        loadDrivers(); // Reload the list
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete driver');
      }
    } catch (error) {
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Failed to delete driver');
    }
  };

  const clearStatus = () => {
    setStatus('idle');
    setStatusMessage('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading drivers...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">League Drivers</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage your league participants</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Driver</span>
        </button>
      </div>


      {/* Status Message */}
      {status !== 'idle' && (
        <div className={`p-4 rounded-lg flex items-center justify-between ${
          status === 'success' ? 'bg-green-500/20 text-green-400' :
          status === 'error' ? 'bg-red-500/20 text-red-400' :
          'bg-blue-500/20 text-blue-400'
        }`}>
          <div className="flex items-center space-x-2">
            {status === 'success' && <CheckCircle className="w-5 h-5" />}
            {status === 'error' && <AlertCircle className="w-5 h-5" />}
            {status === 'loading' && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>}
            <span>{statusMessage}</span>
          </div>
          <button onClick={clearStatus} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Drivers List */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
        {drivers.length > 0 ? (
          <div className="flex flex-col gap-3">
            {drivers.map((driver) => (
              <div 
                key={driver.id} 
                className="relative flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer z-10"
                onClick={() => handleEditDriver(driver)}
              >
                <div className="flex items-center space-x-4 flex-1">
                  <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white font-bold">
                    {driver.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-gray-900 dark:text-white font-medium">{driver.name}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                      {driver.steam_id && (
                        <span>Steam ID: {driver.steam_id}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={() => handleDeleteDriver(driver.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded text-sm flex items-center space-x-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No drivers added yet</p>
            <p className="text-sm">Add your first driver to get started</p>
          </div>
        )}
      </div>

      {/* Add Driver Modal */}
      {showAddModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowAddModal(false)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Add Driver</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Driver Name *
                </label>
                <input
                  type="text"
                  value={newDriver.name}
                  onChange={(e) => {
                    setNewDriver({ ...newDriver, name: e.target.value });
                    if (formErrors.name) {
                      setFormErrors({ ...formErrors, name: undefined });
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${
                    formErrors.name 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 dark:border-gray-600 focus:ring-red-500'
                  }`}
                  placeholder="e.g., John Smith"
                />
                {formErrors.name && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.name}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Steam ID (Optional)
                </label>
                <input
                  type="text"
                  value={newDriver.steam_id}
                  onChange={(e) => {
                    setNewDriver({ ...newDriver, steam_id: formatSteamId(e.target.value) });
                    if (formErrors.steam_id) {
                      setFormErrors({ ...formErrors, steam_id: undefined });
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${
                    formErrors.steam_id 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 dark:border-gray-600 focus:ring-red-500'
                  }`}
                  placeholder="e.g., 76561198000000000"
                  maxLength={17}
                />
                {formErrors.steam_id ? (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.steam_id}</p>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    17-digit Steam ID for F1 23 UDP mapping
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewDriver({ name: '', steam_id: '' });
                  clearStatus();
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddDriver}
                disabled={status === 'loading'}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                {status === 'loading' ? 'Adding...' : 'Add Driver'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Driver Modal */}
      {showEditModal && editingDriver && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowEditModal(false)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Edit Driver</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Driver Name *
                </label>
                <input
                  type="text"
                  value={editingDriver.name}
                  onChange={(e) => {
                    setEditingDriver({ ...editingDriver, name: e.target.value });
                    if (editFormErrors.name) {
                      setEditFormErrors({ ...editFormErrors, name: undefined });
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${
                    editFormErrors.name 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 dark:border-gray-600 focus:ring-red-500'
                  }`}
                  placeholder="e.g., John Smith"
                />
                {editFormErrors.name && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{editFormErrors.name}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Steam ID (Optional)
                </label>
                <input
                  type="text"
                  value={editingDriver.steam_id || ''}
                  onChange={(e) => {
                    setEditingDriver({ ...editingDriver, steam_id: formatSteamId(e.target.value) });
                    if (editFormErrors.steam_id) {
                      setEditFormErrors({ ...editFormErrors, steam_id: undefined });
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${
                    editFormErrors.steam_id 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 dark:border-gray-600 focus:ring-red-500'
                  }`}
                  placeholder="e.g., 76561198000000000"
                  maxLength={17}
                />
                {editFormErrors.steam_id ? (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{editFormErrors.steam_id}</p>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    17-digit Steam ID for F1 23 UDP mapping
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingDriver(null);
                  clearStatus();
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateDriver}
                disabled={status === 'loading'}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                {status === 'loading' ? 'Updating...' : 'Update Driver'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

