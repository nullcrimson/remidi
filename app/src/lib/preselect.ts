import type { Engine } from './midiremap';

export interface Preselection {
  src?: string;
  tgt?: string;
}

export function preselection(search: string, engines: Engine[]): Preselection | null {
  const params = new URLSearchParams(search);
  const known = new Set(engines.map((e) => e.id));
  const pick = (key: string): string | undefined => {
    const value = params.get(key);
    return value !== null && known.has(value) ? value : undefined;
  };
  const src = pick('from');
  const picked = pick('to');
  const tgt = picked === src ? undefined : picked;
  if (src === undefined && tgt === undefined) return null;
  return { ...(src === undefined ? {} : { src }), ...(tgt === undefined ? {} : { tgt }) };
}
