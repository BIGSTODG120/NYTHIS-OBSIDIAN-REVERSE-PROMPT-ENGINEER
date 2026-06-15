import type { AnalysisSignal } from '../types';
import { allRules } from './heuristics';
import { buildContext } from './heuristics/rule';

// v1.4 — Long-input + per-rule budget protection
export const MAX_INPUT_CHARS = 100_000;
export const RULE_BUDGET_MS = 50; // soft per-rule budget (logged, not enforced via worker)

export interface AnalyzeOptions {
  maxChars?: number;
}

export function analyze(input: string, opts: AnalyzeOptions = {}): AnalysisSignal[] {
  if (!input || !input.trim()) return [];
  const maxChars = opts.maxChars ?? MAX_INPUT_CHARS;
  const truncated = input.length > maxChars ? input.slice(0, maxChars) : input;
  const ctx = buildContext(truncated);
  const signals: AnalysisSignal[] = [];

  for (const rule of allRules) {
    const start = performance.now();
    try {
      const s = rule.run(truncated, ctx);
      if (s) signals.push(s);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[NYTHIS] Rule ${rule.id} threw:`, err);
    }
    const elapsed = performance.now() - start;
    if (elapsed > RULE_BUDGET_MS) {
      // eslint-disable-next-line no-console
      console.warn(`[NYTHIS] Rule ${rule.id} exceeded budget: ${elapsed.toFixed(1)}ms`);
    }
  }

  signals.sort((a, b) => b.confidence - a.confidence);
  return signals;
}

export function aggregateConfidence(signals: AnalysisSignal[]): number {
  if (signals.length === 0) return 0;
  const top = signals.slice(0, 5);
  const mean = top.reduce((sum, s) => sum + s.confidence, 0) / top.length;
  const coverage = Math.min(1, signals.length / 8);
  return Math.min(0.95, mean * 0.7 + coverage * 0.25);
}

// v1.4 — Public helper: was the input truncated?
export function checkInputBounds(input: string): { tooLong: boolean; length: number; max: number } {
  return { tooLong: input.length > MAX_INPUT_CHARS, length: input.length, max: MAX_INPUT_CHARS };
}
