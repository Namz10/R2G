// Core Data Types per Spec §12.4

export type Role = 'repro' | 'guard' | 'holdout';
export type Kind = 'assertion' | 'runtime' | 'reference' | 'syntax' | 'timeout';

export interface TestCase {
  id: string;
  role: Role;
  name: string;
  code: string;
}

export interface TestResult {
  id: string;
  status: 'pass' | 'fail' | 'error';
  kind?: Kind;
  message?: string;
  expected?: string;
  actual?: string;
  durationMs: number;
}

export interface SuiteRun {
  results: TestResult[];
  totalMs: number;
}

export interface Investigation {
  hypothesis: string;
  suspectLocation: { functionName: string; lines: string };
  failureMode: 'wrong-output' | 'crash' | 'hang';
  assumptions: string[];
  tests: TestCase[];
}

export interface PatchAttempt {
  attempt: number;
  retryReasoning?: string;
  rootCause: string;
  changeSummary: string;
  fixedSource: string;
  run?: SuiteRun;
  rejectedReason?: string;
}

export type Outcome =
  | 'SOLVED'
  | 'SOLVED_WITH_WARNINGS'
  | 'UNSOLVED'
  | 'INVALID_INPUT'
  | 'ERROR';

export type StepId =
  | 'PREFLIGHT'
  | 'INVESTIGATE'
  | 'FREEZE'
  | 'RUN_ORIGINAL'
  | 'PATCH'
  | 'RUN_PATCHED'
  | 'HOLDOUT';

export type StepStatus = 'pending' | 'running' | 'done' | 'failed' | 'retry';

export interface StepState {
  id: StepId;
  label: string;
  status: StepStatus;
  durationSec?: number;
  badge?: string;
  detail?: string;
}

export interface TraceEvent {
  timestamp: number;
  type: string;
  payload: any;
}

export interface AgentState {
  phase:
    | 'IDLE'
    | 'PREFLIGHT'
    | 'INVESTIGATE'
    | 'RUN_ORIGINAL'
    | 'PATCH'
    | 'RUN_PATCHED'
    | 'HOLDOUT'
    | 'REPORT'
    | 'DONE';
  steps: StepState[];
  investigation?: Investigation;
  frozen?: { hash: string; ids: string[] };
  originalRun?: SuiteRun;
  patchedRun?: SuiteRun;
  attempts: PatchAttempt[];
  outcome?: Outcome;
  verdictMessage?: string;
  warnings: string[];
  replay?: { recordedAt: string };
  trace: TraceEvent[];
  activeTab: 'tests' | 'diff' | 'rootCause';
}
