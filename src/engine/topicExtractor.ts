// Topic extractor — finds the actual subject of an output, skipping LLM preambles
// and list markers. Returns { topic, defaulted } so callers can show honest UI.

const PREAMBLE_PHRASES = [
  'sure!', 'sure,', 'sure thing', 'certainly!', 'certainly,', 'absolutely!',
  'of course!', 'of course,', 'here is', "here's", "here are", 'here you go',
  'i would', 'i can', 'i can help', "i'd be happy", 'great question',
  'no problem', "let's", 'okay,', 'ok,', 'alright,', 'happy to help',
  'good question', 'glad you asked', 'thanks for asking',
];

const POSTAMBLE_PHRASES = [
  'let me know', 'hope this helps', 'feel free', 'is there anything',
  'happy to clarify', "i hope you", 'reach out if',
];

interface ExtractResult {
  topic: string;
  defaulted: boolean;
  reason: string;
}

export function extractTopic(input: string): ExtractResult {
  if (!input || !input.trim()) {
    return { topic: '{{TOPIC}}', defaulted: true, reason: 'empty input' };
  }

  const lines = input.split('\n').map((l) => l.trim()).filter(Boolean);

  // Strategy 1: pull the first substantive list item if a list dominates
  const listItems = lines
    .map((l) => l.match(/^(?:\d+[.)]|[-*•])\s+(.+)$/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => m[1].trim())
    .filter((s) => s.length > 6);

  if (listItems.length >= 2) {
    // Build a topic from the common theme of the items (just join shortened)
    const sample = listItems[0];
    const trimmed = trimToWords(sample, 10);
    return {
      topic: `{{TOPIC — list-based, e.g. "${trimmed}"}}`,
      defaulted: false,
      reason: 'extracted from first list item',
    };
  }

  // Strategy 2: skip preambles, take first real content sentence
  const sentences = input
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);

  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    if (PREAMBLE_PHRASES.some((p) => lower.startsWith(p) || lower === p.replace(/[!,]/g, ''))) {
      continue;
    }
    if (POSTAMBLE_PHRASES.some((p) => lower.includes(p))) {
      continue;
    }
    // Skip lone list-item lines
    if (/^\s*(?:\d+[.)]|[-*•])\s+/.test(sentence)) continue;

    const cleaned = trimToWords(sentence.replace(/^[#*>\s-]+/, ''), 14);
    if (cleaned.length > 8) {
      return {
        topic: `{{TOPIC — e.g. "${cleaned}"}}`,
        defaulted: false,
        reason: 'extracted from first content sentence',
      };
    }
  }

  // Strategy 3: defaulted — be honest
  return {
    topic: '{{TOPIC — could not identify subject; describe what you want}}',
    defaulted: true,
    reason: 'no clear topic signal found',
  };
}

function trimToWords(s: string, maxWords: number): string {
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(' ');
  return words.slice(0, maxWords).join(' ') + '…';
}
