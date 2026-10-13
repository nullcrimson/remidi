import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeUmami } from './umami';

const FIXTURE = `
  <input type="search" hidden data-filter="engines" data-page="index">
  <div id="engines"><section data-group><a data-q="ezdrummer">EZdrummer</a><a data-q="superior">Superior</a></section></div>
  <p id="engines-empty" hidden></p>`;

const FILTER_SCRIPT = import.meta.glob('../../midiremap-site/static/filter.js');

async function runFilterScript() {
  vi.resetModules();
  await Promise.all(Object.values(FILTER_SCRIPT).map((load) => load()));
}

function type(text: string) {
  const input = document.querySelector<HTMLInputElement>('input[data-filter]');
  if (input === null) throw new Error('no filter input in the fixture');
  input.value = text;
  input.dispatchEvent(new Event('input'));
}

describe('the filter script of the static pages', () => {
  const umami = fakeUmami();

  beforeEach(async () => {
    document.body.innerHTML = FIXTURE;
    await runFilterScript();
  });

  it('sends maps-filtered with the page of the input for the first text typed', () => {
    type('ez');
    expect(umami).toHaveBeenCalledWith('maps-filtered', { page: 'index' });
  });

  it('sends maps-filtered once however many times the input changes', () => {
    type('e');
    type('ez');
    expect(umami).toHaveBeenCalledOnce();
  });

  it('sends nothing for a blank input', () => {
    type('   ');
    expect(umami).not.toHaveBeenCalled();
  });
});
