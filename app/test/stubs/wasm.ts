import type * as Wasm from '@wasm';

export default async function init(): Promise<unknown> {
  return {};
}

export const engine_catalog: typeof Wasm.engine_catalog = () => [
  { id: 'ggd_invasion', name: 'GGD Invasion', fullName: 'GetGood Drums Invasion' },
  { id: 'ezdrummer', name: 'EZdrummer', fullName: 'Toontrack EZdrummer 3' },
];

const unknownEngine = (role: string, id: string): Wasm.WasmError => ({
  kind: 'unknownEngine',
  message: `unknown ${role} engine '${id}'`,
  id,
});

export const engine_drums: typeof Wasm.engine_drums = (tgt) => {
  if (tgt === 'nope') throw unknownEngine('target', tgt);
  return [
    { note: 36, canon: 'kick.main', label: 'Kick', family: 'Kick' },
    { note: 38, canon: 'snare1.hit', label: 'Snare', family: 'Snare' },
    { note: 37, canon: 'snare1.sidestick', label: 'Side Stick', family: 'Snare' },
    { note: 48, canon: 'tom.rack1.hit', label: 'Rack Tom 1', family: 'Toms' },
    { note: 42, canon: 'hat.closed', label: 'Hi-Hat Closed', family: 'Hi-Hat' },
    { note: 49, canon: 'crash.1.hit', label: 'Crash 1', family: 'Cymbals' },
  ];
};

export const engine_notes: typeof Wasm.engine_notes = () => [
  { note: 24, canon: 'kick.main', label: 'Kick', family: 'Kick' },
  { note: 26, canon: 'snare1.hit', label: 'Snare', family: 'Snare' },
  { note: 60, canon: 'china.1.hit', label: 'China 1', family: 'Cymbals' },
];

export const canon_catalog: typeof Wasm.canon_catalog = () => [
  { canon: 'kick.main', label: 'Kick', family: 'Kick' },
  { canon: 'snare1.hit', label: 'Snare', family: 'Snare' },
  { canon: 'china.1.hit', label: 'China 1', family: 'Cymbals' },
];

export const family_order: typeof Wasm.family_order = () => [
  'Kick', 'Snare', 'Toms', 'Hi-Hat', 'Cymbals', 'Percussion', 'Aux',
];

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const note_names: typeof Wasm.note_names = (base) =>
  Array.from({ length: 128 }, (_, n) => `${NAMES[n % 12]}${Math.floor(n / 12) - (base === 'c1' ? 1 : 2)}`);

const BASE_ROWS: Wasm.VoiceRow[] = [
  { canon: 'kick.main', label: 'Kick', srcNotes: [24], tgtNote: 36, defaultTgtNote: 36, status: 'direct', otherDrum: false },
  { canon: 'snare1.hit', label: 'Snare', srcNotes: [26], tgtNote: 38, defaultTgtNote: 38, status: 'direct', otherDrum: false },
  { canon: 'hat.open3', label: 'Hi-Hat Open 3', srcNotes: [47], tgtNote: 46, defaultTgtNote: 46, status: 'fallback', otherDrum: false },
  { canon: 'china.1.hit', label: 'China 1', srcNotes: [59], tgtNote: null, defaultTgtNote: null, status: 'dropped', otherDrum: true },
  { canon: 'hat.cc', label: 'Hi-Hat CC', srcNotes: [4], tgtNote: null, defaultTgtNote: null, status: 'dropped', otherDrum: false },
];

export const parse_preset_file: typeof Wasm.parse_preset_file = (json) => {
  const p = JSON.parse(json) as Partial<Wasm.PresetView> & { name: string; src: string; tgt: string };
  return { name: p.name, src: p.src, tgt: p.tgt, edits: p.edits ?? {}, srcEdits: p.srcEdits ?? {}, skipped: [] };
};

export let lastPlanOverrides: Wasm.Overrides | null | undefined;
export let lastPlanMissing: Wasm.MissingDrums | null | undefined;

export const plan: typeof Wasm.plan = (_src, _tgt, overrides, missing) => {
  lastPlanOverrides = overrides;
  lastPlanMissing = missing;
  const rows = BASE_ROWS.map((r) => ({ ...r, srcNotes: [...r.srcNotes] }));
  for (const o of overrides?.tgt ?? []) {
    const row = rows.find((r) => r.canon === o.canon);
    if (row) row.tgtNote = o.note;
  }
  for (const s of overrides?.src ?? []) {
    for (const r of rows) r.srcNotes = r.srcNotes.filter((n) => n !== s.note);
    const row = rows.find((r) => r.canon === s.canon);
    if (row) row.srcNotes = [s.note, ...row.srcNotes];
  }
  return rows;
};

export let lastRemapChannel: string | null | undefined;
export let lastRemapMissing: Wasm.MissingDrums | null | undefined;

export const REMAP_BYTES = new Uint8Array([77, 84, 104, 100]);

export const remap: typeof Wasm.remap = (_mid, _src, _tgt, _overrides, channel, missing) => {
  lastRemapChannel = channel;
  lastRemapMissing = missing;
  return {
    bytes: REMAP_BYTES,
    report: {
      unmappedSource: {},
      fallbackUsed: { 'hat.open3': { note: 46, count: 2 } },
      dropped: { 'china.1.hit': 1 },
      untouched: 5,
      converted: 40,
    },
  };
};
