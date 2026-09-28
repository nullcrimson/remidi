import { useEffect, useEffectEvent, useState } from 'react';
import { errorMessage } from '../lib/errors';
import { engines as listEngines, ready, type Engine } from '../lib/midiremap';

export type CatalogStatus = 'loading' | 'ready' | 'error';

export function useEngineCatalog(onReady?: (engines: Engine[]) => void) {
  const [status, setStatus] = useState<CatalogStatus>('loading');
  const [engines, setEngines] = useState<Engine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const announceReady = useEffectEvent((list: Engine[]) => onReady?.(list));

  useEffect(() => {
    let cancelled = false;
    ready()
      .then(() => {
        if (cancelled) return;
        const list = [...listEngines()].sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
        );
        setEngines(list);
        setStatus('ready');
        announceReady(list);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(errorMessage(e));
          setStatus('error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { status, engines, error };
}
