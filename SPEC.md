# SPEC — NYTHIS Obsidian Reverse Prompt Engineer (v1.0)

## Mission

Give anyone — for free, with no API keys — a tool that takes an output and infers the prompt that likely produced it. Deployable to GitHub Pages in one push.

## Non-goals (v1.0)

- Server-side inference
- User accounts / cloud history
- Paid tiers / monetization
- In-browser LLM mode (deferred to v1.1)

## Core flows

1. **Heuristic flow**: paste output → 60-rule analyzer → prompt builder → display + signals + export
2. **BYOK flow**: paste output → user's chosen provider via stored key → parsed JSON → display + signals + export
3. **Image flow**: upload image → transformers.js caption → append to input → run heuristic or BYOK

## Stack (locked)

- Vite + React 18 + TypeScript
- Tailwind 3 (NYTHIS Obsidian theme: matte black + violet ignition)
- `@huggingface/transformers` v3 (image captioning only at v1)
- `lucide-react` icons
- Deployment: GitHub Pages via GitHub Actions
- License: MIT

## Heuristic engine (locked)

- **60 rules** across 6 categories of 10 each: tone, structure, constraints, schema, persona, format
- Each rule: `{ id, category, label, run(input, ctx) → AnalysisSignal | null }`
- Aggregate confidence: mean of top-5 signals × 0.7 + coverage × 0.25, capped at 0.95

## BYOK providers (locked)

- OpenAI (and OpenAI-compatible)
- Anthropic
- Ollama (local)
- Custom (OpenAI-compatible endpoint)

Key storage: `localStorage` only. Never transmitted to NYTHIS.

## Export (locked)

- JSON
- Markdown
- Copy-to-clipboard for both

## History (locked)

- `localStorage`, capped at 50 entries
- Drawer UI with select / clear

## Acceptance criteria

- All 60 rules ship and load without error (verified by `pnpm test:engine`)
- `pnpm typecheck` passes
- `pnpm build` produces a working `dist/`
- `pnpm preview` serves a fully functional app
- GitHub Actions workflow builds and deploys to Pages on push to `main`
- Heuristic mode works with zero network calls (verifiable in DevTools Network tab)
- BYOK mode actually calls the configured endpoint (no mocking)
- No dead UI: every button and control performs its labeled function

## Hard restrictions (NYTHIS skill discipline)

- No fake success
- No dead UI
- No fake integrations
- No fake auth
- No fake billing
- No fake deployment claims
- No code before audit ✅ (Phase 1 completed)
- No build before SPEC.lock.md approval ✅ (approved)
- No scoring without evidence
