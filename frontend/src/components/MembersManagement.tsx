import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, CheckCircle, AlertCircle, X } from 'lucide-react';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';

interface Member {
  id: string;
  name: string;
  steam_id?: string;
  createdAt: string;
  updatedAt: string;
}

interface MembersManagementProps {
  // No props needed for now
}

export const MembersManagement: React.FC<MembersManagementProps> = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [newMember, setNewMember] = useState({ name: '', steam_id: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  // Load members on component mount
  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const response = await apiGet('/api/members');
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
      } else {
        throw new Error('Failed to load members');
      }
    } catch (error) {
      console.error('Error loading members:', error);
      setStatus('error');
      setStatusMessage('Failed to load members');
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

  const handleAddMember = async () => {
    if (!newMember.name.trim()) {
      setStatus('error');
      setStatusMessage('Name is required');
      return;
    }

    if (newMember.steam_id && !validateSteamId(newMember.steam_id)) {
      setStatus('error');
      setStatusMessage('Steam ID must be 17 digits');
      return;
    }

    try {
      setStatus('loading');
      setStatusMessage('Adding member...');

      const response = await apiPost('/api/members', {
        name: newMember.name.trim(),
        steam_id: newMember.steam_id ? formatSteamId(newMember.steam_id) : undefined,
      });

      if (response.ok) {
        setStatus('success');
        setStatusMessage('Member added successfully');
        setNewMember({ name: '', steam_id: '' });
        setShowAddModal(false);
        loadMembers(); // Reload the list
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add member');
      }
    } catch (error) {
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Failed to add member');
    }
  };

  const handleEditMember = (member: Member) => {
    setEditingMember(member);
    setShowEditModal(true);
  };

  const handleUpdateMember = async () => {
    if (!editingMember) return;

    if (!editingMember.name.trim()) {
      setStatus('error');
      setStatusMessage('Name is required');
      return;
    }

    if (editingMember.steam_id && !validateSteamId(editingMember.steam_id)) {
      setStatus('error');
      setStatusMessage('Steam ID must be 17 digits');
      return;
    }

    try {
      setStatus('loading');
      setStatusMessage('Updating member...');

      const response = await apiPut(`/api/members/${editingMember.id}`, {
        name: editingMember.name.trim(),
        steam_id: editingMember.steam_id ? formatSteamId(editingMember.steam_id) : undefined,
      });

      if (response.ok) {
        setStatus('success');
        setStatusMessage('Member updated successfully');
        setShowEditModal(false);
        setEditingMember(null);
        loadMembers(); // Reload the list
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update member');
      }
    } catch (error) {
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Failed to update member');
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to delete this member? This action cannot be undone.')) {
      return;
    }

    try {
      setStatus('loading');
      setStatusMessage('Deleting member...');

      const response = await apiDelete(`/api/members/${memberId}`);

      if (response.ok) {
        setStatus('success');
        setStatusMessage('Member deleted successfully');
        loadMembers(); // Reload the list
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete member');
      }
    } catch (error) {
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Failed to delete member');
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
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading members...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">League Members</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage your league participants</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Member</span>
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <strong>Note:</strong> Add your league members here. These are the people who can participate in your F1 league seasons. 
          Steam IDs are used to automatically map F1 23 UDP data to the correct member.
        </p>
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

      {/* Members List */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
        {members.length > 0 ? (
          <div className="space-y-3">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white font-bold">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-gray-900 dark:text-white font-medium">{member.name}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                      {member.steam_id && (
                        <span>Steam ID: {member.steam_id}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => handleEditMember(member)}
                    className="text-blue-600 hover:text-blue-700 transition-colors px-2 py-1 rounded text-sm flex items-center space-x-1"
                  >
                    <Edit className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                  <button 
                    onClick={() => handleDeleteMember(member.id)}
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
            <p>No members added yet</p>
            <p className="text-sm">Add your first member to get started</p>
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Add Member</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Member Name *
                </label>
                <input
                  type="text"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="e.g., John Smith"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Steam ID (Optional)
                </label>
                <input
                  type="text"
                  value={newMember.steam_id}
                  onChange={(e) => setNewMember({ ...newMember, steam_id: formatSteamId(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="e.g., 76561198000000000"
                  maxLength={17}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  17-digit Steam ID for F1 23 UDP mapping
                </p>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewMember({ name: '', steam_id: '' });
                  clearStatus();
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMember}
                disabled={status === 'loading'}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                {status === 'loading' ? 'Adding...' : 'Add Member'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {showEditModal && editingMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Edit Member</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Member Name *
                </label>
                <input
                  type="text"
                  value={editingMember.name}
                  onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="e.g., John Smith"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Steam ID (Optional)
                </label>
                <input
                  type="text"
                  value={editingMember.steam_id || ''}
                  onChange={(e) => setEditingMember({ ...editingMember, steam_id: formatSteamId(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="e.g., 76561198000000000"
                  maxLength={17}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  17-digit Steam ID for F1 23 UDP mapping
                </p>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingMember(null);
                  clearStatus();
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateMember}
                disabled={status === 'loading'}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                {status === 'loading' ? 'Updating...' : 'Update Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
