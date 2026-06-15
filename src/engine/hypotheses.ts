// Upgrade #1 — Prompt Hypothesis Set
// Produces three different plausible prompts for the same output, instead
// of pretending one canonical answer exists.

import type { AnalysisSignal, InferredPrompt } from '../types';

export type HypothesisKind = 'direct' | 'roleplay' | 'constraint-first';

export interface Hypothesis {
  kind: HypothesisKind;
  label: string;
  rationale: string;
  systemPrompt: string;
  userPrompt: string;
  confidence: number;
}

interface HypothesisInputs {
  signals: AnalysisSignal[];
  topic: string;
  persona?: AnalysisSignal;
  tone?: AnalysisSignal;
  structure?: AnalysisSignal;
  schema?: AnalysisSignal;
  constraints: AnalysisSignal[];
  format: AnalysisSignal[];
  baseConfidence: number;
}

export function buildHypotheses(inputs: HypothesisInputs): Hypothesis[] {
  const { signals, topic, persona, tone, structure, schema, constraints, format, baseConfidence } = inputs;
  const ids = new Set(signals.map((s) => s.id));

  // === Hypothesis A: Direct Instruction ===
  // "Do X. Format as Y. Constrain to Z."
  // Best fit when output is utilitarian: lists, JSON, summaries.
  const directConfidence = adjustForKind(baseConfidence, {
    boost: structure ? 0.05 : 0,
    boost2: schema ? 0.05 : 0,
    penalty: ids.has('persona.character') ? -0.15 : 0,
  });
  const direct: Hypothesis = {
    kind: 'direct',
    label: 'Direct Instruction',
    rationale: 'Output reads as a task response. The prompt likely gave a clear instruction with format constraints.',
    systemPrompt: [
      'You are a helpful, knowledgeable assistant.',
      tone ? `Your tone is ${tone.label.toLowerCase()}.` : '',
      constraints.length ? `Constraints:\n${constraints.slice(0, 4).map((c) => `- ${c.label}`).join('\n')}` : '',
    ].filter(Boolean).join('\n').trim(),
    userPrompt: [
      `${topic.replace(/{{|}}/g, '').replace(/TOPIC — /i, '').replace(/^.*example signal: /i, '').replace(/"/g, '').trim() || 'Write about the requested topic.'}`,
      structure ? `Format as ${structure.label.toLowerCase()}.` : '',
      schema ? `Use a ${schema.label.toLowerCase()} structure.` : '',
    ].filter(Boolean).join(' '),
    confidence: directConfidence,
  };

  // === Hypothesis B: Roleplay / Persona-First ===
  // "You are a [persona]. Speaking as them, write about X."
  // Best fit when persona signals fire.
  const rolePersona = persona?.label || 'an expert in this domain';
  const roleplayConfidence = adjustForKind(baseConfidence, {
    boost: persona ? 0.1 : -0.2,
    boost2: ids.has('persona.character') || ids.has('persona.copywriter') ? 0.08 : 0,
    penalty: !persona && !ids.has('tone.narrative') ? -0.15 : 0,
  });
  const roleplay: Hypothesis = {
    kind: 'roleplay',
    label: 'Roleplay / Persona-First',
    rationale: persona
      ? `Strong persona signal (${persona.label}). Prompt likely opened with a role directive.`
      : 'Weak persona signal — this hypothesis is offered for completeness but unlikely.',
    systemPrompt: [
      `You are ${rolePersona.toLowerCase()}.`,
      tone ? `You write in a ${tone.label.toLowerCase()} register.` : '',
      'Stay in character throughout your response.',
    ].filter(Boolean).join('\n').trim(),
    userPrompt: `Respond about the following topic from your perspective: ${cleanTopic(topic)}.`,
    confidence: roleplayConfidence,
  };

  // === Hypothesis C: Constraint-First ===
  // "Output must satisfy: X, Y, Z. The subject is ..."
  // Best fit when many constraint signals fire.
  const constraintConfidence = adjustForKind(baseConfidence, {
    boost: constraints.length >= 2 ? 0.08 : -0.1,
    boost2: schema ? 0.05 : 0,
    penalty: constraints.length === 0 ? -0.2 : 0,
  });
  const constraintLines = [
    structure ? `- Output structure: ${structure.label.toLowerCase()}` : '',
    schema ? `- Schema: ${schema.label.toLowerCase()}` : '',
    ...constraints.slice(0, 4).map((c) => `- ${c.label.toLowerCase()}: ${c.detail.toLowerCase()}`),
    ...format.slice(0, 2).map((f) => `- ${f.label.toLowerCase()}`),
  ].filter(Boolean);
  const constraintFirst: Hypothesis = {
    kind: 'constraint-first',
    label: 'Constraint-First',
    rationale: constraints.length >= 2
      ? `${constraints.length} constraint signals detected — the prompt likely led with strict requirements.`
      : 'Few constraints detected — this framing is offered but probably not how the original prompt was structured.',
    systemPrompt: [
      'You produce output that strictly satisfies the constraints below.',
      'Your output must conform to ALL of:',
      constraintLines.length ? constraintLines.join('\n') : '- (no specific constraints detected)',
    ].join('\n').trim(),
    userPrompt: `Subject: ${cleanTopic(topic)}.`,
    confidence: constraintConfidence,
  };

  // Sort by confidence descending so the most plausible appears first
  return [direct, roleplay, constraintFirst].sort((a, b) => b.confidence - a.confidence);
}

function adjustForKind(base: number, mods: { boost?: number; boost2?: number; penalty?: number }): number {
  const total = (mods.boost || 0) + (mods.boost2 || 0) + (mods.penalty || 0);
  return Math.max(0, Math.min(0.95, base + total));
}

function cleanTopic(topic: string): string {
  const match = topic.match(/example signal:\s*"([^"]+)"/i);
  if (match) return match[1];
  return topic.replace(/[{}]/g, '').replace(/TOPIC\s*[—-]\s*/i, '').replace(/^\s*"?|"?\s*$/g, '').trim() || 'the subject of the output';
}
