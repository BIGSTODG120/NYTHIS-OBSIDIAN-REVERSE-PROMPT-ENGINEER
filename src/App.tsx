import { useEffect, useMemo, useState } from 'react';
import { Clock, Settings } from 'lucide-react';
import { Header } from './components/Header';
import { ModeSelector } from './components/ModeSelector';
import { InputPanel } from './components/InputPanel';
import { OutputPanel } from './components/OutputPanel';
import { HistoryDrawer } from './components/HistoryDrawer';
import { BYOKSettings } from './components/BYOKSettings';
import { RefinePanel } from './components/RefinePanel';
import { ConfirmModal } from './components/ConfirmModal';
import { useToast } from './components/Toast';
import { analyze } from './engine/analyzer';
import { buildPrompt } from './engine/promptBuilder';
import { runBYOK, validatePrompt, BYOKError } from './engine/byok';
import {
  appendHistory, clearHistory, defaultSettings, loadHistory, loadSettings, saveSettings, saveHistory, setSchemaVersion,
} from './lib/storage';
import { logError } from './lib/errorLog';
import { truncate, uid } from './lib/utils';
import type { AnalysisResult, AppSettings, RefinementOverrides, ValidationResult } from './types';

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings());
  const [input, setInput] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [validating, setValidating] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showRefine, setShowRefine] = useState(false);
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setSettings(loadSettings());
    setHistory(loadHistory());
    setSchemaVersion();
  }, []);

  useEffect(() => { saveSettings(settings); }, [settings]);

  // Esc closes any open modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showHistory) setShowHistory(false);
        else if (showSettings) setShowSettings(false);
        else if (showRefine) setShowRefine(false);
        else if (confirmClearHistory) setConfirmClearHistory(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showHistory, showSettings, showRefine, confirmClearHistory]);

  const byokConfigured = useMemo(() => {
    if (!settings.byok) return false;
    if (settings.byok.provider === 'ollama') return !!settings.byok.endpoint && !!settings.byok.model;
    return !!settings.byok.apiKey && !!settings.byok.endpoint && !!settings.byok.model;
  }, [settings.byok]);

  const runAnalysis = async (textInput: string, refinement?: RefinementOverrides) => {
    if (!textInput.trim()) return;
    setAnalyzing(true);
    try {
      const inputKind = textInput.startsWith('[Image:') ? 'image' : 'text';

      if (settings.mode === 'byok') {
        if (!byokConfigured || !settings.byok) {
          toast.push('error', 'BYOK mode selected but no provider configured.', {
            action: { label: 'Open settings', onClick: () => setShowSettings(true) },
          });
          return;
        }
        const signals = analyze(textInput);
        const fallback = buildPrompt(textInput, signals, { hideDefaulted: settings.hideDefaulted, refinement });
        try {
          const byokOut = await runBYOK(settings.byok, textInput, settings.primeBYOK ? signals : undefined);
          const newResult: AnalysisResult = {
            id: uid(), timestamp: Date.now(), mode: 'byok', inputKind,
            inputPreview: truncate(textInput, 240), rawInput: textInput, signals,
            inferred: {
              ...fallback,
              systemPrompt: byokOut.systemPrompt,
              userPrompt: byokOut.userPrompt,
              reusableTemplate: byokOut.reusableTemplate,
              confidence: 0.85,
              modelHint: `Generated via BYOK · ${settings.byok.provider} · ${settings.byok.model}${settings.primeBYOK ? ' · primed' : ''}`,
            },
            byokModel: settings.byok.model,
          };
          setResult(newResult);
          setHistory(appendHistory(newResult));
          toast.push('success', 'Analysis complete via BYOK.');
        } catch (err) {
          handleByokError(err);
        }
      } else {
        const signals = analyze(textInput);
        const inferred = buildPrompt(textInput, signals, { hideDefaulted: settings.hideDefaulted, refinement });
        const newResult: AnalysisResult = {
          id: uid(), timestamp: Date.now(), mode: 'heuristic', inputKind,
          inputPreview: truncate(textInput, 240), rawInput: textInput, signals, inferred,
        };
        setResult(newResult);
        setHistory(appendHistory(newResult));
      }
    } catch (err) {
      logError({ timestamp: Date.now(), message: err instanceof Error ? err.message : 'Analysis failed', source: 'engine', stack: err instanceof Error ? err.stack : undefined });
      toast.push('error', err instanceof Error ? err.message : 'Analysis failed.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleByokError = (err: unknown) => {
    if (err instanceof BYOKError) {
      logError({ timestamp: Date.now(), message: `BYOK [${err.kind}]: ${err.message}`, source: 'byok', stack: err.detail });
      const userMsg = (() => {
        switch (err.kind) {
          case 'config': return `Configuration: ${err.message}`;
          case 'timeout': return 'BYOK request timed out after 30s. Check endpoint and try again.';
          case 'network': return 'BYOK network error. Check connection or CORS settings.';
          case 'http': return `BYOK HTTP error: ${err.message}`;
          case 'parse': return 'BYOK response was not valid JSON.';
          case 'schema': return 'BYOK response did not match expected shape.';
        }
      })();
      toast.push('error', userMsg, {
        action: err.kind === 'config' ? { label: 'Open settings', onClick: () => setShowSettings(true) } : undefined,
      });
    } else {
      logError({ timestamp: Date.now(), message: 'Unknown BYOK error', source: 'byok', stack: err instanceof Error ? err.stack : String(err) });
      toast.push('error', err instanceof Error ? err.message : 'BYOK call failed.');
    }
  };

  const handleAnalyze = () => runAnalysis(input);

  const handleRefine = (overrides: RefinementOverrides) => {
    const source = result?.rawInput || input;
    if (!source.trim()) {
      toast.push('error', 'No input to refine. Paste an output first.');
      return;
    }
    void runAnalysis(source, overrides);
  };

  const handleValidate = async () => {
    if (!result || !settings.byok) return;
    setValidating(true);
    try {
      const v: ValidationResult = await validatePrompt(settings.byok, result.inferred.systemPrompt, result.inferred.userPrompt, result.signals);
      const updated = { ...result, validation: v };
      setResult(updated);
      const updatedHistory = history.map((h) => (h.id === result.id ? updated : h));
      setHistory(updatedHistory);
      saveHistory(updatedHistory);
      toast.push('success', `Validation complete: ${Math.round(v.similarityScore * 100)}% signal match.`);
    } catch (err) {
      handleByokError(err);
    } finally {
      setValidating(false);
    }
  };

  const handleClearHistory = () => {
    const backup = history;
    clearHistory();
    setHistory([]);
    toast.push('info', 'History cleared.', {
      durationMs: 6000,
      action: { label: 'Undo', onClick: () => { setHistory(backup); saveHistory(backup); toast.push('success', 'History restored.'); } },
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 mx-auto max-w-6xl w-full px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <ModeSelector mode={settings.mode} onChange={(m) => setSettings({ ...settings, mode: m })} byokConfigured={byokConfigured} />
          <div className="flex gap-2">
            <button onClick={() => setShowSettings(true)} className="obsidian-button-ghost text-xs focus-visible:ring-2 focus-visible:ring-violet-glow focus-visible:outline-none min-h-[36px]">
              <Settings size={14} /> BYOK
            </button>
            <button onClick={() => setShowHistory(true)} className="obsidian-button-ghost text-xs focus-visible:ring-2 focus-visible:ring-violet-glow focus-visible:outline-none min-h-[36px]">
              <Clock size={14} /> History ({history.length})
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <InputPanel value={input} onChange={setInput} onAnalyze={handleAnalyze} analyzing={analyzing} />
          <OutputPanel
            result={result}
            hideDefaulted={settings.hideDefaulted}
            onToggleHideDefaulted={() => setSettings({ ...settings, hideDefaulted: !settings.hideDefaulted })}
            onRefine={() => setShowRefine(true)}
            byok={settings.byok}
            validating={validating}
            onValidate={handleValidate}
          />
        </div>

        <Manifesto />
      </main>
      <Footer />

      <HistoryDrawer
        open={showHistory} onClose={() => setShowHistory(false)} items={history}
        onSelect={(r) => setResult(r)}
        onRequestClear={() => setConfirmClearHistory(true)}
      />
      <BYOKSettings
        open={showSettings} onClose={() => setShowSettings(false)}
        config={settings.byok} onSave={(c) => setSettings({ ...settings, byok: c })}
        primeBYOK={settings.primeBYOK} onTogglePrime={() => setSettings({ ...settings, primeBYOK: !settings.primeBYOK })}
      />
      <RefinePanel
        open={showRefine} onClose={() => setShowRefine(false)}
        current={result?.inferred.refinementApplied}
        onApply={handleRefine}
      />
      <ConfirmModal
        open={confirmClearHistory}
        title="Clear all history?"
        message="This deletes all 50 saved analyses from your browser. You can undo within 6 seconds via the toast banner."
        confirmLabel="Clear history"
        danger
        onConfirm={handleClearHistory}
        onClose={() => setConfirmClearHistory(false)}
      />
    </div>
  );
}

function Manifesto() {
  return (
    <section className="mt-10 grid sm:grid-cols-3 gap-4">
      <Card title="No keys required">Heuristic mode runs 60 pattern rules entirely in your browser. Zero network calls. Zero cost.</Card>
      <Card title="No fabrication">When input is too short or ambiguous, the engine refuses to invent a prompt. Honest defaults, marked clearly.</Card>
      <Card title="Three hypotheses, not one">Real reverse engineering: the engine shows three plausible prompts (direct / roleplay / constraint-first), not a fake-canonical answer.</Card>
    </section>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="obsidian-card p-4">
      <h4 className="text-sm font-bold text-white mb-1.5">{title}</h4>
      <p className="text-xs text-fracture-dim leading-relaxed">{children}</p>
    </div>
  );
}

function Footer() {
  const version = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
  const buildTime = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : '';
  return (
    <footer className="mx-auto max-w-6xl w-full px-6 py-8 text-center text-xs text-fracture-dim">
      <div className="fracture-line mb-6" />
      <p>
        <span className="text-white font-semibold">NYTHIS Obsidian</span> · Reverse Prompt Engineer
        <br />
        Build Local. Validate Local. Deploy When Ready.
      </p>
      <p className="mt-2 text-[10px] font-mono opacity-60" title={buildTime}>
        v{version}
      </p>
    </footer>
  );
}
