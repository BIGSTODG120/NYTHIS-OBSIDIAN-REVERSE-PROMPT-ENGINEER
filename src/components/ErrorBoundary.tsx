// v1.4 — Global error boundary. Catches any uncaught React error so the app
// never blanks out. Logs locally so users can show support what happened.

import React from 'react';
import { logError } from '../lib/errorLog';

interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logError({
      timestamp: Date.now(),
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack ?? undefined,
      source: 'react-boundary',
    });
  }

  reset = () => this.setState({ hasError: false, error: undefined });

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-obsidian-950">
        <div className="obsidian-card p-6 max-w-lg ring-1 ring-amber-300/40">
          <h2 className="text-lg font-bold text-amber-200 mb-2">Something went wrong</h2>
          <p className="text-xs text-fracture-dim mb-3 leading-relaxed">
            The interface hit an unexpected error. Your data is safe — nothing was lost.
            You can reload the page or reset the UI to continue.
          </p>
          {this.state.error && (
            <details className="text-[11px] text-fracture-dim mb-3 font-mono bg-obsidian-950/60 border border-violet-ash/20 rounded-md p-2">
              <summary className="cursor-pointer text-fracture">Show error detail</summary>
              <p className="mt-2 whitespace-pre-wrap break-words">{this.state.error.message}</p>
            </details>
          )}
          <div className="flex gap-2">
            <button onClick={this.reset} className="obsidian-button text-xs">Reset UI</button>
            <button onClick={() => window.location.reload()} className="obsidian-button-ghost text-xs">Reload page</button>
          </div>
        </div>
      </div>
    );
  }
}
