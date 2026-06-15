# Changelog — NYTHIS Obsidian Reverse Prompt

## v1.4.0 — Lock-In Hardening (2026-06-15)

**Theme:** No new features. 15 hardening upgrades. No silent failures.

### Critical hardening
- Global React error boundary — no more blank-screen crashes
- Toast notification system replacing every silent failure
- BYOK requests: 30-second timeout, one auto-retry on transient errors, structured `BYOKError` type, response schema validation
- Storage schema versioning (v4) with graceful migration of v1.0–v1.3 entries
- Quota-exceeded handling: auto-prunes oldest history when localStorage fills
- Input length protection (100KB hard cap), per-rule 50ms budget tracking
- Confirmation modal before destructive actions
- Undo banner (6-second window) after history clear

### Reliability
- Three pre-loaded demo examples on first-time use
- Cancel button during image captioning
- Keyboard shortcuts: Cmd/Ctrl+Enter to analyze, Esc to close modals
- Mobile-first layout pass (44px touch targets, responsive grid)
- Focus rings via `focus-visible:` for keyboard accessibility

### Observability
- Local-only error log (last 20 entries) — privacy preserved
- Version stamp injected from package.json into UI footer
- Build timestamp accessible via footer hover

### Trust & repeatability
- Fuzz test suite — 14 pathological inputs + 50 random Unicode strings
- Determinism test — verifies byte-identical output across runs
- CI workflow now runs typecheck + engine + calibration + fuzz + determinism before deploy

### Migration
- Old history entries from v1.0/v1.2/v1.3 deserialize cleanly with sensible defaults
- Old settings entries upgrade automatically
- Malformed localStorage detected and reset rather than crashing the app

---

## v1.3.0 — Real Reverse Engineering (2026-06-15)

- Prompt Hypothesis Set — three competing interpretations instead of one fake-canonical answer
- Cross-Signal Reasoning — detects reinforcements, conflicts, and model hints
- Calibrated Confidence Bands — honest English labels
- Domain Inference — 5 domains via lexicon scoring
- BYOK Priming — sends heuristic findings as priors to BYOK model
- Refinement Loop — re-run analysis with forced domain/platform/persona
- Prompt Validation — closes the loop with similarity scoring

---

## v1.2.0 — Honesty Discipline (2026-06-14)

- Min-Signal Gate — refuses to fabricate prompts below 3 signals or 50% confidence
- Topic Extractor — skips preambles
- Evidence Panel — every line traces to a signal or is marked defaulted
- Honest Defaults — `[defaulted]` markers with Hide/Show toggle
- Calibration Suite — 15 real-world cases in CI

---

## v1.0.0 — Initial Release (2026-06-14)

- 60 heuristic rules across 6 categories
- BYOK adapter (OpenAI / Anthropic / Ollama / custom)
- Client-side image captioning via transformers.js
- localStorage history (capped 50)
- JSON + Markdown export
- GitHub Pages deploy workflow
- MIT licensed
