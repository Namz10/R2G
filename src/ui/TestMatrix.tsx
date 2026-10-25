import React, { useState } from 'react';
import { Lock, X, Check, Circle, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { TestCase, TestResult } from '../agent/types.ts';

interface TestMatrixProps {
  tests: TestCase[];
  originalResults?: TestResult[];
  patchedResults?: TestResult[];
  frozenHash?: string;
}

export const TestMatrix: React.FC<TestMatrixProps> = ({
  tests,
  originalResults,
  patchedResults,
  frozenHash
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const origMap = new Map((originalResults || []).map((r) => [r.id, r]));
  const patchMap = new Map((patchedResults || []).map((r) => [r.id, r]));

  const renderStatus = (result?: TestResult, index: number = 0) => {
    const staggerDelay = `${index * 120}ms`;

    if (!result) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-mono">
          <Circle className="w-3.5 h-3.5 text-slate-600" />
          <span>pending</span>
        </span>
      );
    }
    if (result.status === 'pass') {
      return (
        <span
          style={{ animationDelay: staggerDelay }}
          className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium font-mono animate-cell-flip"
        >
          <Check className="w-3.5 h-3.5" />
          <span>pass</span>
          <span className="text-[10px] text-slate-500">({result.durationMs.toFixed(0)}ms)</span>
        </span>
      );
    }
    if (result.status === 'fail' || result.status === 'error') {
      return (
        <span
          style={{ animationDelay: staggerDelay }}
          className="inline-flex items-center gap-1.5 text-xs text-rose-400 font-medium font-mono animate-cell-flip"
        >
          <X className="w-3.5 h-3.5" />
          <span>fail</span>
          <span className="text-[10px] text-slate-500">({result.durationMs.toFixed(0)}ms)</span>
        </span>
      );
    }
    return null;
  };

  const getRoleChip = (role: TestCase['role']) => {
    switch (role) {
      case 'repro':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-rose-500/15 text-rose-400 border border-rose-500/30">
            repro
          </span>
        );
      case 'guard':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-sky-500/15 text-sky-400 border border-sky-500/30">
            guard
          </span>
        );
      case 'holdout':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30">
            holdout
          </span>
        );
    }
  };

  if (tests.length === 0) {
    return (
      <div className="py-12 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
        <Lock className="w-5 h-5 text-slate-600" />
        <span>No tests generated yet. Run an investigation to synthesize and freeze the verification suite.</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Hash header */}
      <div className="flex items-center justify-between text-xs px-1 text-slate-400">
        <div className="flex items-center gap-2">
          <span>Verification Matrix ({tests.length} tests)</span>
        </div>
        {frozenHash && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0B0F14] border border-[#1F2937] text-amber-300 font-mono text-[11px]">
            <Lock className="w-3 h-3 text-amber-400" />
            <span>Frozen Hash:</span>
            <span className="font-semibold">{frozenHash.slice(0, 10)}...{frozenHash.slice(-4)}</span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="border border-[#1F2937] rounded-xl overflow-hidden bg-[#0B0F14]">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#1F2937] bg-[#121821]/80 text-slate-400 font-semibold">
              <th className="py-2.5 px-3">Role</th>
              <th className="py-2.5 px-3">Test Case</th>
              <th className="py-2.5 px-3 w-36">Original (RED)</th>
              <th className="py-2.5 px-3 w-36">Patched (GREEN)</th>
              <th className="py-2.5 px-2 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1F2937]/60">
            {tests.map((test, idx) => {
              const orig = origMap.get(test.id);
              const patch = patchMap.get(test.id);
              const isExpanded = expandedId === test.id;

              return (
                <React.Fragment key={test.id}>
                  <tr
                    onClick={() => setExpandedId(isExpanded ? null : test.id)}
                    className="hover:bg-[#121821] cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-3">{getRoleChip(test.role)}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-200">{test.name}</div>
                      <div className="text-[11px] font-mono text-slate-500">{test.id}</div>
                    </td>
                    <td className="py-2.5 px-3">{renderStatus(orig, idx)}</td>
                    <td className="py-2.5 px-3">{renderStatus(patch, idx)}</td>
                    <td className="py-2.5 px-2 text-slate-500">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr className="bg-[#121821]/50">
                      <td colSpan={5} className="p-3 text-xs">
                        <div className="space-y-2 bg-[#0B0F14] p-3 rounded-lg border border-[#1F2937]">
                          <div>
                            <div className="text-[11px] font-semibold text-slate-400 mb-1">
                              Test Code:
                            </div>
                            <pre className="font-mono text-[11px] text-slate-300 p-2 rounded bg-black/40 overflow-x-auto">
                              {test.code}
                            </pre>
                          </div>

                          {(orig?.message || patch?.message) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-[#1F2937]">
                              {orig?.message && (
                                <div className="space-y-1">
                                  <div className="text-[10px] font-semibold text-rose-400 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    Original Failure:
                                  </div>
                                  <div className="font-mono text-[11px] text-rose-300 bg-rose-950/20 p-2 rounded border border-rose-900/30">
                                    {orig.message}
                                    {orig.expected && (
                                      <div className="mt-1 text-slate-400">
                                        Expected: {orig.expected} | Got: {orig.actual}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {patch?.message && (
                                <div className="space-y-1">
                                  <div className="text-[10px] font-semibold text-rose-400 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    Patched Failure:
                                  </div>
                                  <div className="font-mono text-[11px] text-rose-300 bg-rose-950/20 p-2 rounded border border-rose-900/30">
                                    {patch.message}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
