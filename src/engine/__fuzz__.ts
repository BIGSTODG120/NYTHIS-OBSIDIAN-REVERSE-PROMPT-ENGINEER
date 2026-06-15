// v1.4 — Fuzz suite: pathological inputs must not throw, must return valid shape.

import { analyze, aggregateConfidence } from './analyzer';
import { buildPrompt } from './promptBuilder';

function randomString(len: number, charset: string): string {
  let s = '';
  for (let i = 0; i < len; i++) s += charset[Math.floor(Math.random() * charset.length)];
  return s;
}

const TESTS: { name: string; input: string }[] = [
  { name: 'empty', input: '' },
  { name: 'whitespace only', input: '\n\n   \t\t  \n' },
  { name: 'single character', input: 'x' },
  { name: 'long ascii', input: 'a'.repeat(50_000) },
  { name: 'long mixed', input: randomString(20_000, 'abcdefABCDEF0123456789 \n.,!?:;') },
  { name: 'control chars', input: '\u0001\u0002\u0003\u0004 hello \u0007\u0008\u000b\u000c' },
  { name: 'rtl arabic', input: 'مرحبا بالعالم. هذا اختبار. ' .repeat(50) },
  { name: 'cjk', input: '你好世界。这是测试。 '.repeat(50) },
  { name: 'mixed emoji + cjk + rtl', input: '🚀 你好 שלום مرحبا hello\n\n' .repeat(30) },
  { name: 'null bytes', input: 'before\u0000after\u0000\u0000end' },
  { name: 'malformed markdown', input: '**unclosed bold\n```unclosed code\n[unclosed link(' .repeat(20) },
  { name: 'massive json', input: '{' + '"k":"v",'.repeat(5000) + '"end":"x"}' },
  { name: 'repeated numbered items', input: Array.from({ length: 200 }, (_, i) => `${i + 1}. item ${i}`).join('\n') },
  { name: 'binary-ish blob', input: randomString(5000, '\u0001\u0080\u00ff\u00fe\u0001\u00aa\u0055') },
];

let failures = 0;

for (const t of TESTS) {
  try {
    const start = performance.now();
    const signals = analyze(t.input);
    const result = buildPrompt(t.input, signals);
    const elapsed = performance.now() - start;

    if (!Array.isArray(signals)) { console.error(`FAIL [${t.name}]: signals not array`); failures++; continue; }
    if (typeof result.systemPrompt !== 'string') { console.error(`FAIL [${t.name}]: systemPrompt not string`); failures++; continue; }
    if (typeof result.userPrompt !== 'string') { console.error(`FAIL [${t.name}]: userPrompt not string`); failures++; continue; }
    if (typeof result.reusableTemplate !== 'string') { console.error(`FAIL [${t.name}]: reusableTemplate not string`); failures++; continue; }
    if (typeof result.confidence !== 'number' || isNaN(result.confidence)) { console.error(`FAIL [${t.name}]: confidence NaN`); failures++; continue; }
    if (result.confidence < 0 || result.confidence > 1) { console.error(`FAIL [${t.name}]: confidence out of [0,1]`); failures++; continue; }
    if (typeof result.gate.gated !== 'boolean') { console.error(`FAIL [${t.name}]: gate.gated not boolean`); failures++; continue; }
    if (elapsed > 3000) { console.error(`FAIL [${t.name}]: analysis exceeded 3s (${elapsed.toFixed(0)}ms)`); failures++; continue; }

    console.log(`PASS [${t.name}]  signals=${signals.length}  conf=${Math.round(result.confidence*100)}%  ${elapsed.toFixed(0)}ms`);
  } catch (err) {
    console.error(`FAIL [${t.name}]: THREW —`, err instanceof Error ? err.message : err);
    failures++;
  }
}

// 50 random-Unicode fuzz inputs
console.log('\n--- 50 random-Unicode fuzz inputs ---');
let randomFailures = 0;
for (let i = 0; i < 50; i++) {
  const len = Math.floor(Math.random() * 2000) + 10;
  const codePoints = Math.random() < 0.5 ? '\u0001-\u00ff' : null;
  const input = codePoints
    ? randomString(len, codePoints)
    : Array.from({ length: len }, () => String.fromCodePoint(Math.floor(Math.random() * 0x1F600))).join('');
  try {
    const signals = analyze(input);
    const result = buildPrompt(input, signals);
    void aggregateConfidence(signals);
    if (!result || typeof result.confidence !== 'number') throw new Error('bad shape');
  } catch (err) {
    randomFailures++;
    if (randomFailures < 3) console.error(`  random fuzz #${i} failed:`, err instanceof Error ? err.message : err);
  }
}
console.log(`Random fuzz: ${50 - randomFailures} / 50 passed`);
failures += randomFailures;

console.log(failures === 0 ? '\n✓ ALL FUZZ TESTS PASSED' : `\n✗ ${failures} FUZZ FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
