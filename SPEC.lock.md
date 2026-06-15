# SPEC.lock.md — NYTHIS Obsidian Reverse Prompt v1.0

**Status**: LOCKED · 2026-06-14
**Approved by**: BIGSTODG (Phase 1 audit → 5 blockers resolved → Phase 3 build authorized)

This file freezes the scope for v1.0. Any change to the items below requires a new audit cycle.

## Locked scope

| # | Decision | Locked value |
|---|---|---|
| 1 | Input modalities | Text + Image |
| 2 | Heuristic rules | 60 (6 categories × 10) |
| 3 | Inference modes | Mode A (heuristic) + Mode C (BYOK). Mode B (in-browser LLM) → v1.1 |
| 4 | Repo name | `nythis-obsidian-reverse-prompt` |
| 5 | Export formats | JSON + Markdown |
| 6 | License | MIT |
| 7 | Deployment | GitHub Pages via GitHub Actions |
| 8 | Stack | Vite + React 18 + TypeScript + Tailwind 3 |
| 9 | Image captioner | `Xenova/vit-gpt2-image-captioning` via transformers.js v3 |
| 10 | BYOK providers | OpenAI, Anthropic, Ollama, Custom (OpenAI-compatible) |
| 11 | History | localStorage, cap 50 entries |
| 12 | Theme | NYTHIS Obsidian: matte black + violet ignition (#7C3AED / #A855F7) |

## Not in v1.0 (explicitly deferred)

- In-browser LLM mode (transformers.js chat model) → v1.1
- Few-shot example library → v1.2
- Prompt diffing / side-by-side comparison → v1.2
- Browser extension → v1.3
- Server-side anything (forever)
- Accounts / cloud sync (forever)
- Telemetry / analytics (forever)

## Locked acceptance criteria

1. `pnpm test:engine` exits 0 with all assertions passing
2. `pnpm typecheck` passes with `node_modules/` installed
3. `pnpm build` produces a working `dist/`
4. GitHub Actions deploy workflow runs to completion on push to `main`
5. Heuristic mode makes zero network calls (verifiable in DevTools)
6. BYOK mode actually calls the configured endpoint (no mocking)
7. Every button in the UI performs its labeled function (no dead UI)
