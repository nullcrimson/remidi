/** A part of a whole, from 0 to 1; made only here, so no reader divides. */
type Share = number & { readonly __brand: 'Share' };

/** Which band of the events' share scale a share falls in. */
export type ShareBucket = 'none' | 'under10' | 'under25' | 'under33' | 'under50' | 'over50';

function fraction(part: number, whole: number): Share {
  return (part / whole) as Share;
}

/** `part` of `whole`, or null when the whole is empty or `part` is not a part of it. */
export function share(part: number, whole: number): Share | null {
  return whole > 0 && part >= 0 && part <= whole ? fraction(part, whole) : null;
}

/** The edge of the share scale where `under33` starts. */
const QUARTER = fraction(1, 4);

/** The edge of the share scale where `under50` starts. */
const THIRD = fraction(1, 3);

/** Each edge of the share scale with the bucket that starts at it, lowest first. */
const SHARE_EDGES: readonly [Share, ShareBucket][] = [
  [fraction(1, 10), 'under25'],
  [QUARTER, 'under33'],
  [THIRD, 'under50'],
  [fraction(1, 2), 'over50'],
];

/** The bucket `value` falls in: `none` for nothing or no share at all. */
export function shareBucket(value: Share | null): ShareBucket {
  if (value === null || value === 0) return 'none';
  let bucket: ShareBucket = 'under10';
  for (const [edge, from] of SHARE_EDGES) if (value >= edge) bucket = from;
  return bucket;
}
