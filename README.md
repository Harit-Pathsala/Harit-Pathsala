# Harit Pathsala · हरित पाठशाला — Green School Carbon Platform

A climate-education web app for **Nepali school students (Grade 6–10)**, built for
the **Nepal Climate Hackathon 2025**. Standard **React 18 + Vite + Three.js**
project — `npm install`, `npm run dev`, done.

Three connected experiences:

1. **Carbon Calculator** — a **live "build your day" journey**: 8 scenes where
 every choice moves a real-time **Eco-Meter** and shows each option's kg/day, so
 students *see* what helps. Ends in a full result — Eco Score, "what it cost the
 world" messaging, breakdown donut, comparisons, tree-offset and tailored tips.
 Guided by **Bana the red panda**.
2. **Explorer** — a 2.5-D isometric **Three.js** journey through 5 Nepali
 landscapes. Walk into decision rings; good choices visibly heal the world.
 60% correct unlocks the next level.
3. **Ask Bana** — an **agentic RAG chatbot**. Bana answers free questions
 grounded in a Nepal climate knowledge base; when you ask for help she shows her
 plan of action, asks **adaptive** multiple-choice questions (the third question
 changes with what you pick), reads your latest calculator result, and writes a
 personalised Nepal plan you can then refine ("30-day", "no-cost", "add a school
 action"). Runs entirely on your machine via Ollama.

---

## ▶Run it

```bash
npm install
npm run dev # opens http://localhost:8000
```

Build a static bundle for deployment / offline use:

```bash
npm run build # outputs to dist/
npm run preview # serves dist/ at http://localhost:8000
```

Run the engine unit tests (pure math, no browser needed):

```bash
npm test # 27 checks, all passing
```

> Requires Node.js 18+ and npm. Everything (React, Three.js) installs into
> `node_modules` — after `npm install`, the app itself needs no internet to run.

---

## Bilingual (English / Nepali) + conversation memory

Tap **EN / ने** in the top bar to switch the whole app between English and Nepali
at any time (your choice is remembered). The calculator, result screen, Explorer
chrome and the Ask-Bana chat are all translated.

**The AI answers in your language.** Ask Bana's knowledge base ships in *both*
languages (`src/knowledge.js`). When Nepali is selected, Bana retrieves the
Nepali notes and replies in Nepali; in English she uses the English notes — this
"same-language retrieval" works better for Nepali than translating on the fly.

**Bana now remembers the conversation.** The chat uses Ollama's `/api/chat` with
a rolling message history, and builds each search query from the recent turns, so
follow-ups like *"and what about cooking?"* stay on topic and link to what was
said earlier instead of starting fresh each time.

### Nepali knowledge-base PDF
`python scripts/build_knowledge.py` writes `src/knowledge.js` and an English PDF
automatically. The **Nepali PDF** needs a Devanagari font; the script auto-detects
common ones (Noto Sans Devanagari, Mangal, Nirmala UI, Kohinoor…). If none is
found it tells you, and you can install or point to one:

```bash
# Debian/Ubuntu:
sudo apt install fonts-noto-devanagari
python scripts/build_knowledge.py
# or supply a font file directly:
python scripts/build_knowledge.py --font /path/to/NotoSansDevanagari.ttf
```
This produces `knowledge/Bana_Knowledge_Base_EN.pdf` and `…_NE.pdf`.

## Bana the red panda (optional local AI via Ollama)

Bana works out of the box with built-in, scientifically-grounded encouragement.
For **personalised, on-device** replies, give it a local LLM via
[Ollama](https://ollama.com) — nothing leaves the machine.

```bash
bash setup-bana.sh # macOS / Linux (pulls llama3.2, builds the 'bana' model)
setup-bana.bat # Windows
```

Then start Ollama so the browser is allowed to call it, and run the app:

```bash
OLLAMA_ORIGINS='*' ollama serve # macOS / Linux
set OLLAMA_ORIGINS=* && ollama serve # Windows (in its own window)
npm run dev
```

**How Bana resolves a reply:** custom `bana` model → base `llama3.2` → built-in
lines. So it always works — with a great local model, a basic one, or none. The
endpoint defaults to `http://localhost:11434` and can be overridden by setting
`window.HARIT_OLLAMA` before load. The `OLLAMA_ORIGINS` step matters because
browsers block cross-origin calls by default.

---

## Ask Bana — agentic RAG chatbot (local Ollama)

The **Ask Bana** tab is a Retrieval-Augmented-Generation chatbot that runs
**entirely on the student's computer**. Nothing is sent to the cloud.

### What you need (one time)

```bash
ollama pull llama3.2            # the chat model (or use the 'bana' persona model)
ollama pull nomic-embed-text    # the embedding model used for notebook search
```

`setup-bana.sh` / `setup-bana.bat` now pull both for you. Then run Ollama with
browser access allowed and start the app:

```bash
# macOS / Linux
OLLAMA_ORIGINS='*' ollama serve
# Windows: set the variable permanently, then fully quit & reopen Ollama from the tray
setx OLLAMA_ORIGINS "*"
```
```bash
npm run dev
```

> If you skip `nomic-embed-text`, the chatbot still works — it automatically
> falls back to keyword search over the notebook. Pulling it gives smarter
> semantic recall. If Ollama isn't running, the tab shows a clear setup hint.

### How the pipeline works

1. **Knowledge base** — `knowledge/Bana_Knowledge_Base.pdf` is the human-readable
 source: ~39 short, self-contained, Nepal-specific sections (transport, clean
 electricity, cooking fuels, food, waste, forests, action plans, plus Q&A
 entries). RAG best practice: one topic per chunk, with a title + keyword tags.
2. **Index** — on first open, each chunk is embedded with `nomic-embed-text`
 (cached in memory for the session). No vector DB or server needed.
3. **Retrieve** — your question is embedded and scored against every chunk with
 **cosine similarity + a keyword boost** (hybrid search); the top 4–5 chunks are
 selected. Falls back to pure keyword scoring if no embedding model is present.
4. **Generate** — the retrieved chunks are assembled into a grounded prompt and
 streamed through the Bana persona model, so answers stay factual and on-topic.
 Retrieved sources are shown under each reply ("From Bana's notebook…").

### The agentic part

Bana decides how to respond. For a factual question ("Is electricity clean in
Nepal?") she answers directly from the notebook. For a goal like **"How can I
reduce my carbon footprint?"** she switches into a short **clarifying flow** —
asking *where you live*, *what to tackle first*, and *how you get to school* as
tappable multiple-choice questions — then retrieves the relevant notebook
sections and writes a **personalised weekly plan** tailored to your answers.

### Editing the knowledge base

The PDF and the in-app chunks are generated from **one source** so they never
drift apart. Edit the content in `scripts/build_knowledge.py`, then regenerate:

```bash
python scripts/build_knowledge.py   # rewrites src/knowledge.js + EN/NE knowledge PDFs
```

`src/rag.js` holds the whole pipeline (embeddings, hybrid retrieval, streaming,
and the agent flow); `src/components/AskBana.jsx` is the chat UI.

---

## The science is verifiable

All emission factors and formulas live in **one file**, `src/logic.js`, with
sources (NEA 2024 grid 0.12 kg/kWh, IPCC cooking fuels, GHG Protocol, DEFRA
transport). Full derivations are in `docs/`:

- `docs/calculator-math.md` — every factor + source + each formula + worked example.
- `docs/explorer-game-logic.md` — level design, rendering, scoring.

`npm test` pins the spec anchor (`20 kWh × 0.12 = 15.8 kg`) and every category
formula. A sample student nets **3.23 kg/day → Eco Score 68**.

---

## Structure

```
index.html Vite entry
vite.config.js dev server on :8000
package.json
Modelfile defines the local "bana" Ollama model
setup-bana.sh / .bat optional: build the local model
src/
 main.jsx React entry (mounts <App/>)
 App.jsx tabs + error boundary
 logic.js single source of truth: data + math (no UI)
 styles.css design system
 test.mjs engine unit tests (node src/test.mjs)
 components/
 Bana.jsx mascot SVG, Ollama call + fallback, typewriter
 Navbar.jsx
 Calculator.jsx 8-step questionnaire
 ResultDashboard.jsx score ring, donut, comparison, trees, tips
 ExplorerGame.jsx Three.js isometric levels
 ForestArena.jsx Three.js hex grid, class-vs-class
docs/ the science + game-logic write-ups
```

## Design

Storybook palette (forest greens, sun orange, sky blue), Baloo 2 + Nunito,
fully responsive with a mobile D-pad for the games, and a red-panda mascot
throughout. An error boundary keeps a single view's failure from blanking the
whole app.

Made with care for Nepal's students. 