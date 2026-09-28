export default async function init(): Promise<unknown> {
  return {};
}

export function engine_catalog(): unknown {
  return [
    { id: 'ggd_invasion', name: 'GGD Invasion' },
    { id: 'ezdrummer', name: 'EZdrummer' },
  ];
}

export function engine_drums(_tgt: string): unknown {
  return [
    { note: 36, canon: 'kick.main', label: 'Kick', family: 'Kick' },
    { note: 38, canon: 'snare1.hit', label: 'Snare', family: 'Snare' },
    { note: 37, canon: 'snare1.sidestick', label: 'Side Stick', family: 'Snare' },
    { note: 48, canon: 'tom.rack1.hit', label: 'Rack Tom 1', family: 'Toms' },
    { note: 42, canon: 'hat.closed', label: 'Hi-Hat Closed', family: 'Hi-Hat' },
    { note: 49, canon: 'crash.1.hit', label: 'Crash 1', family: 'Cymbals' },
  ];
}

export function engine_notes(_src: string): unknown {
  return [
    { note: 24, canon: 'kick.main', label: 'Kick', family: 'Kick' },
    { note: 26, canon: 'snare1.hit', label: 'Snare', family: 'Snare' },
    { note: 60, canon: 'china.1.hit', label: 'China 1', family: 'Cymbals' },
  ];
}

export function canon_catalog(): unknown {
  return [
    { canon: 'kick.main', label: 'Kick', family: 'Kick' },
    { canon: 'snare1.hit', label: 'Snare', family: 'Snare' },
    { canon: 'china.1.hit', label: 'China 1', family: 'Cymbals' },
  ];
}

const BASE_ROWS = [
  { canon: 'kick.main', label: 'Kick', src_notes: [24], tgt_note: 36, default_tgt_note: 36, status: 'direct', other_drum: false },
  { canon: 'snare1.hit', label: 'Snare', src_notes: [26], tgt_note: 38, default_tgt_note: 38, status: 'direct', other_drum: false },
  { canon: 'hat.open3', label: 'Hi-Hat Open 3', src_notes: [47], tgt_note: 46, default_tgt_note: 46, status: 'fallback', other_drum: false },
  { canon: 'china.1.hit', label: 'China 1', src_notes: [59], tgt_note: null, default_tgt_note: null, status: 'dropped', other_drum: true },
  { canon: 'hat.cc', label: 'Hi-Hat CC', src_notes: [4], tgt_note: undefined, default_tgt_note: undefined, status: 'dropped', other_drum: false },
];

export function parse_preset_file(json: string): unknown {
  const p = JSON.parse(json) as { name: string; src: string; tgt: string; edits?: object; srcEdits?: object };
  return { name: p.name, src: p.src, tgt: p.tgt, edits: p.edits ?? {}, srcEdits: p.srcEdits ?? {}, skipped: [] };
}

export let lastPlanMissing: string | undefined;

export function plan(_src: string, _tgt: string, overridesJson?: string, missing?: string): unknown {
  lastPlanMissing = missing;
  const rows = BASE_ROWS.map((r) => ({ ...r, src_notes: [...r.src_notes] }));
  if (overridesJson) {
    const ov = JSON.parse(overridesJson) as {
      tgt?: { canon: string; note: number }[];
      src?: { note: number; canon: string }[];
    };
    for (const o of ov.tgt ?? []) {
      const row = rows.find((r) => r.canon === o.canon);
      if (row) row.tgt_note = o.note;
    }
    for (const s of ov.src ?? []) {
      for (const r of rows) r.src_notes = r.src_notes.filter((n) => n !== s.note);
      const row = rows.find((r) => r.canon === s.canon);
      if (row) row.src_notes = [s.note, ...row.src_notes];
    }
  }
  return rows;
}

export let lastRemapChannel: string | undefined;
export let lastRemapMissing: string | undefined;

export const REMAP_BYTES = new Uint8Array([77, 84, 104, 100]);

export function remap(
  _mid: Uint8Array,
  _src: string,
  _tgt: string,
  _overridesJson?: string,
  channel?: string,
  missing?: string,
): unknown {
  lastRemapChannel = channel;
  lastRemapMissing = missing;
  return {
    bytes: REMAP_BYTES,
    report: {
      unmapped_source: {},
      fallback_used: { 'hat.open3': { note: 46, count: 2 } },
      dropped: { 'china.1.hit': 1 },
      untouched: 5,
      converted: 40,
    },
  };
}
