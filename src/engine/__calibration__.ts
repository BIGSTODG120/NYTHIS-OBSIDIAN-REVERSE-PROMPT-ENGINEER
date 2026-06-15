// Calibration suite — locks engine behavior against real-world outputs
// Run via: pnpm test:calibration

import { analyze } from './analyzer';
import { buildPrompt } from './promptBuilder';

interface Case {
  name: string;
  input: string;
  expect: {
    minConfidence?: number;
    maxConfidence?: number;
    minSignals?: number;
    mustDetect?: string[];
    mustNotDetect?: string[];
    gated?: boolean;
    templateMustContain?: string[];
    systemPromptMustNotContain?: string[];
  };
}

const cases: Case[] = [
  {
    name: 'GPT-4 — friendly numbered list (rich)',
    input: `Sure! Here are 5 tips:

1. Drink water.
2. Sleep eight hours.
3. Walk thirty minutes a day.
4. Read for twenty minutes.
5. Write down three things you're grateful for.

Let me know if you want more tips!`,
    expect: {
      minConfidence: 0.6,
      minSignals: 3,
      mustDetect: ['structure.numberedList'],
      gated: false,
      templateMustContain: ['numbered list'],
    },
  },
  {
    name: 'Claude — refusal',
    input: `I can't help with that request. I'm not able to provide instructions for synthesizing controlled substances, as this goes against my guidelines. I would be happy to discuss safer chemistry topics or help with other questions you have.`,
    expect: {
      minConfidence: 0.55,
      mustDetect: ['tone.refusal'],
      gated: false,
    },
  },
  {
    name: 'JSON-only API response',
    input: `{"intent": "book_flight", "from": "ATL", "to": "JFK", "date": "2026-08-15", "passengers": 2}`,
    expect: {
      minConfidence: 0.5,
      mustDetect: ['structure.json', 'constraints.outputOnly'],
      gated: false,
    },
  },
  {
    name: 'Marketing landing page',
    input: `Unlock the next-level growth your business deserves. Transform your operations with cutting-edge AI. Discover how industry leaders are revolutionizing workflows. Introducing the game-changing platform that finally delivers results.`,
    expect: {
      minConfidence: 0.55,
      mustDetect: ['tone.marketing'],
      gated: false,
    },
  },
  {
    name: 'Academic abstract',
    input: `# Abstract

This paper proposes a novel framework for distributed inference at scale. We hypothesize that latency-throughput trade-offs can be mitigated through adaptive batching strategies. Building on prior work by Chen et al. (2023) and Patel et al. (2024), we present empirical results across three benchmarks. The literature suggests significant gaps in current approaches that this study addresses.

## Methodology

We conducted experiments with 12 model architectures across 4 hardware configurations. Pursuant to standard practice [1], all measurements were averaged over 100 trials.`,
    expect: {
      minConfidence: 0.55,
      mustDetect: ['tone.academic'],
      mustNotDetect: ['tone.casual', 'tone.marketing'],
      gated: false,
    },
  },
  {
    name: 'Code assistant response',
    input: `Here's the implementation:

\`\`\`python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)
\`\`\`

This recursive function works but is exponentially slow. For production, use memoization or iteration.`,
    expect: {
      minConfidence: 0.55,
      mustDetect: ['structure.codeBlock', 'persona.codeAssistant'],
      gated: false,
    },
  },
  {
    name: 'GATED — tiny input',
    input: `Hi there.`,
    expect: { gated: true },
  },
  {
    name: 'GATED — empty preamble only',
    input: `Sure!`,
    expect: { gated: true },
  },
  {
    name: 'TL;DR + bullets — exec summary',
    input: `TL;DR: Q3 was strong. Revenue up 22%, margins improved 150bps.

Key drivers:
- Enterprise tier adoption
- International expansion
- Cost discipline

Guidance for Q4 raised. We expect 18-20% growth, with operating leverage continuing.`,
    expect: {
      minConfidence: 0.55,
      mustDetect: ['schema.executiveSummary', 'structure.bulletList'],
      gated: false,
    },
  },
  {
    name: 'Roleplay character (medieval)',
    input: `*adjusts spectacles and peers at the ancient tome* Hark, m'lord! Thee shall find what thou seekest in the eastern wing. *gestures dramatically* Thou must speak with the old librarian, who hath guarded these halls for forty years.`,
    expect: {
      minConfidence: 0.5,
      mustDetect: ['persona.character'],
      gated: false,
    },
  },
  {
    name: 'Markdown headers + prose (long)',
    input: `# Introduction

The architecture follows a layered pattern with strict separation of concerns. Each layer exposes a stable interface.

## Data Layer

The data layer handles persistence. It uses PostgreSQL with read replicas for query distribution.

## Business Logic

Business logic sits between the data layer and the API. It enforces invariants and orchestrates workflows.

## API Layer

The API layer exposes REST endpoints. Authentication uses bearer tokens. Rate limiting is per-user, per-endpoint.`,
    expect: {
      minConfidence: 0.55,
      mustDetect: ['structure.headers'],
      gated: false,
    },
  },
  {
    name: 'Q&A format',
    input: `Q: What is the capital of France?
A: Paris.

Q: What is its population?
A: About 2.1 million in the city proper, 11 million in the metro area.

Q: When was it founded?
A: The site has been settled since about 250 BC.`,
    expect: {
      minConfidence: 0.5,
      mustDetect: ['structure.dialogue'],
      gated: false,
    },
  },
  {
    name: 'Comparison table',
    input: `REST vs GraphQL comparison:

| Feature | REST | GraphQL |
|---------|------|---------|
| Caching | Easy (HTTP) | Complex |
| Schema | Flexible | Strict |
| Versioning | URL-based | Evolutionary |
| Learning curve | Low | Medium |`,
    expect: {
      minConfidence: 0.6,
      mustDetect: ['schema.comparisonTable', 'structure.table'],
      gated: false,
    },
  },
  {
    name: 'Pros / Cons schema',
    input: `Pros:
- Faster iteration cycles
- Lower infrastructure costs
- Easier to hire for
- Smaller bundle sizes

Cons:
- Smaller ecosystem than alternatives
- Fewer enterprise integrations
- Less mature tooling
- Steeper initial learning curve`,
    expect: {
      minConfidence: 0.6,
      mustDetect: ['schema.prosCons', 'structure.bulletList'],
      gated: false,
    },
  },
  {
    name: 'Topic extraction — does NOT mistake preamble for topic',
    input: `Sure! Here it goes.

1. Read a passage from the Daily Stoic 365 every morning.
2. Reflect on it during your commute.
3. Apply one principle to a real decision that day.`,
    expect: {
      minConfidence: 0.55,
      mustDetect: ['structure.numberedList'],
      gated: false,
      systemPromptMustNotContain: ['Here it goes', 'Sure!'],
    },
  },
];

