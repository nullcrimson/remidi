import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './site/ErrorBoundary';
import { LocaleProvider } from './locale/LocaleProvider';
import { startAddress, startLocale, startTranslator } from './locale/startLocale';
import { browserRuntime } from './convert/runtime';
import { applyDocument, pathLocale, storedLocale } from './locale/locale';
import './index.css';

const runtime = browserRuntime();
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
            <App runtime={runtime} />
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
