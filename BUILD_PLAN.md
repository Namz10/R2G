# RedToGreen — Build Plan (M0–M7)

> Derived from `RedToGreen-SPEC.md` §15. Single source of truth for milestone tracking and exit criteria.
> **Rule of the build:** One complete, *verifiably working* journey beats five half-working features.

---

## Milestone Tracking

- [x] **M0 Setup (19:00–19:10)**
  - [x] Review `RedToGreen-SPEC.md`
  - [x] Establish BYOK pattern (sessionStorage only, no logging, no env leaks)
  - [x] Create `BUILD_PLAN.md` with M0–M7 checklist and cut-line
  - [x] Create `prompt-journey.md` with §17.2 template
  - [x] Append prompt-logging rule to `RedToGreen-SPEC.md` §17.2
  - **Exit Test:** Hello-world scaffold in place, key-handling approach decided, prompt journey initialized.

- [x] **M1 UI Shell with Mock Data & BYOK (19:10–19:30)**
  - [x] Vite + React 18 + TypeScript + Tailwind CSS scaffold
  - [x] Dark theme styling (`#0B0F14` bg, `#121821` panels, `#1F2937` borders, semantic red `#F43F5E` / green `#22C55E` / amber `#F59E0B`)
  - [x] Inter + JetBrains Mono typography
  - [x] Project directory structure per §12.2 (`/src/agent`, `/src/runner`, `/src/ui`, `/src/samples`, `/src/lib`)
  - [x] Input Panel (bug report textarea, code monospace textarea, char counters, 3 samples picker, "Prove & Fix" and "Cancel" buttons, limits caption)
  - [x] BYOK Settings modal / drawer (API key input, saves only to `sessionStorage`, cleared on demand, masked, never logged)
  - [x] Verdict Bar (state-driven banner with icon + text across IDLE, INVESTIGATING, RED, PATCHING, GREEN, UNSOLVED, etc.)
  - [x] Agent Timeline (7 steps: Read report & code, Form hypothesis, Write & freeze tests, Run on original → RED, Write patch, Run on patched → GREEN, Generalization check with duration and status icons)
  - [x] Evidence Area with tabs:
    - [x] Tests Matrix: role chips (`repro`, `guard`, `holdout`), Original vs Patched columns, test freeze hash badge 🔒
    - [x] Diff View: side-by-side or unified view with `jsdiff`, +/- counts, Copy fixed code
    - [x] Root Cause Panel: hypothesis, suspect location, failure mode, assumptions, change summary
  - [x] 3 Curated Samples (`paginate`, `mergeIntervals`, `parseDuration`) populated and loadable
  - [x] Mock execution runner that simulates the RED → GREEN event timeline
  - **Exit Test:** UI looks visually complete at 1080p, mock run demonstrates complete Red-to-Green cycle with timeline animations, BYOK key can be saved/cleared in sessionStorage.

- [x] **M2 Runner (19:30–19:50)**
  - [x] Fresh Web Worker per test created from Blob URL
  - [x] `harness.ts` with `assert` (`equal`, `deepEqual`, `ok`, `throws`, `notEqual`), safe formatter, egress neutralization
  - [x] Error classifier (`classify.ts`: assertion, runtime, reference, syntax, timeout)
  - [x] Per-test 1.5s timeout on main thread with `worker.terminate()`
  - [x] Preflight validator (`runner.ts`: JS syntax, no imports/require, size check, top-level name extraction)
  - [x] Hand-written tests against Sample 2 to verify red on buggy code and green on fixed code
  - **Exit Test:** Runner shows correct red on buggy code, green on hand-fixed code, timeout terminates infinite loops cleanly.

- [x] **M3 Agent Loop (19:50–20:20)** *(HARD GATE)*
  - [x] `agent/schemas.ts`: Zod schemas for Investigate and Patch structured outputs
  - [x] `agent/prompts.ts`: System prompts and builders per §9
  - [x] `agent/gates.ts`: Pure implementations of `redGate`, `greenGate`, `patchSanity` (§5)
  - [x] `agent/gemini.ts`: `@google/genai` calls with BYOK key, JSON schema enforcement, retry/backoff
  - [x] `agent/orchestrator.ts`: Deterministic state machine wiring Investigate → RED gate → Freeze → Patch → GREEN gate → Holdout check → Report
  - [x] Wire orchestrator events to UI state reducer
  - **Exit Test:** **Sample 2 (`mergeIntervals`) runs end-to-end live: RED → GREEN.**

- [x] **M4 Hardening (20:20–20:40)**
  - [x] Retries on failed red gate (≤2) and failed patch (≤3)
  - [x] AbortController wiring for Cancel button
  - [x] Friendly inline error handling (syntax, 429 quota, limits, wrong key, bad JSON)
  - [x] Honest failure handling (`UNSOLVED` showing best attempt and still-failing tests)
  - [x] 10s run cooldown and button disabled while running
  - [x] `MANUAL_TESTS.md` created: 5 runs per sample + deliberate failures
  - **Exit Test:** ≥ 4/5 success on each sample; failures terminate honestly in UNSOLVED without crashing.

- [x] **M5 Polish + P1 Features (20:40–20:55)**
  - [x] Staggered red/green cell-flip animation (respects `prefers-reduced-motion`)
  - [x] Brand dots turning green on success
  - [x] Replay cache (`replays.json` + `ReplayBadge` with "Run live" + Dev Record button)
  - [x] Download Proof Report (`RedToGreen-report.md`)
  - [x] Keyboard shortcuts (Ctrl/⌘ + Enter to run)
  - [x] "Get a free key in Google AI Studio →" link in settings modal
  - [x] Favicon, page title, and full OpenGraph / Twitter meta tags
  - **Exit Test:** App feels snappy, polished, and ready for recording at 1080p.

- [x] **M6 Deploy & Smoke Test (20:55–21:05)**
  - [x] Production build verification (`npm run build`) — passes clean
  - [x] Static deploy configs created (`vercel.json`, `netlify.toml`)
  - [x] Privacy note added to UI footer
  - [x] Verify no API key leaks in bundle or source — confirmed clean
  - [x] README.md with BYOK docs, run instructions, deploy guides
  - [ ] Deploy to host and smoke test in incognito
  - **Exit Test:** Public URL works end-to-end on live sample runs.

- [ ] **M7 Record & Submit (21:05–21:35)** *(IN PROGRESS)*
  - [x] SUBMISSION.md created (problem statement, LinkedIn draft, demo script, pivots)
  - [ ] Record 75–90s demo video per script §16 (Sample 2 hero run + 1 live fresh bug)
  - [ ] Post on LinkedIn with `#VibeToBuild`
  - [ ] Finalize `prompt-journey.md` outcome fields
  - [ ] Submit official form and screenshot confirmation
  - **Exit Test:** Submission confirmed with public links before deadline.

---

## Cut-Line Protocol (Decide at 19:50)

If M3 is not passing Sample 2 by **20:20**, drop features in this strict order:
1. Replay cache
2. Proof report download (.md)
3. Holdout tests (advisory)
4. Syntax highlighting
5. Diff unified/split toggle
6. Micro-animations

**Never cut:**
- RED gate verification
- GREEN gate verification
- Retry loop
- Public working deployment
