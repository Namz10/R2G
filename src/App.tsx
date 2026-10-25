import React, { useState, useEffect, useRef, useReducer } from 'react';
import { Key, ShieldCheck, FlaskConical } from 'lucide-react';
import { InputPanel } from './ui/InputPanel.tsx';
import { VerdictBar } from './ui/VerdictBar.tsx';
import { Timeline } from './ui/Timeline.tsx';
import { TestMatrix } from './ui/TestMatrix.tsx';
import { DiffView } from './ui/DiffView.tsx';
import { RootCausePanel } from './ui/RootCausePanel.tsx';
import { ReplayBadge } from './ui/ReplayBadge.tsx';
import { SettingsModal } from './ui/SettingsModal.tsx';
import { DevRunnerTest } from './ui/DevRunnerTest.tsx';
import { SAMPLES, Sample } from './samples/samples.ts';
import { validateInput } from './lib/limits.ts';
import { hasApiKey } from './lib/apiKey.ts';
import { AgentState, StepState } from './agent/types.ts';
import { INITIAL_STATE, SAMPLE_2_MOCK_TESTS, SAMPLE_2_PATCH } from './agent/mockData.ts';

type Action =
  | { type: 'SET_PHASE'; phase: AgentState['phase'] }
  | { type: 'UPDATE_STEP'; stepId: string; status: StepState['status']; durationSec?: number; badge?: string; detail?: string }
  | { type: 'SET_INVESTIGATION'; investigation: AgentState['investigation'] }
  | { type: 'SET_FROZEN'; hash: string; ids: string[] }
  | { type: 'SET_ORIGINAL_RUN'; run: AgentState['originalRun'] }
  | { type: 'SET_PATCHED_RUN'; run: AgentState['patchedRun'] }
  | { type: 'ADD_ATTEMPT'; attempt: AgentState['attempts'][0] }
  | { type: 'SET_OUTCOME'; outcome: AgentState['outcome']; message?: string; warnings?: string[] }
  | { type: 'SET_TAB'; tab: AgentState['activeTab'] }
  | { type: 'RESET' }
  | { type: 'SET_REPLAY'; recordedAt: string };

function reducer(state: AgentState, action: Action): AgentState {
  switch (action.type) {
    case 'SET_PHASE':
      return { ...state, phase: action.phase };
    case 'UPDATE_STEP':
      return {
        ...state,
        steps: state.steps.map((s) =>
          s.id === action.stepId
            ? {
                ...s,
                status: action.status,
                durationSec: action.durationSec ?? s.durationSec,
                badge: action.badge ?? s.badge,
                detail: action.detail ?? s.detail
              }
            : s
        )
      };
    case 'SET_INVESTIGATION':
      return { ...state, investigation: action.investigation };
    case 'SET_FROZEN':
      return { ...state, frozen: { hash: action.hash, ids: action.ids } };
    case 'SET_ORIGINAL_RUN':
      return { ...state, originalRun: action.run };
    case 'SET_PATCHED_RUN':
      return { ...state, patchedRun: action.run };
    case 'ADD_ATTEMPT':
      return { ...state, attempts: [...state.attempts, action.attempt] };
    case 'SET_OUTCOME':
      return {
        ...state,
        outcome: action.outcome,
        verdictMessage: action.message,
        warnings: action.warnings || state.warnings,
        phase: 'DONE'
      };
    case 'SET_TAB':
      return { ...state, activeTab: action.tab };
    case 'RESET':
      return { ...INITIAL_STATE, steps: INITIAL_STATE.steps.map((s) => ({ ...s, status: 'pending' })) };
    case 'SET_REPLAY':
      return { ...state, replay: { recordedAt: action.recordedAt } };
    default:
      return state;
  }
}

