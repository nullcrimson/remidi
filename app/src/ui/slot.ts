const MARK = '\u2063';

/** A message argument that stands for the element `name` in `slotParts`' output. */
export function slot(name: string): string {
  return `${MARK}${name}${MARK}`;
}

type SlotPart = { text: string } | { slot: string };

/** Formatted text split into its plain runs and the slots `slot()` put in it. */
export function slotParts(text: string): SlotPart[] {
  return text.split(MARK).map((part, i) => (i % 2 === 1 ? { slot: part } : { text: part }));
}
