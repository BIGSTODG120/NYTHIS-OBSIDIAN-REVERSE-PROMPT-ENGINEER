// Upgrade #4 — Domain Inference
// Detects the subject domain of the output independently of style.

export type Domain = 'technical' | 'creative' | 'business' | 'educational' | 'conversational';

export interface DomainVerdict {
  domain: Domain;
  confidence: number;
  evidence: string[];
}

const DOMAIN_LEXICONS: Record<Exclude<Domain, 'conversational'>, string[]> = {
  technical: [
    'api', 'endpoint', 'function', 'parameter', 'schema', 'payload', 'latency', 'throughput',
    'kubernetes', 'docker', 'database', 'query', 'index', 'compile', 'runtime', 'deploy',
    'algorithm', 'recursion', 'iteration', 'protocol', 'authentication', 'cache', 'middleware',
    'commit', 'branch', 'merge', 'refactor', 'debug', 'patch', 'memory leak', 'race condition',
  ],
  creative: [
    'character', 'scene', 'narrative', 'dialogue', 'metaphor', 'imagery', 'protagonist',
    'antagonist', 'plot', 'setting', 'mood', 'tone', 'verse', 'stanza', 'rhyme',
    'once upon', 'long ago', 'whispered', 'gazed', 'shimmered', 'silently', 'beneath the',
  ],
  business: [
    'revenue', 'margin', 'growth', 'strategy', 'quarter', 'forecast', 'roi', 'kpi',
    'customer', 'segment', 'market', 'pricing', 'churn', 'retention', 'acquisition',
    'stakeholder', 'roadmap', 'okr', 'p&l', 'cogs', 'arr', 'mrr', 'ltv', 'cac',
    'enterprise', 'b2b', 'b2c', 'pipeline', 'conversion', 'funnel',
  ],
  educational: [
    'explain', 'understand', 'concept', 'learn', 'study', 'lesson', 'example', 'illustrate',
    'because', 'reason', 'principle', 'theory', 'definition', 'meaning', 'imagine if',
    'think of it', 'for instance', 'consider this', 'in other words', 'simply put',
    'eli5', 'beginner', 'fundamentals',
  ],
};

export function inferDomain(input: string): DomainVerdict {
  if (!input || !input.trim()) {
    return { domain: 'conversational', confidence: 0, evidence: [] };
  }
  const lower = input.toLowerCase();
  const scores: Record<Domain, number> = {
    technical: 0, creative: 0, business: 0, educational: 0, conversational: 0,
  };
  const evidence: Record<Domain, string[]> = {
    technical: [], creative: [], business: [], educational: [], conversational: [],
  };

  for (const [domain, words] of Object.entries(DOMAIN_LEXICONS) as [Exclude<Domain, 'conversational'>, string[]][]) {
    for (const word of words) {
      const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (re.test(lower)) {
        scores[domain] += 1;
        if (evidence[domain].length < 4) evidence[domain].push(word);
      }
    }
  }

  // Pick highest
  const sorted = (Object.keys(scores) as Domain[])
    .filter((d) => d !== 'conversational')
    .sort((a, b) => scores[b] - scores[a]);
  const top = sorted[0];
  const topScore = scores[top];

  // Confidence: scaled by hit count, capped, requires meaningful signal
  let confidence = 0;
  let chosen: Domain = 'conversational';
  if (topScore >= 5) { chosen = top; confidence = Math.min(0.85, 0.4 + topScore * 0.05); }
  else if (topScore >= 3) { chosen = top; confidence = 0.35 + topScore * 0.05; }
  else if (topScore >= 2) { chosen = top; confidence = 0.25 + topScore * 0.05; }
  // else conversational, 0 confidence

  return {
    domain: chosen,
    confidence,
    evidence: chosen === 'conversational' ? [] : evidence[chosen],
  };
}

export const DOMAIN_LABELS: Record<Domain, string> = {
  technical: 'Technical / engineering',
  creative: 'Creative / narrative',
  business: 'Business / strategy',
  educational: 'Educational / explainer',
  conversational: 'Conversational (default)',
};

export function domainPersonaHint(d: Domain): string {
  switch (d) {
    case 'technical': return 'You are a technical writer with engineering depth.';
    case 'creative': return 'You are a creative writer with strong narrative craft.';
    case 'business': return 'You are a business analyst with strategic clarity.';
    case 'educational': return 'You are a teacher who explains clearly and uses analogies.';
    default: return '';
  }
}
