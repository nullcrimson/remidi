/**
 * The value a static page marks with `attribute`, one of `known`; any other value is a fault
 * of the page, thrown with `what` it should have named so it is seen.
 */
export function knownMark<T extends string>(known: readonly T[], attribute: string, value: string | undefined, what: string): T {
  const mark = known.find((k) => k === value);
  if (mark === undefined) throw new Error(`${attribute}="${value}" names no ${what}`);
  return mark;
}
