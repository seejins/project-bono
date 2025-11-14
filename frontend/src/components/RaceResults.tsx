import React, { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPut } from '../utils/api';
import { Trophy, Clock, Flag, AlertTriangle, RotateCcw, Edit, History, Shield } from 'lucide-react';
import logger from '../utils/logger';
import { formatTimeFromMs } from '../utils/dateUtils';

interface RaceResult {
  id: string;
  position: number;
  driver_name: string;
  member_name: string;
  points: number;
  num_laps: number;
  best_lap_time_ms: number;
  total_race_time_ms: number;
  penalties: number;
  warnings: number;
  result_status: number;
  dnf_reason: string;
  fastest_lap: boolean;
  pole_position: boolean;
}

interface SessionResult {
  sessionId: string;
  sessionType: number;
  sessionName: string;
  completedAt: string;
  results: RaceResult[];
}

interface RaceResultsProps {
  raceId: string;
  isAdmin?: boolean;
}

export const RaceResults: React.FC<RaceResultsProps> = ({ raceId, isAdmin = false }) => {
  const [sessions, setSessions] = useState<SessionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingDriver, setEditingDriver] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [editHistory, setEditHistory] = useState<any[]>([]);

  useEffect(() => {
    loadRaceResults();
  }, [raceId]);

  const loadRaceResults = async () => {
    try {
      setLoading(true);
      const response = await apiGet(`/api/races/${raceId}/results`);
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions);
      } else {
        throw new Error('Failed to load race results');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load race results');
    } finally {
      setLoading(false);
    }
  };

  const loadEditHistory = async (sessionId: string) => {
    try {
      const response = await apiGet(`/api/races/sessions/${sessionId}/edit-history`);
      if (response.ok) {
        const data = await response.json();
        setEditHistory(data.editHistory);
        setShowHistoryModal(true);
      }
    } catch (err) {
      logger.error('Failed to load edit history:', err);
    }
  };

  const handleAddPenalty = async (sessionId: string, driverId: string, penaltyPoints: number, reason: string) => {
    try {
      const response = await apiPost(`/api/races/sessions/${sessionId}/penalties`, {
        driverId,
        penaltyPoints,
        reason,
        editedBy: 'Admin' // TODO: Get from auth context
      });

      if (response.ok) {
        await loadRaceResults();
        setShowEditModal(false);
        setEditingDriver(null);
      } else {
        throw new Error('Failed to add penalty');
      }
    } catch (err) {
      logger.error('Failed to add penalty:', err);
    }
  };

  const handleChangePosition = async (sessionId: string, driverId: string, newPosition: number, reason: string) => {
    try {
      const response = await apiPut(`/api/races/sessions/${sessionId}/positions/${driverId}`, {
        newPosition,
        reason,
        editedBy: 'Admin' // TODO: Get from auth context
      });

      if (response.ok) {
        await loadRaceResults();
        setShowEditModal(false);
        setEditingDriver(null);
      } else {
        throw new Error('Failed to change position');
      }
    } catch (err) {
      logger.error('Failed to change position:', err);
    }
  };

  const handleResetDriver = async (sessionId: string, driverId: string) => {
    try {
      const response = await apiPost(`/api/races/sessions/${sessionId}/reset-driver/${driverId}`);
      if (response.ok) {
        await loadRaceResults();
      }
    } catch (err) {
      logger.error('Failed to reset driver:', err);
    }
  };

  const handleResetRace = async () => {
    try {
      const response = await apiPost(`/api/races/${raceId}/reset`);
      if (response.ok) {
        await loadRaceResults();
      }
    } catch (err) {
      logger.error('Failed to reset race:', err);
    }
  };


  const getResultStatusBadge = (status: number, dnfReason?: string) => {
    switch (status) {
      case 0: return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">Invalid</span>;
      case 1: return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">Inactive</span>;
      case 2: return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Active</span>;
      case 3: return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">Finished</span>;
      case 4: return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">DNF</span>;
      case 5: return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">DSQ</span>;
      case 6: return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Not Classified</span>;
      case 7: return <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">Retired</span>;
      default: return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">Unknown</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-8">
        <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No race results available yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin Controls */}
      {isAdmin && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Admin Controls</h3>
            <div className="flex space-x-2">
              <button
                onClick={handleResetRace}
                className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm flex items-center space-x-1"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset Race</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Session Results */}
      {sessions.map((session) => (
        <div key={session.sessionId} className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Flag className="h-5 w-5 text-red-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {session.sessionName}
                </h3>
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                  Completed
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {new Date(session.completedAt).toLocaleString()}
                </span>
                {isAdmin && (
                  <button
                    onClick={() => loadEditHistory(session.sessionId)}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <History className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Pos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Driver
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Points
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Laps
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Best Lap
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Total Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  {isAdmin && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {session.results.map((result) => (
                  <tr key={result.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {result.position}
                        </span>
                        {result.pole_position && (
                          <Shield className="h-4 w-4 text-yellow-500 ml-1" aria-label="Pole Position" />
                        )}
                        {result.fastest_lap && (
                          <Trophy className="h-4 w-4 text-purple-500 ml-1" aria-label="Fastest Lap" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {result.driver_name}
                      </div>
                      {result.member_name && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {result.member_name}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {result.points}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {result.num_laps}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatTimeFromMs(result.best_lap_time_ms)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatTimeFromMs(result.total_race_time_ms)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getResultStatusBadge(result.result_status, result.dnf_reason)}
                      {result.penalties > 0 && (
                        <div className="text-xs text-red-600 mt-1">
                          {result.penalties} penalty points
                        </div>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setEditingDriver(result.id);
                              setShowEditModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleResetDriver(session.sessionId, result.id)}
                            className="text-orange-600 hover:text-orange-700"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Edit Modal */}
      {showEditModal && editingDriver && (
        <EditDriverModal
          driverId={editingDriver}
          onClose={() => {
            setShowEditModal(false);
            setEditingDriver(null);
          }}
          onAddPenalty={handleAddPenalty}
          onChangePosition={handleChangePosition}
        />
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <EditHistoryModal
          editHistory={editHistory}
          onClose={() => setShowHistoryModal(false)}
        />
      )}
    </div>
  );
};

// Edit Driver Modal Component
interface EditDriverModalProps {
  driverId: string;
  onClose: () => void;
  onAddPenalty: (sessionId: string, driverId: string, penaltyPoints: number, reason: string) => void;
  onChangePosition: (sessionId: string, driverId: string, newPosition: number, reason: string) => void;
}

const EditDriverModal: React.FC<EditDriverModalProps> = ({ driverId, onClose, onAddPenalty, onChangePosition }) => {
  const [penaltyPoints, setPenaltyPoints] = useState(0);
  const [newPosition, setNewPosition] = useState(1);
  const [reason, setReason] = useState('');
  const [activeTab, setActiveTab] = useState<'penalty' | 'position'>('penalty');

  const handleSubmit = () => {
    if (activeTab === 'penalty') {
      onAddPenalty('sessionId', driverId, penaltyPoints, reason);
    } else {
      onChangePosition('sessionId', driverId, newPosition, reason);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-panel max-w-md p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Edit Driver Result</h3>
        
        <div className="flex space-x-1 mb-4">
          <button
            onClick={() => setActiveTab('penalty')}
            className={`px-3 py-2 rounded-lg text-sm ${
              activeTab === 'penalty'
                ? 'bg-red-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Add Penalty
          </button>
          <button
            onClick={() => setActiveTab('position')}
            className={`px-3 py-2 rounded-lg text-sm ${
              activeTab === 'position'
                ? 'bg-red-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Change Position
          </button>
        </div>

        {activeTab === 'penalty' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Penalty Points
              </label>
              <input
                type="number"
                value={penaltyPoints}
                onChange={(e) => setPenaltyPoints(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700"
                min="0"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                New Position
              </label>
              <input
                type="number"
                value={newPosition}
                onChange={(e) => setNewPosition(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700"
                min="1"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Reason
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700"
            rows={3}
            placeholder="Enter reason for this change..."
          />
        </div>

        <div className="flex space-x-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!reason.trim() || (activeTab === 'penalty' && penaltyPoints <= 0) || (activeTab === 'position' && newPosition < 1)}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
          >
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
};

// Edit History Modal Component
interface EditHistoryModalProps {
  editHistory: any[];
  onClose: () => void;
}

const EditHistoryModal: React.FC<EditHistoryModalProps> = ({ editHistory, onClose }) => {
  return (
        <div className="modal-overlay">
          <div className="modal-panel max-w-4xl mx-4 p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Edit History</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {editHistory.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400 text-center py-8">No edit history available</p>
        ) : (
          <div className="space-y-4">
            {editHistory.map((edit) => (
              <div key={edit.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {edit.edit_type.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(edit.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Driver: {edit.driver_name || 'Unknown'}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Reason: {edit.reason || 'No reason provided'}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Edited by: {edit.edited_by || 'Unknown'}
                </div>
                {edit.is_reverted && (
                  <div className="mt-2">
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">
                      Reverted
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

