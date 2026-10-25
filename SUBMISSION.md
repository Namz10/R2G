# RedToGreen — Submission Package

> GDG Pune DevFest 2026 · Vibe to Build · Tech / Developer-Tool track · Solo Entrant

---

## 1. Problem Statement (Spec §2.1)

Reproducing a bug is often the slowest part of fixing it, and AI-suggested fixes are usually *unverified*: they look plausible, but nobody has proven they work. **RedToGreen** turns a bug report into a *verified* fix. Given a bug description and a code snippet, an AI agent writes a test that reproduces the bug, **proves it fails (red)**, patches the code, and **proves the test passes (green) without breaking existing behavior**. Every step runs live in the browser, and the user gets a fix with evidence instead of a guess.

---

## 2. LinkedIn Post Draft

```
AI can suggest a fix in seconds. But who proves it works? 🔴➡️🟢

For #VibeToBuild at GDG Pune DevFest 2026, I built RedToGreen, an agentic dev tool:
paste a bug report + code → the agent writes a failing test, proves the bug is real (RED),
patches the code, and proves the fix works without breaking anything else (GREEN).
All executed live in your browser.

Built with Gemini + Google AI Studio.
🔗 Try it: {DEPLOYED_URL}

#VibeToBuild #DFP2026 #GDGPune #DevFestIndia #DevFestPune2026
```

---

## 3. Demo Shooting Script (Spec §16)

> Record at 1080p, browser zoom 110–125%, dark theme, hide bookmarks bar. Speed-ramp waits (label "sped up 3×"). Add captions.

| Time | Visual | Voiceover / Caption |
|---|---|---|
| 0:00–0:07 | Title card: **"AI says 'fixed.' Prove it."** → app loads | "AI fixes bugs. But who proves the fix works?" |
| 0:07–0:17 | Load Sample 2. Show the bug report (data loss `[[8,10]]`) and code. Click **Prove & Fix** | "Here's a real bug: this function silently drops intervals." |
| 0:17–0:35 | Timeline advances: hypothesis appears → tests written → 🔒 frozen → matrix goes **RED** | "The agent writes tests, **locks them**, and proves the bug is real. Red." |
| 0:35–0:55 | Patch appears → diff → matrix flips **GREEN**, guards still green | "Then it fixes the code and **proves** it: green, with nothing else broken." |
| 0:55–1:12 | **Paste a fresh bug live**, run (speed-ramped), reach green. If a retry happens naturally, linger on it | "Not a demo script. Any single-file JS bug works." |
| 1:12–1:20 | Click **Download proof report**. End card with URL | "RedToGreen: a fix with receipts." |

**Do not** fake a retry. If a self-correction happens organically in a take, that's gold. Keep it.

---

## 4. Prompt Journey Pivots (Real, from `prompt-journey.md`)

The following pivots are extracted from the actual build log. Nothing is invented.

### Pivot 1: Mock Events → Live Execution Engine (M1 → M2)

**What happened:** M1 shipped a complete UI shell driven by mock events that simulated the RED→GREEN cycle with hardcoded delays. The mock runner felt convincing visually but ran no real code. M2 replaced it with a real execution engine — one Web Worker per test from a Blob URL, a custom `assert` API, egress neutralization (fetch/WebSocket/importScripts disabled), and a 1.5s main-thread timeout via `worker.terminate()`.

**Why it mattered:** The spec's core promise is "real code execution in the browser, not mocked" (§1). Without the live runner, the app was a slideshow. The Worker isolation + timeout architecture was the foundation every later milestone built on.

### Pivot 2: Stubs → Deterministic Orchestrator State Machine (M2 → M3)

**What happened:** After the runner was proven correct (Sample 2 red on buggy code, green on fixed, infinite loop terminated), M3 wired the full agent loop: Zod schemas for structured LLM output, system prompts from §9, the Gemini client with BYOK key from sessionStorage, pure gate functions (redGate, greenGate, patchSanity), and the orchestrator state machine with feedback retries. The orchestrator enforced the invariant contract: Investigate → redGate → SHA-256 freeze → Patch → greenGate → holdout advisory → outcome.

**Why it mattered:** This was the spec's "hard gate" (§15) — if M3 didn't pass Sample 2 live by the deadline, features would be cut. The deterministic state machine with pure gates meant correctness could be reasoned about without debugging async race conditions.

### Pivot 3: Happy Path → Honest Failure (M4 Hardening)

**What happened:** M4 added specific error handling for every failure mode: 429 quota exhaustion, invalid API key, malformed JSON from the model, syntax errors in generated tests, import statements in user code, non-JS paste, and size limits. Most importantly, `UNSOLVED` was made honest — instead of showing a blank screen, it renders the best patch attempt alongside the tests that still fail.

**Why it mattered:** The spec explicitly calls out honest failure as a differentiator (§2.3): "if it can't prove a fix, it says UNSOLVED instead of bluffing." The 10s run cooldown and button disabling during active runs prevented accidental quota burns.

### Pivot 4: Functional → Polished (M5)

**What happened:** M5 added the visual polish that makes the demo compelling: staggered cell-flip animations (respecting `prefers-reduced-motion`), brand dots turning green on success, Ctrl/⌘+Enter keyboard shortcut, proof report download as `RedToGreen-report.md`, a dev-only replay recorder for caching successful runs, and OpenGraph/Twitter meta tags for social sharing.

**Why it mattered:** The spec's judging criteria includes "polish" and "originality." The red→green cell-flip animation is the single most memorable visual in a 90-second demo — it makes the proof *visible*. The replay cache ensures the demo never fails even under API latency.

---

## 5. Submission Checklist (Spec §17.1)

- [ ] Deployed URL opens in incognito. Samples run. Fresh bug runs
- [ ] Key not visible in network tab / bundle
- [ ] 75–90s video, captions, LinkedIn post with `#VibeToBuild`
- [ ] Post public. Link copied
- [ ] Prompt journey document finished (§17.2)
- [x] Short problem statement (§2.1) — see Section 1 above
- [ ] Submit via the QR/form from the poster. **Save the confirmation**
- [ ] Submit ≥ 30 min before the cutoff

---

## 6. Tech Stack

| Component | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Tailwind CSS 4 |
| Build | Vite 8 |
| AI | Gemini 2.5 Flash via `@google/genai` |
| Execution | Web Workers (Blob URL, per-test isolation) |
| Key Management | BYOK — `sessionStorage` only, never persisted |
| Deploy | Static SPA (Vercel / Netlify) — no server |

---

<p align="center">
  <strong>RedToGreen</strong> — Prove it. Then fix it.<br/>
  🔴➡️🟢
</p>
