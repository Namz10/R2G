import React from 'react';
import { AlertCircle, CheckCircle2, Clock, XCircle, RefreshCw, Info } from 'lucide-react';
import { AgentState } from '../agent/types.ts';

interface VerdictBarProps {
  state: AgentState;
  onRetry?: () => void;
}

export const VerdictBar: React.FC<VerdictBarProps> = ({ state, onRetry }) => {
  const { phase, outcome, warnings, originalRun, patchedRun, attempts } = state;

  // Determine appearance based on Phase and Outcome
  let bg = 'bg-[#121821] border-[#1F2937] text-slate-300';
  let icon = <Info className="w-4 h-4 text-slate-400" />;
  let headline = 'Paste a bug report and code, or load a sample';
  let subline: string | null = null;
  let showRetry = false;

  if (phase === 'IDLE') {
    bg = 'bg-[#121821] border-[#1F2937] text-slate-300';
    icon = <Info className="w-4 h-4 text-slate-400" />;
    headline = 'Drop in a bug. I\'ll reproduce it with a failing test, fix it, and prove the fix.';
  } else if (phase === 'PREFLIGHT' || phase === 'INVESTIGATE') {
    bg = 'bg-slate-900/80 border-slate-700/60 text-slate-200 animate-pulse';
    icon = <Clock className="w-4 h-4 text-slate-400 animate-spin" />;
    headline = 'Investigating… Reading report, code, and forming test hypotheses';
  } else if (phase === 'RUN_ORIGINAL') {
    const failingCount = originalRun?.results.filter((r) => r.status !== 'pass').length ?? 0;
    bg = 'bg-rose-950/40 border-rose-600/50 text-rose-200';
    icon = <XCircle className="w-4 h-4 text-rose-400" />;
    headline = `🔴 RED: Bug reproduced (${failingCount} failing tests on original code)`;
    subline = 'Tests are now frozen and locked 🔒. Synthesizing fix patch...';
  } else if (phase === 'PATCH' || phase === 'RUN_PATCHED' || phase === 'HOLDOUT') {
    const attempt = attempts.length > 0 ? attempts[attempts.length - 1].attempt : 1;
    bg = 'bg-amber-950/40 border-amber-600/50 text-amber-200';
    icon = <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />;
    headline = `Patching · attempt ${attempt}/3`;
    subline = 'Validating patch sanity and running against frozen verification suite...';
  } else if (phase === 'REPORT' || phase === 'DONE') {
    if (outcome === 'SOLVED') {
      const passCount = patchedRun?.results.filter((r) => r.status === 'pass').length ?? 0;
      const totalCount = patchedRun?.results.length ?? passCount;
      bg = 'bg-emerald-950/40 border-emerald-600/50 text-emerald-200';
      icon = <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      headline = `🟢 GREEN: Fix verified (${passCount}/${totalCount} tests pass)`;
      subline = 'Bug reproduced on original, resolved on patched, zero regressions.';
    } else if (outcome === 'SOLVED_WITH_WARNINGS') {
      const passCount = patchedRun?.results.filter((r) => r.status === 'pass').length ?? 0;
      const totalCount = patchedRun?.results.length ?? passCount;
      bg = 'bg-emerald-950/30 border-amber-600/60 text-emerald-200';
      icon = <CheckCircle2 className="w-4 h-4 text-amber-400" />;
      headline = `🟢 Fix verified · ⚠ ${warnings[0] || 'Holdout test discrepancy'}`;
      subline = `${passCount}/${totalCount} tests passed. Check the warning advisory.`;
    } else if (outcome === 'UNSOLVED') {
      bg = 'bg-amber-950/40 border-amber-500/60 text-amber-200';
      icon = <AlertCircle className="w-4 h-4 text-amber-400" />;
      headline = "Couldn't prove a fix. Here's what I tried.";
      subline = 'I couldn\'t prove a fix within 3 attempts. Best attempt and failing tests shown below.';
      showRetry = true;
    } else if (outcome === 'INVALID_INPUT') {
      bg = 'bg-amber-950/30 border-amber-600/50 text-amber-300';
      icon = <AlertCircle className="w-4 h-4 text-amber-400" />;
      headline = state.verdictMessage || 'Invalid input provided.';
    } else if (outcome === 'ERROR') {
      bg = 'bg-rose-950/40 border-rose-600/60 text-rose-200';
      icon = <XCircle className="w-4 h-4 text-rose-400" />;
      headline = 'The AI service had a problem. Retry';
      subline = state.verdictMessage || 'Unexpected network or execution error.';
      showRetry = true;
    }
  }

  return (
    <div
      role="region"
      aria-live="polite"
      className={`w-full rounded-xl border p-4 transition-all duration-300 flex items-center justify-between shadow-lg ${bg}`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">{icon}</div>
        <div className="flex flex-col">
          <div className="font-semibold text-sm tracking-tight flex items-center gap-2">
            <span>{headline}</span>
          </div>
          {subline && <div className="text-xs opacity-80 mt-0.5">{subline}</div>}
        </div>
      </div>

      {showRetry && onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-white transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
};
