import type { EngineId } from './midiremap';

/** Both engines of a conversion: the one whose drum notes are read and the one they are written for. */
export interface EnginePair {
  src: EngineId;
  tgt: EngineId;
}

/**
 * The one reader of a stored engine id: `value` as an id when it is a non-empty string,
 * otherwise null. The catalog may no longer know it.
 */
export function parseEngineId(value: unknown): EngineId | null {
  return typeof value === 'string' && value !== '' ? (value as EngineId) : null;
}

/** The pair when both engines are chosen, otherwise `null`. */
export function pairOf(src: EngineId | null, tgt: EngineId | null): EnginePair | null {
  return src !== null && tgt !== null ? { src, tgt } : null;
}

/** Whether two pairs convert between the same two engines the same way round. */
export function samePair(a: EnginePair, b: EnginePair): boolean {
  return a.src === b.src && a.tgt === b.tgt;
}

/** The display names of the source and target engines. */
export interface EngineNames {
  source: string;
  target: string;
}

/** An engine's display name; an engine the list lacks is named by its id. */
export function engineName(engines: { id: EngineId; name: string }[], id: EngineId): string {
  return engines.find((e) => e.id === id)?.name ?? id;
}

/** The display names of a pair's engines; an engine the list lacks is named by its id. */
export function namesOf(engines: { id: EngineId; name: string }[], { src, tgt }: EnginePair): EngineNames {
  return { source: engineName(engines, src), target: engineName(engines, tgt) };
}
