import { TestCase, TestResult, SuiteRun } from './types.ts';
import { preflight } from '../runner/runner.ts';
import { computeLineDiff } from '../lib/diff.ts';

export interface RedGateResult {
  ok: boolean;
  keptTests: TestCase[];
  discarded: Array<{ id: string; reason: string }>;
  feedbackForModel?: string[];
}

export interface GreenGateResult {
  ok: boolean;
  failures: TestResult[];
  holdoutWarnings: string[];
}

export interface PatchSanityResult {
  ok: boolean;
  reason?: string;
}

/**
 * Valid failure kinds for RED gate per Spec §8.4:
 * - assertion: ALWAYS valid
 * - runtime: valid if failureMode is crash or wrong-output
 * - timeout: valid only if failureMode is hang
 * - reference / syntax: NEVER valid red
 */
function isValidRedFailure(
  result: TestResult,
  failureMode: 'wrong-output' | 'crash' | 'hang'
): boolean {
  if (result.status === 'pass') return false;
  const kind = result.kind;

  if (kind === 'assertion') return true;
  if (kind === 'runtime' && (failureMode === 'crash' || failureMode === 'wrong-output')) {
    return true;
  }
  if (kind === 'timeout' && failureMode === 'hang') {
    return true;
  }
  return false;
}

/**
 * V1 & V2: RED Gate per Spec §5 & Appendix B
 *
 * Rules:
 *   - ok iff >= 1 repro test fails on original with a valid failure kind
 *   - keep: valid-red repros + passing guards + all holdouts (holdouts are not gated pre-patch)
 *   - discard: repros that passed; guards that failed; tests with syntax/reference errors
 *   - feedbackForModel: actionable messages explaining why discarded tests failed
 */
export function redGate(
  tests: TestCase[],
  run: SuiteRun,
  failureMode: 'wrong-output' | 'crash' | 'hang' = 'wrong-output'
): RedGateResult {
  const resultMap = new Map<string, TestResult>(run.results.map((r) => [r.id, r]));
  const keptTests: TestCase[] = [];
  const discarded: Array<{ id: string; reason: string }> = [];
  const feedback: string[] = [];

  let hasValidRed = false;

  for (const test of tests) {
    const res = resultMap.get(test.id);

    // If test was not executed or errored with syntax/reference
    if (!res) {
      discarded.push({ id: test.id, reason: 'Test did not run' });
      continue;
    }

    if (res.kind === 'syntax') {
      discarded.push({ id: test.id, reason: 'Test body has a syntax error' });
      feedback.push(`${test.id} has a syntax error: ${res.message || 'SyntaxError'}.`);
      continue;
    }
    if (res.kind === 'reference') {
      discarded.push({ id: test.id, reason: 'Test threw ReferenceError' });
      feedback.push(`${test.id} threw ReferenceError: ${res.message || 'Identifier not defined'}. Use only identifiers defined in the source.`);
      continue;
    }

    if (test.role === 'repro') {
      if (res.status === 'pass') {
        discarded.push({ id: test.id, reason: 'Repro test PASSED on original buggy code' });
        feedback.push(`${test.id} PASSED on the original code, so it does not reproduce the bug. Make it fail on current code for the reported behavior.`);
      } else if (isValidRedFailure(res, failureMode)) {
        hasValidRed = true;
        keptTests.push(test);
      } else {
        discarded.push({ id: test.id, reason: `Repro test failed with invalid kind: ${res.kind}` });
        feedback.push(`${test.id} failed with ${res.kind} (${res.message}), which does not match expected failure mode '${failureMode}'.`);
      }
    } else if (test.role === 'guard') {
      if (res.status === 'pass') {
        keptTests.push(test);
      } else {
        discarded.push({ id: test.id, reason: 'Guard test FAILED on original code' });
        feedback.push(`${test.id} FAILED on the original code (${res.message || 'Assertion failed'}). Guards must pass on current code.`);
      }
    } else if (test.role === 'holdout') {
      // Holdouts are kept unconditionally for the advisory check after patching
      keptTests.push(test);
    }
  }

  return {
    ok: hasValidRed,
    keptTests,
    discarded,
    feedbackForModel: feedback.length > 0 ? feedback : undefined
  };
}

/**
 * V4 & Holdout advisory: GREEN Gate per Spec §5 & Appendix B
 *
 * Rules:
 *   - ok iff EVERY kept repro and guard test passed
 *   - Holdout failures do not block (advisory only) -> generate holdoutWarnings
 */
export function greenGate(
  frozenTests: TestCase[],
  run: SuiteRun
): GreenGateResult {
  const resultMap = new Map<string, TestResult>(run.results.map((r) => [r.id, r]));
  const failures: TestResult[] = [];
  const holdoutWarnings: string[] = [];

  for (const test of frozenTests) {
    const res = resultMap.get(test.id);

    if (test.role === 'repro' || test.role === 'guard') {
      if (!res || res.status !== 'pass') {
        failures.push(
          res || {
            id: test.id,
            status: 'error',
            durationMs: 0,
            message: 'Test did not run or complete'
          }
        );
      }
    } else if (test.role === 'holdout') {
      if (!res || res.status !== 'pass') {
        holdoutWarnings.push(
          `Holdout test ${test.id} ("${test.name}") failed on patched code: ${res?.message || 'Did not pass'}`
        );
      }
    }
  }

  return {
    ok: failures.length === 0,
    failures,
    holdoutWarnings
  };
}

/**
 * V5: Patch Sanity Check per Spec §5 & Appendix B
 *
 * Invariants:
 *   (a) Compiles (valid JS syntax)
 *   (b) Differs from original source
 *   (c) Preserves every original top-level function/class name
 *   (d) Does not exceed +-60 changed lines
 */
export function patchSanity(
  originalSource: string,
  fixedSource: string
): PatchSanityResult {
  if (!fixedSource || !fixedSource.trim()) {
    return { ok: false, reason: 'Fixed source is empty.' };
  }

  // (a) Compiles
  const preOriginal = preflight(originalSource);
  const preFixed = preflight(fixedSource);

  if (!preFixed.ok) {
    return {
      ok: false,
      reason: `Patch syntax error or invalid code: ${preFixed.message}`
    };
  }

  // (b) Differs from original
  if (originalSource.trim() === fixedSource.trim()) {
    return {
      ok: false,
      reason: 'Patch is identical to the original source code.'
    };
  }

  // (c) Preserves top-level function/class names
  const origNames = new Set(preOriginal.topLevelNames || []);
  const fixedNames = new Set(preFixed.topLevelNames || []);

  for (const name of origNames) {
    if (!fixedNames.has(name)) {
      return {
        ok: false,
        reason: `Patch removed top-level declaration "${name}". All existing top-level functions must be preserved.`
      };
    }
  }

  // (d) Changed lines count <= 60
  const diff = computeLineDiff(originalSource, fixedSource);
  const totalChanged = diff.additions + diff.deletions;
  if (totalChanged > 60) {
    return {
      ok: false,
      reason: `Patch exceeds maximum allowed changed lines (+/- 60 lines, got ${totalChanged} changes).`
    };
  }

  return { ok: true };
}
