import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Calendar, Users, MapPin, X } from 'lucide-react';

interface Season {
  id: string;
  name: string;
  year: number;
  startDate: string;
  endDate: string;
  pointsSystem: 'f1_standard' | 'custom';
  fastestLapPoint: boolean;
  drivers: any[];
  tracks: any[];
  races: any[];
  isActive: boolean;
}

interface SeasonListItemProps {
  season: Season;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: (season: Season) => void;
  onDelete: (seasonId: string) => void;
  onSelect: (season: Season) => void;
}

export const SeasonListItem: React.FC<SeasonListItemProps> = ({ 
  season, 
  isExpanded, 
  onToggle, 
  onEdit, 
  onDelete, 
  onSelect 
}) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center space-x-3 flex-1">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
          <div className={`w-3 h-3 rounded-full ${season.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{season.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {season.startDate && season.endDate && formatDate(season.startDate) !== 'Not set' && formatDate(season.endDate) !== 'Not set'
                ? `${formatDate(season.startDate)} - ${formatDate(season.endDate)}`
                : `Season ${season.year}`
              }
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(season);
            }}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Manage
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{season.drivers.length}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Drivers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{season.tracks.length}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Tracks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{season.races.length}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Races</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {season.races.filter((r: any) => r.status === 'completed').length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Completed</div>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect(season);
              }}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
            >
              Full Management
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
