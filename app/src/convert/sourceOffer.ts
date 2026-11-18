import type { Advised, EngineId, SourceAdvice } from '../core/midiremap';
import type { SrcEdits } from '../core/overrides';

/** What the screen offers for the `source` that misses hits: another engine, or the `target` named as the file's layout. */
export type Offered
  = | (Extract<SourceAdvice, { kind: 'suggest' }> & { source: EngineId })
    | (Extract<SourceAdvice, { kind: 'looksLikeTarget' }> & { source: EngineId; target: EngineId });

/**
 * What the screen offers from the advice: the advice once it has arrived for the chosen source
 * and target, when it names an engine, and nothing for another pair, which it is stale for, or
 * while source notes are edited, since the edits change what the source recognizes.
 */
export function offeredAdvice(advised: Advised | null, src: EngineId | null, tgt: EngineId | null, srcEdits: SrcEdits): Offered | null {
  if (advised === null || advised.source !== src || advised.target !== tgt || Object.keys(srcEdits).length > 0) return null;
  const { advice, source, target } = advised;
  if (advice.kind === 'suggest') return { ...advice, source };
  return advice.kind === 'looksLikeTarget' && target !== null ? { ...advice, source, target } : null;
}

/** The engine `offered` suggests, or `null` when it names the target. */
export function suggestedEngine(offered: Offered | null): EngineId | null {
  return offered?.kind === 'suggest' ? offered.engine : null;
}
