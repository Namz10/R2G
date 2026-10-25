# RedToGreen — Prompt Journey & Build Log

> Continuous log of all prompts, outputs, surprises, and refinements. Kept per spec §17.2.
> Rule: **Every future prompt is logged here before work begins.**

---

## M0 — Setup: Repository initialization and Baseline Plan

**Prompt:**
*Initial setup and project alignment.*

**What came back:**
Repository checked out, spec reviewed, dependencies planned.

**What broke / surprised me:**
Submission cutoff on 25 October requires rapid milestone execution.

**Refined prompt / fix:**
Proceeding directly to M1 UI shell scaffold with modular architecture.

**Lesson:**
Keep client-side execution self-contained and lock the verification contract early.

---

## M1 — Scaffold App & UI Shell with Mock Events & BYOK

**Prompt:**
```
Read RedToGreen-SPEC.md fully and treat it as the source of truth. Scaffold the app in this repo: Vite + React + TypeScript + Tailwind, dark theme, folder structure per §12.2. Build the UI shell per §10 (input panel, verdict bar, timeline, test matrix, diff, 3 samples) using mock events only. Add BYOK: a settings box where users paste their own Gemini API key, stored only in browser sessionStorage, never logged, never in code, env files, or URLs. Don't build the agent yet.
Also create BUILD_PLAN.md: convert spec §15 into a checkbox list per milestone (M0–M7) with exit tests and the cut-line, marking M1 in progress. Create prompt-journey.md using the §17.2 template and log this entire prompt verbatim under M1, leaving outcome fields blank for me to fill. Append a rule to spec §17.2: every future prompt is logged there before work begins.
```

**What came back:**


**What broke / surprised me:**


**Refined prompt / fix:**


**Lesson:**


---

## M2 — Execution Engine (Runner, Worker Harness, Classifier, Preflight & Dev Test Page)

**Prompt:**
```
Implement M2 per spec §8 and Appendix A, replacing the runner stubs. Build harness.ts (one Web Worker per test from a Blob URL, assert API, safe formatter, egress neutralization), classify.ts (assertion, runtime, reference, syntax, timeout), and runner.ts with preflight and run(source, tests) enforcing a 1.5s main-thread timeout via worker.terminate(). Add a dev-only test page proving Sample 2 is red on buggy code, green on a hand-fixed version, and that while(true){} times out. Log this prompt in prompt-journey.md first. Don't touch the agent.
```

**What came back:**


**What broke / surprised me:**


**Refined prompt / fix:**


**Lesson:**


---
