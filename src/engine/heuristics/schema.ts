import type { Rule } from './rule';
import { signal } from './rule';

export const schemaRules: Rule[] = [
  {
    id: 'schema.keyValue',
    category: 'schema',
    label: 'Key: value pairs',
    run(_, ctx) {
      const kv = ctx.lines.filter((l) => /^\s*[A-Z][\w \-]{1,30}:\s+.+/.test(l)).length;
      if (kv >= 3) return signal(this, `${kv} "Key: value" lines.`, 0.85);
      return null;
    },
  },
  {
    id: 'schema.comparisonTable',
    category: 'schema',
    label: 'Comparison structure',
    run(input, ctx) {
      const vs = /\bvs\.?\b|\bversus\b/i.test(input);
      const hasTable = /\|.+\|.+\|/.test(input) && /\|\s*[-:]+\s*\|/.test(input);
      if (vs && hasTable) return signal(this, '"vs" language plus a table — comparison schema.', 0.9);
      return null;
    },
  },
  {
    id: 'schema.rankedList',
    category: 'schema',
    label: 'Ranked / top-N',
    run(input, _ctx) {
      if (/top\s+\d+|#\s*\d+|rank\s*\d+|best\s+\d+/i.test(input)) {
        return signal(this, 'Ranking markers (Top N, #1, Best 10).', 0.75);
      }
      return null;
    },
  },
  {
    id: 'schema.stepByStep',
    category: 'schema',
    label: 'Step-by-step procedure',
    run(_, ctx) {
      const stepWords = ctx.lines.filter((l) => /^\s*(step\s+\d+|phase\s+\d+|\d+\.)/i.test(l)).length;
      if (stepWords >= 3) return signal(this, `${stepWords} step/phase markers.`, 0.85);
      return null;
    },
  },
  {
    id: 'schema.problemSolution',
    category: 'schema',
    label: 'Problem → solution',
    run(_, ctx) {
      const hasProblem = /problem:|issue:|challenge:|the problem|the issue/i.test(ctx.lower);
      const hasSolution = /solution:|fix:|resolution:|the solution|the fix/i.test(ctx.lower);
      if (hasProblem && hasSolution) return signal(this, 'Both "Problem" and "Solution" markers present.', 0.85);
      return null;
    },
  },
  {
    id: 'schema.beforeAfter',
    category: 'schema',
    label: 'Before → after',
    run(_, ctx) {
      const hasBefore = /before:|original:|❌|wrong:|bad:/i.test(ctx.lower);
      const hasAfter = /after:|improved:|✅|right:|good:|better:/i.test(ctx.lower);
      if (hasBefore && hasAfter) return signal(this, '"Before" and "After" labels present.', 0.85);
      return null;
    },
  },
  {
    id: 'schema.classification',
    category: 'schema',
    label: 'Classification / category',
    run(input, _ctx) {
      if (/category:\s*\w+|class:\s*\w+|label:\s*\w+|type:\s*\w+/i.test(input)) {
        return signal(this, 'Single classification field present.', 0.7);
      }
      return null;
    },
  },
  {
    id: 'schema.executiveSummary',
    category: 'schema',
    label: 'Executive summary block',
    run(_, ctx) {
      if (/(tl;?dr|summary:|executive summary|in short)/i.test(ctx.lower)) {
        return signal(this, 'Contains a summary header.', 0.7);
      }
      return null;
    },
  },
  {
    id: 'schema.prosCons',
    category: 'schema',
    label: 'Pros / Cons schema',
    run(_, ctx) {
      const pros = /pros:|advantages:|benefits:|👍/i.test(ctx.lower);
      const cons = /cons:|disadvantages:|drawbacks:|👎/i.test(ctx.lower);
      if (pros && cons) return signal(this, 'Explicit pros + cons schema.', 0.85);
      return null;
    },
  },
  {
    id: 'schema.confidenceField',
    category: 'schema',
    label: 'Confidence / score field',
    run(input, _ctx) {
      if (/confidence:\s*(0?\.\d+|\d+%)|score:\s*\d+|certainty:\s*\d+/i.test(input)) {
        return signal(this, 'Numeric confidence / score field present.', 0.75);
      }
      return null;
    },
  },
];
