import type { AnalysisSignal, SignalCategory } from '../../types';

export interface Rule {
  id: string;
  category: SignalCategory;
  label: string;
  /**
   * Run the rule against the input. Return a signal if matched, null if not.
   */
  run: (input: string, ctx: RuleContext) => AnalysisSignal | null;
}

export interface RuleContext {
  lower: string;
  lines: string[];
  words: string[];
  charCount: number;
  wordCount: number;
  lineCount: number;
}

export function buildContext(input: string): RuleContext {
  const lower = input.toLowerCase();
  const lines = input.split('\n');
  const words = input.split(/\s+/).filter(Boolean);
  return {
    lower,
    lines,
    words,
    charCount: input.length,
    wordCount: words.length,
    lineCount: lines.length,
  };
}

export function signal(
  rule: Pick<Rule, 'id' | 'category' | 'label'>,
  detail: string,
  confidence: number,
  evidence?: string
): AnalysisSignal {
  return {
    id: rule.id,
    category: rule.category,
    label: rule.label,
    detail,
    confidence: Math.max(0, Math.min(1, confidence)),
    evidence,
  };
}
