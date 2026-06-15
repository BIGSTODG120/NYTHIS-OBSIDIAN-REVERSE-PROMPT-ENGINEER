# NYTHIS Obsidian — Reverse Prompt Engineer

> Paste any output. Recover the prompt that most likely produced it.
> **Free. Open source. No API keys required. Runs 100% in your browser.**

[![License: MIT](https://img.shields.io/badge/license-MIT-7C3AED.svg)](LICENSE)
[![Deploy: GitHub Pages](https://img.shields.io/badge/deploy-GitHub%20Pages-A855F7.svg)](#deploy-to-github-pages)
[![No API keys](https://img.shields.io/badge/API%20keys-not%20required-7C3AED.svg)](#how-it-works)

---

## What this is

A reverse prompt engineer. You give it an output — a piece of text, code, JSON, marketing copy, a captioned image — and it gives you back:

1. The **system prompt** that most likely produced it
2. The **user prompt** that most likely produced it
3. A **reusable template** with `{{PLACEHOLDERS}}` you can drop into any LLM
4. The **signals** it detected, with confidence scores, so you can audit the inference

Two modes:

| Mode | What it does | Needs key? |
|---|---|---|
| **Heuristic** (default) | 60 pattern-matching rules across tone, structure, constraints, schema, persona, and format. Runs offline in your browser. | No |
| **BYOK** (optional) | Calls OpenAI, Anthropic, Ollama, or any OpenAI-compatible endpoint with your key. Key stored in `localStorage` only. | Yes (your own) |

Image support: drop an image in, and a small vision model (`Xenova/vit-gpt2-image-captioning`) downloads on first use (~250MB, browser-cached) and captions it locally. The caption becomes the input.

---

## How it works

```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   Paste output   │ →  │  60 heuristic    │ →  │  Inferred prompt │
│  (or image)      │    │  rules + builder │    │  + template      │
└──────────────────┘    └──────────────────┘    └──────────────────┘
                                ↑
                         All runs in browser.
                         Zero network calls in heuristic mode.
```

No backend. No tracking. No telemetry. The entire app is static files.

---

## Quickstart (local)

Requirements: Node 20+, pnpm 9+ (or npm).

```bash
pnpm install
pnpm dev
```

Open the URL printed in your terminal (usually `http://localhost:5173`).

### Other scripts

```bash
pnpm typecheck      # TypeScript check
pnpm test:engine    # Engine smoke test (60 rules + sample analysis)
pnpm build          # Production build → dist/
pnpm preview        # Serve the built dist locally
```

---

## Deploy to GitHub Pages

This repo ships a working GitHub Actions workflow at `.github/workflows/deploy.yml`. To deploy:

1. **Push this repo to GitHub** under any name (default in `package.json`: `nythis-obsidian-reverse-prompt`).
2. **Enable GitHub Pages**: repo Settings → Pages → Source: **GitHub Actions**.
3. **Push to `main`**. The workflow runs, typechecks, runs engine tests, builds, and deploys.
4. Your site is live at `https://<your-username>.github.io/<repo-name>/`.

The workflow auto-injects the correct base path using `${{ github.event.repository.name }}`, so you can fork or rename the repo without editing config.

### Deploy without GitHub Actions

```bash
pnpm build
# Upload the contents of ./dist to any static host:
# Netlify, Cloudflare Pages, S3 + CloudFront, Render Static Site, etc.
```

---

## BYOK setup (optional)

Click the **BYOK** button. Choose a provider:

| Provider | Endpoint default | Model default |
|---|---|---|
| OpenAI | `https://api.openai.com` | `gpt-4o-mini` |
| Anthropic | `https://api.anthropic.com` | `claude-haiku-4-5-20251001` |
| Ollama (local) | `http://localhost:11434` | `llama3.1:8b` |
| Custom (OpenAI-compatible) | _your endpoint_ | _your model_ |

Your key is written to `localStorage` and read only by the browser tab. It is never sent to NYTHIS, never logged, never persisted server-side. Anybody can verify this by reading [`src/engine/byok.ts`](src/engine/byok.ts).

### Ollama users (CORS)

Browser-origin calls to `localhost:11434` are blocked by default. Start Ollama with:

```bash
OLLAMA_ORIGINS="*" ollama serve
```

Or set the variable in your Ollama config.

---

## The 60 rules

Six categories, ten rules each. All under `src/engine/heuristics/`:

- **Tone** — formal, casual, academic, marketing, technical, instructional, persuasive, narrative, refusal, enthusiastic
- **Structure** — numbered list, bullet list, headers, table, code block, JSON, XML, dialogue, paragraphs, frontmatter
- **Constraints** — exact count, short length, tweet length, no preamble, no postamble, non-English, single sentence, all-caps, audience, output-only
- **Schema** — key:value, comparison, ranked, step-by-step, problem-solution, before-after, classification, executive summary, pros/cons, confidence field
- **Persona** — expert, teacher, assistant, character, doctor, lawyer, financial, copywriter, code assistant, peer
- **Format** — bold, italic, inline code, emoji-heavy, emoji-free, citations, links, math, blockquote, whitespace breathing

Each rule returns a confidence score (0–1) and the evidence that triggered it.

---

## Roadmap

- **v1.0** — Heuristic mode (60 rules), BYOK mode, image captioning, JSON + Markdown export, history. **← you are here**
- **v1.1** — In-browser LLM mode (transformers.js + small chat model, e.g. Qwen2.5-1.5B) for higher-quality inference with zero keys
- **v1.2** — Few-shot example library, prompt diffing, side-by-side comparison
- **v1.3** — Browser extension wrapper

---

## Privacy

- No backend. No analytics. No telemetry.
- Heuristic mode: zero network requests.
- BYOK mode: requests go directly from your browser to the provider you configured. Your key never leaves your machine.
- Image captioning: model downloads from Hugging Face CDN on first use, then cached by the browser. Subsequent uses are fully offline.
- History is stored in `localStorage` and capped at 50 entries.

---

## Contributing

This is a free, open-source tool. PRs welcome. Suggested directions:

- New heuristic rules (keep the 60-rule structure clean — open an issue first)
- Additional BYOK providers
- Translations
- Accessibility improvements

---

## License

[MIT](LICENSE) — do anything you want, just keep the copyright notice.

---

## Built by

**[BIGSTODG](https://github.com/BIGSTODG)** — Founder of [NYTHIS](https://github.com/BIGSTODG).

> *Build Local. Validate Local. Deploy When Ready.*
