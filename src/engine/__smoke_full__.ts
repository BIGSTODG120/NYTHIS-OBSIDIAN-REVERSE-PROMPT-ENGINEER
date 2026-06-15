// Production smoke test — fires targeted inputs at each of the 60 rules
// and reports which fire, which don't, and any unexpected silence.

import { allRules } from './heuristics';
import { analyze } from './analyzer';
import { buildPrompt } from './promptBuilder';

interface Case {
  ruleId: string;
  input: string;
  why: string;
}

const cases: Case[] = [
  // ---------- TONE (10) ----------
  { ruleId: 'tone.formal', input: 'Furthermore, the analysis demonstrates significant findings. Therefore, the conclusions follow. Moreover, additional evidence is provided.', why: 'formal connectives' },
  { ruleId: 'tone.casual', input: "Honestly, you're gonna love this. I'm pretty sure it's kinda what you wanted. Let's just try it.", why: 'casual contractions' },
  { ruleId: 'tone.academic', input: 'This paper proposes a novel approach. We hypothesize that the literature suggests significant gaps. As Smith et al. (2023) demonstrated, the methodology requires refinement.', why: 'academic markers' },
  { ruleId: 'tone.marketing', input: 'Unlock next-level growth. Transform your business with cutting-edge AI. Discover how leaders are revolutionizing their workflows. Introducing the game-changing platform.', why: 'marketing power words' },
  { ruleId: 'tone.technical', input: 'The API endpoint accepts a JSON payload. The function returns a value or throws an exception on schema mismatch. Latency and throughput are tracked per parameter.', why: 'engineering vocab' },
  { ruleId: 'tone.instructional', input: '1. Open the settings panel\n2. Click the Advanced tab\n3. Configure the proxy\n4. Set the timeout value\n5. Save changes', why: 'imperative step verbs' },
  { ruleId: 'tone.persuasive', input: 'The truth is, most people overlook this. Consider this carefully. Imagine if you could change the outcome. Why settle for less? The reality is harder than it appears.', why: 'rhetorical levers' },
  { ruleId: 'tone.narrative', input: 'Once upon a time, in a small village, she said the words that would change everything. Suddenly, the wind shifted. The next morning, he said nothing. Years later, the truth surfaced.', why: 'narrative beats' },
  { ruleId: 'tone.refusal', input: "I can't help with that request. I'm not able to provide instructions on this topic. As an AI, I won't generate content that goes against my guidelines.", why: 'refusal language' },
  { ruleId: 'tone.enthusiastic', input: 'This is amazing! You absolutely have to try it! It will blow your mind! Get ready for the best thing ever!', why: 'multiple exclamations' },

  // ---------- STRUCTURE (10) ----------
  { ruleId: 'structure.numberedList', input: '1. First item\n2. Second item\n3. Third item\n4. Fourth item', why: 'numbered list' },
  { ruleId: 'structure.bulletList', input: '- Alpha\n- Beta\n- Gamma\n- Delta', why: 'bullet list' },
  { ruleId: 'structure.headers', input: '# Main Section\n\nIntro paragraph here.\n\n## Subsection\n\nMore content.\n\n### Detail', why: 'markdown headers' },
  { ruleId: 'structure.table', input: '| Name | Score |\n|------|-------|\n| Alice | 95 |\n| Bob | 87 |', why: 'markdown table' },
  { ruleId: 'structure.codeBlock', input: 'Here is the code:\n```python\ndef hello():\n    print("hi")\n```\nThat is the function.', why: 'fenced code block' },
  { ruleId: 'structure.json', input: '{"sentiment": "positive", "score": 0.92, "tags": ["fast", "clean"]}', why: 'valid JSON object' },
  { ruleId: 'structure.xml', input: '<response><summary>Analysis complete</summary><confidence>high</confidence></response>', why: 'XML tags' },
  { ruleId: 'structure.dialogue', input: 'Q: What is the capital?\nA: Paris.\nQ: And the population?\nA: About 2 million.', why: 'Q&A dialogue' },
  { ruleId: 'structure.paragraphs', input: 'This is the first paragraph with enough content to register as real prose with multiple sentences and ideas being expressed clearly here today.\n\nThis is the second paragraph following a blank line break, continuing the thought process with additional context.\n\nAnd a third paragraph to seal the multi-paragraph detection with sufficient word count for the rule to fire.', why: 'multi-paragraph prose' },
  { ruleId: 'structure.frontmatter', input: '---\ntitle: My Post\ndate: 2026-01-15\ntags: [ai, tools]\n---\n\nThe actual content begins here.', why: 'YAML frontmatter' },

  // ---------- CONSTRAINTS (10) ----------
  { ruleId: 'constraints.exactCount', input: '1. One\n2. Two\n3. Three\n4. Four\n5. Five', why: 'round count of 5' },
  { ruleId: 'constraints.shortLength', input: 'Quick answer: yes.', why: 'under 40 words' },
  { ruleId: 'constraints.tweetLength', input: 'A clever tweet-length take on something current that fits inside two hundred eighty characters but is interesting enough to share publicly without too much.', why: 'tweet length' },
  { ruleId: 'constraints.noPreamble', input: 'The answer is forty-two. The supporting reasoning involves combinatorial mathematics applied to the deep question of life, the universe, and everything we have come to know.', why: 'starts cleanly' },
  { ruleId: 'constraints.noPostamble', input: 'The result of the calculation is 1024. This is derived from two raised to the tenth power, which is a standard reference value in binary computation theory.', why: 'no filler ending' },
  { ruleId: 'constraints.languageNonEnglish', input: 'Esto es una respuesta completamente en español que demuestra que el contenido no está en inglés y contiene muchos caracteres acentuados como á é í ó ú ñ para activar la regla de idioma.', why: 'non-English' },
  { ruleId: 'constraints.singleSentence', input: 'The unified theory proposes that consciousness emerges from the integrated processing of distributed neural correlates across hierarchical predictive coding networks.', why: 'one sentence' },
  { ruleId: 'constraints.allCaps', input: 'THIS IS A LOUD WARNING ABOUT SYSTEM FAILURES ACROSS THE NETWORK INFRASTRUCTURE AND REQUIRES IMMEDIATE ATTENTION FROM ALL OPERATIONS PERSONNEL', why: 'all caps' },
  { ruleId: 'constraints.specificAudience', input: 'Explain like I am 5: imagine your computer is a kitchen, and the CPU is the chef, and the memory is the counter where ingredients sit.', why: 'ELI5 marker' },
  { ruleId: 'constraints.outputOnly', input: '{"action": "deploy", "target": "production"}', why: 'starts with raw structure' },

  // ---------- SCHEMA (10) ----------
  { ruleId: 'schema.keyValue', input: 'Name: Alice Walker\nRole: Engineer\nDepartment: Platform\nLocation: Atlanta\nStart Date: 2024-03-01', why: 'key:value pairs' },
  { ruleId: 'schema.comparisonTable', input: 'REST vs GraphQL comparison:\n\n| Feature | REST | GraphQL |\n|---------|------|---------|\n| Caching | Easy | Complex |\n| Schema | Loose | Strict |', why: 'vs + table' },
  { ruleId: 'schema.rankedList', input: 'Top 5 frameworks of 2026:\n#1 React\n#2 Vue\n#3 Svelte\n#4 Solid\n#5 Qwik', why: 'top N markers' },
  { ruleId: 'schema.stepByStep', input: 'Step 1: Initialize the project\nStep 2: Install dependencies\nStep 3: Configure the build\nStep 4: Run the tests\nStep 5: Deploy', why: 'step markers' },
  { ruleId: 'schema.problemSolution', input: 'Problem: The build is slow. The CI pipeline takes 20 minutes.\n\nSolution: Add layer caching to the Docker build and parallelize the test suite.', why: 'problem + solution' },
  { ruleId: 'schema.beforeAfter', input: 'Before: The dashboard loaded in 8 seconds with multiple render passes.\n\nAfter: The dashboard loads in 1.2 seconds with a single render pass and lazy-loaded panels.', why: 'before + after' },
  { ruleId: 'schema.classification', input: 'Type: warning\nCategory: deprecation\nSeverity: medium', why: 'classification fields' },
  { ruleId: 'schema.executiveSummary', input: 'TL;DR: Q3 revenue up 18%. Margins compressed 200bps. Guidance raised.\n\nThe full analysis follows with detailed breakdowns by segment and region.', why: 'TL;DR header' },
  { ruleId: 'schema.prosCons', input: 'Pros: Faster iteration, lower cost, easier hiring.\n\nCons: Smaller ecosystem, fewer enterprise integrations, less mature tooling.', why: 'pros + cons' },
  { ruleId: 'schema.confidenceField', input: 'Prediction: market will correct within 6 months. Confidence: 0.72. Score: 8/10.', why: 'confidence + score' },

  // ---------- PERSONA (10) ----------
  { ruleId: 'persona.expert', input: 'In my experience over twenty years in distributed systems, the industry standard is to instrument first. Best practice means measuring before optimizing.', why: 'expert markers' },
  { ruleId: 'persona.teacher', input: "Let's break this down. First, we set up the equation. Next, we substitute the values. Here's what's happening under the hood. Finally, we solve for x.", why: 'teacher scaffolding' },
  { ruleId: 'persona.assistant', input: "I can help you with that task. I'd be happy to walk through the options. Let me know if you need anything else. Is there anything else I can do?", why: 'helpful assistant' },
  { ruleId: 'persona.character', input: '*adjusts spectacles* Hark, m\'lord! Thee shall find the answer in the ancient tome. *gestures dramatically* Thou must seek the wisdom of the elders.', why: 'roleplay tags + archaic' },
  { ruleId: 'persona.doctor', input: 'Based on the symptoms, the differential diagnosis includes several possibilities. Consult a physician for proper evaluation. This is not medical advice.', why: 'medical framing' },
  { ruleId: 'persona.lawyer', input: 'The plaintiff alleges breach. Pursuant to statute, the defendant bears liability. Note: this jurisdiction may differ. Not legal advice.', why: 'legal framing' },
  { ruleId: 'persona.financial', input: 'Diversify across asset classes. Consider your risk tolerance and portfolio allocation. Compound returns favor early investors. Not financial advice.', why: 'financial framing' },
  { ruleId: 'persona.copywriter', input: 'Hook: Stop scrolling.\nHeadline: The tool they sell you, for free.\nCaption: I built it last night.\nCTA: Link in comments.', why: 'copywriter labels' },
  { ruleId: 'persona.codeAssistant', input: "Here's the implementation:\n```javascript\nfunction sum(a, b) { return a + b; }\n```\nThis function adds two numbers. Note that it does not handle type coercion.", why: 'code + explanation' },
  { ruleId: 'persona.peer', input: "Honestly, the thing is, between you and me, this whole framework is overhyped. Look, FWIW, IMO you're better off with the simpler approach.", why: 'peer voice' },

  // ---------- FORMAT (10) ----------
  { ruleId: 'format.bold', input: 'The **first principle** is clarity. The **second principle** is brevity. The **third principle** is precision.', why: 'multiple bold spans' },
  { ruleId: 'format.italic', input: 'This is *important* context. The phrase _de facto_ applies here. Also note the *subtle* difference.', why: 'italic spans' },
  { ruleId: 'format.inlineCode', input: 'Run `npm install` then `npm run build` and verify `dist/` exists. Set `NODE_ENV=production` first.', why: 'inline code' },
  { ruleId: 'format.emojiHeavy', input: 'Ship it 🚀 fast ⚡ and clean ✨ with confidence 💪 — the team 🔥 is ready 🎯', why: 'many emojis' },
  { ruleId: 'format.noEmoji', input: 'The architecture follows a layered approach with strict separation between presentation, business logic, and data access. Each layer exposes a stable interface and hides implementation details. Cross-cutting concerns such as logging, authentication, and rate limiting are handled by middleware rather than embedded in core handlers. This separation enables independent evolution of each layer and supports testing in isolation.', why: 'long, no emoji' },
  { ruleId: 'format.citations', input: 'The methodology builds on prior work [1] and extends the framework proposed by Chen et al. (2023) and Patel et al. (2024).', why: 'citation markers' },
  { ruleId: 'format.links', input: 'See the [documentation](https://example.com/docs) and the [API reference](https://example.com/api) for full details.', why: 'markdown links' },
  { ruleId: 'format.math', input: 'The equation $E = mc^2$ relates energy and mass. For sums use $\\sum_{i=1}^{n} x_i$ and integrals \\(\\int f(x) dx\\).', why: 'LaTeX math' },
  { ruleId: 'format.blockquote', input: '> The first quoted line.\n> A continuation of the quote.\n> A third line of the same blockquote.', why: 'blockquote lines' },
  { ruleId: 'format.heavyWhitespace', input: 'Section one.\n\nSection two.\n\nSection three.\n\nSection four.\n\nSection five.\n\nSection six.\n\nSection seven.', why: 'high blank ratio' },
];

