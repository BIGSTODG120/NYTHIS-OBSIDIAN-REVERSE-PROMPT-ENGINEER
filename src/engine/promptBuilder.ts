import type {
  AnalysisSignal, InferredPrompt, PromptEvidence, SignalCategory, GateInfo,
  RefinementOverrides,
} from '../types';
import { aggregateConfidence } from './analyzer';
import { extractTopic } from './topicExtractor';
import { inferDomain, domainPersonaHint, DOMAIN_LABELS } from './domainInference';
import { findRelations } from './signalRelations';
import { bandFor } from './confidenceModel';
import { buildHypotheses } from './hypotheses';

const GATE_MIN_SIGNALS = 3;
const GATE_MIN_CONFIDENCE = 0.5;

interface BuildOptions {
  hideDefaulted?: boolean;
  refinement?: RefinementOverrides;
}

function byCategory(signals: AnalysisSignal[]): Record<SignalCategory, AnalysisSignal[]> {
  const map: Record<SignalCategory, AnalysisSignal[]> = {
    tone: [], structure: [], constraints: [], schema: [], persona: [], format: [],
  };
  for (const s of signals) map[s.category].push(s);
  return map;
}

export function buildPrompt(
  input: string,
  signals: AnalysisSignal[],
  options: BuildOptions = {}
): InferredPrompt {
  const hideDefaulted = !!options.hideDefaulted;
  const refinement = options.refinement;
  const confidence = aggregateConfidence(signals);
  const cats = byCategory(signals);
  const evidence: PromptEvidence[] = [];
  const defaultedCategories: SignalCategory[] = [];

  // === Gate ===
  const gate: GateInfo = {
    gated: signals.length < GATE_MIN_SIGNALS || confidence < GATE_MIN_CONFIDENCE,
    detectedCount: signals.length,
    aggregateConfidence: confidence,
    minRequiredSignals: GATE_MIN_SIGNALS,
    minRequiredConfidence: GATE_MIN_CONFIDENCE,
  };
  if (gate.gated) {
    if (signals.length < GATE_MIN_SIGNALS) {
      gate.reason = `Only ${signals.length} signal(s) detected (need ${GATE_MIN_SIGNALS} for honest inference).`;
    } else {
      gate.reason = `Aggregate confidence is ${Math.round(confidence * 100)}% (need at least ${Math.round(GATE_MIN_CONFIDENCE * 100)}%).`;
    }
    const gatedPrompt = `[Input below the honest-inference threshold.]

${gate.reason}

Detected signals (${signals.length}):
${signals.length ? signals.map((s) => `  • [${s.category}] ${s.label} — ${Math.round(s.confidence * 100)}%`).join('\n') : '  (none)'}

Add at least 50 more words of the original output, or paste a longer sample, for a confident inference.`;
    evidence.push({
      category: 'topic', line: '(gated — no prompt built)',
      defaulted: true, detail: gate.reason,
    });
    return {
      systemPrompt: gatedPrompt, userPrompt: gatedPrompt, reusableTemplate: gatedPrompt,
      confidence, modelHint: undefined,
      evidence, defaultedCategories: ['tone', 'structure', 'constraints', 'schema', 'persona', 'format'],
      gate, topic: '{{TOPIC}}', topicDefaulted: true,
      confidenceBand: bandFor(confidence),
      hypotheses: [], domain: { domain: 'conversational', confidence: 0, evidence: [] }, relations: [],
    };
  }

  // === Topic ===
  const topicResult = extractTopic(input);
  evidence.push({
    category: 'topic', line: topicResult.topic,
    defaulted: topicResult.defaulted, detail: topicResult.reason,
  });

  // === Domain (Upgrade #4) ===
  const domain = refinement?.forcedDomain
    ? { domain: refinement.forcedDomain, confidence: 1, evidence: ['user override'] }
    : inferDomain(input);
  if (domain.confidence > 0) {
    evidence.push({
      category: 'domain',
      line: `Detected domain: ${DOMAIN_LABELS[domain.domain]} (${Math.round(domain.confidence * 100)}%)`,
      defaulted: false,
      detail: domain.evidence.length ? `Keywords: ${domain.evidence.join(', ')}` : 'derived',
    });
  }

  // === Cross-signal relations (Upgrade #2) ===
  const relations = findRelations(signals);
  for (const rel of relations) {
    evidence.push({
      category: 'relation',
      line: `[${rel.kind}] ${rel.description}`,
      defaulted: false,
      detail: rel.involves.join(' + '),
    });
  }

  // === Category resolution ===
  const persona = pickTop(cats.persona);
  const tone = pickTop(cats.tone);
  const structure = pickTop(cats.structure);
  const schema = pickTop(cats.schema);

  // Persona: respect refinement override, then signal, then domain hint, then default
  let personaLine: string;
  let personaDefaulted = false;
  if (refinement?.forcedPersona) {
    personaLine = `You are ${refinement.forcedPersona}.`;
  } else if (persona) {
    personaLine = `You are a ${persona.label.toLowerCase()}.`;
  } else if (domain.confidence >= 0.5) {
    personaLine = domainPersonaHint(domain.domain);
    if (!personaLine) { personaLine = 'You are a helpful, knowledgeable assistant.'; personaDefaulted = true; }
  } else {
    personaLine = 'You are a helpful, knowledgeable assistant.';
    personaDefaulted = true;
  }
  evidence.push(personaDefaulted
    ? { category: 'persona', line: personaLine, defaulted: true, detail: 'No persona signal — using safe default.' }
    : { category: 'persona', line: personaLine, defaulted: false, sourceSignalId: persona?.id, sourceConfidence: persona?.confidence, detail: persona?.detail }
  );
  if (personaDefaulted) defaultedCategories.push('persona');

  const toneLine = tone
    ? `Your tone is ${tone.label.toLowerCase()}.`
    : 'Your tone is clear and direct.';
  evidence.push(makeEvidence('tone', toneLine, tone));
  if (!tone) defaultedCategories.push('tone');

  const constraintEvidence: PromptEvidence[] = cats.constraints.slice(0, 4).map((s) => ({
    category: 'constraints', line: `${s.label}: ${s.detail}`,
    defaulted: false, sourceSignalId: s.id, sourceConfidence: s.confidence, detail: s.detail,
  }));
  if (constraintEvidence.length === 0) defaultedCategories.push('constraints');
  evidence.push(...(constraintEvidence.length ? constraintEvidence : [{
    category: 'constraints' as const, line: '(no constraint signals detected)',
    defaulted: true, detail: 'No length, audience, or output-only signal fired.',
  }]));

  const formatEvidence: PromptEvidence[] = cats.format.slice(0, 3).map((s) => ({
    category: 'format', line: s.label + '.',
    defaulted: false, sourceSignalId: s.id, sourceConfidence: s.confidence, detail: s.detail,
  }));
  if (formatEvidence.length === 0) defaultedCategories.push('format');
  evidence.push(...(formatEvidence.length ? formatEvidence : [{
    category: 'format' as const, line: '(no formatting signals detected)',
    defaulted: true, detail: 'No emphasis, code, citation, or whitespace pattern fired.',
  }]));

  const structureLine = structure ? `Format the response as: ${structure.label.toLowerCase()}.` : '';
  if (structure) {
    evidence.push({ category: 'structure', line: structureLine, defaulted: false, sourceSignalId: structure.id, sourceConfidence: structure.confidence, detail: structure.detail });
  } else { defaultedCategories.push('structure'); }

  const schemaLine = schema ? `Use a ${schema.label.toLowerCase()} schema.` : '';
  if (schema) {
    evidence.push({ category: 'schema', line: schemaLine, defaulted: false, sourceSignalId: schema.id, sourceConfidence: schema.confidence, detail: schema.detail });
  } else { defaultedCategories.push('schema'); }

  // === Compose system prompt ===
  const systemLines = [
    personaLine,
    toneLine + (!tone && !hideDefaulted ? ' [defaulted — no signal]' : ''),
    constraintEvidence.length
      ? '\nConstraints:\n' + constraintEvidence.map((e) => `- ${e.line}`).join('\n')
      : (hideDefaulted ? null : '\nConstraints:\n- (none detected)'),
    formatEvidence.length
      ? '\nFormatting:\n' + formatEvidence.map((e) => `- ${e.line}`).join('\n')
      : (hideDefaulted ? null : '\nFormatting:\n- (none detected)'),
  ].filter(Boolean);
  const systemPrompt = systemLines.join('\n').trim();

  // === User prompt ===
  const userLines = [
    `Write about: ${topicResult.topic}.`,
    structureLine, schemaLine,
  ].filter(Boolean);
  const userPrompt = userLines.join('\n').trim();

  // === Reusable template ===
  const templateLines = [
    '# Role', personaLine, '',
    '# Tone', toneLine, '',
    '# Domain', domain.confidence > 0 ? DOMAIN_LABELS[domain.domain] : '(unspecified)', '',
    '# Task',
    'Write about: {{TOPIC}}.',
    structureLine || (hideDefaulted ? '' : 'Format: (no structure signal detected — choose one).'),
    schemaLine || (hideDefaulted ? '' : 'Schema: (no schema signal detected).'),
    '',
    '# Constraints',
    constraintEvidence.length ? constraintEvidence.map((e) => `- ${e.line}`).join('\n') : '- (no constraint signals detected — defaulted)',
    '',
    '# Formatting',
    formatEvidence.length ? formatEvidence.map((e) => `- ${e.line}`).join('\n') : '- (no format signals detected — defaulted)',
    '',
    '# Output',
    'Respond with the answer only. No preamble. No postamble.',
  ].filter((l) => l !== '');
  const reusableTemplate = templateLines.join('\n').trim();

  // === Model hint (now uses relations) ===
  const modelHintRel = relations.find((r) => r.kind === 'model-hint');
  const modelHint = modelHintRel?.description ?? guessModelHintFallback(signals, refinement);
  if (modelHint) {
    evidence.push({ category: 'model', line: modelHint, defaulted: false, detail: 'Derived from signal combination' });
  }

  // === Hypothesis set (Upgrade #1) ===
  const hypotheses = buildHypotheses({
    signals, topic: topicResult.topic, persona, tone, structure, schema,
    constraints: cats.constraints, format: cats.format, baseConfidence: confidence,
  });

  // === Confidence band ===
  const confidenceBand = bandFor(confidence);

  return {
    systemPrompt, userPrompt, reusableTemplate,
    confidence, modelHint,
    evidence, defaultedCategories, gate,
    topic: topicResult.topic, topicDefaulted: topicResult.defaulted,
    hypotheses, domain, relations, confidenceBand,
    refinementApplied: refinement,
  };
}

function pickTop(arr: AnalysisSignal[]): AnalysisSignal | undefined {
  return arr.length ? arr[0] : undefined;
}

function makeEvidence(category: SignalCategory, line: string, source: AnalysisSignal | undefined): PromptEvidence {
  if (source) return { category, line, defaulted: false, sourceSignalId: source.id, sourceConfidence: source.confidence, detail: source.detail };
  return { category, line, defaulted: true, detail: `No ${category} signal fired — using safe default.` };
}

function guessModelHintFallback(signals: AnalysisSignal[], refinement?: RefinementOverrides): string | undefined {
  if (refinement?.forcedPlatform) {
    return `User-specified platform: ${refinement.forcedPlatform}.`;
  }
  const ids = new Set(signals.map((s) => s.id));
  if (ids.has('tone.refusal')) return 'Likely a safety-tuned model (Claude / GPT-4 family).';
  if (ids.has('persona.codeAssistant') && ids.has('structure.codeBlock')) return 'Likely a code-tuned model.';
  return undefined;
}
