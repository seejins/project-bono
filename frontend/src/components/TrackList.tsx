import React from 'react';

interface TrackListProps {
  onTrackSelect?: (trackId: string) => void;
}

export const TrackList: React.FC<TrackListProps> = ({ onTrackSelect }) => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tracks</h1>
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p>Track list coming soon...</p>
      </div>
    </div>
  );
};