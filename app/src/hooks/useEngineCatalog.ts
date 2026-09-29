import { useEffect, useEffectEvent, useState } from 'react';
import { toAppError, wasmUnavailable, type AppError } from '../lib/errors';
import { engines as listEngines, ready, type Engine } from '../lib/midiremap';

export type CatalogStatus = 'loading' | 'ready' | 'error';

export function useEngineCatalog(onReady?: (engines: Engine[]) => void) {
  const [status, setStatus] = useState<CatalogStatus>('loading');
  const [engines, setEngines] = useState<Engine[]>([]);
  const [error, setError] = useState<AppError | null>(null);
  const announceReady = useEffectEvent((list: Engine[]) => onReady?.(list));

  useEffect(() => {
    let cancelled = false;
    const fail = (e: AppError) => {
      if (!cancelled) {
        setError(e);
        setStatus('error');
      }
    };
    ready()
      .then(() => {
        if (cancelled) return;
        const list = [...listEngines()].sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
        );
        setEngines(list);
        setStatus('ready');
        announceReady(list);
      }, (e: unknown) => fail(wasmUnavailable(e)))
      .catch((e: unknown) => fail(toAppError(e)));
    return () => {
      cancelled = true;
    };
  }, []);

  return { status, engines, error };
}
