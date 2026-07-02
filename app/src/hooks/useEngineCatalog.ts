import { useEffect, useState } from 'react';
import { engines as listEngines, ready, type Engine } from '../lib/midiremap';

export type CatalogStatus = 'loading' | 'ready' | 'error';

export function useEngineCatalog() {
  const [status, setStatus] = useState<CatalogStatus>('loading');
  const [engines, setEngines] = useState<Engine[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    ready()
      .then(() => {
        if (cancelled) return;
        setEngines(listEngines());
        setStatus('ready');
      })
      .catch((e) => {
        if (!cancelled) {
          setError(String(e));
          setStatus('error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { status, engines, error };
}
