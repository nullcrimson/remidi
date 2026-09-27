import { useEffect, useRef, useState } from 'react';
import { engines as listEngines, ready, type Engine } from '../lib/midiremap';

export type CatalogStatus = 'loading' | 'ready' | 'error';

export function useEngineCatalog(onReady?: (engines: Engine[]) => void) {
  const [status, setStatus] = useState<CatalogStatus>('loading');
  const [engines, setEngines] = useState<Engine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const onReadyRef = useRef(onReady);

  useEffect(() => {
    onReadyRef.current = onReady;
  });

  useEffect(() => {
    let cancelled = false;
    ready()
      .then(() => {
        if (cancelled) return;
        const list = listEngines();
        setEngines(list);
        setStatus('ready');
        onReadyRef.current?.(list);
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
