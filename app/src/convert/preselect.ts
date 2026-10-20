import type { Engine, EngineId } from '../core/midiremap';

interface Preselection {
  src?: EngineId;
  tgt?: EngineId;
}

/** The part of a page address that can name engines to preselect. */
export interface Address {
  search: string;
  hash: string;
}

function params({ search, hash }: Address): URLSearchParams {
  const fragment = new URLSearchParams(hash.replace(/^#/, ''));
  return fragment.has('from') || fragment.has('to') ? fragment : new URLSearchParams(search);
}

export function preselection(address: Address, engines: Engine[]): Preselection | null {
  const given = params(address);
  const pick = (key: string): EngineId | undefined => {
    const value = given.get(key);
    return engines.find((e) => e.id === value)?.id;
  };
  const src = pick('from');
  const picked = pick('to');
  const tgt = picked === src ? undefined : picked;
  if (src === undefined && tgt === undefined) return null;
  return { ...(src === undefined ? {} : { src }), ...(tgt === undefined ? {} : { tgt }) };
}
