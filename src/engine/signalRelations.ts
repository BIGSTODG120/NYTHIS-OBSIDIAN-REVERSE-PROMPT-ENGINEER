// Upgrade #2 — Cross-Signal Reasoning
// Second-pass over heuristic signals to find conflicts and reinforcements.

import type { AnalysisSignal } from '../types';

export interface SignalRelation {
  kind: 'reinforcement' | 'conflict' | 'model-hint' | 'context-hint';
  description: string;
  involves: string[]; // signal IDs
  strength: number; // 0..1
}

export function findRelations(signals: AnalysisSignal[]): SignalRelation[] {
  const ids = new Set(signals.map((s) => s.id));
  const rels: SignalRelation[] = [];

  // Reinforcements
  if (ids.has('persona.codeAssistant') && ids.has('structure.codeBlock')) {
    rels.push({
      kind: 'reinforcement',
      description: 'Code persona + fenced code block: strongly suggests a coding-assistant prompt.',
      involves: ['persona.codeAssistant', 'structure.codeBlock'],
      strength: 0.9,
    });
  }
  if (ids.has('tone.academic') && ids.has('format.citations')) {
    rels.push({
      kind: 'reinforcement',
      description: 'Academic tone + citations: research-paper context.',
      involves: ['tone.academic', 'format.citations'],
      strength: 0.85,
    });
  }
  if (ids.has('tone.marketing') && ids.has('schema.prosCons')) {
    rels.push({
      kind: 'reinforcement',
      description: 'Marketing voice + pros/cons schema: sales-enablement framework.',
      involves: ['tone.marketing', 'schema.prosCons'],
      strength: 0.8,
    });
  }
  if (ids.has('schema.executiveSummary') && ids.has('structure.bulletList')) {
    rels.push({
      kind: 'reinforcement',
      description: 'Executive summary + bullets: standard business-brief format.',
      involves: ['schema.executiveSummary', 'structure.bulletList'],
      strength: 0.8,
    });
  }
  if (ids.has('persona.teacher') && ids.has('schema.stepByStep')) {
    rels.push({
      kind: 'reinforcement',
      description: 'Teaching persona + step-by-step: instructional content.',
      involves: ['persona.teacher', 'schema.stepByStep'],
      strength: 0.85,
    });
  }

  // Conflicts
  if (ids.has('tone.formal') && ids.has('format.emojiHeavy')) {
    rels.push({
      kind: 'conflict',
      description: 'Formal tone with heavy emoji use is unusual — likely casual content forced into a structured prompt.',
      involves: ['tone.formal', 'format.emojiHeavy'],
      strength: 0.7,
    });
  }
  if (ids.has('tone.academic') && ids.has('tone.casual')) {
    rels.push({
      kind: 'conflict',
      description: 'Both academic and casual tone signals fired — mixed register may indicate hybrid prompt.',
      involves: ['tone.academic', 'tone.casual'],
      strength: 0.65,
    });
  }
  if (ids.has('tone.refusal') && ids.has('tone.marketing')) {
    rels.push({
      kind: 'conflict',
      description: 'Refusal language with marketing voice is contradictory — verify input is genuinely from one model.',
      involves: ['tone.refusal', 'tone.marketing'],
      strength: 0.75,
    });
  }

  // Model hints (stronger than v1.2's hardcoded heuristics)
  if (ids.has('tone.refusal') && ids.has('persona.assistant')) {
    rels.push({
      kind: 'model-hint',
      description: 'Refusal + helpful-assistant phrasing: likely Claude family or GPT-4 family (safety-tuned).',
      involves: ['tone.refusal', 'persona.assistant'],
      strength: 0.8,
    });
  }
  if (ids.has('persona.codeAssistant') && ids.has('tone.technical')) {
    rels.push({
      kind: 'model-hint',
      description: 'Code persona + engineering vocabulary: GPT-4, Claude, DeepSeek-Coder, or Qwen-Coder likely.',
      involves: ['persona.codeAssistant', 'tone.technical'],
      strength: 0.75,
    });
  }
  if (ids.has('persona.assistant') && ids.has('tone.enthusiastic') && ids.has('structure.numberedList')) {
    rels.push({
      kind: 'model-hint',
      description: 'Enthusiastic helper voice + structured list: classic ChatGPT default behavior.',
      involves: ['persona.assistant', 'tone.enthusiastic', 'structure.numberedList'],
      strength: 0.7,
    });
  }

  // Context hints
  if (ids.has('persona.financial') || ids.has('persona.lawyer') || ids.has('persona.doctor')) {
    rels.push({
      kind: 'context-hint',
      description: 'Professional-domain persona detected: prompt likely included a domain-expert role directive.',
      involves: signals.filter((s) => ['persona.financial', 'persona.lawyer', 'persona.doctor'].includes(s.id)).map((s) => s.id),
      strength: 0.75,
    });
  }
  if (ids.has('constraints.exactCount') && ids.has('structure.numberedList')) {
    rels.push({
      kind: 'context-hint',
      description: 'Round count + numbered list: prompt likely said "give me N things".',
      involves: ['constraints.exactCount', 'structure.numberedList'],
      strength: 0.7,
    });
  }

  return rels;
}
