import React from 'react';
import { Clock } from 'lucide-react';

export const HistoryPage: React.FC = () => {
  return (
    <div className="flex min-h-[calc(100vh-88px)] items-center justify-center bg-[#050916] text-white">
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-white/5 px-12 py-16 text-center shadow-[0_35px_90px_-45px_rgba(6,11,29,0.85)] backdrop-blur-md">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15 text-red-400">
          <Clock className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-extrabold uppercase tracking-[0.35em] text-white/90">
          Coming Soon
        </h1>
        <p className="max-w-md text-sm text-white/65">
          We&apos;re building a full historical archive with past seasons, champions, and driver career stats. Check back after our next major release.
        </p>
      </div>
    </div>
  );
};
