interface RowBox {
  top: number;
  height: number;
}

interface ViewBox {
  scrollTop: number;
  height: number;
}

function revealScrollTop(row: RowBox, view: ViewBox): number | null {
  const visible = row.top >= view.scrollTop && row.top + row.height <= view.scrollTop + view.height;
  if (visible) return null;
  return Math.max(0, row.top - (view.height - row.height) / 2);
}

/** Scrolls `list` to centre `row`, unless the row is already fully visible. */
export function reveal(list: HTMLElement, row: HTMLElement): void {
  const box = row.getBoundingClientRect();
  const top = box.top - list.getBoundingClientRect().top - list.clientTop + list.scrollTop;
  const next = revealScrollTop({ top, height: box.height }, { scrollTop: list.scrollTop, height: list.clientHeight });
  if (next !== null) list.scrollTop = next;
}

/** Brings `block` to the middle of the window and puts focus on `target` without scrolling again. */
export function centerAndFocus(block: HTMLElement, target: HTMLElement | null | undefined): void {
  block.scrollIntoView({ block: 'center' });
  target?.focus({ preventScroll: true });
}
