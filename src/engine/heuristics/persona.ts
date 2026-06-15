import type { Rule } from './rule';
import { signal } from './rule';

export const personaRules: Rule[] = [
  {
    id: 'persona.expert',
    category: 'persona',
    label: 'Expert / authority',
    run(_, ctx) {
      const markers = ['in my experience', "i've worked with", 'as an expert', 'years of', 'industry standard', 'best practice'];
      const hits = markers.filter((m) => ctx.lower.includes(m)).length;
      if (hits >= 1) return signal(this, 'Voice positions the speaker as an experienced authority.', 0.65 + hits * 0.08);
      return null;
    },
  },
  {
    id: 'persona.teacher',
    category: 'persona',
    label: 'Teacher / explainer',
    run(_, ctx) {
      const markers = ["let's break this down", 'first,', 'next,', 'finally,', "here's what's happening", 'to understand this'];
      const hits = markers.filter((m) => ctx.lower.includes(m)).length;
      if (hits >= 2) return signal(this, 'Pacing and scaffolding of a teacher.', 0.7);
      return null;
    },
  },
  {
    id: 'persona.assistant',
    category: 'persona',
    label: 'Generic AI assistant',
    run(_, ctx) {
      const markers = ['i can help you', "i'd be happy to", 'let me know if', 'is there anything else'];
      const hits = markers.filter((m) => ctx.lower.includes(m)).length;
      if (hits >= 1) return signal(this, 'Default helpful-assistant phrasing.', 0.55 + hits * 0.1);
      return null;
    },
  },
  {
    id: 'persona.character',
    category: 'persona',
    label: 'Roleplay character',
    run(_, ctx) {
      const markers = ['*', '« ', '"hark', 'm\'lord', 'thee ', 'thou ', '*adjusts'];
      const hits = markers.filter((m) => ctx.lower.includes(m)).length;
      if (hits >= 2) return signal(this, 'Roleplay action tags or archaic register.', 0.75);
      return null;
    },
  },
  {
    id: 'persona.doctor',
    category: 'persona',
    label: 'Medical professional',
    run(_, ctx) {
      const markers = ['symptoms', 'diagnosis', 'consult a', 'medical advice', 'physician', 'mg/kg', 'differential'];
      const hits = markers.filter((m) => ctx.lower.includes(m)).length;
      if (hits >= 2) return signal(this, 'Medical professional framing.', 0.75);
      return null;
    },
  },
  {
    id: 'persona.lawyer',
    category: 'persona',
    label: 'Legal professional',
    run(_, ctx) {
      const markers = ['plaintiff', 'defendant', 'jurisdiction', 'liability', 'pursuant to', 'statute', 'not legal advice'];
      const hits = markers.filter((m) => ctx.lower.includes(m)).length;
      if (hits >= 2) return signal(this, 'Legal professional framing.', 0.8);
      return null;
    },
  },
  {
    id: 'persona.financial',
    category: 'persona',
    label: 'Financial advisor',
    run(_, ctx) {
      const markers = ['diversif', 'portfolio', 'asset allocation', 'risk tolerance', 'compound', 'returns', 'not financial advice'];
      const hits = markers.filter((m) => ctx.lower.includes(m)).length;
      if (hits >= 2) return signal(this, 'Financial advisor framing.', 0.75);
      return null;
    },
  },
  {
    id: 'persona.copywriter',
    category: 'persona',
    label: 'Copywriter / creative',
    run(_, ctx) {
      const markers = ['hook:', 'cta:', 'headline:', 'caption:', 'tagline:'];
      const hits = markers.filter((m) => ctx.lower.includes(m)).length;
      if (hits >= 1) return signal(this, 'Copywriting field labels.', 0.8);
      return null;
    },
  },
  {
    id: 'persona.codeAssistant',
    category: 'persona',
    label: 'Code assistant',
    run(input, _ctx) {
      const fences = (input.match(/```/g) || []).length;
      const explain = /(here'?s|this code|this function|note that|importantly)/i.test(input);
      if (fences >= 2 && explain) return signal(this, 'Code block + surrounding explanation.', 0.85);
      return null;
    },
  },
  {
    id: 'persona.peer',
    category: 'persona',
    label: 'Peer / friend voice',
    run(_, ctx) {
      const markers = ["honestly", "look,", "the thing is", "between you and me", "fwiw", "imo"];
      const hits = markers.filter((m) => ctx.lower.includes(m)).length;
      if (hits >= 2) return signal(this, 'Talks like a peer, not an authority.', 0.65);
      return null;
    },
  },
];
