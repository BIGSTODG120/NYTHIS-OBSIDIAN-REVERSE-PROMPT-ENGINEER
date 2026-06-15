import type { Rule } from './rule';
import { signal } from './rule';

export const structureRules: Rule[] = [
  {
    id: 'structure.numberedList',
    category: 'structure',
    label: 'Numbered list',
    run(_, ctx) {
      const numbered = ctx.lines.filter((l) => /^\s*\d+[.)]\s+/.test(l)).length;
      if (numbered >= 3) return signal(this, `Has ${numbered} numbered items.`, 0.85);
      if (numbered >= 1) return signal(this, `Has ${numbered} numbered item(s).`, 0.55);
      return null;
    },
  },
  {
    id: 'structure.bulletList',
    category: 'structure',
    label: 'Bullet list',
    run(_, ctx) {
      const bullets = ctx.lines.filter((l) => /^\s*[-*•]\s+/.test(l)).length;
      if (bullets >= 3) return signal(this, `Has ${bullets} bullet items.`, 0.85);
      if (bullets >= 1) return signal(this, `Has ${bullets} bullet item(s).`, 0.5);
      return null;
    },
  },
  {
    id: 'structure.headers',
    category: 'structure',
    label: 'Markdown headers',
    run(_, ctx) {
      const h = ctx.lines.filter((l) => /^#{1,6}\s+/.test(l)).length;
      if (h >= 2) return signal(this, `${h} markdown headers — sectioned document.`, 0.9);
      if (h >= 1) return signal(this, '1 markdown header.', 0.5);
      return null;
    },
  },
  {
    id: 'structure.table',
    category: 'structure',
    label: 'Table (markdown)',
    run(input, _ctx) {
      const tableRow = /\|.+\|.+\|/;
      const sep = /\|\s*[-:]+\s*\|/;
      if (sep.test(input) && tableRow.test(input)) {
        return signal(this, 'Markdown table detected (pipe + separator row).', 0.95);
      }
      return null;
    },
  },
  {
    id: 'structure.codeBlock',
    category: 'structure',
    label: 'Fenced code block',
    run(input, _ctx) {
      const fences = (input.match(/```/g) || []).length;
      if (fences >= 2) return signal(this, `${fences / 2} fenced code block(s).`, 0.95);
      return null;
    },
  },
  {
    id: 'structure.json',
    category: 'structure',
    label: 'JSON output',
    run(input, _ctx) {
      const trimmed = input.trim();
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
          JSON.parse(trimmed);
          return signal(this, 'Entire output parses as valid JSON.', 0.98);
        } catch {
          if (/"\w+"\s*:/.test(trimmed)) return signal(this, 'Looks like JSON but did not parse cleanly.', 0.7);
        }
      }
      return null;
    },
  },
  {
    id: 'structure.xml',
    category: 'structure',
    label: 'XML / tag wrapped',
    run(input, _ctx) {
      const tagOpen = /<[a-z][\w-]*>/i;
      const tagClose = /<\/[a-z][\w-]*>/i;
      if (tagOpen.test(input) && tagClose.test(input)) {
        return signal(this, 'Output is wrapped in XML-style tags.', 0.85);
      }
      return null;
    },
  },
  {
    id: 'structure.dialogue',
    category: 'structure',
    label: 'Dialogue / Q&A',
    run(_, ctx) {
      const qa = ctx.lines.filter((l) => /^(q:|a:|question:|answer:|user:|assistant:)/i.test(l.trim())).length;
      if (qa >= 2) return signal(this, `${qa} Q&A or dialogue tags.`, 0.85);
      return null;
    },
  },
  {
    id: 'structure.paragraphs',
    category: 'structure',
    label: 'Multi-paragraph prose',
    run(_, ctx) {
      const blanks = ctx.lines.filter((l) => l.trim() === '').length;
      if (blanks >= 2 && ctx.wordCount > 120) return signal(this, 'Plain multi-paragraph prose.', 0.55);
      return null;
    },
  },
  {
    id: 'structure.frontmatter',
    category: 'structure',
    label: 'YAML frontmatter',
    run(input, _ctx) {
      if (/^---\n[\s\S]+?\n---/.test(input)) return signal(this, 'Starts with YAML frontmatter block.', 0.95);
      return null;
    },
  },
];
