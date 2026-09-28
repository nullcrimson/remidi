/**
 * Groups items by family: families in `order` first, in that order, then any family `order`
 * does not list, in the order first seen. Empty families are left out.
 */
export function groupByFamily<T>(
  items: T[],
  familyOf: (item: T) => string,
  order: readonly string[],
): { family: string; items: T[] }[] {
  const groups = new Map<string, T[]>(order.map((f) => [f, []]));
  for (const item of items) {
    const family = familyOf(item);
    groups.set(family, [...(groups.get(family) ?? []), item]);
  }
  return [...groups].filter(([, members]) => members.length > 0).map(([family, members]) => ({ family, items: members }));
}
