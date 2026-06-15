// v1.4 — Hardened BYOK adapter
// Adds: 30s timeout via AbortController, one auto-retry on transient errors,
// response schema validation, structured error types.

import type { AnalysisSignal, BYOKConfig, ValidationResult } from '../types';
import { analyze } from './analyzer';

const TIMEOUT_MS = 30_000;
const RETRY_MAX = 1;

export class BYOKError extends Error {
  constructor(public kind: 'config' | 'network' | 'timeout' | 'http' | 'parse' | 'schema', message: string, public detail?: string) {
    super(message);
    this.name = 'BYOKError';
  }
}

export interface ByokResult {
  systemPrompt: string;
  userPrompt: string;
  reusableTemplate: string;
  raw: string;
}

function buildInstruction(originalOutput: string, signals?: AnalysisSignal[]): string {
  let primer = '';
  if (signals && signals.length > 0) {
    primer = `\n\nThe NYTHIS Obsidian heuristic engine detected these signals in the output (treat these as priors but feel free to disagree in your reasoning):\n${signals.slice(0, 12).map((s) => `- [${s.category}] ${s.label} (${Math.round(s.confidence * 100)}%): ${s.detail}`).join('\n')}\n`;
  }
  return `You are a reverse prompt engineer. Given the OUTPUT below${signals?.length ? ' and the heuristic priors' : ''}, infer the most likely SYSTEM PROMPT, USER PROMPT, and a REUSABLE TEMPLATE (with {{PLACEHOLDERS}}) that would have produced it.${primer}

Respond ONLY with valid JSON in this exact shape:

{
  "systemPrompt": "...",
  "userPrompt": "...",
  "reusableTemplate": "..."
}

No preamble. No markdown fences. No commentary.

=== OUTPUT ===
${originalOutput}
=== END OUTPUT ===`;
}

function validateConfig(c: BYOKConfig): void {
  if (!c.endpoint) throw new BYOKError('config', 'Missing endpoint.');
  if (!c.model) throw new BYOKError('config', 'Missing model name.');
  if (c.provider !== 'ollama' && !c.apiKey) throw new BYOKError('config', 'Missing API key.');
  try { new URL(c.endpoint); } catch { throw new BYOKError('config', `Endpoint "${c.endpoint}" is not a valid URL.`); }
}

async function fetchWithTimeoutAndRetry(url: string, init: RequestInit): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= RETRY_MAX; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      // Only retry on network errors (not on aborts or programmer errors)
      const isAbort = (err as any)?.name === 'AbortError';
      if (isAbort && attempt < RETRY_MAX) continue; // timeout → retry once
      if (!isAbort && (err instanceof TypeError) && attempt < RETRY_MAX) continue; // network → retry once
      break;
    }
  }
  const isAbort = (lastErr as any)?.name === 'AbortError';
  if (isAbort) throw new BYOKError('timeout', `Request exceeded ${TIMEOUT_MS / 1000}s timeout.`);
  throw new BYOKError('network', 'Network request failed.', lastErr instanceof Error ? lastErr.message : String(lastErr));
}

export async function runBYOK(
  config: BYOKConfig,
  output: string,
  heuristicSignals?: AnalysisSignal[]
): Promise<ByokResult> {
  validateConfig(config);
  const userMessage = buildInstruction(output, heuristicSignals);

  let raw = '';
  switch (config.provider) {
    case 'openai':
    case 'custom':
      raw = await callOpenAICompatible(config, userMessage); break;
    case 'anthropic':
      raw = await callAnthropic(config, userMessage); break;
    case 'ollama':
      raw = await callOllama(config, userMessage); break;
  }

  const parsed = safeParse(raw);
  if (!parsed.systemPrompt && !parsed.userPrompt && !parsed.reusableTemplate) {
    throw new BYOKError('schema', 'Provider returned no parseable prompt.', raw.slice(0, 200));
  }
  return {
    systemPrompt: parsed.systemPrompt || '(model returned no system prompt)',
    userPrompt: parsed.userPrompt || '(model returned no user prompt)',
    reusableTemplate: parsed.reusableTemplate || '(model returned no template)',
    raw,
  };
}

