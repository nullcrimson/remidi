/** A latin font file, the subset English pages load: one variable file for all weights, or one weight. */
export interface LatinFont {
  weight: 'variable' | number;
}

/**
 * The latin font `file` names, a source url (`./files/<family>-latin-wght-normal.woff2`) or an
 * emitted file with its hash; `undefined` for any other file or subset.
 */
export function latinFont(file: string): LatinFont | undefined {
  const weight = /-latin-(wght|\d+)-normal(-[^./]+)?\.woff2$/.exec(file)?.[1];
  if (weight === undefined) return undefined;
  return { weight: weight === 'wght' ? 'variable' : Number(weight) };
}
