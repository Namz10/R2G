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

## M3 — Agent Loop (Part 1: Schemas, Prompts, Gemini Client, Gates; Part 2: Orchestrator, Live End-to-End RED→GREEN)

**Prompt:**
```
Implement M3 part 1 per spec §5 and §9. Build schemas.ts (zod for Investigate and Patch outputs), prompts.ts (system prompts verbatim from §9 plus builders that wrap user content as DATA), gemini.ts (@google/genai, BYOK key from sessionStorage, MODEL_ID constant, JSON schema output, 45s timeout, one retry with backoff), and pure gates.ts per Appendix B. Add unit-style checks for gates using fixture data. No UI wiring yet. Log this prompt in prompt-journey.md first.
Implement M3 part 2 per spec §7.3. Build orchestrator.ts: preflight, Investigate with up to two feedback retries, redGate, freeze with SHA-256 hash and holdouts hidden from the patcher, Patch up to three attempts with failure feedback, greenGate, holdout advisory, outcomes. Emit events into the UI reducer, remove the mock runner, wire Cancel via AbortController. Exit test: Sample 2 runs live RED→GREEN with my key. Log this prompt first.
```

**What came back:**


**What broke / surprised me:**


**Refined prompt / fix:**


**Lesson:**


---

## M4 & M5 — Hardening (§14) and Polish (§10 & M5)

**Prompt:**
```
Harden per spec §14. Add specific UI errors for 429 quota, invalid key, bad JSON, syntax errors, imports, non-JS paste, and size limits. UNSOLVED must show the best attempt and still-failing tests. Add a 10s run cooldown; disable Run while active. Create MANUAL_TESTS.md for me: five runs per sample, plus deliberate failures (bad test, bad patch, infinite loop, empty input, wrong key). Log this prompt first.
Polish per spec §10 and M5, one feature at a time without breaking existing behavior: staggered red/green cell-flip animation (respect prefers-reduced-motion), brand dots turning green on success, Ctrl/⌘+Enter to run, Proof Report download (§12.6), syntax highlighting, OG tags. Add a dev-only Record button saving real runs to replays.json, with ReplayBadge and Run live. Add a "Get a free key" AI Studio link in settings. Log this prompt first.
```

**What came back:**


**What broke / surprised me:**


**Refined prompt / fix:**


**Lesson:**


---
