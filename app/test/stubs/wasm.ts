export default async function init(): Promise<unknown> {
  return {};
}

export function engine_catalog(): unknown {
  return [
    { id: 'ggd_invasion', name: 'GGD Invasion' },
    { id: 'ezdrummer', name: 'EZdrummer' },
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
    const ov = JSON.parse(overridesJson) as { tgt?: { canon: string; note: number }[] };
    for (const o of ov.tgt ?? []) {
      const row = rows.find((r) => r.canon === o.canon);
      if (row) row.tgt_note = o.note;
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
