import { useState } from 'react';
import {
  AlertTriangle, Check, Copy, Download, FileJson, FileText, Eye, EyeOff,
  ShieldCheck, Sparkles, Layers, ShieldQuestion, Compass, Loader2,
} from 'lucide-react';
import type {
  AnalysisResult, SignalCategory, PromptEvidence, Hypothesis, BYOKConfig,
} from '../types';
import { downloadFile, exportJSON, exportMarkdown } from '../lib/export';
import { cn } from '../lib/utils';

interface Props {
  result: AnalysisResult | null;
  hideDefaulted: boolean;
  onToggleHideDefaulted: () => void;
  onRefine: () => void;
  byok: BYOKConfig | null;
  validating: boolean;
  onValidate: () => void;
}

export function OutputPanel({ result, hideDefaulted, onToggleHideDefaulted, onRefine, byok, validating, onValidate }: Props) {
  if (!result) {
    return (
      <div className="obsidian-card p-8 text-center text-fracture-dim text-sm min-h-[260px] flex items-center justify-center">
        <div>
          <div className="text-3xl mb-3 opacity-40">⌬</div>
          Paste an output on the left and hit{' '}
          <span className="text-violet-glow font-semibold">Reverse-engineer prompt</span>.
          <br /><span className="text-xs">All analysis runs locally in your browser.</span>
        </div>
      </div>
    );
  }

  const { gate, hypotheses, domain, relations, confidenceBand } = result.inferred;

  return (
    <div className="space-y-4">
      {gate.gated ? <GateNotice result={result} /> : (
        <>
          <ConfidenceBar result={result} />
          {confidenceBand && (
            <p className="text-xs -mt-2 px-1 leading-snug">
              <span className="font-semibold" style={{ color: confidenceBand.cssColor }}>{confidenceBand.label}.</span>
              <span className="text-fracture-dim ml-1">{confidenceBand.description}</span>
            </p>
          )}
          {domain && domain.confidence > 0 && <DomainBadge result={result} />}
          {relations && relations.some((r) => r.kind === 'conflict') && <ConflictNotice result={result} />}
        </>
      )}

      {!gate.gated && (
        <>
          <ActionsRow
            hideDefaulted={hideDefaulted}
            onToggleHideDefaulted={onToggleHideDefaulted}
            onRefine={onRefine}
            canValidate={!!byok && result.mode === 'heuristic'}
            onValidate={onValidate}
            validating={validating}
          />
          {hypotheses && hypotheses.length > 0 && <HypothesisTabs hypotheses={hypotheses} />}
          <Section title="Primary system prompt" content={result.inferred.systemPrompt} />
          <Section title="Primary user prompt" content={result.inferred.userPrompt} />
          <Section title="Reusable template" content={result.inferred.reusableTemplate} accent />
          {relations && relations.length > 0 && <RelationsPanel result={result} />}
          <EvidencePanel result={result} />
          <SignalsBlock result={result} />
          {result.validation && <ValidationPanel v={result.validation} />}
          <ExportBlock result={result} />
        </>
      )}
      {gate.gated && <SignalsBlock result={result} />}
    </div>
  );
}

