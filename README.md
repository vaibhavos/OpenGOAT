<div align="center">

# OPENGOAT 🐐

### The GOAT app for doers.

[![Stars](https://img.shields.io/github/stars/vaibhavos/OpenGOAT?style=for-the-badge&color=EF9F27&labelColor=0a0a0a)](https://github.com/vaibhavos/OpenGOAT/stargazers)
[![npm](https://img.shields.io/npm/v/opengoat?style=for-the-badge&color=EF9F27&labelColor=0a0a0a)](https://npmjs.com/package/opengoat)
[![License: MIT](https://img.shields.io/badge/License-MIT-EF9F27?style=for-the-badge&labelColor=0a0a0a)](LICENSE)
[![Last Commit](https://img.shields.io/github/last-commit/vaibhavos/OpenGOAT?style=for-the-badge&color=1D9E75&labelColor=0a0a0a)](https://github.com/vaibhavos/OpenGOAT/commits)

**Gap = Goal − Current.**

[Install](#install) · [How it works](#how-it-works) · [Commands](#commands) · [Roadmap](#roadmap) · [Why I built this](#why-i-built-this)

<!-- ADD demo.gif HERE — record npx opengoat init through to first simulation output -->

</div>

---

## The problem with every productivity app

They all do the same thing: record what you did.

None of them can tell you if you're actually going to make it.

Notion is a blank canvas — you spend hours building the system instead of using it. Task managers give you infinite lists with no intelligence. Goal trackers show a progress bar with no path forward.

**OpenGOAT is different.**

You dump everything — your goal, your resources, your ideas, your constraints. GoatBrain runs a Monte Carlo simulation across every possible path and tells you the mathematically fastest route to close the gap, using what you *already have*, right now.

No templates. No setup. No blank pages.

---

## Install

```bash
npx opengoat init
```

Works on macOS, Linux, and Windows (WSL).
Runs fully offline with Ollama. No account. No cloud. Your data stays on your machine.

---

## How it works

```
You enter your goal + deadline + resources
GoatBrain asks: do you have ideas?
  → Yes: dump them all, AI categorizes and simulates
  → No: AI searches playbooks + community library
Monte Carlo simulation runs across every path combination
Top 3 paths ranked by one metric: speed to close your gap
Each path includes the first action you can take in 2 hours
You pick one. You log your number daily.
GoatBrain watches. When gap moves → silence.
When gap stalls → one question. One unblock.
```

---

## The brain dump — what makes this different

Before GoatBrain suggests anything, it asks one question:

> **"Do you have ideas?"**

If you do — and most people do — you dump everything:

```
opengoat init

  Goal: $10,000 in 50 days
  Resources: 5h/day · $200 · coding skills · 2k Twitter · 1 agency contact

  Do you have ideas? (y/n): y

  Dump them. All of them. Don't filter.
  > I could do freelance React work. I know someone at an agency.
    Been thinking about a Chrome extension. I'm good at writing
    threads. Could flip some domains. Maybe a small info product.

  GoatBrain running 10,000 simulations...
```

GoatBrain reads everything. Categorizes every idea by speed, probability, and effort — specific to YOUR resources, not generic difficulty. Then runs the simulation.

```
  SIMULATION COMPLETE

  Path #1 — Freelance React + Agency contact combined
  Probability of $10k in 50 days: 71%
  Why: your agency contact eliminates cold outreach entirely.
  First action (next 2 hours): Message your contact with this script →

  Path #2 — Thread writing + info product
  Probability: 44%

  Path #3 — Chrome extension
  Probability: 28%
  Gap: no existing audience in that niche yet
```

Numbers. Not vibes. Probability built from your specific situation.

---

## Daily execution — 3 seconds

```bash
opengoat log 3200
```

```
  GAP           : $6,800
  7-DAY VELOCITY: +$320/day
  PROJECTED DONE: April 18
  OPERATOR RANK : GHOST
  STATUS        : ON TRACK ↗
```

Log a number. Get velocity, projected finish date, and rank.
GoatBrain is silent when you're moving. It only speaks when you stall.

---

## Commands

| Command | What it does |
|---|---|
| `opengoat init` | Brain dump → resource map → Monte Carlo → top 3 paths |
| `opengoat log <n>` | Update your gap in 3 seconds |
| `opengoat gap` | Full velocity analysis + pace projection |
| `opengoat paths` | View all ranked paths, switch active path |
| `opengoat resources` | Update your resource map |
| `opengoat score` | Weekly operator score built from velocity |
| `opengoat share` | Generate a PNG score card (built for X) |
| `opengoat dashboard` | Live full-screen terminal cockpit |
| `opengoat serve` | Web dashboard at localhost:3000 |
| `opengoat analyze` | Velocity trends + cross-goal correlation |
| `opengoat commit` | Post your gap publicly to X or Discord |

---

## GoatBrain architecture

```
┌──────────────────────────────────────────────┐
│  INTERFACE LAYER                             │
│  CLI · TUI Cockpit · Web Dashboard (SSE)     │
├──────────────────────────────────────────────┤
│  GOATBRAIN (Intelligence)                    │
│  Brain Dump Parser · Monte Carlo Engine      │
│  Resource Mapper · Path Ranker               │
│  Gap Watcher · Constraint Identifier         │
├──────────────────────────────────────────────┤
│  STATISTICAL ENGINE                          │
│  Gap Tracker · 7-Day Velocity · Projection   │
│  Time-Weighted Traversal · Drift Detection   │
├──────────────────────────────────────────────┤
│  DATA LAYER                                  │
│  SQLite · Machine-Fingerprint Encryption     │
│  Ideas · Logs · Paths · Scores · Blockers    │
└──────────────────────────────────────────────┘
```

- **Brain Dump Parser** — reads your raw ideas before generating anything
- **Monte Carlo Engine** — 10,000 simulations across your idea combinations. Returns probability scores, not generic advice
- **Resource Mapper** — converts your constraints into a 5D profile (Time · Capital · Skills · Network · Assets)
- **Gap Watcher** — silent when moving, asks one question when stalled, runs recovery mode after 5 days of no movement
- **Constraint Identifier** — finds what is blocking you (time / skill / clarity / external) and returns one specific unlock

---

## Bring your own AI

OpenGOAT runs on your keys or your local models. Nothing leaves your machine.

| Provider | Setup | Cost |
|---|---|---|
| Ollama (local) | `ollama serve` — no key needed | Free |
| Groq | console.groq.com | Free tier |
| Anthropic | console.anthropic.com | ~$0.02/week |
| OpenAI | platform.openai.com | ~$0.03/week |

Set during `opengoat init`. Switch anytime with `opengoat config provider`.

---

## Plugin system

OpenGOAT is plugin-first. The core does the math. Everything else is a plugin.

```typescript
IPathLibraryPlugin  // add goal paths for any niche — JSON, no code needed
IProviderPlugin     // connect any AI model
IRendererPlugin     // Obsidian, Notion, Raycast, iOS widgets
IStorageAdapter     // Supabase, Turso, PocketBase — swap SQLite out
IHookPlugin         // Discord alerts, webhooks, tweets — 20 lines of code
```

```bash
opengoat plugin add opengoat-obsidian   # goals sync to your Obsidian vault
opengoat plugin add opengoat-discord    # gap alerts in your Discord server
opengoat plugin search <keyword>        # browse community plugins
```

The local API at `localhost:3000/api/state/stream` is live whenever `opengoat serve` runs — hook it into Raycast, StreamDeck, iOS Shortcuts, or anything else.

---

## Roadmap

- [ ] **v0.2** — Monte Carlo engine fully open for community inspection + improvement
- [ ] **v0.3** — `opengoat-obsidian` native plugin (goals, logs, blockers sync to vault)
- [ ] **v0.4** — Mobile companion — log from your phone in 2 taps via local API
- [ ] **v0.5** — `opengoat-openclaw` — gap alerts delivered to WhatsApp and Telegram
- [ ] **v1.0** — Public Operator Leaderboard (opt-in) — compete on velocity, not vanity

---

## Contributing

The easiest contribution: **add a path library** for your niche. It is JSON. Takes 20 minutes. No code required.

**Most wanted right now:**

- [`opengoat-obsidian`](https://github.com/vaibhavos/OpenGOAT/issues/1) — native Obsidian vault sync
- [`opengoat-discord`](https://github.com/vaibhavos/OpenGOAT/issues/2) — gap alerts hook plugin
- [Marathon path library](https://github.com/vaibhavos/OpenGOAT/issues/3) — fitness playbooks
- [Gemini provider](https://github.com/vaibhavos/OpenGOAT/issues/4) — AI provider plugin

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup. Every plugin lives in its own repo with its own discoverability on GitHub.

---

## Why I built this

I am Vaibhav — CS + Math, 21, building from Bhopal, India.

I am publicly running a $50k challenge (March to August 2026). Every tool I tried had the same problem: they recorded what I did but could not tell me if I was actually going to make it.

I did not need more tasks. I needed one number: **given my current velocity, am I going to hit my goal on time?**

OpenGOAT is what I run the challenge on. Every number I log goes through it. Every weekly recap is a GoatBrain calibration. The math is unforgiving in the best way.

Honest note: I built the entire AI layer without a paid API key — testing on free tiers and local Ollama. The math engine works standalone. That was always the point.

---

## Connect

**Ghost Protocol** — Quant systems, builder tools, and the $50k challenge numbers. Free.
→ [ghost-protocol.beehiiv.com](https://ghost-protocol.beehiiv.com)

**X:** [@VaibhavOS](https://x.com/VaibhavOS) — live updates from the challenge

**Live board:** [vaibhavos.github.io/vaibhav-live](https://vaibhavos.github.io/vaibhav-live)

---

If OpenGOAT helps you close a gap — ⭐ the repo. Every star helps more operators find it.

---

<div align="center">

*Built by [@VaibhavOS](https://github.com/VaibhavOS) · $50k challenge · Ghost Protocol · Bhopal, India*

</div>
