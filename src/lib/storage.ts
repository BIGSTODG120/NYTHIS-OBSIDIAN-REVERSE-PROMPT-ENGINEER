// v1.4 — Hardened storage with schema versioning, migration, quota handling.

import type { AnalysisResult, AppSettings } from '../types';
import { logError } from './errorLog';

const KEY_HISTORY = 'nythis.obsidian.history';
const KEY_SETTINGS = 'nythis.obsidian.settings';
const KEY_VERSION = 'nythis.obsidian.schemaVersion';
const SCHEMA_VERSION = 4; // bumped when shape changes
const MAX_HISTORY = 50;

interface StoredHistory {
  v: number;
  items: AnalysisResult[];
}

interface StoredSettings {
  v: number;
  data: AppSettings;
}

// === MIGRATION ===
// Older formats had no version field. New format wraps in { v, items|data }.
// Old entries lack v1.3+ fields — we fill safe defaults so the UI doesn't crash.

function migrateHistoryEntry(e: any): AnalysisResult | null {
  if (!e || typeof e !== 'object') return null;
  // Required v1.0 fields
  if (!e.id || !e.timestamp || !e.inferred || !e.signals) return null;
  // Ensure v1.2/v1.3 fields exist (don't fabricate, just allow undefined / safe defaults)
  if (!e.inferred.gate) {
    e.inferred.gate = {
      gated: false, detectedCount: e.signals.length, aggregateConfidence: e.inferred.confidence ?? 0,
      minRequiredSignals: 3, minRequiredConfidence: 0.5,
    };
  }
  if (!Array.isArray(e.inferred.evidence)) e.inferred.evidence = [];
  if (!Array.isArray(e.inferred.defaultedCategories)) e.inferred.defaultedCategories = [];
  if (typeof e.inferred.topic !== 'string') e.inferred.topic = '{{TOPIC}}';
  if (typeof e.inferred.topicDefaulted !== 'boolean') e.inferred.topicDefaulted = true;
  return e as AnalysisResult;
}

export function loadHistory(): AnalysisResult[] {
  try {
    const raw = localStorage.getItem(KEY_HISTORY);
    if (!raw) return [];
    let parsed: any;
    try { parsed = JSON.parse(raw); } catch (e) {
      logError({ timestamp: Date.now(), message: 'History JSON malformed; resetting.', source: 'storage', stack: String(e) });
      localStorage.removeItem(KEY_HISTORY);
      return [];
    }
    // Legacy: raw array
    if (Array.isArray(parsed)) {
      return parsed.map((e: any) => migrateHistoryEntry(e)).filter((x: AnalysisResult | null): x is AnalysisResult => x !== null);
    }
    // Versioned: { v, items }
    if (parsed && Array.isArray(parsed.items)) {
      return parsed.items.map((e: any) => migrateHistoryEntry(e)).filter((x: AnalysisResult | null): x is AnalysisResult => x !== null);
    }
    return [];
  } catch (e) {
    logError({ timestamp: Date.now(), message: 'loadHistory failed', source: 'storage', stack: e instanceof Error ? e.stack : String(e) });
    return [];
  }
}

export function saveHistory(items: AnalysisResult[]) {
  const trimmed = items.slice(0, MAX_HISTORY);
  const payload: StoredHistory = { v: SCHEMA_VERSION, items: trimmed };
  try {
    localStorage.setItem(KEY_HISTORY, JSON.stringify(payload));
  } catch (e) {
    // Quota exceeded — drop the oldest half and retry once
    const half = trimmed.slice(0, Math.max(1, Math.floor(trimmed.length / 2)));
    try {
      localStorage.setItem(KEY_HISTORY, JSON.stringify({ v: SCHEMA_VERSION, items: half }));
      logError({ timestamp: Date.now(), message: 'Storage quota exceeded; pruned history to half.', source: 'storage' });
    } catch (e2) {
      logError({ timestamp: Date.now(), message: 'Storage quota exceeded; history NOT saved.', source: 'storage', stack: e2 instanceof Error ? e2.stack : String(e2) });
    }
  }
}

export function appendHistory(item: AnalysisResult): AnalysisResult[] {
  const current = loadHistory();
  const next = [item, ...current].slice(0, MAX_HISTORY);
  saveHistory(next);
  return next;
}

export function clearHistory() {
  try { localStorage.removeItem(KEY_HISTORY); } catch { /* noop */ }
}

function migrateSettings(data: any): AppSettings {
  const defaults = defaultSettings();
  if (!data || typeof data !== 'object') return defaults;
  return {
    mode: data.mode === 'byok' || data.mode === 'heuristic' ? data.mode : defaults.mode,
    byok: data.byok ?? defaults.byok,
    showEvidence: typeof data.showEvidence === 'boolean' ? data.showEvidence : defaults.showEvidence,
    hideDefaulted: typeof data.hideDefaulted === 'boolean' ? data.hideDefaulted : defaults.hideDefaulted,
    primeBYOK: typeof data.primeBYOK === 'boolean' ? data.primeBYOK : defaults.primeBYOK,
  };
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY_SETTINGS);
    if (!raw) return defaultSettings();
    let parsed: any;
    try { parsed = JSON.parse(raw); } catch (e) {
      logError({ timestamp: Date.now(), message: 'Settings JSON malformed; resetting.', source: 'storage' });
      localStorage.removeItem(KEY_SETTINGS);
      return defaultSettings();
    }
    // Legacy: raw object
    if (parsed && !('data' in parsed) && !('v' in parsed)) return migrateSettings(parsed);
    // Versioned
    if (parsed && 'data' in parsed) return migrateSettings(parsed.data);
    return defaultSettings();
  } catch (e) {
    logError({ timestamp: Date.now(), message: 'loadSettings failed', source: 'storage' });
    return defaultSettings();
  }
}

export function saveSettings(s: AppSettings) {
  const payload: StoredSettings = { v: SCHEMA_VERSION, data: s };
  try { localStorage.setItem(KEY_SETTINGS, JSON.stringify(payload)); } catch (e) {
    logError({ timestamp: Date.now(), message: 'saveSettings failed', source: 'storage' });
  }
}

export function defaultSettings(): AppSettings {
  return { mode: 'heuristic', byok: null, showEvidence: true, hideDefaulted: false, primeBYOK: true };
}

// Schema version stamp — useful for debug page
export function getSchemaVersion(): number {
  try {
    const v = localStorage.getItem(KEY_VERSION);
    return v ? parseInt(v, 10) : 0;
  } catch { return 0; }
}
export function setSchemaVersion() {
  try { localStorage.setItem(KEY_VERSION, String(SCHEMA_VERSION)); } catch { /* noop */ }
}