let failures = 0;
let passed = 0;

function fail(testName: string, msg: string) {
  console.error(`FAIL [${testName}]: ${msg}`);
  failures++;
}
function pass(testName: string) {
  console.log(`PASS [${testName}]`);
  passed++;
}

for (const c of cases) {
  const signals = analyze(c.input);
  const prompt = buildPrompt(c.input, signals);
  const ids = new Set(signals.map((s) => s.id));
  let caseFailed = false;

  if (c.expect.gated !== undefined && prompt.gate.gated !== c.expect.gated) {
    fail(c.name, `expected gated=${c.expect.gated}, got ${prompt.gate.gated}`);
    caseFailed = true;
  }
  if (c.expect.minConfidence !== undefined && prompt.confidence < c.expect.minConfidence) {
    fail(c.name, `confidence ${prompt.confidence.toFixed(2)} < min ${c.expect.minConfidence}`);
    caseFailed = true;
  }
  if (c.expect.maxConfidence !== undefined && prompt.confidence > c.expect.maxConfidence) {
    fail(c.name, `confidence ${prompt.confidence.toFixed(2)} > max ${c.expect.maxConfidence}`);
    caseFailed = true;
  }
  if (c.expect.minSignals !== undefined && signals.length < c.expect.minSignals) {
    fail(c.name, `signals ${signals.length} < min ${c.expect.minSignals}`);
    caseFailed = true;
  }
  if (c.expect.mustDetect) {
    for (const id of c.expect.mustDetect) {
      if (!ids.has(id)) {
        fail(c.name, `expected rule "${id}" to fire`);
        caseFailed = true;
      }
    }
  }
  if (c.expect.mustNotDetect) {
    for (const id of c.expect.mustNotDetect) {
      if (ids.has(id)) {
        fail(c.name, `expected rule "${id}" to NOT fire`);
        caseFailed = true;
      }
    }
  }
  if (c.expect.templateMustContain) {
    const t = prompt.reusableTemplate.toLowerCase();
    for (const phrase of c.expect.templateMustContain) {
      if (!t.includes(phrase.toLowerCase())) {
        fail(c.name, `template missing required phrase: "${phrase}"`);
        caseFailed = true;
      }
    }
  }
  if (c.expect.systemPromptMustNotContain) {
    for (const phrase of c.expect.systemPromptMustNotContain) {
      if (prompt.systemPrompt.includes(phrase) || prompt.userPrompt.includes(phrase)) {
        fail(c.name, `prompt unexpectedly contains: "${phrase}"`);
        caseFailed = true;
      }
    }
  }

  if (!caseFailed) pass(c.name);
}

console.log(`\nCalibration: ${passed} passed / ${failures} failed of ${cases.length} cases`);
process.exit(failures === 0 ? 0 : 1);
