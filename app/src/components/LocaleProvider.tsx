import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Locale } from '../generated/i18n';
import { loadTranslator, type Translator } from '../i18n';
import { applyDocument, converterPath } from '../lib/documentLocale';
import { storeLocale } from '../lib/localeChoice';
import { pathLocale } from '../locale';
import { LocaleContext, type LocaleState } from '../localeContext';

/** Holds the page's translator; switches language in place and follows Back and Forward. */
export function LocaleProvider({ initial, children }: { initial: Translator; children: ReactNode }) {
  const [translator, setTranslator] = useState(initial);
  const [failed, setFailed] = useState<Locale | null>(null);
  const latest = useRef(0);

  const show = useCallback(async (locale: Locale, push: boolean) => {
    const request = ++latest.current;
    try {
      const next = await loadTranslator(locale);
      if (request !== latest.current) return;
      setTranslator(next);
      setFailed(null);
      applyDocument(next);
      if (push) history.pushState(null, '', converterPath(locale));
    } catch (err) {
      if (request !== latest.current) return;
      console.error(err);
      setFailed(locale);
    }
  }, []);

  useEffect(() => {
    const onPop = () => void show(pathLocale(), false);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [show]);

  const value = useMemo<LocaleState>(() => ({
    translator,
    failed,
    switchTo: (locale) => {
      storeLocale(locale);
      void show(locale, true);
    },
  }), [translator, failed, show]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
