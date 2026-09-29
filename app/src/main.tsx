import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LocaleProvider } from './components/LocaleProvider';
import { applyDocument } from './lib/documentLocale';
import { storedLocale } from './lib/localeChoice';
import { startAddress, startLocale, startTranslator } from './lib/startLocale';
import { pathLocale } from './locale';
import './index.css';

const path = pathLocale();
const start = startLocale(path, storedLocale(), navigator.languages);

startTranslator(path, start).then(
  (translator) => {
    if (translator.locale !== path) history.replaceState(null, '', startAddress(translator.locale, location.search, location.hash));
    applyDocument(translator);
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <LocaleProvider initial={translator}>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </LocaleProvider>
      </React.StrictMode>,
    );
  },
  (err: unknown) => {
    console.error(err);
    document.getElementById('load-failed')?.removeAttribute('hidden');
  },
);
