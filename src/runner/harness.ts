/**
 * Web Worker Harness source code per Spec §8.1-8.3 and Appendix A.
 *
 * Runs inside an isolated Web Worker instance created dynamically via a Blob URL.
 * Injects:
 *   - assert API (equal, notEqual, deepEqual, ok, throws)
 *   - safe formatter (circular-safe, 300 char truncate, handles BigInt/undefined/NaN/-0)
 *   - seeded Math.random and frozen Date.now() for determinism
 *   - egress neutralization (fetch, XMLHttpRequest, WebSocket, importScripts, etc.)
 *   - fresh AsyncFunction evaluation combining source and test body
 */

export const WORKER_HARNESS_CODE = `
self.onmessage = async ({ data: { runId, testId, source, body } }) => {
  const t0 = performance.now();

  class AssertionError extends Error {
    constructor(m, e, a) {
      super(m);
      this.name = 'AssertionError';
      this.expected = e;
      this.actual = a;
    }
  }

  // Safe formatter per §8.2: circular-safe, truncates at 300 chars, handles BigInt/undefined/NaN/-0
  const fmt = (v) => {
    try {
      if (typeof v === 'bigint') return v + 'n';
      if (Object.is(v, -0)) return '-0';
      if (Number.isNaN(v)) return 'NaN';
      if (v === undefined) return 'undefined';

      const seen = new WeakSet();
      const str = JSON.stringify(v, (k, val) => {
        if (typeof val === 'object' && val !== null) {
          if (seen.has(val)) return '[Circular]';
          seen.add(val);
        }
        if (val === undefined) return '__undefined__';
        if (typeof val === 'bigint') return val.toString() + 'n';
        if (Number.isNaN(val)) return 'NaN';
        if (Object.is(val, -0)) return '-0';
        return val;
      });

      return (str?.slice(0, 300) ?? String(v));
    } catch {
      return String(v).slice(0, 300);
    }
  };

  const assert = {
    equal: (actual, expected, msg) => {
      if (!Object.is(actual, expected)) {
        throw new AssertionError(
          msg || \`Expected \${fmt(expected)}, got \${fmt(actual)}\`,
          fmt(expected),
          fmt(actual)
        );
      }
    },
    notEqual: (actual, expected, msg) => {
      if (Object.is(actual, expected)) {
        throw new AssertionError(
          msg || \`Expected values to differ, both were \${fmt(actual)}\`,
          undefined,
          fmt(actual)
        );
      }
    },
    deepEqual: (actual, expected, msg) => {
      const aFmt = fmt(actual);
      const eFmt = fmt(expected);
      if (aFmt !== eFmt) {
        throw new AssertionError(
          msg || \`Expected \${eFmt}, got \${aFmt}\`,
          eFmt,
          aFmt
        );
      }
    },
    ok: (value, msg) => {
      if (!value) {
        throw new AssertionError(
          msg || \`Expected truthy value, got \${fmt(value)}\`,
          'truthy',
          fmt(value)
        );
      }
    },
    throws: async (fn, msg) => {
      let threw = false;
      try {
        await fn();
      } catch {
        threw = true;
      }
      if (!threw) {
        throw new AssertionError(msg || 'Expected function to throw an error');
      }
    }
  };

  // Neutralize egress & escape hatches (best-effort guard per §8.1)
  const forbiddenGlobals = [
    'fetch',
    'XMLHttpRequest',
    'WebSocket',
    'importScripts',
    'EventSource',
    'Worker'
  ];
  for (const k of forbiddenGlobals) {
    try {
      Object.defineProperty(self, k, {
        value: undefined,
        writable: false,
        configurable: false
      });
    } catch {}
  }

  // Determinism per §8.1: freeze Date.now and stub seeded Math.random
  try {
    const fixedTime = 1700000000000;
    Date.now = () => fixedTime;
    let seed = 123456789;
    Math.random = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
  } catch {}

  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

  try {
    // Each test evaluates: user source + test body inside a fresh AsyncFunction scope
    const fn = new AsyncFunction('assert', source + '\\n;\\n' + body);
    await fn(assert);
    self.postMessage({
      runId,
      testId,
      status: 'pass',
      durationMs: performance.now() - t0
    });
  } catch (e) {
    const durationMs = performance.now() - t0;
    const isAssertion = e instanceof AssertionError || e?.name === 'AssertionError';
    const isSyntax = e?.name === 'SyntaxError';
    const isReference = e?.name === 'ReferenceError';

    const kind = isAssertion
      ? 'assertion'
      : isSyntax
      ? 'syntax'
      : isReference
      ? 'reference'
      : 'runtime';

    const status = isAssertion ? 'fail' : 'error';

    self.postMessage({
      runId,
      testId,
      status,
      kind,
      message: String(e?.message ?? e),
      expected: e?.expected,
      actual: e?.actual,
      errorName: e?.name,
      durationMs
    });
  }
};
`;

/**
 * Creates a Worker from the in-memory harness code.
 */
export function createHarnessWorker(): Worker {
  const blob = new Blob([WORKER_HARNESS_CODE], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);
  // URL can be safely revoked once worker is instantiated
  URL.revokeObjectURL(url);
  return worker;
}
