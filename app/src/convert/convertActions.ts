import type { Vocabulary } from '../core/canon';
import type { LoadedFile } from '../core/files';
import type { EngineId } from '../core/midiremap';
import { knownEdits } from '../core/overrides';
import type { Left, SelectionEvent, SourceSwitch } from '../core/selection';
import { track } from '../core/stats';
import { leftBy, setupAfter, type Asked, type ConvertSetup } from './convertSetup';
import type { Offer } from './partQuestions';
import type { ChosenSelection } from './selectionState';
import type { TrackedRun } from './useTrackedRun';

/**
 * The ways the screen starts a conversion of `setup`, the setup on show: converting the files,
 * the ones ready, anyway after the question, with an offered part, or with missing drums left
 * out; and switching the source for a suggestion and converting at once, the other way round,
 * or back to the pair a suggestion left, with that pair's edits and preset, its question taken
 * as answered. A switch's run converts the setup the next screen shows.
 */
export function convertActions({ setup, selection, run, ready, emit, answered, markAsked, vocabulary, alsoPick }: {
  setup: ConvertSetup;
  selection: ChosenSelection;
  run: TrackedRun;
  ready: LoadedFile[];
  emit: (event: SelectionEvent) => void;
  answered: () => void;
  markAsked: (source: EngineId) => void;
  vocabulary: Vocabulary;
  alsoPick: (offer: Offer) => LoadedFile[];
}) {
  const switchTo = (event: SourceSwitch, asked: Asked) => {
    const next = setupAfter(selection, setup.overrides, event, asked);
    emit(event);
    return run(next);
  };
  const suggested = { kind: 'suggested' as const, from: leftBy(setup) };
  return {
    setup,
    convert: (files?: LoadedFile[]) => run(setup, files),
    convertReady: () => run(setup, ready),
    convertAnyway: (partial: boolean) => {
      answered();
      return run({ ...setup, asked: 'anyway' }, partial ? ready : undefined);
    },
    alsoConvert: (offer: Offer) => {
      track('parts-offer-taken', { parts: offer.parts.length });
      return run(setup, alsoPick(offer));
    },
    dropMissingAndConvert: () => {
      emit({ type: 'setMissing', missing: 'drop' });
      return run({ ...setup, missing: 'drop' });
    },
    convertFrom: (id: EngineId, asked: Asked) => switchTo({ type: 'chooseSrc', id, via: suggested }, asked),
    swapAndConvert: () => switchTo({ type: 'swap', via: suggested }, 'none'),
    goBack: (back: Left) => {
      markAsked(back.pair.src);
      const known = knownEdits(back.overrides, vocabulary);
      return switchTo({ type: 'loadMapping', src: back.pair.src, tgt: back.pair.tgt, presetId: back.presetId, known }, 'none');
    },
  };
}

/** The ways to convert the setup on show, as `convertActions` makes them. */
export type ConvertActions = ReturnType<typeof convertActions>;
