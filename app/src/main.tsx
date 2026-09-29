import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { loadMessages } from './i18n';
import { LOCALE } from './locale';
import './index.css';

loadMessages(LOCALE).then(
  () => ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  ),
  (err: unknown) => {
    console.error(err);
    document.getElementById('load-failed')?.removeAttribute('hidden');
  },
);
