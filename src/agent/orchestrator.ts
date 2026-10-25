import { preflight, runSuite } from '../runner/runner.ts';
import { investigate, patch } from './gemini.ts';
import { redGate, greenGate, patchSanity } from './gates.ts';
import { sha256 } from '../lib/hash.ts';
import {
  AgentState,
  TestCase,
  TestResult,
  Investigation,
  PatchAttempt,
  Outcome
} from './types.ts';

export type AgentEvent =
  | { type: 'PHASE'; phase: AgentState['phase'] }
  | { type: 'STEP'; stepId: string; status: 'pending' | 'running' | 'done' | 'failed' | 'retry'; durationSec?: number; badge?: string; detail?: string }
  | { type: 'INVESTIGATION'; investigation: Investigation }
  | { type: 'FROZEN'; hash: string; ids: string[] }
  | { type: 'ORIGINAL_RUN'; run: { results: TestResult[]; totalMs: number } }
  | { type: 'PATCHED_RUN'; run: { results: TestResult[]; totalMs: number } }
  | { type: 'ATTEMPT'; attempt: PatchAttempt }
  | { type: 'OUTCOME'; outcome: Outcome; message?: string; warnings?: string[] };

export type EventEmitter = (event: AgentEvent) => void;

/**
 * RedToGreen Orchestrator State Machine per Spec §7.1 and §7.3.
 *
 * Invariants:
 *  - PREFLIGHT: compiles source, checks limits & single-file JS
 *  - INVESTIGATE loop (1 + 2 retries): LLM hypothesis + tests -> run on original -> redGate (V1+V2)
 *  - FREEZE tests (V3): SHA-256 hash, read-only lock, HOLDOUTS HIDDEN FROM PATCHER
 *  - PATCH loop (up to 3 attempts): patchSanity (V5) -> run on patched -> greenGate (V4)
 *  - HOLDOUT check (advisory): flags overfit warnings
 *  - Honest failure (V6): ends in UNSOLVED if retries exhausted
 */
