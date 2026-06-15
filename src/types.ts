export type Mode = 'heuristic' | 'byok';
export type InputKind = 'text' | 'image';

export interface AnalysisSignal {
  id: string;
  category: SignalCategory;
  label: string;
  detail: string;
  confidence: number;
  evidence?: string;
}

export type SignalCategory =
  | 'tone' | 'structure' | 'constraints' | 'schema' | 'persona' | 'format';

export interface PromptEvidence {
  category: SignalCategory | 'topic' | 'model' | 'domain' | 'relation';
  line: string;
  defaulted: boolean;
  sourceSignalId?: string;
  sourceConfidence?: number;
  detail?: string;
}

export interface GateInfo {
  gated: boolean;
  reason?: string;
  detectedCount: number;
  aggregateConfidence: number;
  minRequiredSignals: number;
  minRequiredConfidence: number;
}

// === v1.3 additions ===
export type HypothesisKind = 'direct' | 'roleplay' | 'constraint-first';

export interface Hypothesis {
  kind: HypothesisKind;
  label: string;
  rationale: string;
  systemPrompt: string;
  userPrompt: string;
  confidence: number;
}

export type Domain = 'technical' | 'creative' | 'business' | 'educational' | 'conversational';

export interface DomainVerdict {
  domain: Domain;
  confidence: number;
  evidence: string[];
}

export interface SignalRelation {
  kind: 'reinforcement' | 'conflict' | 'model-hint' | 'context-hint';
  description: string;
  involves: string[];
  strength: number;
}

export type ConfidenceBand =
  | 'gated' | 'weak' | 'single-dim' | 'moderate' | 'strong' | 'very-strong';

export interface ConfidenceVerdict {
  band: ConfidenceBand;
  label: string;
  description: string;
  cssColor: string;
}

export interface RefinementOverrides {
  forcedDomain?: Domain;
  forcedPlatform?: 'chatgpt' | 'claude' | 'gemini' | 'local';
  forcedPersona?: string;
}

export interface ValidationResult {
  similarityScore: number;
  reproducedSignals: string[];
  missingSignals: string[];
  newSignals: string[];
  rawReproducedOutput: string;
  note: string;
}

export interface InferredPrompt {
  systemPrompt: string;
  userPrompt: string;
  reusableTemplate: string;
  confidence: number;
  modelHint?: string;
  evidence: PromptEvidence[];
  defaultedCategories: SignalCategory[];
  gate: GateInfo;
  topic: string;
  topicDefaulted: boolean;
  // v1.3
  hypotheses?: Hypothesis[];
  domain?: DomainVerdict;
  relations?: SignalRelation[];
  confidenceBand?: ConfidenceVerdict;
  refinementApplied?: RefinementOverrides;
}

export interface AnalysisResult {
  id: string;
  timestamp: number;
  mode: Mode;
  inputKind: InputKind;
  inputPreview: string;
  signals: AnalysisSignal[];
  inferred: InferredPrompt;
  byokModel?: string;
  rawInput?: string; // v1.3: kept so refinement + validation can re-run without re-pasting
  validation?: ValidationResult;
}

export interface BYOKConfig {
  provider: 'openai' | 'anthropic' | 'ollama' | 'custom';
  endpoint: string;
  apiKey: string;
  model: string;
}

export interface AppSettings {
  mode: Mode;
  byok: BYOKConfig | null;
  showEvidence: boolean;
  hideDefaulted: boolean;
  primeBYOK: boolean; // v1.3 — Upgrade #5
}