export const App: React.FC = () => {
  const [sample, setSample] = useState<Sample>(SAMPLES[1]); // default to hero sample 2
  const [bugReport, setBugReport] = useState<string>(SAMPLES[1].bugReport);
  const [code, setCode] = useState<string>(SAMPLES[1].code);
  const [fixedCode, setFixedCode] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [hasKey, setHasKey] = useState<boolean>(() => hasApiKey());
  const [isRunning, setIsRunning] = useState(false);
  const [showDevTest, setShowDevTest] = useState(false);

  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const abortRef = useRef<boolean>(false);

  // Keyboard shortcut Ctrl/Cmd + Enter to run
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (!isRunning) {
          handleRunMock();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRunning, bugReport, code]);

  const handleSelectSample = (s: Sample) => {
    if (isRunning) return;
    setSample(s);
    setBugReport(s.bugReport);
    setCode(s.code);
    setFixedCode('');
    setValidationError(null);
    dispatch({ type: 'RESET' });
  };

  // Mock Orchestrator runner for M1 UI validation per §10 & §15
  const handleRunMock = async () => {
    const validation = validateInput(bugReport, code);
    if (!validation.ok) {
      setValidationError(validation.message || 'Validation error');
      dispatch({ type: 'SET_OUTCOME', outcome: 'INVALID_INPUT', message: validation.message });
      return;
    }
    setValidationError(null);

    abortRef.current = false;
    setIsRunning(true);
    dispatch({ type: 'RESET' });

    const sleep = (ms: number) =>
      new Promise((resolve) => {
        const timer = setTimeout(resolve, ms);
        // check abort
        if (abortRef.current) clearTimeout(timer);
      });

    try {
      // Step 1: Preflight
      dispatch({ type: 'SET_PHASE', phase: 'PREFLIGHT' });
      dispatch({ type: 'UPDATE_STEP', stepId: 'PREFLIGHT', status: 'running' });
      await sleep(300);
      if (abortRef.current) return;
      dispatch({ type: 'UPDATE_STEP', stepId: 'PREFLIGHT', status: 'done', durationSec: 0.2, detail: 'Preflight OK: single-file JS parsed successfully. Top-level function "mergeIntervals" identified.' });

      // Step 2: Investigate
      dispatch({ type: 'SET_PHASE', phase: 'INVESTIGATE' });
      dispatch({ type: 'UPDATE_STEP', stepId: 'INVESTIGATE', status: 'running' });
      await sleep(1000);
      if (abortRef.current) return;
      const mockInv = {
        hypothesis: 'The function fails to sort intervals before the merge loop, causing out-of-order intervals to be discarded. Additionally, the overlap comparison uses `<` instead of `<=`, dropping touching intervals.',
        suspectLocation: { functionName: 'mergeIntervals', lines: 'lines 3-8' },
        failureMode: 'wrong-output' as const,
        assumptions: ['Interval endpoints are numeric and intervals are represented as [start, end] pairs.'],
        tests: SAMPLE_2_MOCK_TESTS
      };
      dispatch({ type: 'SET_INVESTIGATION', investigation: mockInv });
      dispatch({ type: 'UPDATE_STEP', stepId: 'INVESTIGATE', status: 'done', durationSec: 1.1, detail: `Hypothesis: ${mockInv.hypothesis}` });

      // Step 3: Freeze tests
      dispatch({ type: 'UPDATE_STEP', stepId: 'FREEZE', status: 'running' });
      await sleep(400);
      if (abortRef.current) return;
      const hash = '3f9a72b0c1e4d88e6a2b1f5c';
      dispatch({ type: 'SET_FROZEN', hash, ids: SAMPLE_2_MOCK_TESTS.map((t) => t.id) });
      dispatch({
        type: 'UPDATE_STEP',
        stepId: 'FREEZE',
        status: 'done',
        durationSec: 0.1,
        badge: '🔒 6 tests',
        detail: `Verification suite locked with SHA-256: ${hash}. Patcher has zero access to modify tests.`
      });

      // Step 4: Run Original (RED Gate)
      dispatch({ type: 'SET_PHASE', phase: 'RUN_ORIGINAL' });
      dispatch({ type: 'UPDATE_STEP', stepId: 'RUN_ORIGINAL', status: 'running' });
      await sleep(700);
      if (abortRef.current) return;
      const originalResults = [
        { id: 'repro_1', status: 'fail' as const, kind: 'assertion' as const, message: 'Expected [[1,6],[8,10]], got [[8,10]]', expected: '[[1,6],[8,10]]', actual: '[[8,10]]', durationMs: 4 },
        { id: 'repro_2', status: 'fail' as const, kind: 'assertion' as const, message: 'Expected [[1,5]], got [[1,3],[3,5]]', expected: '[[1,5]]', actual: '[[1,3],[3,5]]', durationMs: 2 },
        { id: 'guard_1', status: 'pass' as const, durationMs: 2 },
        { id: 'guard_2', status: 'pass' as const, durationMs: 1 },
        { id: 'guard_3', status: 'pass' as const, durationMs: 1 },
        { id: 'holdout_1', status: 'fail' as const, kind: 'assertion' as const, message: 'Expected [[1,10]], got [[1,10],[2,5],[3,7]]', durationMs: 3 },
      ];
      dispatch({ type: 'SET_ORIGINAL_RUN', run: { results: originalResults, totalMs: 13 } });
      dispatch({ type: 'UPDATE_STEP', stepId: 'RUN_ORIGINAL', status: 'done', durationSec: 0.3, detail: 'RED gate validated: 2/2 repro tests failed on buggy code with assertion mismatches.' });

      // Step 5: Patch Call
      dispatch({ type: 'SET_PHASE', phase: 'PATCH' });
      dispatch({ type: 'UPDATE_STEP', stepId: 'PATCH', status: 'running' });
      await sleep(1200);
      if (abortRef.current) return;
      const mockAttempt = {
        attempt: 1,
        rootCause: 'Intervals were evaluated in raw input sequence without pre-sorting by start time, and touching intervals were omitted because condition used strictly `<` instead of `<=`.',
        changeSummary: 'Sort intervals by start coordinate and update overlap condition to `<=`.',
        fixedSource: SAMPLE_2_PATCH,
      };
      setFixedCode(SAMPLE_2_PATCH);
      dispatch({ type: 'ADD_ATTEMPT', attempt: mockAttempt });
      dispatch({ type: 'UPDATE_STEP', stepId: 'PATCH', status: 'done', durationSec: 1.2, detail: `Patch Attempt 1: ${mockAttempt.changeSummary}` });

      // Step 6: Run on Patched (GREEN Gate)
      dispatch({ type: 'SET_PHASE', phase: 'RUN_PATCHED' });
      dispatch({ type: 'UPDATE_STEP', stepId: 'RUN_PATCHED', status: 'running' });
      await sleep(700);
      if (abortRef.current) return;
      const patchedResults = [
        { id: 'repro_1', status: 'pass' as const, durationMs: 3 },
        { id: 'repro_2', status: 'pass' as const, durationMs: 2 },
        { id: 'guard_1', status: 'pass' as const, durationMs: 2 },
        { id: 'guard_2', status: 'pass' as const, durationMs: 1 },
        { id: 'guard_3', status: 'pass' as const, durationMs: 1 },
        { id: 'holdout_1', status: 'pass' as const, durationMs: 3 },
      ];
      dispatch({ type: 'SET_PATCHED_RUN', run: { results: patchedResults, totalMs: 12 } });
      dispatch({ type: 'UPDATE_STEP', stepId: 'RUN_PATCHED', status: 'done', durationSec: 0.3, detail: 'GREEN gate validated: 5/5 repro & guard tests pass cleanly without regressions.' });

      // Step 7: Generalization & Holdout
      dispatch({ type: 'SET_PHASE', phase: 'HOLDOUT' });
      dispatch({ type: 'UPDATE_STEP', stepId: 'HOLDOUT', status: 'running' });
      await sleep(400);
      if (abortRef.current) return;
      dispatch({ type: 'UPDATE_STEP', stepId: 'HOLDOUT', status: 'done', durationSec: 0.1, detail: 'Holdout check passed: 1/1 holdout test passes. Fix is general.' });

      // Done
      dispatch({ type: 'SET_OUTCOME', outcome: 'SOLVED' });
    } finally {
      setIsRunning(false);
    }
  };

  const handleCancel = () => {
    abortRef.current = true;
    setIsRunning(false);
    dispatch({ type: 'SET_OUTCOME', outcome: 'UNSOLVED', message: 'Execution cancelled by user.' });
  };

  return (
    <div className="min-h-screen bg-[#0B0F14] text-[#E2E8F0] flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b border-[#1F2937] bg-[#121821]/90 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand Motif per §10.2 */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span className="w-3 h-3 rounded-full bg-[#F43F5E] shadow-sm shadow-rose-500/50" />
              <span className="w-3 h-3 rounded-full bg-[#F59E0B] shadow-sm shadow-amber-500/50" />
              <span className="w-3 h-3 rounded-full bg-[#22C55E] shadow-sm shadow-emerald-500/50" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-white tracking-tight text-base sm:text-lg">
                RedToGreen
              </span>
              <span className="hidden md:inline text-xs text-slate-400 font-normal">
                — Prove it. Then fix it.
              </span>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowDevTest(!showDevTest)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs text-amber-300 hover:bg-amber-500/20 transition-all font-mono"
            >
              <FlaskConical className="w-3.5 h-3.5 text-amber-400" />
              <span>{showDevTest ? 'Back to App' : 'Dev: M2 Runner Tests'}</span>
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1F2937] hover:border-slate-600 bg-[#0B0F14] text-xs text-slate-300 hover:text-white transition-all shadow-sm"
            >
              <Key className="w-3.5 h-3.5 text-rose-400" />
              <span>BYOK API Key</span>
              {hasKey && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 ml-1" title="Key stored in sessionStorage" />
              )}
            </button>

            <a
              href="https://github.com/Namz10/R2G"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-slate-400 hover:text-white transition-colors hidden sm:inline"
            >
              GitHub
            </a>
          </div>
        </div>
      </header>

      {showDevTest ? (
        <main className="flex-1">
          <DevRunnerTest onBack={() => setShowDevTest(false)} />
        </main>
      ) : (
        <main className="max-w-7xl mx-auto w-full p-4 sm:p-6 flex-1 flex flex-col gap-5">
        {state.replay && (
          <ReplayBadge
            recordedAt={state.replay.recordedAt}
            onRunLive={handleRunMock}
            isRunning={isRunning}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column (Input Panel) - 5 cols on lg */}
          <section className="lg:col-span-5 flex flex-col gap-4">
            <InputPanel
              bugReport={bugReport}
              setBugReport={setBugReport}
              code={code}
              setCode={setCode}
              isRunning={isRunning}
              onRun={handleRunMock}
              onCancel={handleCancel}
              onSelectSample={handleSelectSample}
              selectedSampleId={sample.id}
              error={validationError}
            />
          </section>

          {/* Right Column (Verdict, Timeline, Evidence) - 7 cols on lg */}
          <section className="lg:col-span-7 flex flex-col gap-4">
            {/* Verdict Bar */}
            <VerdictBar state={state} onRetry={handleRunMock} />

            {/* Agent Timeline */}
            <Timeline steps={state.steps} />

            {/* Evidence Area with Tabs */}
            <div className="bg-[#121821] border border-[#1F2937] rounded-xl p-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-[#1F2937] mb-4">
                <div className="flex items-center gap-1 bg-[#0B0F14] border border-[#1F2937] rounded-lg p-1">
                  <button
                    onClick={() => dispatch({ type: 'SET_TAB', tab: 'tests' })}
                    className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                      state.activeTab === 'tests'
                        ? 'bg-rose-500 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Tests Matrix
                  </button>
                  <button
                    onClick={() => dispatch({ type: 'SET_TAB', tab: 'diff' })}
                    className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                      state.activeTab === 'diff'
                        ? 'bg-rose-500 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Diff View
                  </button>
                  <button
                    onClick={() => dispatch({ type: 'SET_TAB', tab: 'rootCause' })}
                    className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                      state.activeTab === 'rootCause'
                        ? 'bg-rose-500 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Root Cause
                  </button>
                </div>

                <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
                  Proof-Carrying Evidence
                </span>
              </div>

              {/* Tab Contents */}
              <div>
                {state.activeTab === 'tests' && (
                  <TestMatrix
                    tests={state.investigation?.tests || []}
                    originalResults={state.originalRun?.results}
                    patchedResults={state.patchedRun?.results}
                    frozenHash={state.frozen?.hash}
                  />
                )}
                {state.activeTab === 'diff' && (
                  <DiffView originalCode={code} fixedCode={fixedCode} />
                )}
                {state.activeTab === 'rootCause' && (
                  <RootCausePanel
                    investigation={state.investigation}
                    attempts={state.attempts}
                  />
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
      )}

      {/* Footer */}
      <footer className="border-t border-[#1F2937] py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>GDG Pune DevFest 2026 · #VibeToBuild · Solo Entrant</div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Real in-browser execution · Gemini structured outputs</span>
          </div>
        </div>
      </footer>

      {/* BYOK Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSaved={() => setHasKey(hasApiKey())}
      />
    </div>
  );
};
