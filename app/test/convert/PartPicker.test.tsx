import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PartPicker, type PartPickerSource } from '../../src/convert/PartPicker';
import { PartOffers } from '../../src/convert/PartOffers';
import type { PartSummary } from '../../src/core/midiremap';
import { typed } from '../typed';

const KIT = typed<PartSummary>({
  part: { track: 1, channel: 1 },
  trackName: 'Kit',
  hits: 12,
  plays: {
    drums: [
      { canon: 'kick.main', hits: 6 },
      { canon: 'snare1.hit', hits: 3 },
      { canon: 'china.1.hit', hits: 1 },
      { canon: 'hat.closed', hits: 1 },
    ],
    unknown: 1,
  },
});
const BASS = typed<PartSummary>({ part: { track: 2, channel: 2 }, trackName: null, hits: 30, plays: null });

function remapper(asked: { file: string; parts: PartSummary[] }[], picks: Record<string, PartSummary['part'][]>, setParts = vi.fn()) {
  return typed<PartPickerSource>({
    questions: { asked, waiting: new Set(), offers: [] },
    picks,
    src: 'ggd_invasion',
    engines: [{ id: 'ggd_invasion', name: 'GGD Invasion', fullName: 'GetGood Drums Invasion' }],
    editor: { canonOptions: [{ canon: 'kick.main', label: 'Kick', family: 'Kick' }, { canon: 'snare1.hit', label: 'Snare', family: 'Snare' }] },
    setParts,
  });
}

describe('PartPicker', () => {
  it('shows nothing when no file is asked about', () => {
    const { container } = render(<PartPicker remapper={remapper([], {})} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('lists each part with its track, notes and what it plays as the source', () => {
    render(<PartPicker remapper={remapper([{ file: 'song.mid', parts: [KIT, BASS] }], {})} />);
    expect(screen.getByRole('group', { name: 'Which parts of song.mid are the drums?' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Track “Kit” · channel 1/ })).not.toBeChecked();
    expect(screen.getByText('Kick · Snare · china.1.hit · +1 more · 1 unknown')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Track 2 · channel 2/ })).toBeInTheDocument();
    expect(screen.getByText('What each would play as GGD Invasion:')).toBeInTheDocument();
  });

  it('ticks and unticks a part', async () => {
    const setParts = vi.fn();
    const { rerender } = render(<PartPicker remapper={remapper([{ file: 'song.mid', parts: [KIT, BASS] }], {}, setParts)} />);
    await userEvent.click(screen.getByRole('checkbox', { name: /Kit/ }));
    expect(setParts).toHaveBeenLastCalledWith('song.mid', [KIT.part]);
    rerender(<PartPicker remapper={remapper([{ file: 'song.mid', parts: [KIT, BASS] }], { 'song.mid': [KIT.part] }, setParts)} />);
    await userEvent.click(screen.getByRole('checkbox', { name: /Kit/ }));
    expect(setParts).toHaveBeenLastCalledWith('song.mid', []);
  });

  it('offers to tick the tracks named as in a file already picked', async () => {
    const setParts = vi.fn();
    const other = { ...KIT, part: { track: 3, channel: 1 } };
    render(
      <PartPicker remapper={remapper(
        [{ file: 'a.mid', parts: [KIT, BASS] }, { file: 'b.mid', parts: [BASS, other] }],
        { 'a.mid': [KIT.part] },
        setParts,
      )}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Tick the same tracks as in a.mid' }));
    expect(setParts).toHaveBeenCalledWith('b.mid', [other.part]);
  });
});

describe('PartOffers', () => {
  it('says what stayed beside channel 10 and converts it on request', async () => {
    const onAlsoConvert = vi.fn();
    const withOffers = [{ track: 1, channel: 10 }, KIT.part];
    render(<PartOffers offers={[{ file: 'mjod.mid', parts: [KIT], withOffers }]} onAlsoConvert={onAlsoConvert} />);
    expect(screen.getByText('12 notes on Track “Kit” · channel 1 in mjod.mid stayed as they were, beside the drums on channel 10.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Also convert them' }));
    expect(onAlsoConvert).toHaveBeenCalledWith('mjod.mid', withOffers);
  });
});
