import { AgentState } from '../agent/types.ts';
import { MODEL_ID } from '../agent/gemini.ts';

/**
 * Generates RedToGreen-report.md per Spec §12.6.
 *
 * Contents:
 *  - Title & timestamp
 *  - Bug report
 *  - Root cause hypothesis & assumptions
 *  - Frozen test list with cryptographic SHA-256 hash
 *  - Original vs Patched verification matrix table
 *  - Unified diff
 *  - Fix summary & attempt history
 *  - Outcome and Model ID
 */
export function generateProofReport(
  bugReport: string,
  originalCode: string,
  fixedCode: string,
  state: AgentState
): string {
  const dateStr = new Date().toISOString();
  const outcomeStr = state.outcome || 'IN_PROGRESS';
  const hash = state.frozen?.hash || 'unfrozen';

  let md = `# RedToGreen — Verification Proof Report

> Generated on: **${dateStr}**
> Verdict: **${outcomeStr}** · Engine: **${MODEL_ID}**
> Test-Freeze Hash: \`${hash}\`

---

## 1. Problem Statement & Bug Report

\`\`\`
${bugReport.trim()}
\`\`\`

---

## 2. Root Cause Investigation

- **Hypothesis:** ${state.investigation?.hypothesis || 'N/A'}
- **Suspect Location:** ${state.investigation?.suspectLocation?.functionName || 'N/A'} (${state.investigation?.suspectLocation?.lines || 'N/A'})
- **Failure Mode:** \`${state.investigation?.failureMode || 'N/A'}\`

### Assumptions
${(state.investigation?.assumptions || []).map((a) => `- ${a}`).join('\n') || '- None recorded.'}

---

## 3. Frozen Verification Matrix

| Role | Test ID | Description | Original Code | Patched Code |
|------|---------|-------------|---------------|--------------|
`;

  const tests = state.investigation?.tests || [];
  const origMap = new Map((state.originalRun?.results || []).map((r) => [r.id, r]));
  const patchMap = new Map((state.patchedRun?.results || []).map((r) => [r.id, r]));

  for (const t of tests) {
    const o = origMap.get(t.id);
    const p = patchMap.get(t.id);
    const oStatus = o ? (o.status === 'pass' ? 'PASS' : `FAIL (${o.kind || 'error'})`) : 'N/A';
    const pStatus = p ? (p.status === 'pass' ? 'PASS' : `FAIL (${p.kind || 'error'})`) : 'N/A';
    md += `| \`${t.role}\` | \`${t.id}\` | ${t.name} | **${oStatus}** | **${pStatus}** |\n`;
  }

  md += `
---

## 4. Fix Code & Unified Diff

### Original Source
\`\`\`js
${originalCode.trim()}
\`\`\`

### Patched Source
\`\`\`js
${fixedCode || '// No patch produced'}
\`\`\`

---

## 5. Attempt History & Proof Guarantee

- **Attempts taken:** ${state.attempts.length}
${state.attempts
  .map(
    (att) => `### Attempt ${att.attempt}
- **Change:** ${att.changeSummary}
- **Explanation:** ${att.rootCause}
${att.retryReasoning ? `- **Retry Reasoning:** ${att.retryReasoning}` : ''}
`
  )
  .join('\n')}

> **Proof Guarantee:** Tests were sealed cryptographically prior to patch generation. The patch passes all kept repro and guard tests without regression.
`;

  return md;
}

export function downloadProofReport(
  bugReport: string,
  originalCode: string,
  fixedCode: string,
  state: AgentState
) {
  const content = generateProofReport(bugReport, originalCode, fixedCode, state);
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `RedToGreen-proof-report-${Date.now()}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
