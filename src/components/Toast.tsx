// v1.4 — Minimal toast system. Replaces silent failures.
// Self-dismisses, click to dismiss, stacks bottom-right.

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

type ToastKind = 'info' | 'success' | 'error';
interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
  action?: { label: string; onClick: () => void };
}

interface ToastCtx {
  push: (kind: ToastKind, message: string, opts?: { action?: Toast['action']; durationMs?: number }) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback<ToastCtx['push']>((kind, message, opts) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((cur) => [...cur, { id, kind, message, action: opts?.action }]);
    const duration = opts?.durationMs ?? (opts?.action ? 6000 : 4000);
    setTimeout(() => setToasts((cur) => cur.filter((t) => t.id !== id)), duration);
  }, []);

  const dismiss = (id: string) => setToasts((cur) => cur.filter((t) => t.id !== id));

  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm" aria-live="polite">
        {toasts.map((t) => <ToastItem key={t.id} t={t} onClose={() => dismiss(t.id)} />)}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

function ToastItem({ t, onClose }: { t: Toast; onClose: () => void }) {
  const icon = t.kind === 'error' ? <AlertTriangle size={16} /> : t.kind === 'success' ? <CheckCircle2 size={16} /> : <Info size={16} />;
  const color = t.kind === 'error' ? 'ring-amber-300/40 text-amber-200' : t.kind === 'success' ? 'ring-violet-glow/40 text-violet-glow' : 'ring-fracture-dim/30 text-fracture';
  return (
    <div className={`obsidian-card p-3 ring-1 ${color} text-xs flex items-start gap-2 animate-in fade-in slide-in-from-right-2`}>
      <span className="shrink-0 mt-0.5">{icon}</span>
      <span className="flex-1 text-fracture leading-snug">{t.message}</span>
      {t.action && (
        <button onClick={() => { t.action!.onClick(); onClose(); }} className="text-violet-glow font-semibold whitespace-nowrap hover:underline">
          {t.action.label}
        </button>
      )}
      <button onClick={onClose} className="text-fracture-dim hover:text-white shrink-0"><X size={12} /></button>
    </div>
  );
}
