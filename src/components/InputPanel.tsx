import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Sparkles, Trash2, Lightbulb, AlertTriangle, X } from 'lucide-react';
import { captionImage } from '../engine/imageCaption';
import { checkInputBounds, MAX_INPUT_CHARS } from '../engine/analyzer';
import { DEMO_EXAMPLES } from '../lib/examples';
import { useToast } from './Toast';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onAnalyze: () => void;
  analyzing: boolean;
  disabled?: boolean;
}

export function InputPanel({ value, onChange, onAnalyze, analyzing, disabled }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [captionLoading, setCaptionLoading] = useState(false);
  const [captionStatus, setCaptionStatus] = useState('');
  const [showExamples, setShowExamples] = useState(false);
  const captionAbortRef = useRef<AbortController | null>(null);
  const toast = useToast();

  const bounds = checkInputBounds(value);

  const handleImage = async (file: File) => {
    setCaptionStatus('Starting…');
    setCaptionLoading(true);
    captionAbortRef.current = new AbortController();
    try {
      const caption = await captionImage(file, setCaptionStatus);
      const prefix = value.trim() ? value.trim() + '\n\n' : '';
      onChange(`${prefix}[Image: ${file.name}] ${caption}`);
      setCaptionStatus('Caption added.');
      toast.push('success', 'Image captioned successfully.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Image captioning failed.';
      toast.push('error', msg);
      setCaptionStatus('');
    } finally {
      setCaptionLoading(false);
      captionAbortRef.current = null;
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleImage(file);
    e.target.value = '';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (value.trim() && !analyzing && !disabled) onAnalyze();
    }
  };

  return (
    <div className="obsidian-card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-fracture">Input</h2>
        <div className="flex gap-2 flex-wrap">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
          <button
            type="button"
            onClick={() => setShowExamples((s) => !s)}
            className="obsidian-button-ghost text-xs focus-visible:ring-2 focus-visible:ring-violet-glow focus-visible:outline-none"
          >
            <Lightbulb size={14} /> Examples
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={captionLoading || disabled}
            className="obsidian-button-ghost text-xs focus-visible:ring-2 focus-visible:ring-violet-glow focus-visible:outline-none"
            title="Add an image — will be captioned in your browser"
          >
            {captionLoading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
            Image
          </button>
          <button
            type="button"
            onClick={() => onChange('')}
            disabled={!value || disabled}
            className="obsidian-button-ghost text-xs focus-visible:ring-2 focus-visible:ring-violet-glow focus-visible:outline-none"
            aria-label="Clear input"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {showExamples && (
        <div className="space-y-2 border border-violet-ash/30 rounded-lg p-3 bg-obsidian-950/40">
          <p className="text-[11px] text-fracture-dim uppercase tracking-wider">Try a demo example:</p>
          {DEMO_EXAMPLES.map((ex) => (
            <button
              key={ex.id}
              onClick={() => { onChange(ex.text); setShowExamples(false); }}
              className="w-full text-left p-2 rounded-md hover:bg-obsidian-800/60 border border-transparent hover:border-violet-glow/30 transition-all"
            >
              <div className="text-xs font-semibold text-fracture">{ex.label}</div>
              <div className="text-[11px] text-fracture-dim">{ex.description}</div>
            </button>
          ))}
        </div>
      )}

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={`Paste the output you want to reverse-engineer here.

Examples:
• A response from ChatGPT, Claude, or Gemini
• A piece of marketing copy
• A formatted table or JSON blob
• Code with comments
• A story passage

Tip: Cmd/Ctrl+Enter to analyze.`}
        className="obsidian-input min-h-[260px] resize-y font-mono leading-relaxed focus-visible:ring-2 focus-visible:ring-violet-glow focus-visible:outline-none"
        disabled={disabled}
      />

      {bounds.tooLong && (
        <div className="text-xs text-amber-200 flex items-start gap-2 border border-amber-300/30 rounded-md p-2 bg-amber-950/20">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>Input exceeds {MAX_INPUT_CHARS.toLocaleString()} chars ({bounds.length.toLocaleString()}). Analysis will use the first {MAX_INPUT_CHARS.toLocaleString()} characters.</span>
        </div>
      )}

      {captionStatus && (
        <div className="text-xs text-violet-glow flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            {captionLoading && <Loader2 size={12} className="animate-spin" />}
            {captionStatus}
          </span>
          {captionLoading && (
            <button
              onClick={() => { captionAbortRef.current?.abort(); setCaptionLoading(false); setCaptionStatus(''); toast.push('info', 'Image captioning cancelled.'); }}
              className="text-fracture-dim hover:text-white"
              aria-label="Cancel image captioning"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
        <span className="text-xs text-fracture-dim">
          {value.length.toLocaleString()} chars · {value.split(/\s+/).filter(Boolean).length.toLocaleString()} words
        </span>
        <button
          type="button"
          onClick={onAnalyze}
          disabled={!value.trim() || analyzing || disabled}
          className="obsidian-button focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none min-h-[44px]"
        >
          {analyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {analyzing ? 'Analyzing…' : 'Reverse-engineer prompt'}
        </button>
      </div>
    </div>
  );
}
