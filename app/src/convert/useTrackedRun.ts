import { useCallback } from 'react';
import { eventChannel } from '../core/channel';
import { kindCounts } from '../core/errors';
import type { LoadedFile } from '../core/files';
import { editCount } from '../core/overrides';
import { track } from '../core/stats';
import type { SuggestedProp } from '../core/umami';
import { convertedProps } from '../report/lossProps';
import { offeredAdvice, suggestedEngine } from './sourceOffer';
import type { Converter } from './converter';
import type { ConvertSetup } from './convertSetup';
import type { useConverter } from './useConverter';

/** The engine the advice for `setup` over `files` suggests, as `converted` sends it. */
async function suggestionOf(converter: Converter, files: LoadedFile[], { pair, channel, overrides }: ConvertSetup): Promise<SuggestedProp> {
  try {
    const advised = await converter.advice(files, channel, pair.src, pair.tgt);
    return suggestedEngine(offeredAdvice(advised, pair.src, pair.tgt, overrides.srcEdits)) ?? '';
  } catch {
    return 'advice-failed';
  }
}

/**
 * A run of the converter from the setup it is handed, under that setup's key, and what came
 * of it sent as `convert-failed`, `file-failed` and `converted`, each read from the setup and,
 * for a run of every file in `picked`, the advice the converter gives for that setup, never
 * from the screen's state when the run ends.
 */
export function useTrackedRun(runConvert: ReturnType<typeof useConverter>['convert'], converter: Converter, picked: LoadedFile[]) {
  return useCallback(
    async (setup: ConvertSetup, files?: LoadedFile[]) => {
      const outcome = await runConvert(setup, files);
      if (outcome === null) return;
      const { pair, channel, overrides } = setup;
      if (outcome.kind === 'failed') {
        track('convert-failed', { from: pair.src, to: pair.tgt, kind: outcome.error.kind });
        return;
      }
      const suggested = files === undefined ? await suggestionOf(converter, picked, setup) : '';
      for (const [kind, files] of kindCounts(outcome.failed.map((file) => file.error))) track('file-failed', { kind, files });
      track('converted', convertedProps(pair, outcome.ok, outcome.failed.length, {
        channel: eventChannel(outcome.ok, channel),
        missing: setup.missing,
        edited: editCount(overrides) > 0,
        preset: setup.presetId !== null,
        closer: suggested,
        via: setup.via,
        asked: setup.asked,
      }));
    },
    [runConvert, converter, picked],
  );
}

/** A run of the converter, as `useTrackedRun` makes it. */
export type TrackedRun = ReturnType<typeof useTrackedRun>;
