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
import { Download, Disc, Check } from 'lucide-react';
import { downloadProofReport } from './ui/ProofReport.ts';
import { saveReplay, getReplayForSample } from './samples/replayManager.ts';
import { AgentState, StepState } from './agent/types.ts';
import { INITIAL_STATE } from './agent/mockData.ts';
import { runAgentOrchestrator, AgentEvent } from './agent/orchestrator.ts';

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
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [recordedSuccess, setRecordedSuccess] = useState(false);

  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cooldown countdown timer per Spec §13 (10s between runs)
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const handleSelectSample = (s: Sample) => {
    if (isRunning) return;
    setSample(s);
    setBugReport(s.bugReport);
    setCode(s.code);
    setFixedCode('');
    setValidationError(null);

    // Check if replay exists for this sample
    const cached = getReplayForSample(s.id);
    if (cached) {
      dispatch({ type: 'RESET' });
      dispatch({ type: 'SET_REPLAY', recordedAt: cached.recordedAt });
    } else {
      dispatch({ type: 'RESET' });
    }
  };

  const handleRecordReplay = () => {
    if (!state.outcome || state.outcome === 'INVALID_INPUT' || state.outcome === 'ERROR') return;
    saveReplay(sample.id, {
      sampleId: sample.id,
      recordedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      bugReport,
      code,
      fixedCode,
      state
    });
    setRecordedSuccess(true);
    setTimeout(() => setRecordedSuccess(false), 2000);
  };

  const handleDownloadReport = () => {
    downloadProofReport(bugReport, code, fixedCode, state);
  };

  // Live Orchestrator runner wiring M3 Part 2 per Spec §7.3
  const handleRunLive = async () => {
    if (cooldownSeconds > 0) return;

    const validation = validateInput(bugReport, code);
    if (!validation.ok) {
      setValidationError(validation.message || 'Validation error');
      dispatch({ type: 'SET_OUTCOME', outcome: 'INVALID_INPUT', message: validation.message });
      return;
    }

    if (!hasApiKey()) {
      setIsSettingsOpen(true);
      setValidationError('Please provide your Gemini API key in settings before running.');
      return;
    }

    setValidationError(null);
    setFixedCode('');
    setIsRunning(true);
    dispatch({ type: 'RESET' });

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await runAgentOrchestrator(
        { bugReport, code },
        (event: AgentEvent) => {
          switch (event.type) {
            case 'PHASE':
              dispatch({ type: 'SET_PHASE', phase: event.phase });
              break;
            case 'STEP':
              dispatch({
                type: 'UPDATE_STEP',
                stepId: event.stepId,
                status: event.status,
                durationSec: event.durationSec,
                badge: event.badge,
                detail: event.detail
              });
              break;
            case 'INVESTIGATION':
              dispatch({ type: 'SET_INVESTIGATION', investigation: event.investigation });
              break;
            case 'FROZEN':
              dispatch({ type: 'SET_FROZEN', hash: event.hash, ids: event.ids });
              break;
            case 'ORIGINAL_RUN':
              dispatch({ type: 'SET_ORIGINAL_RUN', run: event.run });
              break;
            case 'PATCHED_RUN':
              dispatch({ type: 'SET_PATCHED_RUN', run: event.run });
              break;
            case 'ATTEMPT':
              setFixedCode(event.attempt.fixedSource);
              dispatch({ type: 'ADD_ATTEMPT', attempt: event.attempt });
              break;
            case 'OUTCOME':
              dispatch({
                type: 'SET_OUTCOME',
                outcome: event.outcome,
                message: event.message,
                warnings: event.warnings
              });
              break;
          }
        },
        controller.signal
      );
    } catch (err: any) {
      if (controller.signal.aborted) {
        dispatch({
          type: 'SET_OUTCOME',
          outcome: 'UNSOLVED',
          message: 'Execution cancelled by user.'
        });
      } else {
        dispatch({
          type: 'SET_OUTCOME',
          outcome: 'ERROR',
          message: err?.message || 'Agent loop encountered an unexpected error.'
        });
      }
    } finally {
      setIsRunning(false);
      abortControllerRef.current = null;
      setCooldownSeconds(10);
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsRunning(false);
    dispatch({ type: 'SET_OUTCOME', outcome: 'UNSOLVED', message: 'Execution cancelled by user.' });
  };

  // Keyboard shortcut Ctrl/Cmd + Enter to run
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (!isRunning) {
          handleRunLive();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRunning, bugReport, code]);

  return (
    <div className="min-h-screen bg-[#0B0F14] text-[#E2E8F0] flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b border-[#1F2937] bg-[#121821]/90 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand Motif per §10.2: turns green on success */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span
                className={`w-3 h-3 rounded-full transition-all duration-500 shadow-sm ${
                  state.outcome === 'SOLVED'
                    ? 'bg-[#22C55E] shadow-emerald-500/50'
                    : 'bg-[#F43F5E] shadow-rose-500/50'
                }`}
              />
              <span
                className={`w-3 h-3 rounded-full transition-all duration-500 shadow-sm ${
                  state.outcome === 'SOLVED'
                    ? 'bg-[#22C55E] shadow-emerald-500/50'
                    : 'bg-[#F59E0B] shadow-amber-500/50'
                }`}
              />
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
            onRunLive={handleRunLive}
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
              onRun={handleRunLive}
              onCancel={handleCancel}
              onSelectSample={handleSelectSample}
              selectedSampleId={sample.id}
              error={validationError}
              cooldownSeconds={cooldownSeconds}
            />
          </section>

          {/* Right Column (Verdict, Timeline, Evidence) - 7 cols on lg */}
          <section className="lg:col-span-7 flex flex-col gap-4">
            {/* Verdict Bar */}
            <VerdictBar state={state} onRetry={handleRunLive} />

            {/* Agent Timeline */}
            <Timeline steps={state.steps} />

            {/* Evidence Area with Tabs */}
            <div className="bg-[#121821] border border-[#1F2937] rounded-xl p-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-[#1F2937] mb-4 gap-2 flex-wrap">
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

                <div className="flex items-center gap-2">
                  {state.outcome && (
                    <button
                      onClick={handleDownloadReport}
                      title="Download RedToGreen-report.md"
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0B0F14] border border-[#1F2937] hover:border-slate-500 text-[11px] text-slate-300 hover:text-white transition-all shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5 text-rose-400" />
                      <span>Download Proof Report</span>
                    </button>
                  )}

                  {state.outcome === 'SOLVED' && (
                    <button
                      onClick={handleRecordReplay}
                      title="Dev only: save real run into replays cache"
                      className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-[11px] text-amber-300 font-mono transition-all"
                    >
                      {recordedSuccess ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Saved Replay</span>
                        </>
                      ) : (
                        <>
                          <Disc className="w-3 h-3 text-amber-400" />
                          <span>Record Replay</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
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
