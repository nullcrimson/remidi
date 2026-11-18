import type { Message } from '../generated/i18n';
import type { EngineId } from '../core/midiremap';
import type { Offered } from './sourceOffer';

/** Whether a count is the whole of the hits, as the messages choose their words by. */
export function wholeOf(count: number, hits: number): 'all' | 'some' {
  return count === hits ? 'all' : 'some';
}

/** What `source` misses of the hits `offered` counts: none of them known, or how many not. */
export function misses(offered: Offered, source: string): Message {
  const { missing, hits } = offered;
  return { id: 'source-fit-missing', args: { missed: wholeOf(missing, hits), missing, hits, source } };
}

/**
 * What the question says about `source`: what it lacks of the kit and misses of the hits, or,
 * with every hit missed, only that.
 */
export function lacks(offered: Offered, source: string): Message {
  const { ask, missing, hits } = offered;
  if (ask === null || missing === hits) return misses(offered, source);
  return { id: 'source-ask', args: { lacks: ask, source, missing, hits } };
}

/** What the engine the advice names knows of the hits: the suggested engine or the target, named by `nameOf`. */
export function knows(offered: Offered, nameOf: (id: EngineId) => string): Message {
  const { recognized, hits } = offered;
  if (offered.kind === 'looksLikeTarget') {
    return { id: 'source-fit-target', args: { known: wholeOf(recognized, hits), count: recognized, target: nameOf(offered.target) } };
  }
  const engine = nameOf(offered.engine);
  return recognized === hits
    ? { id: 'source-fit-all', args: { engine } }
    : { id: 'source-fit-some', args: { engine, count: recognized } };
}
