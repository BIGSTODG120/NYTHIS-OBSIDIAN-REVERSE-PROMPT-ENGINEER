import { toneRules } from './tone';
import { structureRules } from './structure';
import { constraintRules } from './constraints';
import { schemaRules } from './schema';
import { personaRules } from './persona';
import { formatRules } from './format';
import type { Rule } from './rule';

export const allRules: Rule[] = [
  ...toneRules,
  ...structureRules,
  ...constraintRules,
  ...schemaRules,
  ...personaRules,
  ...formatRules,
];

// Sanity check at module load — surfaces drift during dev.
if (allRules.length !== 60) {
  // eslint-disable-next-line no-console
  console.warn(`[NYTHIS] Expected 60 heuristic rules, got ${allRules.length}.`);
}

export { toneRules, structureRules, constraintRules, schemaRules, personaRules, formatRules };
