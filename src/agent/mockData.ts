import { AgentState, StepState, TestCase } from './types.ts';

export const INITIAL_STEPS: StepState[] = [
  { id: 'PREFLIGHT', label: 'Read report & code', status: 'pending' },
  { id: 'INVESTIGATE', label: 'Form hypothesis', status: 'pending' },
  { id: 'FREEZE', label: 'Write & freeze tests', status: 'pending' },
  { id: 'RUN_ORIGINAL', label: 'Run on original → RED', status: 'pending' },
  { id: 'PATCH', label: 'Write patch (attempt 1/3)', status: 'pending' },
  { id: 'RUN_PATCHED', label: 'Run on patched → GREEN', status: 'pending' },
  { id: 'HOLDOUT', label: 'Generalization check', status: 'pending' },
];

export const INITIAL_STATE: AgentState = {
  phase: 'IDLE',
  steps: INITIAL_STEPS,
  attempts: [],
  warnings: [],
  trace: [],
  activeTab: 'tests',
};

// Realistic mock run data for Sample 2: mergeIntervals
export const SAMPLE_2_MOCK_TESTS: TestCase[] = [
  {
    id: 'repro_1',
    role: 'repro',
    name: 'Unsorted intervals are merged without data loss',
    code: `const out = mergeIntervals([[8,10],[1,3],[2,6]]);
assert.deepEqual(out, [[1,6],[8,10]], 'Should sort intervals before merging');`
  },
  {
    id: 'repro_2',
    role: 'repro',
    name: 'Touching intervals [1,3] and [3,5] merge into [1,5]',
    code: `const out = mergeIntervals([[1,3],[3,5]]);
assert.deepEqual(out, [[1,5]], 'Touching intervals should merge');`
  },
  {
    id: 'guard_1',
    role: 'guard',
    name: 'Already sorted disjoint intervals stay separated',
    code: `const out = mergeIntervals([[1,2],[4,5],[7,8]]);
assert.deepEqual(out, [[1,2],[4,5],[7,8]]);`
  },
  {
    id: 'guard_2',
    role: 'guard',
    name: 'Single interval returns unmodified',
    code: `const out = mergeIntervals([[2,4]]);
assert.deepEqual(out, [[2,4]]);`
  },
  {
    id: 'guard_3',
    role: 'guard',
    name: 'Empty array returns empty array',
    code: `const out = mergeIntervals([]);
assert.deepEqual(out, []);`
  },
  {
    id: 'holdout_1',
    role: 'holdout',
    name: 'Intervals enclosed completely within another',
    code: `const out = mergeIntervals([[1,10],[2,5],[3,7]]);
assert.deepEqual(out, [[1,10]], 'Enclosed intervals should collapse into the outer interval');`
  }
];

export const SAMPLE_2_PATCH = `function mergeIntervals(intervals) {
  if (!intervals || intervals.length <= 1) return intervals || [];
  // Sort intervals by start time to prevent silent data loss
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const result = [];
  for (const current of sorted) {
    const last = result[result.length - 1];
    // Intervals touch or overlap when current[0] <= last[1]
    if (last && current[0] <= last[1]) {
      last[1] = Math.max(last[1], current[1]);
    } else {
      result.push([...current]);
    }
  }
  return result;
}`;
