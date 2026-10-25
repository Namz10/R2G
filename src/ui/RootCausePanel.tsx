import React from 'react';
import { Lightbulb, MapPin, AlertOctagon, HelpCircle, History } from 'lucide-react';
import { Investigation, PatchAttempt } from '../agent/types.ts';

interface RootCausePanelProps {
  investigation?: Investigation;
  attempts?: PatchAttempt[];
}

export const RootCausePanel: React.FC<RootCausePanelProps> = ({
  investigation,
  attempts = []
}) => {
  if (!investigation) {
    return (
      <div className="py-12 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
        <Lightbulb className="w-5 h-5 text-slate-600" />
        <span>Root cause analysis will be displayed once investigation completes.</span>
      </div>
    );
  }

  const latestAttempt = attempts.length > 0 ? attempts[attempts.length - 1] : null;

  return (
    <div className="space-y-4 text-xs">
      {/* Hypothesis & Location */}
      <div className="bg-[#0B0F14] border border-[#1F2937] rounded-xl p-4 space-y-3">
        <div>
          <div className="flex items-center gap-2 text-rose-400 font-semibold mb-1 text-xs">
            <Lightbulb className="w-4 h-4" />
            <span>Root Cause Hypothesis</span>
          </div>
          <p className="text-slate-200 leading-relaxed font-sans text-xs">
            {investigation.hypothesis}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[#1F2937]">
          <div>
            <div className="flex items-center gap-1.5 text-slate-400 font-medium text-[11px] mb-1">
              <MapPin className="w-3.5 h-3.5 text-sky-400" />
              <span>Suspect Location:</span>
            </div>
            <div className="font-mono text-slate-300 text-[11px] bg-[#121821] px-2.5 py-1 rounded border border-[#1F2937]">
              {investigation.suspectLocation.functionName} ({investigation.suspectLocation.lines})
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-slate-400 font-medium text-[11px] mb-1">
              <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
              <span>Failure Mode:</span>
            </div>
            <div className="font-mono text-slate-300 text-[11px] bg-[#121821] px-2.5 py-1 rounded border border-[#1F2937] uppercase">
              {investigation.failureMode}
            </div>
          </div>
        </div>
      </div>

      {/* Assumptions */}
      {investigation.assumptions && investigation.assumptions.length > 0 && (
        <div className="bg-[#0B0F14] border border-[#1F2937] rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-300 font-semibold mb-2 text-xs">
            <HelpCircle className="w-4 h-4 text-sky-400" />
            <span>Assumptions Made</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
            {investigation.assumptions.map((assump, idx) => (
              <li key={idx}>{assump}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Fix Summary & Attempt History */}
      {latestAttempt && (
        <div className="bg-[#0B0F14] border border-[#1F2937] rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
              <History className="w-4 h-4" />
              <span>Patch Summary (Attempt {latestAttempt.attempt})</span>
            </div>
          </div>
          <p className="text-slate-200 text-xs">
            <strong>Change:</strong> {latestAttempt.changeSummary}
          </p>
          <p className="text-slate-400 text-[11px] font-mono leading-relaxed bg-[#121821] p-2.5 rounded border border-[#1F2937]">
            {latestAttempt.rootCause}
          </p>

          {latestAttempt.retryReasoning && (
            <div className="pt-2 text-amber-300 text-[11px]">
              <strong>Retry Reasoning:</strong> {latestAttempt.retryReasoning}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
