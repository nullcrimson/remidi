import type { Offered } from './sourceOffer';
import { isConverted, type Conv } from './useConverter';
import type { QuestionState } from './useSourceQuestion';

/** Where the screen is in a conversion, as far as advice on the source goes: setting it up, with what is offered, or done. */
type SourceStage
  = | { kind: 'setup'; offer: QuestionState }
    | { kind: 'done'; unrecognizedShown: boolean };

/** The one place that speaks about the source: the engines step's notice, the question before converting, each with what is offered, the done card's block, or none. */
export type SourceSurface
  = | { kind: 'none' }
    | { kind: 'notice' | 'question'; offered: Offered }
    | { kind: 'done' };

const NONE: SourceSurface = { kind: 'none' };

/** The stage of `conv`: a converted file is done, whatever else is true, and its block shows when `unrecognized` notes were left. */
export function sourceStage(conv: Conv, offer: QuestionState, unrecognized: number): SourceStage {
  return isConverted(conv) ? { kind: 'done', unrecognizedShown: unrecognized > 0 } : { kind: 'setup', offer };
}

/** Which surface `stage` shows: the done card's block once converted, else the question while it is open, else the notice when something is offered. */
export function sourceSurface(stage: SourceStage): SourceSurface {
  if (stage.kind === 'done') return stage.unrecognizedShown ? { kind: 'done' } : NONE;
  const { offer } = stage;
  switch (offer.kind) {
    case 'none':
      return NONE;
    case 'offered':
    case 'due':
      return { kind: 'notice', offered: offer.offered };
    case 'open':
      return { kind: 'question', offered: offer.offered };
  }
}