export async function validatePrompt(
  config: BYOKConfig,
  inferredSystemPrompt: string,
  inferredUserPrompt: string,
  originalSignals: AnalysisSignal[]
): Promise<ValidationResult> {
  validateConfig(config);
  const composed = `${inferredSystemPrompt}\n\n${inferredUserPrompt}`;

  let raw = '';
  switch (config.provider) {
    case 'openai':
    case 'custom':
      raw = await callOpenAICompatible(config, composed); break;
    case 'anthropic':
      raw = await callAnthropic(config, composed); break;
    case 'ollama':
      raw = await callOllama(config, composed); break;
  }

  const reproducedSignals = analyze(raw);
  const originalIds = new Set(originalSignals.map((s) => s.id));
  const reproducedIds = new Set(reproducedSignals.map((s) => s.id));

  const reproduced = [...originalIds].filter((id) => reproducedIds.has(id));
  const missing = [...originalIds].filter((id) => !reproducedIds.has(id));
  const novel = [...reproducedIds].filter((id) => !originalIds.has(id));
  const intersection = reproduced.length;
  const union = originalIds.size + novel.length;
  const similarity = union === 0 ? 0 : intersection / union;
  const note = originalSignals.length === 0
    ? 'No original signals to validate against.'
    : `Reproduced ${reproduced.length} of ${originalSignals.length} original signals. ${novel.length} new signal(s) appeared.`;

  return {
    similarityScore: similarity,
    reproducedSignals: reproduced,
    missingSignals: missing,
    newSignals: novel,
    rawReproducedOutput: raw.length > 2000 ? raw.slice(0, 2000) + '\n…[truncated]' : raw,
    note,
  };
}

async function callOpenAICompatible(config: BYOKConfig, content: string): Promise<string> {
  const res = await fetchWithTimeoutAndRetry(`${config.endpoint.replace(/\/$/, '')}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
    body: JSON.stringify({ model: config.model, messages: [{ role: 'user', content }], temperature: 0.2 }),
  });
  if (!res.ok) throw new BYOKError('http', `HTTP ${res.status}: ${await safeReadText(res)}`);
  const data = await safeReadJson(res);
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== 'string') throw new BYOKError('schema', 'OpenAI-shaped response missing choices[0].message.content.');
  return text;
}

async function callAnthropic(config: BYOKConfig, content: string): Promise<string> {
  const res = await fetchWithTimeoutAndRetry(`${config.endpoint.replace(/\/$/, '')}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model: config.model, max_tokens: 2000, messages: [{ role: 'user', content }] }),
  });
  if (!res.ok) throw new BYOKError('http', `HTTP ${res.status}: ${await safeReadText(res)}`);
  const data = await safeReadJson(res);
  const text = data?.content?.[0]?.text;
  if (typeof text !== 'string') throw new BYOKError('schema', 'Anthropic-shaped response missing content[0].text.');
  return text;
}

async function callOllama(config: BYOKConfig, content: string): Promise<string> {
  const res = await fetchWithTimeoutAndRetry(`${config.endpoint.replace(/\/$/, '')}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: config.model, stream: false, messages: [{ role: 'user', content }] }),
  });
  if (!res.ok) throw new BYOKError('http', `HTTP ${res.status}: ${await safeReadText(res)}`);
  const data = await safeReadJson(res);
  const text = data?.message?.content;
  if (typeof text !== 'string') throw new BYOKError('schema', 'Ollama-shaped response missing message.content.');
  return text;
}

async function safeReadText(res: Response): Promise<string> {
  try { return await res.text(); } catch { return '<unreadable>'; }
}
async function safeReadJson(res: Response): Promise<any> {
  try { return await res.json(); } catch (e) { throw new BYOKError('parse', 'Response was not valid JSON.', e instanceof Error ? e.message : ''); }
}

function safeParse(raw: string): { systemPrompt?: string; userPrompt?: string; reusableTemplate?: string } {
  if (!raw) return {};
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  try { return JSON.parse(cleaned); } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try { return JSON.parse(cleaned.slice(start, end + 1)); } catch { /* fall through */ }
    }
    return {};
  }
}

export const DEFAULT_ENDPOINTS: Record<BYOKConfig['provider'], string> = {
  openai: 'https://api.openai.com',
  anthropic: 'https://api.anthropic.com',
  ollama: 'http://localhost:11434',
  custom: '',
};

export const DEFAULT_MODELS: Record<BYOKConfig['provider'], string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-haiku-4-5-20251001',
  ollama: 'llama3.1:8b',
  custom: '',
};
