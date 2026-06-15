import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import { logError } from './lib/errorLog';
import './index.css';

// Catch unhandled promise rejections
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    logError({
      timestamp: Date.now(),
      message: 'Unhandled promise rejection: ' + (event.reason?.message ?? String(event.reason)),
      stack: event.reason?.stack,
      source: 'unknown',
    });
  });
  window.addEventListener('error', (event) => {
    logError({
      timestamp: Date.now(),
      message: event.message,
      stack: event.error?.stack,
      source: 'unknown',
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
