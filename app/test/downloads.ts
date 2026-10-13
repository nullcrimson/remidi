import { afterEach, beforeEach, vi, type MockInstance } from 'vitest';

export interface Download {
  readonly name: string;
  readonly blob: Blob;
}

export function recordDownloads(): () => readonly Download[] {
  const saved: Download[] = [];
  let click: MockInstance<() => void> | undefined;
  beforeEach(() => {
    saved.length = 0;
    click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      const blob = vi.mocked(URL.createObjectURL).mock.lastCall?.[0];
      if (blob instanceof Blob) saved.push({ name: this.download, blob });
    });
  });
  afterEach(() => click?.mockRestore());
  return () => saved;
}
