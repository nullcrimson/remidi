/** Both engines of a conversion: the one whose drum notes are read and the one they are written for. */
export interface EnginePair {
  src: string;
  tgt: string;
}

/** The pair when both engines are chosen, otherwise `null`. */
export function pairOf(src: string | null, tgt: string | null): EnginePair | null {
  return src !== null && tgt !== null ? { src, tgt } : null;
}

/** The display names of the source and target engines. */
export interface EngineNames {
  source: string;
  target: string;
}

/** The display names of a pair's engines; an engine the list lacks is named by its id. */
export function namesOf(engines: { id: string; name: string }[], { src, tgt }: EnginePair): EngineNames {
  const nameOf = (id: string) => engines.find((e) => e.id === id)?.name ?? id;
  return { source: nameOf(src), target: nameOf(tgt) };
}
