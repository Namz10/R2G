import React from 'react';
import { History, Play } from 'lucide-react';

interface ReplayBadgeProps {
  recordedAt?: string;
  onRunLive?: () => void;
  isRunning?: boolean;
}

export const ReplayBadge: React.FC<ReplayBadgeProps> = ({
  recordedAt,
  onRunLive,
  isRunning
}) => {
  if (!recordedAt) return null;

  return (
    <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs animate-fadeIn">
      <div className="flex items-center gap-2">
        <History className="w-3.5 h-3.5" />
        <span>
          ⏺ Replayed from a real run on <span className="font-mono text-white">{recordedAt}</span>
        </span>
      </div>
      {onRunLive && (
        <button
          onClick={onRunLive}
          disabled={isRunning}
          className="flex items-center gap-1 font-semibold hover:text-white underline ml-3 cursor-pointer disabled:opacity-50"
        >
          <Play className="w-3 h-3 fill-current" />
          <span>Run live</span>
        </button>
      )}
    </div>
  );
};
