import { Cpu, KeyRound } from 'lucide-react';
import { cn } from '../lib/utils';
import type { Mode } from '../types';

interface Props {
  mode: Mode;
  onChange: (m: Mode) => void;
  byokConfigured: boolean;
}

export function ModeSelector({ mode, onChange, byokConfigured }: Props) {
  return (
    <div className="inline-flex rounded-lg border border-violet-ash/30 bg-obsidian-900/60 p-1">
      <Tab
        active={mode === 'heuristic'}
        onClick={() => onChange('heuristic')}
        icon={<Cpu size={14} />}
        label="Heuristic"
        sub="60 rules · offline"
      />
      <Tab
        active={mode === 'byok'}
        onClick={() => onChange('byok')}
        icon={<KeyRound size={14} />}
        label="BYOK"
        sub={byokConfigured ? 'configured' : 'unconfigured'}
        warn={mode === 'byok' && !byokConfigured}
      />
    </div>
  );
}

function Tab({
  active,
  onClick,
  icon,
  label,
  sub,
  warn,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  sub: string;
  warn?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex flex-col items-start gap-0',
        active
          ? 'bg-gradient-to-b from-violet-ignite to-violet-ember text-white shadow-ignite'
          : 'text-fracture-dim hover:text-fracture hover:bg-obsidian-800/60'
      )}
    >
      <span className="inline-flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span className={cn('text-[10px] uppercase tracking-wider opacity-70', warn && 'text-amber-300 opacity-100')}>
        {sub}
      </span>
    </button>
  );
}
