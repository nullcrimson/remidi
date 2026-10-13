import { describe, expect, it } from 'vitest';
import { reveal } from '../../src/ui/reveal';

function placed(top: number, height: number): HTMLElement {
  const el = document.createElement('div');
  el.getBoundingClientRect = () => new DOMRect(0, top, 200, height);
  Object.defineProperty(el, 'clientHeight', { value: height });
  return el;
}

function listAt(top: number, scrollTop: number): HTMLElement {
  const list = placed(top, 240);
  list.scrollTop = scrollTop;
  return list;
}

describe('reveal', () => {
  it('leaves the list where it is when the row is fully visible', () => {
    const list = listAt(100, 50);
    reveal(list, placed(140, 30));
    expect(list.scrollTop).toBe(50);
  });

  it('centres a row below the visible area, wherever the list sits on the page', () => {
    const list = listAt(100, 0);
    reveal(list, placed(700, 30));
    expect(list.scrollTop).toBe(495);
  });

  it('centres a partly hidden row', () => {
    const list = listAt(100, 0);
    reveal(list, placed(325, 30));
    expect(list.scrollTop).toBe(120);
  });

  it('stops at the top for a hidden row near the start of the list', () => {
    const list = listAt(100, 300);
    reveal(list, placed(-140, 30));
    expect(list.scrollTop).toBe(0);
  });
});
