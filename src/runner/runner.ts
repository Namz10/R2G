import { TestCase, TestResult, SuiteRun } from '../agent/types.ts';
import { LIMITS } from '../lib/limits.ts';
import { createHarnessWorker } from './harness.ts';
import { classifyError } from './classify.ts';

export interface PreflightResult {
  ok: boolean;
  message?: string;
  topLevelNames?: string[];
  cleanSource?: string;
}

/**
 * Pre-flight validation per Spec §8.5.
 * Checks:
 *   - Compiles / valid JavaScript syntax
 *   - Disallows import / require / module.exports
 *   - Flags other languages (Python, C/C++, Java) with helpful messages
 *   - Enforces size limits
 *   - Strips leading export / export default
 *   - Extracts top-level function and class names for V5 patch sanity
 */
export function preflight(rawSource: string): PreflightResult {
  if (!rawSource || !rawSource.trim()) {
    return { ok: false, message: 'Source code cannot be empty.' };
  }

  const bytes = new TextEncoder().encode(rawSource).length;
  if (bytes > LIMITS.MAX_CODE_BYTES) {
    return {
      ok: false,
      message: `Source code exceeds ${LIMITS.MAX_CODE_BYTES} bytes (${bytes} bytes).`
    };
  }

  const lineCount = rawSource.split('\n').length;
  if (lineCount > LIMITS.MAX_CODE_LINES) {
    return {
      ok: false,
      message: `Source code exceeds ${LIMITS.MAX_CODE_LINES} lines (${lineCount} lines).`
    };
  }

  // Language heuristics per §8.5 & §10.5
  if (/^\s*(def |class [A-Za-z0-9_]+(\(.*\))?:|import [a-z0-9_]+ as |from [a-z0-9_]+ import )/m.test(rawSource)) {
    return { ok: false, message: 'This looks like Python. RedToGreen supports JavaScript for now.' };
  }
  if (/#include\s*<|public\s+static\s+void\s+main|package\s+[a-z.]+/m.test(rawSource)) {
    return { ok: false, message: 'Unsupported language detected. RedToGreen supports JavaScript for now.' };
  }

  // Disallow module syntax / imports per §8.1
  if (/^\s*(import\s|require\s*\(|module\.exports\b)/m.test(rawSource)) {
    return {
      ok: false,
      message: 'Single-file JavaScript without imports or require() only.'
    };
  }

  // Preprocessing: strip leading "export default " or "export "
  const cleanSource = rawSource
    .replace(/^\s*export\s+default\s+/gm, '')
    .replace(/^\s*export\s+/gm, '');

  // Syntax check via Function constructor
  try {
    new Function(cleanSource);
  } catch (err: any) {
    return {
      ok: false,
      message: `JavaScript syntax error: ${err?.message || String(err)}`
    };
  }

  // Extract top-level function and class names
  const topLevelNames: string[] = [];
  const funcRegex = /^(?:async\s+)?function\s+([A-Za-z0-9_$]+)/gm;
  const classRegex = /^class\s+([A-Za-z0-9_$]+)/gm;
  const constFuncRegex = /^(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z0-9_$]+)\s*=>/gm;

  let m: RegExpExecArray | null;
  while ((m = funcRegex.exec(cleanSource)) !== null) {
    topLevelNames.push(m[1]);
  }
  while ((m = classRegex.exec(cleanSource)) !== null) {
    topLevelNames.push(m[1]);
  }
  while ((m = constFuncRegex.exec(cleanSource)) !== null) {
    topLevelNames.push(m[1]);
  }

  return {
    ok: true,
    cleanSource,
    topLevelNames: Array.from(new Set(topLevelNames))
  };
}

/**
 * Runs a single test inside a fresh isolated Web Worker.
 * Enforces a strict 1.5s timeout on the main thread via setTimeout -> worker.terminate().
 */
export function runSingleTest(
  source: string,
  test: TestCase,
  timeoutMs: number = LIMITS.PER_TEST_TIMEOUT_MS,
  runId: string = Math.random().toString(36).slice(2)
): Promise<TestResult> {
  return new Promise<TestResult>((resolve) => {
    let worker: Worker | null = null;
    let timer: any = null;
    let finished = false;
    const startTime = performance.now();

    const cleanup = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (worker) {
        worker.terminate();
        worker = null;
      }
    };

    try {
      worker = createHarnessWorker();

      // Main thread timeout enforcement per §8.3
      timer = setTimeout(() => {
        if (!finished) {
          finished = true;
          cleanup();
          const durationMs = performance.now() - startTime;
          resolve({
            id: test.id,
            status: 'error',
            kind: 'timeout',
            message: `Test exceeded ${timeoutMs}ms limit and was terminated.`,
            durationMs
          });
        }
      }, timeoutMs);

      worker.onmessage = (e: MessageEvent) => {
        if (!finished) {
          finished = true;
          cleanup();
          const { status, kind, message, expected, actual, durationMs } = e.data;
          resolve({
            id: test.id,
            status,
            kind,
            message,
            expected,
            actual,
            durationMs: durationMs ?? (performance.now() - startTime)
          });
        }
      };

      worker.onerror = (e: ErrorEvent) => {
        if (!finished) {
          finished = true;
          cleanup();
          const durationMs = performance.now() - startTime;
          const classified = classifyError(e);
          resolve({
            id: test.id,
            status: classified.status,
            kind: classified.kind || 'runtime',
            message: e.message || 'Worker execution error',
            durationMs
          });
        }
      };

      // Dispatch message to worker
      worker.postMessage({
        runId,
        testId: test.id,
        source,
        body: test.code
      });
    } catch (err: any) {
      if (!finished) {
        finished = true;
        cleanup();
        const durationMs = performance.now() - startTime;
        const classified = classifyError(err);
        resolve({
          id: test.id,
          status: classified.status,
          kind: classified.kind || 'runtime',
          message: err?.message || String(err),
          durationMs
        });
      }
    }
  });
}

/**
 * Runs a suite of tests sequentially against source code, using one fresh Web Worker per test.
 */
export async function runSuite(
  source: string,
  tests: TestCase[],
  timeoutMs: number = LIMITS.PER_TEST_TIMEOUT_MS
): Promise<SuiteRun> {
  const startTime = performance.now();
  const results: TestResult[] = [];

  // Clean source before execution (strips exports)
  const pre = preflight(source);
  const executableSource = pre.ok && pre.cleanSource ? pre.cleanSource : source;

  for (const test of tests) {
    const result = await runSingleTest(executableSource, test, timeoutMs);
    results.push(result);
  }

  const totalMs = performance.now() - startTime;
  return { results, totalMs };
}
