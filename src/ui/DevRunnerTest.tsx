import React, { useState } from 'react';
import { runSuite, runSingleTest, preflight } from '../runner/runner.ts';
import { SAMPLES } from '../samples/samples.ts';
import { SAMPLE_2_MOCK_TESTS, SAMPLE_2_PATCH } from '../agent/mockData.ts';
import { runGateUnitChecks } from '../agent/gates.test.ts';
import { SuiteRun, TestResult, TestCase } from '../agent/types.ts';
import { CheckCircle2, XCircle, Play, Clock, ArrowLeft, ShieldCheck } from 'lucide-react';

interface DevRunnerTestProps {
  onBack: () => void;
}

export const DevRunnerTest: React.FC<DevRunnerTestProps> = ({ onBack }) => {
  const [buggyRun, setBuggyRun] = useState<SuiteRun | null>(null);
  const [fixedRun, setFixedRun] = useState<SuiteRun | null>(null);
  const [timeoutResult, setTimeoutResult] = useState<TestResult | null>(null);
  const [preflightOutput, setPreflightOutput] = useState<any>(null);
  const [gateChecks, setGateChecks] = useState<{ passed: boolean; results: string[] } | null>(null);
  const [running, setRunning] = useState(false);

  const sample2 = SAMPLES[1];

  const handleRunAllTests = async () => {
    setRunning(true);
    setBuggyRun(null);
    setFixedRun(null);
    setTimeoutResult(null);
    setGateChecks(null);

    try {
      // 0. Run Gate Unit-Style Checks with Fixtures
      const gatesResult = runGateUnitChecks();
      setGateChecks(gatesResult);

      // 1. Run Preflight
      const pf = preflight(sample2.code);
      setPreflightOutput(pf);

      // 2. Run Sample 2 tests against Buggy Code (Expect RED on repro tests)
      const resBuggy = await runSuite(sample2.code, SAMPLE_2_MOCK_TESTS);
      setBuggyRun(resBuggy);

      // 3. Run Sample 2 tests against Fixed Code (Expect GREEN on all tests)
      const resFixed = await runSuite(SAMPLE_2_PATCH, SAMPLE_2_MOCK_TESTS);
      setFixedRun(resFixed);

      // 4. Test infinite loop timeout enforcement with while(true)
      const hangTest: TestCase = {
        id: 'hang_test',
        role: 'repro',
        name: 'Infinite while(true){} loop timeout verification',
        code: `while(true) { /* deliberate hang */ }`
      };
      const resTimeout = await runSingleTest('function noop(){}', hangTest, 1500);
      setTimeoutResult(resTimeout);
    } finally {
      setRunning(false);
    }
  };

  const renderBadge = (res?: TestResult) => {
    if (!res) return null;
    if (res.status === 'pass') {
      return (
        <span className="inline-flex items-center gap-1 text-emerald-400 font-mono text-xs font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5" /> PASS ({res.durationMs.toFixed(1)}ms)
        </span>
      );
    }
    if (res.kind === 'timeout') {
      return (
        <span className="inline-flex items-center gap-1 text-amber-400 font-mono text-xs font-semibold">
          <Clock className="w-3.5 h-3.5" /> TIMEOUT ({res.durationMs.toFixed(1)}ms)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-rose-400 font-mono text-xs font-semibold">
        <XCircle className="w-3.5 h-3.5" /> {res.status.toUpperCase()} ({res.kind}) ({res.durationMs.toFixed(1)}ms)
      </span>
    );
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 text-slate-200">
      <div className="flex items-center justify-between border-b border-[#1F2937] pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1F2937] hover:bg-[#121821] text-xs text-slate-300"
          >
            <ArrowLeft className="w-4 h-4" /> Back to App
          </button>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <span>M2 Web Worker Runner Verification</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-mono border border-amber-500/30">
                Dev Test Page
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Validates Web Worker isolation, assert harness, timeout termination, and Sample 2 Red→Green.
            </p>
          </div>
        </div>

        <button
          onClick={handleRunAllTests}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-medium text-xs shadow-lg shadow-rose-500/20 disabled:opacity-50 cursor-pointer"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{running ? 'Executing Tests in Workers...' : 'Run All Exit Tests'}</span>
        </button>
      </div>

      {/* Test 0: Gate Unit Checks */}
      {gateChecks && (
        <div className="bg-[#121821] border border-[#1F2937] rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>0. Pure Verification Gates Unit-Style Checks (Fixtures)</span>
            </span>
            <span className={`font-mono font-semibold ${gateChecks.passed ? 'text-emerald-400' : 'text-rose-400'}`}>
              {gateChecks.passed ? '✓ ALL PASS' : '✕ FAILURES'}
            </span>
          </div>
          <div className="text-xs font-mono bg-[#0B0F14] p-3 rounded-lg border border-[#1F2937] space-y-1">
            {gateChecks.results.map((r, i) => (
              <div key={i} className={r.includes('PASS') ? 'text-emerald-300' : 'text-rose-300'}>
                {r}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test 1: Preflight */}
      {preflightOutput && (
        <div className="bg-[#121821] border border-[#1F2937] rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-white">1. Preflight Validation Check</span>
            <span className="text-emerald-400 font-mono font-semibold">✓ OK</span>
          </div>
          <div className="text-xs font-mono bg-[#0B0F14] p-3 rounded-lg border border-[#1F2937] text-slate-300">
            <div><strong>Top-level functions extracted:</strong> {JSON.stringify(preflightOutput.topLevelNames)}</div>
            <div><strong>Cleaned source lines:</strong> {preflightOutput.cleanSource.split('\n').length}</div>
          </div>
        </div>
      )}

      {/* Test 2: Timeout Termination */}
      {timeoutResult && (
        <div className="bg-[#121821] border border-[#1F2937] rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-white">2. Infinite Loop Timeout Guard (`while(true){}`)</span>
            {renderBadge(timeoutResult)}
          </div>
          <p className="text-xs text-slate-400">
            Worker was terminated by main thread timeout handler after {timeoutResult.durationMs.toFixed(0)}ms without locking the UI.
          </p>
          <div className="text-xs font-mono bg-amber-950/20 border border-amber-900/40 p-2.5 rounded text-amber-300">
            {timeoutResult.message}
          </div>
        </div>
      )}

      {/* Test 3: Sample 2 Against Buggy Code (Expected RED) */}
      {buggyRun && (
        <div className="bg-[#121821] border border-[#1F2937] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-rose-400">
              3. Sample 2 Original (Buggy Code) → Must fail repro tests (RED gate)
            </span>
            <span className="font-mono text-slate-400 text-xs">Total: {buggyRun.totalMs.toFixed(1)}ms</span>
          </div>
          <div className="space-y-2">
            {buggyRun.results.map((r) => {
              const test = SAMPLE_2_MOCK_TESTS.find((t) => t.id === r.id);
              return (
                <div
                  key={r.id}
                  className={`p-2.5 rounded-lg border flex items-center justify-between text-xs font-mono ${
                    r.status === 'pass'
                      ? 'bg-[#0B0F14] border-[#1F2937]'
                      : 'bg-rose-950/20 border-rose-900/40'
                  }`}
                >
                  <div>
                    <span className="font-semibold text-slate-200">[{test?.role}] {test?.name}</span>
                    {r.message && <div className="text-[11px] text-rose-300 mt-1 font-mono">{r.message}</div>}
                  </div>
                  <div>{renderBadge(r)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Test 4: Sample 2 Against Fixed Code (Expected GREEN) */}
      {fixedRun && (
        <div className="bg-[#121821] border border-[#1F2937] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-emerald-400">
              4. Sample 2 Hand-Fixed Code → All tests must pass (GREEN gate)
            </span>
            <span className="font-mono text-slate-400 text-xs">Total: {fixedRun.totalMs.toFixed(1)}ms</span>
          </div>
          <div className="space-y-2">
            {fixedRun.results.map((r) => {
              const test = SAMPLE_2_MOCK_TESTS.find((t) => t.id === r.id);
              return (
                <div
                  key={r.id}
                  className="p-2.5 rounded-lg border bg-[#0B0F14] border-[#1F2937] flex items-center justify-between text-xs font-mono"
                >
                  <div>
                    <span className="font-semibold text-slate-200">[{test?.role}] {test?.name}</span>
                  </div>
                  <div>{renderBadge(r)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!buggyRun && !running && (
        <div className="p-12 text-center text-slate-500 text-xs bg-[#121821] rounded-xl border border-[#1F2937]">
          Click "Run All Exit Tests" above to verify worker harness execution against buggy code, hand-fixed code, and timeout loop.
        </div>
      )}
    </div>
  );
};
