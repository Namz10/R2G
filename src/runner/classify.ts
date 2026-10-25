import { Kind } from '../agent/types.ts';

export interface Classification {
  status: 'pass' | 'fail' | 'error';
  kind?: Kind;
}

/**
 * Classifies an error or test execution outcome per Spec §8.4.
 *
 * | Kind        | Cause                                               | Counts as valid red? |
 * |-------------|-----------------------------------------------------|----------------------|
 * | `assertion` | Test assertion failed                               | Yes                  |
 * | `runtime`   | Code threw (TypeError, RangeError, etc.)            | Yes (if crash/wrong) |
 * | `timeout`   | Exceeded 1.5s                                       | Only if hang         |
 * | `reference` | ReferenceError (calls undeclared identifier)        | No                   |
 * | `syntax`    | Test body / source doesn't parse                    | No                   |
 */
export function classifyError(error: any): Classification {
  if (!error) {
    return { status: 'pass' };
  }

  const name = error?.name || error?.errorName || '';

  if (name === 'AssertionError') {
    return { status: 'fail', kind: 'assertion' };
  }
  if (name === 'SyntaxError' || error?.kind === 'syntax') {
    return { status: 'error', kind: 'syntax' };
  }
  if (name === 'ReferenceError' || error?.kind === 'reference') {
    return { status: 'error', kind: 'reference' };
  }
  if (name === 'TimeoutError' || error?.kind === 'timeout') {
    return { status: 'error', kind: 'timeout' };
  }

  // Runtime errors like TypeError, RangeError, URIError, or generic Error
  return { status: 'error', kind: 'runtime' };
}
