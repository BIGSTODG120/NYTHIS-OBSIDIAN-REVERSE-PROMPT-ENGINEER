// Upgrade #3 — Calibrated Confidence
// Translates a 0..1 confidence score into honest English bands.

export type ConfidenceBand = 'gated' | 'weak' | 'single-dim' | 'moderate' | 'strong' | 'very-strong';

export interface ConfidenceVerdict {
  band: ConfidenceBand;
  label: string;
  description: string;
  cssColor: string;
}

export function bandFor(confidence: number): ConfidenceVerdict {
  if (confidence < 0.3) return {
    band: 'gated', label: 'Very weak signal',
    description: 'Below the honest-inference threshold. The engine refuses to fabricate.',
    cssColor: '#f59e0b',
  };
  if (confidence < 0.5) return {
    band: 'weak', label: 'Weak signal',
    description: 'Some surface patterns detected, but not enough cross-category match to be reliable.',
    cssColor: '#f59e0b',
  };
  if (confidence < 0.65) return {
    band: 'single-dim', label: 'Single-dimension match',
    description: 'One dimension matched clearly. Other categories defaulted. Treat as a sketch, not a finding.',
    cssColor: '#fb923c',
  };
  if (confidence < 0.78) return {
    band: 'moderate', label: 'Moderate confidence',
    description: 'Multiple signals align across categories. Inferred prompt is plausible but not the only valid one.',
    cssColor: '#a855f7',
  };
  if (confidence < 0.88) return {
    band: 'strong', label: 'Strong cross-category match',
    description: 'Signals reinforce each other across tone, structure, and constraints. High-fidelity reconstruction.',
    cssColor: '#a855f7',
  };
  return {
    band: 'very-strong', label: 'Very strong match',
    description: 'Signals align across nearly all categories. Heuristic ceiling reached.',
    cssColor: '#22c55e',
  };
}
