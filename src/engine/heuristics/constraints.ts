import type { Rule } from './rule';
import { signal } from './rule';

export const constraintRules: Rule[] = [
  {
    id: 'constraints.exactCount',
    category: 'constraints',
    label: 'Exact item count requested',
    run(_, ctx) {
      // e.g. exactly 5 numbered items, or 3 bullets, etc.
      const numbered = ctx.lines.filter((l) => /^\s*\d+[.)]\s+/.test(l)).length;
      const bullets = ctx.lines.filter((l) => /^\s*[-*•]\s+/.test(l)).length;
      const count = Math.max(numbered, bullets);
      if (count === 3 || count === 5 || count === 7 || count === 10) {
        return signal(this, `Round item count (${count}) suggests an explicit "give me N" constraint.`, 0.7);
      }
      return null;
    },
  },
  {
    id: 'constraints.shortLength',
    category: 'constraints',
    label: 'Short-length constraint',
    run(_, ctx) {
      if (ctx.wordCount > 0 && ctx.wordCount <= 40) {
        return signal(this, `Very short output (${ctx.wordCount} words) — likely a length cap.`, 0.65);
      }
      return null;
    },
  },
  {
    id: 'constraints.tweetLength',
    category: 'constraints',
    label: 'Tweet-length',
    run(input, _ctx) {
      if (input.length > 60 && input.length <= 280 && !input.includes('\n\n')) {
        return signal(this, `Within tweet length (${input.length} chars).`, 0.5);
      }
      return null;
    },
  },
  {
    id: 'constraints.noPreamble',
    category: 'constraints',
    label: 'No preamble',
    run(input, ctx) {
      const first = ctx.lines.find((l) => l.trim().length > 0) || '';
      const preambles = ['sure!', 'sure,', 'certainly', 'absolutely', 'of course', 'here is', "here's", 'i would', 'great question'];
      const startsClean = !preambles.some((p) => first.toLowerCase().startsWith(p));
      if (startsClean && input.length > 80) return signal(this, 'Opens directly with content, no "Sure! Here is..." preamble.', 0.55);
      return null;
    },
  },
  {
    id: 'constraints.noPostamble',
    category: 'constraints',
    label: 'No postamble',
    run(_, ctx) {
      const last = [...ctx.lines].reverse().find((l) => l.trim().length > 0) || '';
      const post = ['let me know', 'hope this helps', 'feel free to', "i hope you", 'is there anything else'];
      const cleanEnd = !post.some((p) => last.toLowerCase().includes(p));
      if (cleanEnd && ctx.wordCount > 50) return signal(this, 'Ends without filler closer.', 0.5);
      return null;
    },
  },
  {
    id: 'constraints.languageNonEnglish',
    category: 'constraints',
    label: 'Non-English output',
    run(input, _ctx) {
      const nonAscii = (input.match(/[^\x00-\x7F]/g) || []).length;
      if (nonAscii > 20 && nonAscii / input.length > 0.15) {
        return signal(this, 'High non-ASCII ratio — likely non-English language constraint.', 0.7);
      }
      return null;
    },
  },
  {
    id: 'constraints.singleSentence',
    category: 'constraints',
    label: 'Single-sentence output',
    run(input, _ctx) {
      const sentences = input.split(/[.!?]+\s/).filter((s) => s.trim().length > 5);
      if (sentences.length === 1 && input.length > 20 && input.length < 400) {
        return signal(this, 'Constrained to one sentence.', 0.7);
      }
      return null;
    },
  },
  {
    id: 'constraints.allCaps',
    category: 'constraints',
    label: 'ALL-CAPS output',
    run(input, _ctx) {
      const letters = input.replace(/[^a-zA-Z]/g, '');
      const upper = input.replace(/[^A-Z]/g, '');
      if (letters.length > 30 && upper.length / letters.length > 0.85) {
        return signal(this, 'Output is dominantly uppercase.', 0.8);
      }
      return null;
    },
  },
  {
    id: 'constraints.specificAudience',
    category: 'constraints',
    label: 'Audience-targeted',
    run(_, ctx) {
      const audiences = ["explain like i'm 5", 'eli5', 'for beginners', 'for executives', 'for engineers', 'for kids', 'for a 10-year-old', 'in simple terms'];
      const hit = audiences.find((a) => ctx.lower.includes(a));
      if (hit) return signal(this, `Audience marker present: "${hit}".`, 0.75);
      // Implicit: lots of analogies + simple words
      const simpleMarkers = ['imagine', 'think of it like', "it's like when", 'pretend'];
      const sHits = simpleMarkers.filter((m) => ctx.lower.includes(m)).length;
      if (sHits >= 2) return signal(this, 'Heavy analogy use — written for a non-expert audience.', 0.6);
      return null;
    },
  },
  {
    id: 'constraints.outputOnly',
    category: 'constraints',
    label: 'Output-only (no commentary)',
    run(input, _ctx) {
      const trimmed = input.trim();
      const startsRaw = /^[{\[<`]/.test(trimmed) || /^\w+:/.test(trimmed);
      if (startsRaw) return signal(this, 'Begins with a raw structure character — likely "respond only with X" constraint.', 0.75);
      return null;
    },
  },
];
