import { describe, expect, it } from 'vitest';
import { groupByFamily } from '../src/lib/families';

const item = (name: string, family: string) => ({ name, family });
const ORDER = ['Kick', 'Snare', 'Toms', 'Hi-Hat', 'Cymbals', 'Percussion', 'Aux'];

describe('groupByFamily', () => {
  it('groups items in the given family order and drops empty families', () => {
    const groups = groupByFamily(
      [item('Crash', 'Cymbals'), item('Kick', 'Kick'), item('Ride', 'Cymbals'), item('Snare', 'Snare')],
      (i) => i.family,
      ORDER,
    );
    expect(groups.map((g) => [g.family, g.items.map((i) => i.name)])).toEqual([
      ['Kick', ['Kick']],
      ['Snare', ['Snare']],
      ['Cymbals', ['Crash', 'Ride']],
    ]);
  });

  it('keeps families the order does not list, after the listed ones in first-seen order', () => {
    const groups = groupByFamily(
      [item('Gong', 'Gongs'), item('Kick', 'Kick'), item('Bell', 'Bells'), item('Gong 2', 'Gongs')],
      (i) => i.family,
      ORDER,
    );
    expect(groups.map((g) => [g.family, g.items.length])).toEqual([
      ['Kick', 1],
      ['Gongs', 2],
      ['Bells', 1],
    ]);
  });

  it('groups in first-seen order when no order is known', () => {
    const groups = groupByFamily([item('Snare', 'Snare'), item('Kick', 'Kick')], (i) => i.family, []);
    expect(groups.map((g) => g.family)).toEqual(['Snare', 'Kick']);
  });
});