function GateNotice({ result }: { result: AnalysisResult }) {
  const { gate } = result.inferred;
  return (
    <div className="obsidian-card p-5 ring-1 ring-amber-300/40">
      <div className="flex items-start gap-3">
        <AlertTriangle size={20} className="text-amber-300 shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-bold text-amber-200 uppercase tracking-[0.18em] mb-1.5">Inference gated</h3>
          <p className="text-xs text-fracture leading-relaxed mb-2">{gate.reason}</p>
          <p className="text-xs text-fracture-dim leading-relaxed">
            NYTHIS Obsidian refuses to fabricate a prompt when there isn't enough signal. Add at least{' '}
            <span className="text-fracture font-semibold">50 more words</span> for a confident inference.
          </p>
          <div className="flex flex-wrap gap-4 mt-3 text-[11px] text-fracture-dim font-mono">
            <span>signals: {gate.detectedCount} / {gate.minRequiredSignals}</span>
            <span>confidence: {Math.round(gate.aggregateConfidence * 100)}% / {Math.round(gate.minRequiredConfidence * 100)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfidenceBar({ result }: { result: AnalysisResult }) {
  const pct = Math.round(result.inferred.confidence * 100);
  return (
    <div className="obsidian-card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-[0.2em] text-fracture-dim">Aggregate confidence</span>
        <span className="text-sm font-bold text-violet-glow font-mono">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-obsidian-800 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-violet-ember via-violet-ignite to-violet-glow transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      {result.inferred.modelHint && (
        <p className="text-xs text-fracture-dim mt-2"><span className="text-violet-glow">Model hint:</span> {result.inferred.modelHint}</p>
      )}
    </div>
  );
}

function DomainBadge({ result }: { result: AnalysisResult }) {
  const d = result.inferred.domain;
  if (!d || d.confidence === 0) return null;
  return (
    <div className="obsidian-card p-3 flex items-center gap-3">
      <Compass size={16} className="text-violet-glow shrink-0" />
      <div className="flex-1 text-xs">
        <span className="text-fracture-dim uppercase tracking-wider mr-2">Domain:</span>
        <span className="text-fracture font-semibold">{d.domain}</span>
        <span className="text-fracture-dim font-mono ml-2">{Math.round(d.confidence * 100)}%</span>
        {d.evidence.length > 0 && <span className="text-fracture-dim ml-2 hidden sm:inline">— {d.evidence.join(', ')}</span>}
      </div>
    </div>
  );
}

function ConflictNotice({ result }: { result: AnalysisResult }) {
  const conflicts = result.inferred.relations?.filter((r) => r.kind === 'conflict') ?? [];
  if (conflicts.length === 0) return null;
  return (
    <div className="obsidian-card p-3 ring-1 ring-amber-300/30">
      <div className="flex items-start gap-2">
        <ShieldQuestion size={16} className="text-amber-300 shrink-0 mt-0.5" />
        <div className="text-xs">
          <span className="text-amber-200 font-semibold uppercase tracking-wider mr-2">Signal conflict</span>
          <span className="text-fracture-dim">{conflicts[0].description}</span>
        </div>
      </div>
    </div>
  );
}

function ActionsRow({ hideDefaulted, onToggleHideDefaulted, onRefine, canValidate, onValidate, validating }: {
  hideDefaulted: boolean; onToggleHideDefaulted: () => void; onRefine: () => void;
  canValidate: boolean; onValidate: () => void; validating: boolean;
}) {
  return (
    <div className="obsidian-card p-3 flex items-center justify-between flex-wrap gap-2">
      <div className="flex items-center gap-2 text-xs">
        <ShieldCheck size={14} className="text-violet-glow" />
        <span className="text-fracture-dim">
          Honesty: {hideDefaulted ? <span className="text-fracture font-semibold">strict</span> : <span className="text-fracture font-semibold">transparent</span>}
        </span>
      </div>
      <div className="flex gap-2 flex-wrap">
        <button onClick={onToggleHideDefaulted} className="obsidian-button-ghost text-xs focus-visible:ring-2 focus-visible:ring-violet-glow focus-visible:outline-none">
          {hideDefaulted ? <Eye size={12} /> : <EyeOff size={12} />}
          {hideDefaulted ? 'Show defaulted' : 'Hide defaulted'}
        </button>
        <button onClick={onRefine} className="obsidian-button-ghost text-xs focus-visible:ring-2 focus-visible:ring-violet-glow focus-visible:outline-none">
          <Sparkles size={12} /> Refine
        </button>
        {canValidate && (
          <button onClick={onValidate} disabled={validating} className="obsidian-button-ghost text-xs focus-visible:ring-2 focus-visible:ring-violet-glow focus-visible:outline-none" title="Re-runs the inferred prompt through your BYOK provider, then compares signals">
            {validating ? <Loader2 size={12} className="animate-spin" /> : <ShieldQuestion size={12} />}
            {validating ? 'Validating…' : 'Validate'}
          </button>
        )}
      </div>
    </div>
  );
}

function HypothesisTabs({ hypotheses }: { hypotheses: Hypothesis[] }) {
  const [active, setActive] = useState(0);
  const h = hypotheses[active];
  return (
    <div className="obsidian-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Layers size={14} className="text-violet-glow" />
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-fracture">Prompt hypotheses ({hypotheses.length})</h3>
      </div>
      <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
        {hypotheses.map((hy, i) => (
          <button
            key={hy.kind}
            onClick={() => setActive(i)}
            className={cn(
              'text-xs px-3 py-1.5 rounded-md font-semibold whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-violet-glow focus-visible:outline-none',
              i === active
                ? 'bg-gradient-to-b from-violet-ignite to-violet-ember text-white'
                : 'bg-obsidian-800/60 text-fracture-dim hover:text-fracture border border-violet-ash/30'
            )}
          >
            {hy.label}
            <span className="ml-1.5 font-mono opacity-70">{Math.round(hy.confidence * 100)}%</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-fracture-dim mb-2 italic">{h.rationale}</p>
      <div className="space-y-2">
        <Mini title="System" body={h.systemPrompt} />
        <Mini title="User" body={h.userPrompt} />
      </div>
    </div>
  );
}

function Mini({ title, body }: { title: string; body: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-[0.2em] text-violet-glow font-semibold">{title}</span>
        <button onClick={async () => { try { await navigator.clipboard.writeText(body); setCopied(true); setTimeout(() => setCopied(false), 1200); } catch {} }} className="text-fracture-dim hover:text-white">
          {copied ? <Check size={11} /> : <Copy size={11} />}
        </button>
      </div>
      <pre className="text-[11px] font-mono text-fracture whitespace-pre-wrap leading-relaxed bg-obsidian-950/60 border border-violet-ash/20 rounded-md p-2 max-h-[200px] overflow-auto">{body}</pre>
    </div>
  );
}

function Section({ title, content, accent }: { title: string; content: string; accent?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {} };
  return (
    <div className={cn('obsidian-card p-4', accent && 'ring-1 ring-violet-glow/30')}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-fracture">{title}</h3>
        <button onClick={copy} className="obsidian-button-ghost text-xs focus-visible:ring-2 focus-visible:ring-violet-glow focus-visible:outline-none">
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="text-xs font-mono text-fracture whitespace-pre-wrap break-words leading-relaxed bg-obsidian-950/60 border border-violet-ash/20 rounded-md p-3 max-h-[400px] overflow-auto">{content}</pre>
    </div>
  );
}

function RelationsPanel({ result }: { result: AnalysisResult }) {
  const rels = result.inferred.relations ?? [];
  if (rels.length === 0) return null;
  return (
    <div className="obsidian-card p-4">
      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-fracture mb-2">Cross-signal reasoning · {rels.length}</h3>
      <ul className="space-y-1.5">
        {rels.map((r, i) => (
          <li key={i} className="text-xs flex items-start gap-2">
            <span className={cn('font-mono text-[10px] mt-0.5 shrink-0 min-w-[80px] uppercase tracking-wider font-semibold', r.kind === 'conflict' ? 'text-amber-300' : 'text-violet-glow')}>{r.kind}</span>
            <span className="text-fracture leading-snug">{r.description}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EvidencePanel({ result }: { result: AnalysisResult }) {
  const ev = result.inferred.evidence;
  return (
    <div className="obsidian-card p-4">
      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-fracture mb-2">Why this prompt · evidence trace</h3>
      <ul className="space-y-1.5">{ev.map((e, i) => <EvidenceRow key={i} ev={e} />)}</ul>
    </div>
  );
}

function EvidenceRow({ ev }: { ev: PromptEvidence }) {
  const conf = ev.sourceConfidence != null ? Math.round(ev.sourceConfidence * 100) : null;
  return (
    <li className="text-xs flex items-start gap-2 leading-snug">
      <span className={cn('font-mono text-[10px] mt-0.5 shrink-0 min-w-[60px]', ev.defaulted ? 'text-amber-300' : 'text-violet-glow')}>
        {ev.defaulted ? 'DEFAULT' : (conf != null ? `${conf}%` : 'INFER')}
      </span>
      <span>
        <span className="text-fracture-dim uppercase text-[10px] tracking-wider mr-1.5">{ev.category}:</span>
        <span className={ev.defaulted ? 'text-fracture-dim italic' : 'text-fracture'}>{ev.line}</span>
        {ev.detail && !ev.defaulted && <span className="text-fracture-dim"> — {ev.detail}</span>}
      </span>
    </li>
  );
}

const CATEGORY_LABEL: Record<SignalCategory, string> = {
  tone: 'Tone', structure: 'Structure', constraints: 'Constraints',
  schema: 'Schema', persona: 'Persona', format: 'Format',
};

function SignalsBlock({ result }: { result: AnalysisResult }) {
  const grouped = result.signals.reduce<Record<string, typeof result.signals>>((m, s) => { (m[s.category] ||= []).push(s); return m; }, {});
  return (
    <div className="obsidian-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-fracture">Signals detected · {result.signals.length}</h3>
      </div>
      {result.signals.length === 0 ? (
        <p className="text-xs text-fracture-dim">No signals detected.</p>
      ) : (
        <div className="space-y-3">
          {(Object.keys(CATEGORY_LABEL) as SignalCategory[]).map((cat) =>
            grouped[cat]?.length ? (
              <div key={cat}>
                <div className="text-[10px] uppercase tracking-[0.2em] text-violet-glow mb-1.5 font-semibold">{CATEGORY_LABEL[cat]}</div>
                <ul className="space-y-1.5">
                  {grouped[cat].map((s) => (
                    <li key={s.id} className="text-xs flex items-start gap-2">
                      <span className="font-mono text-fracture-dim text-[10px] mt-0.5 shrink-0">{Math.round(s.confidence * 100)}%</span>
                      <span><span className="text-fracture font-semibold">{s.label}</span> <span className="text-fracture-dim">— {s.detail}</span></span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}

function ValidationPanel({ v }: { v: NonNullable<AnalysisResult['validation']> }) {
  const pct = Math.round(v.similarityScore * 100);
  return (
    <div className="obsidian-card p-4 ring-1 ring-violet-glow/30">
      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-fracture mb-2">Prompt validation</h3>
      <div className="flex items-center gap-3 mb-2">
        <div className="flex-1 h-1.5 rounded-full bg-obsidian-800 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-violet-ember to-violet-glow" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-sm font-bold text-violet-glow font-mono">{pct}%</span>
      </div>
      <p className="text-xs text-fracture-dim mb-2">{v.note}</p>
      <details className="text-xs">
        <summary className="text-violet-glow cursor-pointer">Show reproduced output</summary>
        <pre className="text-[11px] font-mono text-fracture mt-2 whitespace-pre-wrap bg-obsidian-950/60 border border-violet-ash/20 rounded-md p-2 max-h-[200px] overflow-auto">{v.rawReproducedOutput}</pre>
      </details>
    </div>
  );
}

function ExportBlock({ result }: { result: AnalysisResult }) {
  const ts = new Date(result.timestamp).toISOString().replace(/[:.]/g, '-');
  return (
    <div className="obsidian-card p-4 flex flex-wrap items-center justify-between gap-3">
      <span className="text-xs uppercase tracking-[0.2em] text-fracture-dim">Export</span>
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => downloadFile(`nythis-${ts}.json`, exportJSON(result), 'application/json')} className="obsidian-button-ghost text-xs">
          <FileJson size={14} /> JSON
        </button>
        <button onClick={() => downloadFile(`nythis-${ts}.md`, exportMarkdown(result), 'text/markdown')} className="obsidian-button-ghost text-xs">
          <FileText size={14} /> Markdown
        </button>
        <button onClick={async () => { try { await navigator.clipboard.writeText(exportMarkdown(result)); } catch {} }} className="obsidian-button-ghost text-xs">
          <Download size={14} /> Copy MD
        </button>
      </div>
    </div>
  );
}
