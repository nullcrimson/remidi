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
  { canon: 'kick.main', label: 'Kick', src_note: 24, tgt_note: 36, status: 'direct' },
  { canon: 'snare1.hit', label: 'Snare', src_note: 26, tgt_note: 38, status: 'direct' },
  { canon: 'hat.open3', label: 'Hi-Hat Open 3', src_note: 47, tgt_note: 46, status: 'fallback' },
  { canon: 'china.1.hit', label: 'China 1', src_note: 59, tgt_note: null, status: 'dropped' },
];

export function plan(_src: string, _tgt: string, overridesJson?: string): unknown {
  const rows = BASE_ROWS.map((r) => ({ ...r }));
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
      const row = rows.find((r) => r.canon === s.canon);
      if (row) row.src_note = s.note;
    }
  }
  return rows;
}

export function remap(
  _mid: Uint8Array,
  _src: string,
  _tgt: string,
  _overridesJson?: string,
): unknown {
  return {
    bytes: [77, 84, 104, 100],
    report: { unmapped_source: {}, fallback_used: { 'hat.open3': 2 }, dropped: { 'china.1.hit': 1 } },
  };
}
