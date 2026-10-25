import { redGate, greenGate, patchSanity } from './gates.ts';
import { TestCase, SuiteRun } from './types.ts';

/**
 * Unit-style fixture test suite for pure gates verification per M3 Part 1 prompt.
 */
export function runGateUnitChecks(): { passed: boolean; results: string[] } {
  const log: string[] = [];
  let allOk = true;

  const assert = (condition: boolean, desc: string) => {
    if (condition) {
      log.push(`✓ PASS: ${desc}`);
    } else {
      log.push(`✕ FAIL: ${desc}`);
      allOk = false;
    }
  };

  // Test 1: redGate accepts valid assertion failure on repro test
  const tests1: TestCase[] = [
    { id: 'repro_1', role: 'repro', name: 'Repro 1', code: '' },
    { id: 'guard_1', role: 'guard', name: 'Guard 1', code: '' }
  ];
  const run1: SuiteRun = {
    results: [
      { id: 'repro_1', status: 'fail', kind: 'assertion', durationMs: 2 },
      { id: 'guard_1', status: 'pass', durationMs: 1 }
    ],
    totalMs: 3
  };
  const g1 = redGate(tests1, run1, 'wrong-output');
  assert(g1.ok === true && g1.keptTests.length === 2, 'redGate passes when repro fails on assertion and guard passes');

  // Test 2: redGate rejects when repro test passes (V1 violation)
  const run2: SuiteRun = {
    results: [
      { id: 'repro_1', status: 'pass', durationMs: 2 },
      { id: 'guard_1', status: 'pass', durationMs: 1 }
    ],
    totalMs: 3
  };
  const g2 = redGate(tests1, run2, 'wrong-output');
  assert(g2.ok === false && g2.discarded.length === 1, 'redGate rejects when repro test passes on original code');

  // Test 3: redGate discards failing guards (V2 invariant)
  const run3: SuiteRun = {
    results: [
      { id: 'repro_1', status: 'fail', kind: 'assertion', durationMs: 2 },
      { id: 'guard_1', status: 'fail', kind: 'assertion', durationMs: 1 }
    ],
    totalMs: 3
  };
  const g3 = redGate(tests1, run3, 'wrong-output');
  assert(g3.ok === true && g3.keptTests.length === 1 && g3.discarded[0].id === 'guard_1', 'redGate discards failing guard tests');

  // Test 4: greenGate passes when all repro & guard tests pass
  const frozenTests: TestCase[] = [
    { id: 'repro_1', role: 'repro', name: 'Repro 1', code: '' },
    { id: 'guard_1', role: 'guard', name: 'Guard 1', code: '' },
    { id: 'holdout_1', role: 'holdout', name: 'Holdout 1', code: '' }
  ];
  const greenRunPass: SuiteRun = {
    results: [
      { id: 'repro_1', status: 'pass', durationMs: 2 },
      { id: 'guard_1', status: 'pass', durationMs: 1 },
      { id: 'holdout_1', status: 'pass', durationMs: 2 }
    ],
    totalMs: 5
  };
  const gr1 = greenGate(frozenTests, greenRunPass);
  assert(gr1.ok === true && gr1.holdoutWarnings.length === 0, 'greenGate passes when all tests pass');

  // Test 5: greenGate holdout failure is advisory (does NOT block ok)
  const greenRunHoldoutFail: SuiteRun = {
    results: [
      { id: 'repro_1', status: 'pass', durationMs: 2 },
      { id: 'guard_1', status: 'pass', durationMs: 1 },
      { id: 'holdout_1', status: 'fail', kind: 'assertion', durationMs: 2, message: 'Expected 10, got 5' }
    ],
    totalMs: 5
  };
  const gr2 = greenGate(frozenTests, greenRunHoldoutFail);
  assert(gr2.ok === true && gr2.holdoutWarnings.length === 1, 'greenGate holdout failure is advisory (returns ok: true with warnings)');

  // Test 6: patchSanity invariant V5
  const origSource = 'function sum(a, b) { return a - b; }';
  const identicalSource = 'function sum(a, b) { return a - b; }';
  const goodPatch = 'function sum(a, b) { return a + b; }';
  const removedNamePatch = 'function add(a, b) { return a + b; }';

  assert(patchSanity(origSource, identicalSource).ok === false, 'patchSanity rejects identical patch');
  assert(patchSanity(origSource, removedNamePatch).ok === false, 'patchSanity rejects patch that removes top-level function');
  assert(patchSanity(origSource, goodPatch).ok === true, 'patchSanity accepts valid minimal patch');

  return { passed: allOk, results: log };
}
