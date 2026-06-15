// v1.4 — Local-only error log. Privacy preserved (no remote).
// Capped at last 20 entries. User can view via footer link.

const KEY = 'nythis.obsidian.errorlog';
const MAX = 20;

export interface ErrorEntry {
  timestamp: number;
  message: string;
  stack?: string;
  componentStack?: string;
  source: 'react-boundary' | 'byok' | 'engine' | 'storage' | 'unknown';
}

export function logError(entry: ErrorEntry) {
  try {
    const raw = localStorage.getItem(KEY);
    const arr: ErrorEntry[] = raw ? JSON.parse(raw) : [];
    arr.unshift(entry);
    localStorage.setItem(KEY, JSON.stringify(arr.slice(0, MAX)));
  } catch {
    // If localStorage is full, drop oldest and retry once
    try { localStorage.setItem(KEY, JSON.stringify([entry])); } catch { /* give up */ }
  }
  if (typeof console !== 'undefined') {
    // eslint-disable-next-line no-console
    console.error(`[NYTHIS:${entry.source}] ${entry.message}`, entry);
  }
}

export function loadErrors(): ErrorEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

export function clearErrors() {
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
}
