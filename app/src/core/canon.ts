import type { Canon, VocabularyDrum } from './midiremap';

/** The drums this version of the core knows, by the key each is stored under. */
export type Vocabulary = ReadonlyMap<string, Canon>;

/** The vocabulary of the core's drum catalog. */
export function vocabularyOf(drums: VocabularyDrum[]): Vocabulary {
  return new Map(drums.map((d) => [d.canon, d.canon]));
}

/** The entries of a record keyed by drum, each key as the drum it was written under. */
export function byCanon<V>(record: Record<Canon, V>): [Canon, V][] {
  return Object.entries(record) as [Canon, V][];
}
