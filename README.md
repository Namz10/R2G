# 🔴➡️🟢 RedToGreen

> **Paste a bug. Watch an agent prove it, fix it, and prove the fix.**

RedToGreen is an agentic developer tool that turns a bug report into a *verified* fix. Given a bug description and a code snippet, an AI agent writes a test that reproduces the bug, **proves it fails (red)**, patches the code, and **proves the test passes (green) without breaking existing behavior**. Every step runs live in the browser—you get a fix with evidence, not a guess.

Built for **GDG Pune DevFest 2026 · Vibe to Build** · Tech / Developer-Tool track.

---

## ✨ What Makes It Different

| Feature | Why It Matters |
|---|---|
| **Frozen tests** | Tests are locked *before* the patch, so the agent can't weaken them to pass |
| **Valid-red gate** | A bug isn't "reproduced" until a test fails *for the right reason* |
| **Guard tests** | The fix must not break behavior that already worked |
| **Holdout tests** | Hidden from the patcher to detect overfit patches |
| **Honest failure** | If it can't prove a fix, it says **UNSOLVED** instead of bluffing |

---

## 🔑 BYOK (Bring Your Own Key)

RedToGreen uses the **Gemini API** (`gemini-3.8-flash`) for its agent loop. Your API key is required to run the tool.

### How It Works

1. Click **BYOK API Key** in the top navigation bar
2. Paste your [Google AI Studio](https://aistudio.google.com/apikey) API key
3. The key is stored **only in your browser's `sessionStorage`**
4. It is automatically cleared when you close the tab

### Security Guarantees

- ✅ Key stored **only** in `sessionStorage` (never `localStorage`, cookies, or disk)
- ✅ **Never** logged to console, analytics, or error reporters
- ✅ **Never** committed to source code, `.env` files, or URLs
- ✅ **No server** — the entire app runs client-side; API calls go directly from your browser to Google's API
- ✅ Source code and production bundle verified to contain zero hardcoded keys

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 18
- A [Google AI Studio API key](https://aistudio.google.com/apikey) (free tier works)

### Run Locally

```bash
# Clone the repo
git clone https://github.com/Namz10/R2G.git
cd R2G

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and paste your API key via the **BYOK API Key** button.

### Build for Production

```bash
npm run build
```

Output goes to `dist/`. Serve with any static file host.

---

## 🌐 Deploy

RedToGreen is a fully client-side SPA — no server, no backend, no environment variables on the host.

### Vercel

1. Connect your GitHub repo to [Vercel](https://vercel.com)
2. The included `vercel.json` handles SPA routing automatically
3. Deploy — done

### Netlify

1. Connect your GitHub repo to [Netlify](https://app.netlify.com)
2. The included `netlify.toml` configures build command and SPA redirects
3. Deploy — done

---

## 🏗️ Architecture

```
src/
├── agent/          # LLM orchestrator, schemas, prompts, gates, Gemini client
├── runner/         # Web Worker test harness, classifier, preflight validator
├── ui/             # React components (InputPanel, TestMatrix, DiffView, etc.)
├── samples/        # 3 curated bug samples + replay manager
├── lib/            # API key helpers, input validation, utilities
├── App.tsx         # Main app wiring orchestrator → UI state reducer
└── index.css       # Tailwind + dark theme design tokens
```

**Key design decisions:**

- **One Web Worker per test** from a Blob URL — full isolation, 1.5s timeout via `worker.terminate()`
- **Pure gate functions** (`redGate`, `greenGate`, `patchSanity`) with no side effects
- **Deterministic orchestrator** state machine: Investigate → RED gate → Freeze → Patch → GREEN gate → Holdout → Report
- **SHA-256 test freeze** — cryptographic proof that tests weren't modified between red and green runs

---

## 🔒 Privacy

Your code is sent to the **Gemini API** using **your own API key**. No code, keys, or data are stored on any server. The entire application runs in your browser. Keys live only in `sessionStorage` and are cleared when the tab closes.

---

## 📄 License

See [LICENSE](./LICENSE).

---

<p align="center">
  <strong>RedToGreen</strong> — Prove it. Then fix it.<br/>
  GDG Pune DevFest 2026 · #VibeToBuild
</p>
