import React, { useState } from 'react';
import { Copy, Check, FileDiff, Columns, AlignJustify } from 'lucide-react';
import { computeLineDiff, DiffLine } from '../lib/diff.ts';

interface DiffViewProps {
  originalCode: string;
  fixedCode: string;
}

export const DiffView: React.FC<DiffViewProps> = ({ originalCode, fixedCode }) => {
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<'unified' | 'split'>('unified');

  if (!fixedCode || originalCode === fixedCode) {
    return (
      <div className="py-12 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
        <FileDiff className="w-5 h-5 text-slate-600" />
        <span>No patch generated yet. Fix patch and diff will appear here after execution.</span>
      </div>
    );
  }

  const { lines, additions, deletions } = computeLineDiff(originalCode, fixedCode);

  const handleCopy = () => {
    navigator.clipboard.writeText(fixedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      {/* Diff Toolbar */}
      <div className="flex items-center justify-between text-xs px-1">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="text-emerald-400 font-semibold">+{additions}</span>
            <span className="text-rose-400 font-semibold">-{deletions}</span>
            <span className="text-slate-500">lines changed</span>
          </div>
          <div className="flex bg-[#0B0F14] border border-[#1F2937] rounded-md p-0.5">
            <button
              onClick={() => setMode('unified')}
              className={`px-2 py-0.5 rounded text-[11px] flex items-center gap-1 ${
                mode === 'unified' ? 'bg-[#1F2937] text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <AlignJustify className="w-3 h-3" />
              Unified
            </button>
            <button
              onClick={() => setMode('split')}
              className={`px-2 py-0.5 rounded text-[11px] flex items-center gap-1 ${
                mode === 'split' ? 'bg-[#1F2937] text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Columns className="w-3 h-3" />
              Split
            </button>
          </div>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B0F14] border border-[#1F2937] hover:border-slate-600 text-slate-300 hover:text-white transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy fixed code</span>
            </>
          )}
        </button>
      </div>

      {/* Code Container */}
      {mode === 'unified' ? (
        <div className="border border-[#1F2937] rounded-xl overflow-hidden bg-[#0B0F14] font-mono text-xs">
          <div className="overflow-x-auto divide-y divide-[#1F2937]/30">
            {lines.map((line: DiffLine, idx: number) => {
              const isAdd = line.type === 'added';
              const isRem = line.type === 'removed';

              return (
                <div
                  key={idx}
                  className={`flex px-3 py-1 font-mono text-[11px] leading-5 select-text ${
                    isAdd
                      ? 'bg-emerald-950/25 text-emerald-300'
                      : isRem
                      ? 'bg-rose-950/25 text-rose-300'
                      : 'text-slate-300 hover:bg-[#121821]/50'
                  }`}
                >
                  <div className="w-8 shrink-0 text-slate-600 select-none text-[10px]">
                    {idx + 1}
                  </div>
                  <div className="w-5 shrink-0 select-none font-semibold">
                    {isAdd ? '+' : isRem ? '-' : ' '}
                  </div>
                  <div className="whitespace-pre overflow-x-auto">{line.value || ' '}</div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 border border-[#1F2937] rounded-xl overflow-hidden bg-[#0B0F14] p-3 text-xs font-mono">
          <div>
            <div className="text-[11px] font-semibold text-rose-400 mb-1.5 pb-1 border-b border-[#1F2937]">
              Original Source
            </div>
            <pre className="text-slate-400 overflow-x-auto text-[11px] whitespace-pre">
              {originalCode}
            </pre>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-emerald-400 mb-1.5 pb-1 border-b border-[#1F2937]">
              Patched Source
            </div>
            <pre className="text-slate-200 overflow-x-auto text-[11px] whitespace-pre">
              {fixedCode}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
