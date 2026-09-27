import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { FounderProvider } from './context/FounderContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <ErrorBoundary>
        <FounderProvider>
          <App />
        </FounderProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
  if (typeof (window as any).__SNAPFIND_MOUNTED__ === 'function') {
    (window as any).__SNAPFIND_MOUNTED__();
  }
}
