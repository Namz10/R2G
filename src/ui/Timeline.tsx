import React, { useState } from 'react';
import { Check, Circle, Loader2, X, RefreshCw, Lock, ChevronDown, ChevronRight } from 'lucide-react';
import { StepState } from '../agent/types.ts';

interface TimelineProps {
  steps: StepState[];
}

export const Timeline: React.FC<TimelineProps> = ({ steps }) => {
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedStepId((prev) => (prev === id ? null : id));
  };

  const getStepIcon = (status: StepState['status']) => {
    switch (status) {
      case 'done':
        return <Check className="w-3.5 h-3.5 text-emerald-400" />;
      case 'running':
        return <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />;
      case 'failed':
        return <X className="w-3.5 h-3.5 text-rose-400" />;
      case 'retry':
        return <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />;
      case 'pending':
      default:
        return <Circle className="w-3 h-3 text-slate-600" />;
    }
  };

  return (
    <div className="bg-[#121821] border border-[#1F2937] rounded-xl p-4 shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-[#1F2937] mb-3">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Agent Timeline
        </h3>
        <span className="text-[11px] text-slate-500 font-mono">7-Stage Verification</span>
      </div>

      <div className="space-y-1.5">
        {steps.map((step) => {
          const isExpanded = expandedStepId === step.id;
          const hasDetail = Boolean(step.detail);

          return (
            <div
              key={step.id}
              className={`rounded-lg transition-colors border ${
                step.status === 'running'
                  ? 'bg-amber-500/5 border-amber-500/20'
                  : 'bg-[#0B0F14]/50 border-transparent hover:border-[#1F2937]'
              }`}
            >
              <div
                onClick={() => hasDetail && toggleExpand(step.id)}
                className={`flex items-center justify-between px-3 py-2 text-xs select-none ${
                  hasDetail ? 'cursor-pointer' : ''
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 flex items-center justify-center shrink-0">
                    {getStepIcon(step.status)}
                  </div>
                  <span
                    className={`font-medium ${
                      step.status === 'done'
                        ? 'text-slate-200'
                        : step.status === 'running'
                        ? 'text-amber-200 font-semibold'
                        : step.status === 'failed'
                        ? 'text-rose-300'
                        : 'text-slate-500'
                    }`}
                  >
                    {step.label}
                  </span>
                  {step.badge && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                      {step.badge.includes('🔒') ? <Lock className="w-2.5 h-2.5 text-amber-400" /> : null}
                      {step.badge}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
                  {typeof step.durationSec === 'number' && (
                    <span>{step.durationSec.toFixed(1)}s</span>
                  )}
                  {hasDetail && (
                    <button
                      type="button"
                      aria-label="Toggle details"
                      className="text-slate-500 hover:text-slate-300"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {isExpanded && step.detail && (
                <div className="px-3 pb-2.5 pt-1 text-xs text-slate-300 border-t border-[#1F2937]/50 font-mono text-[11px] bg-[#0B0F14] rounded-b-lg whitespace-pre-wrap">
                  {step.detail}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
