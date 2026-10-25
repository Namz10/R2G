import React from 'react';
import { Play, Square, Sparkles, AlertCircle, FileCode, Bug } from 'lucide-react';
import { SAMPLES, Sample } from '../samples/samples.ts';
import { LIMITS } from '../lib/limits.ts';

interface InputPanelProps {
  bugReport: string;
  setBugReport: (val: string) => void;
  code: string;
  setCode: (val: string) => void;
  isRunning: boolean;
  onRun: () => void;
  onCancel: () => void;
  onSelectSample: (sample: Sample) => void;
  selectedSampleId: string | null;
  error?: string | null;
  cooldownSeconds?: number;
}

export const InputPanel: React.FC<InputPanelProps> = ({
  bugReport,
  setBugReport,
  code,
  setCode,
  isRunning,
  onRun,
  onCancel,
  onSelectSample,
  selectedSampleId,
  error,
  cooldownSeconds = 0
}) => {
  const reportBytes = new TextEncoder().encode(bugReport).length;
  const codeBytes = new TextEncoder().encode(code).length;
  const codeLines = code.trim() ? code.split('\n').length : 0;

  return (
    <div className="bg-[#121821] border border-[#1F2937] rounded-xl p-5 flex flex-col gap-4 shadow-xl">
      {/* Sample Picker Row */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1F2937]">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Curated Samples</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SAMPLES.map((sample) => (
            <button
              key={sample.id}
              onClick={() => onSelectSample(sample)}
              disabled={isRunning}
              title={sample.tagline}
              className={`px-2.5 py-1 text-xs rounded-md transition-all border font-medium ${
                selectedSampleId === sample.id
                  ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 font-semibold'
                  : 'bg-[#0B0F14] border-[#1F2937] text-slate-300 hover:border-slate-600 hover:text-white'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {sample.id === 'mergeIntervals' ? '★ ' : ''}
              {sample.name.replace(/^Sample \d+: /, '')}
            </button>
          ))}
        </div>
      </div>

      {/* 1. Bug Report Field */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Bug className="w-3.5 h-3.5 text-rose-400" />
            <span>1. Bug Report</span>
          </label>
          <span className="text-[11px] text-slate-500 font-mono">
            {reportBytes} / {LIMITS.MAX_REPORT_BYTES} bytes
          </span>
        </div>
        <textarea
          value={bugReport}
          onChange={(e) => setBugReport(e.target.value)}
          disabled={isRunning}
          rows={4}
          placeholder="Describe the unexpected behavior and expected output..."
          className="w-full bg-[#0B0F14] border border-[#1F2937] focus:border-rose-500 rounded-lg p-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none transition-colors resize-y leading-relaxed disabled:opacity-50"
        />
      </div>

      {/* 2. Source Code Field */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <FileCode className="w-3.5 h-3.5 text-sky-400" />
            <span>2. Source Code</span>
          </label>
          <div className="flex gap-2 text-[11px] text-slate-500 font-mono">
            <span>{codeLines} / {LIMITS.MAX_CODE_LINES} lines</span>
            <span>·</span>
            <span>{codeBytes} / {LIMITS.MAX_CODE_BYTES} bytes</span>
          </div>
        </div>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          disabled={isRunning}
          rows={14}
          placeholder="function buggyCode(...) { ... }"
          spellCheck={false}
          className="w-full bg-[#0B0F14] border border-[#1F2937] focus:border-rose-500 rounded-lg p-3 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none transition-colors resize-y leading-normal disabled:opacity-50"
        />
      </div>

      {/* Inline Error Toast */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs animate-shake">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Action Buttons & Note */}
      <div className="pt-2 flex flex-col gap-2.5">
        <div className="flex items-center gap-3">
          <button
            onClick={onRun}
            disabled={isRunning || cooldownSeconds > 0 || !bugReport.trim() || !code.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-medium text-xs shadow-lg shadow-rose-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>
              {cooldownSeconds > 0
                ? `Cooldown (${cooldownSeconds}s)`
                : isRunning
                ? 'Running...'
                : 'Prove & Fix'}
            </span>
            {cooldownSeconds === 0 && (
              <span className="text-[10px] opacity-75 hidden sm:inline ml-1 font-mono">⌘/Ctrl+Enter</span>
            )}
          </button>

          {isRunning && (
            <button
              onClick={onCancel}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-[#1F2937] hover:border-red-500/50 bg-[#0B0F14] text-slate-300 hover:text-rose-400 text-xs font-medium transition-colors"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
          )}
        </div>

        <div className="text-[11px] text-slate-500 text-center">
          Works on single-file JavaScript (no imports), up to 200 lines.
        </div>
      </div>
    </div>
  );
};
