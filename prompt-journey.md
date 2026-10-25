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

## M6 — Deploy Preparation & Build Verification

**Prompt:**
```
Prepare deployment. Ensure npm run build passes. Write README.md (what it is, how BYOK works, run instructions). Confirm .gitignore covers env files and no API key appears in source, dist, or git history. Add static deploy config for Vercel or Netlify (client-only, no server). Add a UI privacy note that code is sent to Gemini using the user's own key. Log this prompt first.
```

**What came back:**


**What broke / surprised me:**


**Refined prompt / fix:**


**Lesson:**


---

## M7 — Submission Documentation

**Prompt:**
```
Create SUBMISSION.md: short problem statement from spec §2.1; LinkedIn post draft with #VibeToBuild #DFP2026 #GDGPune #DevFestIndia #DevFestPune2026 and a placeholder for the live URL; the demo shooting script from §16; and a summary of the real pivots from my logged prompt-journey.md entries, inventing nothing. Log this prompt first. (use tokens judiciously, think intelligently- make this PEAK)
```

**What came back:**


**What broke / surprised me:**


**Refined prompt / fix:**


**Lesson:**


---

## M6.1 — Vercel Deployment Troubleshooting (Missing Modules & Strict Typing)

**Prompt:**
```
22:54:02.675 Running build in Washington, D.C., USA (East) – iad1
...
src/App.tsx(13,31): error TS2307: Cannot find module './lib/limits.ts' or its corresponding type declarations.
src/App.tsx(14,27): error TS2307: Cannot find module './lib/apiKey.ts' or its corresponding type declarations.
src/agent/gates.ts(3,33): error TS2307: Cannot find module '../lib/diff.ts' or its corresponding type declarations.
src/agent/gemini.ts(2,27): error TS2307: Cannot find module '../lib/apiKey.ts' or its corresponding type declarations.
src/agent/orchestrator.ts(4,24): error TS2307: Cannot find module '../lib/hash.ts' or its corresponding type declarations.
src/runner/runner.ts(2,24): error TS2307: Cannot find module '../lib/limits.ts' or its corresponding type declarations.
src/ui/DiffView.tsx(3,33): error TS2307: Cannot find module '../lib/diff.ts' or its corresponding type declarations.
src/ui/DiffView.tsx(85,25): error TS7006: Parameter 'line' implicitly has an 'any' type.
src/ui/DiffView.tsx(85,31): error TS7006: Parameter 'idx' implicitly has an 'any' type.
src/ui/InputPanel.tsx(4,24): error TS2307: Cannot find module '../lib/limits.ts' or its corresponding type declarations.
src/ui/SettingsModal.tsx(3,51): error TS2307: Cannot find module '../lib/apiKey.ts' or its corresponding type declarations.
Error: [BUILD_UTILS_SPAWN_1] Command "npm run build" exited with 1

fix all the errors, it needs to get deployed the next time i try
```

**What came back:**
Diagnosed `.gitignore` rule collision (`lib/` matching `src/lib/`) and typed `DiffLine` parameter.

**What broke / surprised me:**
Generic `lib/` in standard `.gitignore` template caught `src/lib/`, preventing git from tracking essential helper files.

**Refined prompt / fix:**
Updated `.gitignore` with `/lib/` and `!src/lib/`, added explicit types to `lines.map((line: DiffLine, idx: number))` in `DiffView.tsx`, and committed all missing files.

**Lesson:**
Always verify `git ls-files` against local source directories before first cloud deployment.

---

## M6.2 — Model Deprecation: Upgrading to Gemini 3.8 Flash

**Prompt:**
```
The AI service had a problem. Retry
Investigation API error: {"error":{"code":404,"message":"This model models/gemini-2.5-flash is no longer available to new users. Please update your code to use models/gemini-3.8-flash for the latest features and improvements. We recommend you to use the Interactions API (https://ai.google.dev/gemini-api/docs/get-started).","status":"NOT_FOUND"}}

fix this, use the recommended model.
also i hope u r logging in my prompts in this chat too in the prompts md file , if not do it, log the deployment error and model error prompts too
fix the model thing first (use tokens judiciously)
```

**What came back:**
Single-constant model update and verified build.

**What broke / surprised me:**
Google AI Studio retired `gemini-2.5-flash` for new API keys with a 404 response requiring `gemini-3.8-flash`.

**Refined prompt / fix:**
Updated `MODEL_ID` in `src/agent/gemini.ts` to `gemini-3.8-flash` per Spec §9.1 architectural design (centralized constant).

**Lesson:**
Centralizing model identifiers in a single configuration constant allows seamless API version migrations in seconds.

---
