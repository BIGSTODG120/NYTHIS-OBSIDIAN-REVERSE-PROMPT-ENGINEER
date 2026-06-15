// Engine smoke test — v1.3 (covers v1.0, v1.2, v1.3 contracts)

import { allRules } from './heuristics';
import { analyze } from './analyzer';
import { buildPrompt } from './promptBuilder';

const SAMPLE_OUTPUTS = [
  `Sure! Here are 5 ways to improve your sleep:

1. Stick to a consistent schedule.
2. Limit caffeine after 2 PM.
3. Keep your room cool and dark.
4. Avoid screens an hour before bed.
5. Wind down with a calming routine.

Let me know if you want more tips!`,
  `{"sentiment": "positive", "confidence": 0.92, "keywords": ["fast", "reliable", "great support"]}`,
  `As an experienced software architect with 15 years in distributed systems, I've worked with teams scaling APIs from 100 to 10M requests/sec. The key trade-off is throughput vs. latency. Best practice: instrument first, optimize second.`,
  `**TL;DR:** The market is shifting. Act now.

**Problem:** Your competitors are using AI. You aren't.
**Solution:** Deploy our platform in under 5 minutes.

Unlock the next-level growth you've been chasing.`,
];

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) { console.error('FAIL:', msg); failures++; } else { console.log('PASS:', msg); }
}

// v1.0 — Rules
assert(allRules.length === 60, `Rule count is 60 (got ${allRules.length})`);
const ids = new Set(allRules.map((r) => r.id));
assert(ids.size === allRules.length, 'All rule IDs are unique');
const counts = allRules.reduce<Record<string, number>>((m, r) => { m[r.category] = (m[r.category] || 0) + 1; return m; }, {});
for (const cat of ['tone', 'structure', 'constraints', 'schema', 'persona', 'format']) {
  assert(counts[cat] === 10, `Category "${cat}" has 10 rules (got ${counts[cat]})`);
}

// v1.0 — Samples produce non-empty outputs
for (let i = 0; i < SAMPLE_OUTPUTS.length; i++) {
  const sample = SAMPLE_OUTPUTS[i];
  const signals = analyze(sample);
  const prompt = buildPrompt(sample, signals);
  assert(signals.length > 0, `Sample ${i + 1} produces at least 1 signal (got ${signals.length})`);
  assert(prompt.systemPrompt.length > 0, `Sample ${i + 1} produces a system prompt`);
  assert(prompt.userPrompt.length > 0, `Sample ${i + 1} produces a user prompt`);
  assert(prompt.reusableTemplate.length > 0, `Sample ${i + 1} produces a reusable template`);
  assert(prompt.confidence > 0 && prompt.confidence <= 0.95, `Sample ${i + 1} confidence in (0, 0.95]`);
  // v1.2
  assert(Array.isArray(prompt.evidence) && prompt.evidence.length > 0, `Sample ${i + 1} has evidence trace`);
  assert(typeof prompt.gate.gated === 'boolean', `Sample ${i + 1} has gate info`);
  assert(typeof prompt.topic === 'string' && prompt.topic.length > 0, `Sample ${i + 1} has a topic`);
  assert(Array.isArray(prompt.defaultedCategories), `Sample ${i + 1} has defaultedCategories array`);
}

// Empty input
assert(analyze('').length === 0, 'Empty input produces zero signals');
assert(analyze('   ').length === 0, 'Whitespace input produces zero signals');

// v1.2 — Gate
const tinyResult = buildPrompt('hi', analyze('hi'));
assert(tinyResult.gate.gated === true, 'Gate fires on tiny input');
assert(tinyResult.systemPrompt.includes('threshold'), 'Gated output explains the threshold');
const richSignals = analyze(SAMPLE_OUTPUTS[0]);
const richResult = buildPrompt(SAMPLE_OUTPUTS[0], richSignals);
assert(richResult.gate.gated === false, 'Gate does NOT fire on rich input');

// v1.2 — hideDefaulted
const hideOn = buildPrompt(SAMPLE_OUTPUTS[1], analyze(SAMPLE_OUTPUTS[1]), { hideDefaulted: true });
assert(!hideOn.systemPrompt.includes('[defaulted'), 'hideDefaulted removes [defaulted] tags');

// === v1.3 ===
const v13Sample = SAMPLE_OUTPUTS[0];
const v13Signals = analyze(v13Sample);
const v13Result = buildPrompt(v13Sample, v13Signals);
assert(Array.isArray(v13Result.hypotheses) && v13Result.hypotheses!.length === 3, 'v1.3: 3 hypotheses produced');
assert(v13Result.hypotheses!.every((h) => h.systemPrompt.length > 0 && h.userPrompt.length > 0), 'v1.3: all hypotheses have non-empty prompts');
assert(!!v13Result.domain, 'v1.3: domain object present');
assert(Array.isArray(v13Result.relations), 'v1.3: relations array present');
assert(!!v13Result.confidenceBand, 'v1.3: confidence band present');

// v1.3 — Refinement override
const refined = buildPrompt(v13Sample, v13Signals, {
  refinement: { forcedDomain: 'technical', forcedPersona: 'a senior infrastructure engineer' },
});
assert(refined.systemPrompt.toLowerCase().includes('senior infrastructure engineer'), 'v1.3: refinement forces persona');
assert(refined.domain?.domain === 'technical', 'v1.3: refinement forces domain');

// v1.3 — Cross-signal relations on code+technical sample
const codeSample = `Here's the implementation:\n\`\`\`python\ndef sum(a, b): return a + b\n\`\`\`\nThe function uses an O(1) algorithm. Latency is constant. The API endpoint returns this.`;
const codeSignals = analyze(codeSample);
const codeResult = buildPrompt(codeSample, codeSignals);
const hasReinforcement = codeResult.relations?.some((r) => r.kind === 'reinforcement');
assert(!!hasReinforcement, 'v1.3: code sample produces a reinforcement relation');

console.log(failures === 0 ? '\n✓ ALL TESTS PASSED' : `\n✗ ${failures} TEST(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