console.log(`\n=== NYTHIS Obsidian — Full Coverage Smoke Test ===\n`);
console.log(`Rules: ${allRules.length}`);
console.log(`Test cases: ${cases.length}`);
console.log(`---`);

let fired = 0;
let missed = 0;
const missedRules: string[] = [];

for (const c of cases) {
  const signals = analyze(c.input);
  const matched = signals.find((s) => s.id === c.ruleId);
  if (matched) {
    fired++;
    console.log(`PASS  ${c.ruleId.padEnd(34)}  conf=${Math.round(matched.confidence * 100).toString().padStart(3)}%  (${c.why})`);
  } else {
    missed++;
    missedRules.push(c.ruleId);
    console.log(`MISS  ${c.ruleId.padEnd(34)}  ----   (${c.why})`);
  }
}

console.log(`---`);
console.log(`Rules fired:  ${fired} / ${cases.length}`);
console.log(`Rules missed: ${missed}`);

// End-to-end prompt build on a representative input
const e2eInput = `Sure! Here are 5 ways to improve your sleep:

1. Stick to a consistent schedule.
2. Limit caffeine after 2 PM.
3. **Keep your room cool and dark.**
4. Avoid screens an hour before bed.
5. Wind down with a calming routine.

Let me know if you want more tips!`;

const e2eSignals = analyze(e2eInput);
const e2ePrompt = buildPrompt(e2eInput, e2eSignals);
console.log(`\n=== End-to-End: representative ChatGPT-style output ===`);
console.log(`Signals detected: ${e2eSignals.length}`);
console.log(`Aggregate confidence: ${Math.round(e2ePrompt.confidence * 100)}%`);
console.log(`System prompt length: ${e2ePrompt.systemPrompt.length} chars`);
console.log(`User prompt length: ${e2ePrompt.userPrompt.length} chars`);
console.log(`Reusable template length: ${e2ePrompt.reusableTemplate.length} chars`);
console.log(`Model hint: ${e2ePrompt.modelHint ?? '(none)'}`);

const verdict = missed === 0 ? 'GREEN — all 60 rules fire on targeted inputs' : `YELLOW — ${missed} rule(s) need tuning: ${missedRules.join(', ')}`;
console.log(`\n=== VERDICT: ${verdict} ===\n`);

process.exit(missed === 0 ? 0 : 1);
