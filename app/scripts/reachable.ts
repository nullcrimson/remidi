/** `entry` and everything reached from it along `next`, each once, in the order first reached. */
export function reachable(entry: string, next: (node: string) => readonly string[]): string[] {
  const seen = new Set<string>();
  const visit = (node: string) => {
    if (seen.has(node)) return;
    seen.add(node);
    next(node).forEach(visit);
  };
  visit(entry);
  return [...seen];
}
