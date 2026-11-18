import type { Engine, EngineId } from '../core/midiremap';
import type { Locale } from '../generated/i18n';
import { converterPath } from '../locale/locale';

/** The address key naming the FROM engine to preselect. */
const FROM_KEY = 'from';

/** The address key naming the TO engine to preselect. */
const TO_KEY = 'to';

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
  return fragment.has(FROM_KEY) || fragment.has(TO_KEY) ? fragment : new URLSearchParams(search);
}

export function preselection(address: Address, engines: Engine[]): Preselection | null {
  const given = params(address);
  const pick = (key: string): EngineId | undefined => {
    const value = given.get(key);
    return engines.find((e) => e.id === value)?.id;
  };
  const src = pick(FROM_KEY);
  const picked = pick(TO_KEY);
  const tgt = picked === src ? undefined : picked;
  if (src === undefined && tgt === undefined) return null;
  return { ...(src === undefined ? {} : { src }), ...(tgt === undefined ? {} : { tgt }) };
}

/** The fragment that preselects `src` and `tgt`, as `preselection` reads it back; empty when neither is chosen. */
function engineFragment(src: EngineId | null, tgt: EngineId | null): string {
  const chosen = new URLSearchParams();
  if (src !== null) chosen.set(FROM_KEY, src);
  if (tgt !== null) chosen.set(TO_KEY, tgt);
  const fragment = chosen.toString();
  return fragment === '' ? '' : `#${fragment}`;
}

/**
 * The full address of the converter in `locale` with the engines chosen, read back by
 * `preselection`: the app never writes its engines to the address bar, so it is built.
 */
export function converterAddress(locale: Locale, src: EngineId | null, tgt: EngineId | null): string {
  return new URL(`${converterPath(locale)}${engineFragment(src, tgt)}`, location.origin).href;
}
