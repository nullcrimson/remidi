import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Locale } from '../generated/i18n';
import { loadTranslator, type Translator } from './i18n';
import { applyDocument, converterPath, pathLocale, storeLocale } from './locale';
import { LocaleContext, type LocaleState } from './localeContext';

/**
 * Holds the page's translator; switches language in place and follows Back and Forward.
 * `load` fetches a language's translator: the app's own loader unless another is given.
 */
export function LocaleProvider({
  initial,
  load = loadTranslator,
  children,
}: {
  initial: Translator;
  load?: (locale: Locale) => Promise<Translator>;
  children: ReactNode;
}) {
  const [translator, setTranslator] = useState(initial);
  const [failed, setFailed] = useState<Locale | null>(null);
  const latest = useRef(0);

  const show = useCallback(async (locale: Locale, push: boolean) => {
    const request = ++latest.current;
    try {
      const next = await load(locale);
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
  }, [load]);

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
