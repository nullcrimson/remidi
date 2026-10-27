import { engineName, type EnginePair } from '../core/enginePair';
import type { Midiremap, MissingDrums, Overrides, PresetName, RackFile, Unrecognized } from '../core/midiremap';
import type { Notice, NoticeLine } from '../core/notice';
import { editCount, knownEdits, type KnownEdits } from '../core/overrides';
import type { SavedMapping } from '../presets/mappings';
import type { Remapper } from './useRemapper';
import { saveBlob } from '../core/download';
import { toAppError } from '../core/errors';
import { packed } from '../core/packing';
import { track } from '../core/stats';
import { skippedNotice } from '../presets/presetImport';

interface RackSettings {
  pair: EnginePair;
  targetName: string;
  missing: MissingDrums;
  unrecognized: Unrecognized;
}

/** What an Ableton rack is made from: the open mapping of step 2, or a saved preset with its checked edits. */
export type RackRequest = RackSettings & (
  | { where: 'summary'; edits: Overrides; presetName?: PresetName }
  | { where: 'preset'; edits: KnownEdits; presetName: PresetName }
);

function savedLine(file: RackFile, target: string): NoticeLine {
  if (file.dropped > 0) {
    return { message: { id: 'rack-saved-dropped', args: { file: file.fileName, target, count: file.dropped } } };
  }
  return { message: { id: 'rack-saved', args: { file: file.fileName, target } } };
}

function skippedLines(rack: RackRequest): NoticeLine[] {
  if (rack.where === 'summary') return [];
  const skipped = skippedNotice(rack.presetName, rack.edits.skipped);
  return skipped ? [{ message: skipped }] : [];
}

/** Saves the Ableton rack `rack` asks for and returns the notice that says how to load it, or why it could not be made. */
export function saveRack(core: Midiremap, rack: RackRequest): NoticeLine[] {
  const { pair, edits, missing, unrecognized, presetName } = rack;
  let file: RackFile;
  try {
    file = core.remapRack(pair, { edits: edits.edits, srcEdits: edits.srcEdits }, missing, unrecognized, presetName);
  } catch (err) {
    return [{ rackFailed: toAppError(err) }];
  }
  saveBlob(packed(file.packing, file.xml), file.fileName);
  track('rack-downloaded', { where: rack.where, edited: editCount(edits) > 0 });
  return [savedLine(file, rack.targetName), ...skippedLines(rack)];
}

/** What the rack downloads read from the converter: the catalog, the open pair and its edits, and the settings. */
type RackSource = Pick<Remapper, 'catalog' | 'pair' | 'editor' | 'engines' | 'missing' | 'unrecognized'>;

/**
 * The two rack downloads: the open mapping's, whose notice shows under the summary row, and a
 * saved preset's, made from that preset alone, whose notice shows above the saved mappings.
 */
export function rackDownloads(source: RackSource, openPreset: SavedMapping | undefined, show: (notice: Notice) => void) {
  const core = source.catalog.status === 'ready' ? source.catalog.core : null;
  const { pair, editor, engines, missing, unrecognized } = source;
  return {
    summary: () => {
      if (core === null || pair === null) return;
      const lines = saveRack(core, {
        where: 'summary',
        pair,
        targetName: engineName(engines, pair.tgt),
        edits: editor,
        missing,
        unrecognized,
        presetName: openPreset?.name,
      });
      show({ lines, at: 'summary', pair });
    },
    preset: (m: SavedMapping) => {
      if (core === null) return;
      const lines = saveRack(core, {
        where: 'preset',
        pair: { src: m.src, tgt: m.tgt },
        targetName: engineName(engines, m.tgt),
        edits: knownEdits(m, editor.vocabulary),
        missing,
        unrecognized,
        presetName: m.name,
      });
      show({ lines, at: 'engines' });
    },
  };
}
