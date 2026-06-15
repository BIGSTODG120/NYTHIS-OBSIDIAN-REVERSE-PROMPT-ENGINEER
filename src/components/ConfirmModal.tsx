// v1.4 — Generic confirmation modal for destructive actions

import { AlertTriangle, X } from 'lucide-react';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmModal({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger, onConfirm, onClose }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] bg-obsidian-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`obsidian-card w-full max-w-md p-5 ${danger ? 'ring-1 ring-amber-300/40' : ''}`}>
        <div className="flex items-start justify-between mb-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            {danger && <AlertTriangle size={16} className="text-amber-300" />}
            {title}
          </h2>
          <button onClick={onClose} className="text-fracture-dim hover:text-white"><X size={18} /></button>
        </div>
        <p className="text-xs text-fracture-dim leading-relaxed mb-5">{message}</p>
        <div className="flex gap-2">
          <button onClick={onClose} className="obsidian-button-ghost flex-1 text-xs">{cancelLabel}</button>
          <button onClick={() => { onConfirm(); onClose(); }} className={`obsidian-button flex-1 text-xs ${danger ? '' : ''}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
