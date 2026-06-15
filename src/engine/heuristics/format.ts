import type { Rule } from './rule';
import { signal } from './rule';

export const formatRules: Rule[] = [
  {
    id: 'format.bold',
    category: 'format',
    label: 'Bold emphasis',
    run(input, _ctx) {
      const count = (input.match(/\*\*[^*\n]+\*\*/g) || []).length;
      if (count >= 3) return signal(this, `${count} bold spans — heavy emphasis style.`, 0.8);
      if (count >= 1) return signal(this, `${count} bold span(s).`, 0.5);
      return null;
    },
  },
  {
    id: 'format.italic',
    category: 'format',
    label: 'Italic emphasis',
    run(input, _ctx) {
      const count = (input.match(/(?<!\*)\*[^*\n]+\*(?!\*)/g) || []).length + (input.match(/_[^_\n]+_/g) || []).length;
      if (count >= 2) return signal(this, `${count} italic spans.`, 0.65);
      return null;
    },
  },
  {
    id: 'format.inlineCode',
    category: 'format',
    label: 'Inline code',
    run(input, _ctx) {
      const count = (input.match(/`[^`\n]+`/g) || []).length;
      if (count >= 2) return signal(this, `${count} inline code spans.`, 0.8);
      return null;
    },
  },
  {
    id: 'format.emojiHeavy',
    category: 'format',
    label: 'Emoji-heavy',
    run(input, _ctx) {
      const emojis = (input.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) || []).length;
      if (emojis >= 5) return signal(this, `${emojis} emoji — likely "use emoji" instruction.`, 0.85);
      if (emojis >= 2) return signal(this, `${emojis} emoji present.`, 0.6);
      return null;
    },
  },
  {
    id: 'format.noEmoji',
    category: 'format',
    label: 'Emoji-free / clean',
    run(input, ctx) {
      const emojis = (input.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) || []).length;
      if (emojis === 0 && ctx.wordCount > 200) return signal(this, 'Long output with zero emoji — disciplined tone.', 0.5);
      return null;
    },
  },
  {
    id: 'format.citations',
    category: 'format',
    label: 'Citations / references',
    run(input, _ctx) {
      const cites = (input.match(/\[\d+\]|\(\d{4}\)|\[\w+\s+et\s+al/gi) || []).length;
      if (cites >= 2) return signal(this, `${cites} citation markers.`, 0.85);
      return null;
    },
  },
  {
    id: 'format.links',
    category: 'format',
    label: 'Embedded links',
    run(input, _ctx) {
      const md = (input.match(/\[[^\]]+\]\([^)]+\)/g) || []).length;
      const raw = (input.match(/https?:\/\/\S+/g) || []).length;
      if (md >= 2) return signal(this, `${md} markdown links.`, 0.8);
      if (raw >= 2) return signal(this, `${raw} raw URLs.`, 0.65);
      return null;
    },
  },
  {
    id: 'format.math',
    category: 'format',
    label: 'Math notation',
    run(input, _ctx) {
      const tex = /\$[^$\n]+\$|\\\(|\\\[/.test(input);
      const unicodeMath = /[∑∫∂∇∞≤≥≠±√∈∉∀∃]/.test(input);
      if (tex) return signal(this, 'LaTeX-style math notation present.', 0.9);
      if (unicodeMath) return signal(this, 'Unicode math symbols present.', 0.7);
      return null;
    },
  },
  {
    id: 'format.blockquote',
    category: 'format',
    label: 'Blockquote',
    run(_, ctx) {
      const bq = ctx.lines.filter((l) => /^\s*>\s+/.test(l)).length;
      if (bq >= 2) return signal(this, `${bq} blockquote lines.`, 0.8);
      return null;
    },
  },
  {
    id: 'format.heavyWhitespace',
    category: 'format',
    label: 'Whitespace breathing',
    run(_, ctx) {
      const blanks = ctx.lines.filter((l) => l.trim() === '').length;
      if (ctx.lineCount > 10 && blanks / ctx.lineCount > 0.25) {
        return signal(this, 'High blank-line ratio — deliberate breathing room.', 0.55);
      }
      return null;
    },
  },
];
