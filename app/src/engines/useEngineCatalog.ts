import { useEffect, useEffectEvent, useState } from 'react';
import { toAppError, wasmUnavailable, type AppError } from '../core/errors';
import type { Engine, LoadMidiremap, Midiremap } from '../core/midiremap';

/** The converter module while it loads, once loaded with its engine list, or why it could not load. */
export type Catalog
  = | { status: 'loading' }
    | { status: 'ready'; core: Midiremap; engines: Engine[] }
    | { status: 'error'; error: AppError };

/** Loads the converter module through `load` and lists its engines by name. */
export function useEngineCatalog(
  load: LoadMidiremap,
  onReady?: (engines: Engine[], core: Midiremap) => void,
): Catalog {
  const [catalog, setCatalog] = useState<Catalog>({ status: 'loading' });
  const announceReady = useEffectEvent((list: Engine[], core: Midiremap) => onReady?.(list, core));

  useEffect(() => {
    let cancelled = false;
    const fail = (error: AppError) => {
      if (!cancelled) setCatalog({ status: 'error', error });
    };
    load()
      .then((core) => {
        if (cancelled) return;
        const engines = [...core.engines()].sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
        );
        setCatalog({ status: 'ready', core, engines });
        announceReady(engines, core);
      }, (e: unknown) => fail(wasmUnavailable(e)))
      .catch((e: unknown) => fail(toAppError(e)));
    return () => {
      cancelled = true;
    };
  }, [load]);

  return catalog;
}
