// Limits per Spec §7.2 & §14
export const LIMITS = {
  MAX_CODE_LINES: 200,
  MAX_CODE_BYTES: 8192,
  MAX_REPORT_BYTES: 2048,
  PER_TEST_TIMEOUT_MS: 1500,
  WHOLE_RUN_TIMEOUT_SEC: 120,
  MAX_INVESTIGATE_RETRIES: 2,
  MAX_PATCH_ATTEMPTS: 3,
};

export function validateInput(report: string, code: string): { ok: boolean; message?: string } {
  if (!report.trim()) {
    return { ok: false, message: 'Bug report cannot be empty.' };
  }
  if (!code.trim()) {
    return { ok: false, message: 'Source code cannot be empty.' };
  }

  const reportBytes = new TextEncoder().encode(report).length;
  if (reportBytes > LIMITS.MAX_REPORT_BYTES) {
    return {
      ok: false,
      message: `Bug report exceeds ${LIMITS.MAX_REPORT_BYTES} bytes (${reportBytes} bytes).`,
    };
  }

  const codeBytes = new TextEncoder().encode(code).length;
  if (codeBytes > LIMITS.MAX_CODE_BYTES) {
    return {
      ok: false,
      message: `Source code exceeds ${LIMITS.MAX_CODE_BYTES} bytes (${codeBytes} bytes).`,
    };
  }

  const lines = code.split('\n').length;
  if (lines > LIMITS.MAX_CODE_LINES) {
    return {
      ok: false,
      message: `Source code exceeds ${LIMITS.MAX_CODE_LINES} lines (${lines} lines).`,
    };
  }

  // Non-JS heuristic check per §8.5 & §10.5
  if (/^\s*(def |class [A-Za-z0-9_]+(\(.*\))?:|import [a-z0-9_]+ as |from [a-z0-9_]+ import )/m.test(code)) {
    return { ok: false, message: 'This looks like Python. RedToGreen supports JavaScript for now.' };
  }
  if (/#include\s*<|public\s+static\s+void\s+main/m.test(code)) {
    return { ok: false, message: 'Unsupported language detected. RedToGreen supports JavaScript for now.' };
  }

  return { ok: true };
}
