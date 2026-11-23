import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { isCapacitorNative } from './hooks/usePWAInstall';
import './index.css';

// Prevent uncaught asynchronous network or third-party rejections from crashing the app
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.warn('Unhandled rejection caught gracefully:', event.reason);
    event.preventDefault();
  });

  // Register lightweight PWA service worker on web builds (skipped in Capacitor native runtime)
  if (
    import.meta.env.PROD &&
    'serviceWorker' in navigator &&
    !isCapacitorNative()
  ) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
