// Upgrade #6 — Refinement Loop
// Lets the user re-run the prompt builder with forced priors (domain, platform, persona)

import { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import type { Domain, RefinementOverrides } from '../types';

const DOMAIN_OPTIONS: { value: Domain; label: string }[] = [
  { value: 'technical', label: 'Technical / engineering' },
  { value: 'creative', label: 'Creative / narrative' },
  { value: 'business', label: 'Business / strategy' },
  { value: 'educational', label: 'Educational / explainer' },
  { value: 'conversational', label: 'Conversational' },
];

const PLATFORM_OPTIONS = [
  { value: 'chatgpt' as const, label: 'ChatGPT (OpenAI)' },
  { value: 'claude' as const, label: 'Claude (Anthropic)' },
  { value: 'gemini' as const, label: 'Gemini (Google)' },
  { value: 'local' as const, label: 'Local / open model' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onApply: (overrides: RefinementOverrides) => void;
  current?: RefinementOverrides;
}

export function RefinePanel({ open, onClose, onApply, current }: Props) {
  const [domain, setDomain] = useState<Domain | ''>(current?.forcedDomain ?? '');
  const [platform, setPlatform] = useState<'chatgpt' | 'claude' | 'gemini' | 'local' | ''>(current?.forcedPlatform ?? '');
  const [persona, setPersona] = useState(current?.forcedPersona ?? '');

  if (!open) return null;

  const apply = () => {
    const overrides: RefinementOverrides = {};
    if (domain) overrides.forcedDomain = domain;
    if (platform) overrides.forcedPlatform = platform;
    if (persona.trim()) overrides.forcedPersona = persona.trim();
    onApply(overrides);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-obsidian-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="obsidian-card w-full max-w-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles size={16} className="text-violet-glow" />
              Refine analysis
            </h2>
            <p className="text-xs text-fracture-dim mt-1">
              Force priors to test alternative interpretations. Re-runs the engine without re-pasting.
            </p>
          </div>
          <button onClick={onClose} className="text-fracture-dim hover:text-white"><X size={20} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-fracture-dim mb-1.5 block">Force domain</label>
            <select value={domain} onChange={(e) => setDomain(e.target.value as Domain | '')} className="obsidian-input">
              <option value="">— Use detected domain —</option>
              {DOMAIN_OPTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-fracture-dim mb-1.5 block">Force platform</label>
            <select value={platform} onChange={(e) => setPlatform(e.target.value as any)} className="obsidian-input">
              <option value="">— Use detected hint —</option>
              {PLATFORM_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-fracture-dim mb-1.5 block">Force persona (free text)</label>
            <input type="text" value={persona} onChange={(e) => setPersona(e.target.value)} placeholder="e.g. a senior infrastructure engineer" className="obsidian-input" />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={() => { setDomain(''); setPlatform(''); setPersona(''); onApply({}); onClose(); }} className="obsidian-button-ghost flex-1">
            Reset
          </button>
          <button onClick={apply} className="obsidian-button flex-1">
            Apply & re-run
          </button>
        </div>
      </div>
    </div>
  );
}
