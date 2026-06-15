import { useState } from 'react';
import { Lock, X } from 'lucide-react';
import type { BYOKConfig } from '../types';
import { DEFAULT_ENDPOINTS, DEFAULT_MODELS } from '../engine/byok';

interface Props {
  open: boolean;
  onClose: () => void;
  config: BYOKConfig | null;
  onSave: (c: BYOKConfig | null) => void;
  primeBYOK: boolean;
  onTogglePrime: () => void;
}

export function BYOKSettings({ open, onClose, config, onSave, primeBYOK, onTogglePrime }: Props) {
  const [draft, setDraft] = useState<BYOKConfig>(
    config ?? { provider: 'openai', endpoint: DEFAULT_ENDPOINTS.openai, apiKey: '', model: DEFAULT_MODELS.openai }
  );

  if (!open) return null;

  const setProvider = (p: BYOKConfig['provider']) => {
    setDraft({
      provider: p,
      endpoint: DEFAULT_ENDPOINTS[p],
      apiKey: p === 'ollama' ? '' : draft.apiKey,
      model: DEFAULT_MODELS[p],
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-obsidian-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="obsidian-card w-full max-w-lg p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Lock size={16} className="text-violet-glow" />
              Bring-Your-Own-Key
            </h2>
            <p className="text-xs text-fracture-dim mt-1">Key stored in your browser only. Never sent to NYTHIS. Never logged.</p>
          </div>
          <button onClick={onClose} className="text-fracture-dim hover:text-white" aria-label="Close"><X size={20} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-fracture-dim mb-1.5 block">Provider</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['openai', 'anthropic', 'ollama', 'custom'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setProvider(p)}
                  className={`text-xs font-semibold py-2 rounded-md border transition-all capitalize min-h-[44px] focus-visible:ring-2 focus-visible:ring-violet-glow focus-visible:outline-none ${
                    draft.provider === p
                      ? 'bg-violet-ignite/30 border-violet-glow text-white'
                      : 'bg-obsidian-800/60 border-violet-ash/30 text-fracture-dim hover:text-white hover:border-violet-glow/50'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-fracture-dim mb-1.5 block">Endpoint</label>
            <input type="text" value={draft.endpoint} onChange={(e) => setDraft({ ...draft, endpoint: e.target.value })} className="obsidian-input" placeholder="https://api.example.com" />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-fracture-dim mb-1.5 block">
              API key {draft.provider === 'ollama' && <span className="text-fracture-dim/60">(not needed for Ollama)</span>}
            </label>
            <input type="password" value={draft.apiKey} onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })} className="obsidian-input" placeholder={draft.provider === 'ollama' ? 'leave blank' : 'sk-...'} autoComplete="off" disabled={draft.provider === 'ollama'} />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-fracture-dim mb-1.5 block">Model</label>
            <input type="text" value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })} className="obsidian-input" placeholder="model name" />
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={primeBYOK} onChange={onTogglePrime} className="mt-0.5 accent-violet-ignite w-4 h-4 cursor-pointer" />
            <div>
              <div className="text-xs font-semibold text-fracture">Prime BYOK calls with heuristic findings</div>
              <div className="text-[11px] text-fracture-dim leading-relaxed">When on, the heuristic engine's signals are sent to your provider as priors. Higher quality output, slightly larger request.</div>
            </div>
          </label>

          <div className="text-[11px] text-fracture-dim leading-relaxed border border-violet-ash/30 rounded-md p-3 bg-obsidian-950/50">
            <strong className="text-fracture">Local Ollama users:</strong> if calls fail, start Ollama with{' '}
            <code className="text-violet-glow">OLLAMA_ORIGINS="*" ollama serve</code> to allow browser requests.
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={() => { onSave(null); onClose(); }} className="obsidian-button-ghost flex-1">Clear</button>
          <button
            onClick={() => { onSave(draft); onClose(); }}
            className="obsidian-button flex-1"
            disabled={!draft.endpoint || !draft.model || (draft.provider !== 'ollama' && !draft.apiKey)}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
