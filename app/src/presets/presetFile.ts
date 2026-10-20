import { saveBlob } from '../core/download';
import type { StoredEdits } from '../core/overrides';
import type { EngineId, PresetName } from '../core/midiremap';

const PRESET_FORMAT = 'drumverter-preset';
const PRESET_VERSION = 1;

export interface PresetContent extends StoredEdits {
  name: PresetName;
  src: EngineId;
  tgt: EngineId;
}

export function toPresetFile(p: PresetContent): string {
  const file = {
    format: PRESET_FORMAT,
    version: PRESET_VERSION,
    name: p.name,
    src: p.src,
    tgt: p.tgt,
    edits: p.edits,
    srcEdits: p.srcEdits,
  };
  return `${JSON.stringify(file, null, 2)}\n`;
}

export function presetFileName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug || 'preset'}-drumverter.json`;
}

/** Downloads a preset as a `<name>-drumverter.json` file. */
export function downloadPreset(p: PresetContent): void {
  saveBlob(new Blob([toPresetFile(p)], { type: 'application/json' }), presetFileName(p.name));
}