export async function runAgentOrchestrator(
  input: { bugReport: string; code: string },
  emit: EventEmitter,
  signal: AbortSignal
): Promise<void> {
  // 1. PREFLIGHT
  emit({ type: 'PHASE', phase: 'PREFLIGHT' });
  emit({ type: 'STEP', stepId: 'PREFLIGHT', status: 'running' });

  const pre = preflight(input.code);
  if (!pre.ok) {
    emit({ type: 'STEP', stepId: 'PREFLIGHT', status: 'failed', detail: pre.message });
    emit({
      type: 'OUTCOME',
      outcome: 'INVALID_INPUT',
      message: pre.message || 'JavaScript preflight failed'
    });
    return;
  }

  emit({
    type: 'STEP',
    stepId: 'PREFLIGHT',
    status: 'done',
    durationSec: 0.1,
    detail: `Compiles OK. Top-level declarations: ${(pre.topLevelNames || []).join(', ') || 'none'}`
  });

  if (signal.aborted) throw new Error('Operation cancelled by user');

  // 2. INVESTIGATE loop (up to 2 retries on non-valid-red)
  emit({ type: 'PHASE', phase: 'INVESTIGATE' });
  let feedback: string[] | null = null;
  let keptTests: TestCase[] = [];
  let investigationData: Investigation | null = null;

  for (let invAttempt = 0; invAttempt <= 2; invAttempt++) {
    const isRetry = invAttempt > 0;
    emit({
      type: 'STEP',
      stepId: 'INVESTIGATE',
      status: isRetry ? 'retry' : 'running',
      detail: isRetry ? `Re-investigating with feedback (Attempt ${invAttempt + 1}/3)...` : 'Generating root cause hypothesis and test suite...'
    });

    const t0 = performance.now();
    try {
      const invOutput = await investigate(input, feedback, signal);
      const invDuration = (performance.now() - t0) / 1000;

      investigationData = {
        hypothesis: invOutput.hypothesis,
        suspectLocation: invOutput.suspectLocation,
        failureMode: invOutput.failureMode,
        assumptions: invOutput.assumptions,
        tests: invOutput.tests
      };

      emit({ type: 'INVESTIGATION', investigation: investigationData });
      emit({
        type: 'STEP',
        stepId: 'INVESTIGATE',
        status: 'done',
        durationSec: invDuration,
        detail: `Hypothesis: ${invOutput.hypothesis}`
      });

      // Run generated tests on the original (buggy) code
      emit({ type: 'PHASE', phase: 'RUN_ORIGINAL' });
      emit({ type: 'STEP', stepId: 'RUN_ORIGINAL', status: 'running' });

      const tRun0 = performance.now();
      const origRun = await runSuite(input.code, invOutput.tests);
      const runDuration = (performance.now() - tRun0) / 1000;

      emit({ type: 'ORIGINAL_RUN', run: origRun });

      // Evaluate RED gate (V1 + V2)
      const gate = redGate(invOutput.tests, origRun, invOutput.failureMode);

      if (gate.ok) {
        keptTests = gate.keptTests;
        emit({
          type: 'STEP',
          stepId: 'RUN_ORIGINAL',
          status: 'done',
          durationSec: runDuration,
          detail: `RED gate passed: Bug verified with ${keptTests.filter((t) => t.role === 'repro').length} valid repro failures.`
        });
        break; // Valid red achieved!
      } else {
        // Red gate failed -> provide specific feedback for retry
        feedback = gate.feedbackForModel || [
          'No repro test failed with a valid failure kind on the original buggy code.'
        ];
        emit({
          type: 'STEP',
          stepId: 'RUN_ORIGINAL',
          status: 'failed',
          durationSec: runDuration,
          detail: `RED gate rejected: ${feedback.join(' ')}`
        });

        if (invAttempt === 2) {
          emit({
            type: 'OUTCOME',
            outcome: 'UNSOLVED',
            message: 'Could not reproduce the bug with a valid failing test after 3 attempts.'
          });
          return;
        }
      }
    } catch (err: any) {
      if (signal.aborted) throw err;
      emit({
        type: 'OUTCOME',
        outcome: 'ERROR',
        message: `Investigation API error: ${err?.message || String(err)}`
      });
      return;
    }
  }

  if (keptTests.length === 0) {
    emit({
      type: 'OUTCOME',
      outcome: 'UNSOLVED',
      message: 'No valid tests retained after investigation.'
    });
    return;
  }

  // 3. FREEZE tests (V3 invariant)
  // Holdouts MUST BE HIDDEN from the patcher to prevent overfitting
  emit({ type: 'STEP', stepId: 'FREEZE', status: 'running' });
  const allTestsSerialized = JSON.stringify(keptTests);
  const frozenHash = await sha256(allTestsSerialized);
  const patcherVisibleTests = keptTests.filter((t) => t.role !== 'holdout');

  emit({
    type: 'FROZEN',
    hash: frozenHash,
    ids: keptTests.map((t) => t.id)
  });
  emit({
    type: 'STEP',
    stepId: 'FREEZE',
    status: 'done',
    durationSec: 0.1,
    badge: `🔒 ${keptTests.length} tests`,
    detail: `Verification suite locked. SHA-256: ${frozenHash}. ${keptTests.length - patcherVisibleTests.length} holdouts hidden from patcher.`
  });

  if (signal.aborted) throw new Error('Operation cancelled by user');

  // 4. PATCH loop (up to 3 attempts with failure feedback)
  emit({ type: 'PHASE', phase: 'PATCH' });
  let previousAttempt: {
    attempt: number;
    source: string;
    reasoning?: string;
    failures?: Array<{ testId: string; name: string; role: string; message?: string; expected?: string; actual?: string }>;
    rejectedReason?: string;
  } | null = null;

  for (let attemptNum = 1; attemptNum <= 3; attemptNum++) {
    emit({
      type: 'STEP',
      stepId: 'PATCH',
      status: attemptNum > 1 ? 'retry' : 'running',
      detail: `Synthesizing fix patch (Attempt ${attemptNum}/3)...`
    });

    const tPatch0 = performance.now();
    let patchRes;
    try {
      patchRes = await patch(input, patcherVisibleTests, previousAttempt, signal);
    } catch (err: any) {
      if (signal.aborted) throw err;
      emit({
        type: 'OUTCOME',
        outcome: 'ERROR',
        message: `Patch API error: ${err?.message || String(err)}`
      });
      return;
    }
    const patchDuration = (performance.now() - tPatch0) / 1000;

    // V5: Patch sanity check
    const sanity = patchSanity(input.code, patchRes.fixedSource);
    if (!sanity.ok) {
      emit({
        type: 'STEP',
        stepId: 'PATCH',
        status: 'failed',
        durationSec: patchDuration,
        detail: `Patch sanity violation: ${sanity.reason}`
      });

      previousAttempt = {
        attempt: attemptNum,
        source: patchRes.fixedSource,
        reasoning: patchRes.retryReasoning,
        rejectedReason: sanity.reason
      };

      if (attemptNum === 3) {
        emit({
          type: 'OUTCOME',
          outcome: 'UNSOLVED',
          message: `Patch attempts exhausted. Last attempt rejected: ${sanity.reason}`
        });
        return;
      }
      continue;
    }

    emit({
      type: 'ATTEMPT',
      attempt: {
        attempt: attemptNum,
        rootCause: patchRes.rootCause,
        changeSummary: patchRes.changeSummary,
        fixedSource: patchRes.fixedSource,
        retryReasoning: patchRes.retryReasoning
      }
    });

    emit({
      type: 'STEP',
      stepId: 'PATCH',
      status: 'done',
      durationSec: patchDuration,
      detail: `Patch attempt ${attemptNum} generated: ${patchRes.changeSummary}`
    });

    // 5. RUN PATCHED (GREEN Gate)
    emit({ type: 'PHASE', phase: 'RUN_PATCHED' });
    emit({ type: 'STEP', stepId: 'RUN_PATCHED', status: 'running' });

    const tRunPatch0 = performance.now();
    // Run against ALL kept tests (including holdouts)
    const patchedSuiteRun = await runSuite(patchRes.fixedSource, keptTests);
    const runPatchedDuration = (performance.now() - tRunPatch0) / 1000;

    emit({ type: 'PATCHED_RUN', run: patchedSuiteRun });

    // Evaluate GREEN gate (V4 + Holdout advisory)
    const gGate = greenGate(keptTests, patchedSuiteRun);

    if (gGate.ok) {
      emit({
        type: 'STEP',
        stepId: 'RUN_PATCHED',
        status: 'done',
        durationSec: runPatchedDuration,
        detail: `GREEN gate passed: All repro and guard tests pass without regression.`
      });

      // 6. HOLDOUT generalization check
      emit({ type: 'PHASE', phase: 'HOLDOUT' });
      emit({ type: 'STEP', stepId: 'HOLDOUT', status: 'running' });

      if (gGate.holdoutWarnings.length > 0) {
        emit({
          type: 'STEP',
          stepId: 'HOLDOUT',
          status: 'failed',
          durationSec: 0.1,
          detail: `Advisory warning: ${gGate.holdoutWarnings.join('; ')}`
        });
        emit({
          type: 'OUTCOME',
          outcome: 'SOLVED_WITH_WARNINGS',
          warnings: gGate.holdoutWarnings,
          message: 'Fix verified for target bug, but holdout generalization check flagged an advisory warning.'
        });
      } else {
        emit({
          type: 'STEP',
          stepId: 'HOLDOUT',
          status: 'done',
          durationSec: 0.1,
          detail: 'Holdout tests passed: Fix generalizes beyond immediate training inputs.'
        });
        emit({
          type: 'OUTCOME',
          outcome: 'SOLVED',
          message: 'Fix verified with complete proof: bug reproduced on original, resolved on patched, zero regressions.'
        });
      }
      return;
    } else {
      // Green gate failed
      emit({
        type: 'STEP',
        stepId: 'RUN_PATCHED',
        status: 'failed',
        durationSec: runPatchedDuration,
        detail: `${gGate.failures.length} test(s) failed on patched code.`
      });

      previousAttempt = {
        attempt: attemptNum,
        source: patchRes.fixedSource,
        reasoning: patchRes.retryReasoning,
        failures: gGate.failures.map((f) => {
          const testDef = keptTests.find((t) => t.id === f.id);
          return {
            testId: f.id,
            name: testDef?.name || f.id,
            role: testDef?.role || 'repro',
            message: f.message,
            expected: f.expected,
            actual: f.actual
          };
        })
      };

      if (attemptNum === 3) {
        emit({
          type: 'OUTCOME',
          outcome: 'UNSOLVED',
          message: "Couldn't prove a fix within 3 attempts. Best attempt and failing tests shown."
        });
        return;
      }
    }
  }

  emit({
    type: 'OUTCOME',
    outcome: 'UNSOLVED',
    message: 'Retry budget exhausted.'
  });
}
