# RedToGreen — Manual Test Matrix & Edge-Case Validation

> Protocol per Spec §14, §15, and §19.
> Run each trial, observe the UI and verdict bar, and tick the corresponding box.

---

## 1. Five Runs per Curated Sample

### Sample 1: `paginate` (Off-by-one pagination)
- [ ] Trial 1 — Expected: SOLVED (`🔴 RED` → `🟢 GREEN`)
- [ ] Trial 2 — Expected: SOLVED (`🔴 RED` → `🟢 GREEN`)
- [ ] Trial 3 — Expected: SOLVED (`🔴 RED` → `🟢 GREEN`)
- [ ] Trial 4 — Expected: SOLVED (`🔴 RED` → `🟢 GREEN`)
- [ ] Trial 5 — Expected: SOLVED (`🔴 RED` → `🟢 GREEN`)
- **Criteria:** ≥ 4 of 5 succeed. Single-line fix `(page - 1) * perPage`.

### Sample 2: `mergeIntervals` (Hero Demo: Out-of-order & touching intervals)
- [ ] Trial 1 — Expected: SOLVED (`🔴 RED` 2 failing repros → `🟢 GREEN` 5/5 or 6/6 tests)
- [ ] Trial 2 — Expected: SOLVED (`🔴 RED` → `🟢 GREEN`)
- [ ] Trial 3 — Expected: SOLVED (`🔴 RED` → `🟢 GREEN`)
- [ ] Trial 4 — Expected: SOLVED (`🔴 RED` → `🟢 GREEN`)
- [ ] Trial 5 — Expected: SOLVED (`🔴 RED` → `🟢 GREEN`)
- **Criteria:** ≥ 4 of 5 succeed. Guard tests (disjoint, single interval, empty) remain green.

### Sample 3: `parseDuration` (Decimal parsing in regex)
- [ ] Trial 1 — Expected: SOLVED (`🔴 RED` → `🟢 GREEN`)
- [ ] Trial 2 — Expected: SOLVED (`🔴 RED` → `🟢 GREEN`)
- [ ] Trial 3 — Expected: SOLVED (`🔴 RED` → `🟢 GREEN`)
- [ ] Trial 4 — Expected: SOLVED (`🔴 RED` → `🟢 GREEN`)
- [ ] Trial 5 — Expected: SOLVED (`🔴 RED` → `🟢 GREEN`)
- **Criteria:** ≥ 4 of 5 succeed. Recognizes regex decimal bug (`parseFloat`).

---

## 2. Deliberate Failure & Edge-Case Tests

| Test Case | Steps to Execute | Expected UI Behavior | Tested (✓/✕) |
|---|---|---|---|
| **Empty Input** | Clear bug report or code, click "Prove & Fix" | Run button is disabled or shows inline validation toast: *"Bug report cannot be empty"* | [ ] |
| **Non-JS Paste (Python)** | Paste `def solve(): return True` | Amber toast: *"This looks like Python. RedToGreen supports JavaScript for now."* | [ ] |
| **Import / Require** | Paste `import lodash from 'lodash';` | Amber toast: *"Single-file JavaScript without imports or require() only."* | [ ] |
| **Syntax Error in Source** | Paste `function broken( { return 1;` | `INVALID_INPUT` banner: *"JavaScript syntax error: Unexpected token"* | [ ] |
| **Invalid / Wrong Key** | Put `AIzaSyFakeKey123` in settings and click "Prove & Fix" | Red error banner: *"API key invalid or unauthorized. Please check your key in settings."* | [ ] |
| **Infinite Loop (`while(true)`)** | Run code containing an infinite loop | Terminated cleanly by main thread at 1.5s with timeout status; UI remains responsive | [ ] |
| **Over Size Limit** | Paste > 200 lines or > 8KB source | Validation toast: *"Source code exceeds limits"* | [ ] |
| **10s Cooldown** | Click "Prove & Fix" twice in rapid succession | Cooldown timer displays: *"Please wait Ns before next run"* | [ ] |
| **Cancel Mid-Run** | Click "Prove & Fix" then immediately click "Cancel" | In-flight request aborted immediately; Verdict shows *"Execution cancelled by user"* | [ ] |

---

## 3. Honest Failure State Verification (`UNSOLVED`)

- [ ] Pasting a non-buggy function or impossible contradictory requirement ends in `UNSOLVED`.
- [ ] UI displays the best patch attempt in the Diff tab.
- [ ] UI displays the still-failing tests in the Tests Matrix tab.
- [ ] No blank screens, unhandled promise rejections, or console crashes.
