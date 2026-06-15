// v1.4 — Determinism test: same input must produce byte-identical output across runs.

import { analyze } from './analyzer';
import { buildPrompt } from './promptBuilder';

const SAMPLES = [
  `Sure! Here are 5 tips:\n1. one\n2. two\n3. three\n4. four\n5. five`,
  `{"intent": "deploy", "confidence": 0.91}`,
  `As an experienced architect, I've worked with distributed systems for years. The key trade-off is latency vs. throughput.`,
];

let failures = 0;
const ITERATIONS = 5;

for (const sample of SAMPLES) {
  const runs = Array.from({ length: ITERATIONS }, () => {
    const signals = analyze(sample);
    const result = buildPrompt(sample, signals);
    return JSON.stringify({
      signals: signals.map((s) => ({ id: s.id, conf: s.confidence })),
      sys: result.systemPrompt,
      user: result.userPrompt,
      template: result.reusableTemplate,
      conf: result.confidence,
      gated: result.gate.gated,
    });
  });

  const first = runs[0];
  const allMatch = runs.every((r) => r === first);
  if (allMatch) {
    console.log(`PASS  ${ITERATIONS} runs identical: "${sample.slice(0, 40).replace(/\n/g, ' ')}…"`);
  } else {
    console.error(`FAIL  determinism broken on: "${sample.slice(0, 40).replace(/\n/g, ' ')}…"`);
    failures++;
  }
}

console.log(failures === 0 ? '\n✓ DETERMINISM VERIFIED' : `\n✗ ${failures} NON-DETERMINISTIC SAMPLE(S)`);
process.exit(failures === 0 ? 0 : 1);
