export interface RowBox {
  top: number;
  height: number;
}

export interface ViewBox {
  scrollTop: number;
  height: number;
}

export function revealScrollTop(row: RowBox, view: ViewBox): number | null {
  const visible = row.top >= view.scrollTop && row.top + row.height <= view.scrollTop + view.height;
  if (visible) return null;
  return Math.max(0, row.top - (view.height - row.height) / 2);
}
