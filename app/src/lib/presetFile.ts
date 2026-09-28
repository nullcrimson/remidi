import { saveFile } from './download';
import type { Edits, SrcEdits } from './overrides';

/** The `format` tag and version the core's `parse_preset` reads. */
const PRESET_FORMAT = 'drumverter-preset';
const PRESET_VERSION = 1;

export interface PresetContent {
  name: string;
  src: string;
  tgt: string;
  edits: Edits;
  srcEdits: SrcEdits;
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
  return `${slug || 'preset'}.drumverter.json`;
}

/** `name`, or the first "name copy", "name copy 2", … not in `taken`. */
export function uniqueName(name: string, taken: string[]): string {
  const used = new Set(taken);
  if (!used.has(name)) return name;
  for (let i = 1; ; i++) {
    const candidate = i === 1 ? `${name} copy` : `${name} copy ${i}`;
    if (!used.has(candidate)) return candidate;
  }
}

/** Downloads a preset as a `.drumverter.json` file. */
export function downloadPreset(p: PresetContent): void {
  const url = URL.createObjectURL(new Blob([toPresetFile(p)], { type: 'application/json' }));
  saveFile(url, presetFileName(p.name));
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
