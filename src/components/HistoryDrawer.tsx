import { Clock, Trash2, X } from 'lucide-react';
import type { AnalysisResult } from '../types';
import { truncate } from '../lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  items: AnalysisResult[];
  onSelect: (r: AnalysisResult) => void;
  onRequestClear: () => void;
}

export function HistoryDrawer({ open, onClose, items, onSelect, onRequestClear }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-obsidian-950/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="w-full max-w-sm bg-obsidian-900 border-l border-violet-ash/40 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-violet-ash/30">
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-fracture flex items-center gap-2">
            <Clock size={14} /> History
          </h3>
          <div className="flex gap-2">
            {items.length > 0 && (
              <button onClick={onRequestClear} className="obsidian-button-ghost text-xs focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:outline-none" aria-label="Clear all history">
                <Trash2 size={12} />
              </button>
            )}
            <button onClick={onClose} className="text-fracture-dim hover:text-white focus-visible:ring-2 focus-visible:ring-violet-glow focus-visible:outline-none rounded" aria-label="Close history"><X size={20} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-3 space-y-2">
          {items.length === 0 ? (
            <p className="text-xs text-fracture-dim p-4 text-center">No saved analyses yet.</p>
          ) : (
            items.map((r) => (
              <button
                key={r.id}
                onClick={() => { onSelect(r); onClose(); }}
                className="w-full text-left obsidian-card p-3 hover:border-violet-glow/50 transition-all focus-visible:ring-2 focus-visible:ring-violet-glow focus-visible:outline-none"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-violet-glow font-semibold">{r.mode} · {r.inputKind}</span>
                  <span className="text-[10px] text-fracture-dim font-mono">{Math.round(r.inferred.confidence * 100)}%</span>
                </div>
                <p className="text-xs text-fracture leading-snug break-words">{truncate(r.inputPreview, 120)}</p>
                <p className="text-[10px] text-fracture-dim mt-1.5">{new Date(r.timestamp).toLocaleString()}</p>
              </button>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
