import type { Rule } from './rule';
import { signal } from './rule';

export const toneRules: Rule[] = [
  {
    id: 'tone.formal',
    category: 'tone',
    label: 'Formal tone',
    run(_, ctx) {
      const markers = ['furthermore', 'therefore', 'consequently', 'moreover', 'henceforth', 'pursuant', 'wherein'];
      const hits = markers.filter((m) => ctx.lower.includes(m)).length;
      if (hits >= 2) return signal(this, 'Uses formal connectives and elevated diction.', 0.7 + hits * 0.05, markers.filter((m) => ctx.lower.includes(m)).join(', '));
      return null;
    },
  },
  {
    id: 'tone.casual',
    category: 'tone',
    label: 'Casual / conversational',
    run(input, ctx) {
      const markers = [" you're", " i'm", " let's", ' gonna', ' wanna', ' kinda', ' yeah', ' honestly,', ' tbh'];
      const hits = markers.filter((m) => ctx.lower.includes(m)).length;
      if (hits >= 2) return signal(this, 'Contractions and casual hedges throughout.', 0.6 + hits * 0.05);
      return null;
    },
  },
  {
    id: 'tone.academic',
    category: 'tone',
    label: 'Academic register',
    run(_, ctx) {
      const markers = ['et al.', 'ibid', 'op. cit', 'this paper', 'this study', 'we hypothesize', 'we propose', 'literature suggests'];
      const hits = markers.filter((m) => ctx.lower.includes(m)).length;
      if (hits >= 1) return signal(this, 'Reads like a research paper or academic abstract.', 0.65 + hits * 0.08);
      return null;
    },
  },
  {
    id: 'tone.marketing',
    category: 'tone',
    label: 'Marketing copy',
    run(_, ctx) {
      const markers = ['unlock', 'transform', 'elevate', 'revolutionize', 'game-changing', 'cutting-edge', 'next-level', 'discover how', 'introducing'];
      const hits = markers.filter((m) => ctx.lower.includes(m)).length;
      if (hits >= 2) return signal(this, 'Marketing power-words and call-to-action shape.', 0.7 + hits * 0.05);
      return null;
    },
  },
  {
    id: 'tone.technical',
    category: 'tone',
    label: 'Technical / engineering',
    run(_, ctx) {
      const markers = ['api', 'endpoint', 'function', 'parameter', 'return value', 'throw', 'exception', 'schema', 'payload', 'latency', 'throughput'];
      const hits = markers.filter((m) => ctx.lower.includes(m)).length;
      if (hits >= 3) return signal(this, 'Engineering vocabulary dominates.', 0.7 + hits * 0.04);
      return null;
    },
  },
  {
    id: 'tone.instructional',
    category: 'tone',
    label: 'Instructional / how-to',
    run(_, ctx) {
      const startsWithVerb = /^\s*(?:\d+\.\s+|[-*]\s+)?(?:open|click|run|install|create|configure|set|add|remove|navigate|select|enter|copy|paste|press|type)\b/im;
      if (startsWithVerb.test(ctx.lines.slice(0, 12).join('\n'))) {
        return signal(this, 'Imperative step verbs lead lines — how-to shape.', 0.8);
      }
      return null;
    },
  },
  {
    id: 'tone.persuasive',
    category: 'tone',
    label: 'Persuasive / argumentative',
    run(_, ctx) {
      const markers = ['the truth is', 'consider this', 'imagine if', 'why settle', 'the reality', 'most people don', 'the real question'];
      const hits = markers.filter((m) => ctx.lower.includes(m)).length;
      if (hits >= 1) return signal(this, 'Rhetorical levers aimed at the reader.', 0.6 + hits * 0.1);
      return null;
    },
  },
  {
    id: 'tone.narrative',
    category: 'tone',
    label: 'Narrative / story',
    run(_, ctx) {
      const markers = ['once', ' she said', ' he said', ' they said', ' suddenly', ' meanwhile', ' the next morning', ' years later'];
      const hits = markers.filter((m) => ctx.lower.includes(m)).length;
      if (hits >= 2) return signal(this, 'Story beats: dialogue tags and temporal jumps.', 0.65 + hits * 0.05);
      return null;
    },
  },
  {
    id: 'tone.refusal',
    category: 'tone',
    label: 'Refusal / safety wrapper',
    run(_, ctx) {
      const markers = ["i can't help", "i'm not able to", 'i cannot provide', "i won't", 'against my guidelines', 'as an ai'];
      const hits = markers.filter((m) => ctx.lower.includes(m)).length;
      if (hits >= 1) return signal(this, 'Contains refusal or safety-policy language.', 0.85);
      return null;
    },
  },
  {
    id: 'tone.enthusiastic',
    category: 'tone',
    label: 'Enthusiastic / upbeat',
    run(input, _ctx) {
      const exclam = (input.match(/!/g) || []).length;
      const emojis = (input.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) || []).length;
      if (exclam >= 3 || emojis >= 2) {
        return signal(this, `High-energy punctuation (${exclam} "!", ${emojis} emoji).`, 0.6 + Math.min(0.3, (exclam + emojis) * 0.05));
      }
      return null;
    },
  },
];
