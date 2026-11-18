import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import * as stub from './stubs/wasm';
import { addMidi, convertButton, engineCard, pickEngines, pickFrom, pickTo, startApp } from './eventSteps';
import {
  ask,
  ASK_SENTENCE,
  chosen,
  convertMyKit,
  convertsWithUnrecognized,
  convertTheOtherWay,
  fitsTheTargetAndAsks,
  fitsThatAsk,
  fitsWithInvasionAt,
  SOURCE_ENGINES,
  TARGET_ASK_SENTENCE,
} from './sourceAdviceSteps';

const notice = () => screen.queryByText(/ notes in your file\.$/);
const suggestions = () => within(notice()!.parentElement!).getAllByRole('button').map((b) => b.textContent);

async function chooseTheSuggestion() {
  fitsWithInvasionAt(300);
  await startApp();
  await pickEngines();
  await addMidi('groove.mid');
  await userEvent.click(await screen.findByRole('button', { name: 'Use GGD Modern & Massive' }));
}

describe('the source advice notice', () => {
  beforeEach(() => {
    vi.mocked(stub.engine_catalog).mockReturnValue(SOURCE_ENGINES);
  });

  it('shows nothing before a file is added', async () => {
    fitsWithInvasionAt(300);
    await startApp();
    await pickEngines();
    expect(notice()).not.toBeInTheDocument();
    expect(stub.source_advice).not.toHaveBeenCalled();
  });

  it("says how many of the file's notes the source misses once a file is added", async () => {
    fitsWithInvasionAt(405);
    await startApp();
    await pickEngines();
    await addMidi('groove.mid');
    expect(await screen.findByRole('status')).toHaveTextContent("GGD Invasion doesn't know 7 of the 412 notes in your file.");
    expect(notice()!.parentElement).toHaveTextContent('GGD Modern & Massive knows every note.Use GGD Modern & Massive');
  });

  it('fits the files under the drum channel', async () => {
    fitsWithInvasionAt(405);
    await startApp();
    await pickEngines();
    await addMidi('groove.mid');
    await screen.findByText(/ notes in your file\.$/);
    expect(vi.mocked(stub.source_advice).mock.lastCall).toEqual([[{ bytes: new Uint8Array([1]), selection: { scope: 'auto' } }], 'ggd_invasion', 'ezdrummer']);
  });

  it('suggests one engine', async () => {
    fitsWithInvasionAt(300);
    await startApp();
    await pickEngines();
    await addMidi('groove.mid');
    await screen.findByText(/ notes in your file\.$/);
    expect(suggestions()).toEqual(['Use GGD Modern & Massive']);
  });

  it('shows no target line when another engine is suggested', async () => {
    fitsWithInvasionAt(300);
    await startApp();
    await pickEngines();
    await addMidi('groove.mid');
    await screen.findByText(/ notes in your file\.$/);
    expect(screen.queryByText(/may already be in its layout/)).not.toBeInTheDocument();
  });

  it('makes a chosen suggestion the source', async () => {
    await chooseTheSuggestion();
    expect(chosen('FROM')).toHaveTextContent('GGD Modern & Massive');
  });

  it('advises again for the new source', async () => {
    await chooseTheSuggestion();
    await vi.waitFor(() => expect(vi.mocked(stub.source_advice).mock.lastCall?.[1]).toBe('ggd_mm'));
  });

  it('goes away once the source recognizes every note', async () => {
    fitsWithInvasionAt(300);
    await startApp();
    await pickEngines();
    await addMidi('groove.mid');
    await userEvent.click(await screen.findByRole('button', { name: 'Use GGD Modern & Massive' }));
    expect(notice()).not.toBeInTheDocument();
  });

  const step = (title: string) => screen.getByRole('region', { name: new RegExp(`^${title}`) });

  it('shows under the engine pickers from the sm width up', async () => {
    fitsWithInvasionAt(300);
    await startApp();
    await pickEngines();
    await addMidi('groove.mid');
    await screen.findByText(/ notes in your file\.$/);
    expect(within(step('From one drum layout to another')).getByRole('status')).toHaveTextContent('notes in your file');
    expect(within(step('Your drum file')).queryByText(/ notes in your file\.$/)).not.toBeInTheDocument();
  });

  const onAPhone = () => {
    const phone = (media: string) => ({ media, matches: false, addEventListener: () => {}, removeEventListener: () => {} }) as unknown as MediaQueryList;
    const narrow = vi.spyOn(window, 'matchMedia').mockImplementation(phone);
    onTestFinished(() => narrow.mockRestore());
  };

  const addedWithBothEngines = async (invasion: number) => {
    fitsWithInvasionAt(invasion);
    await startApp();
    await pickEngines();
    await addMidi('groove.mid');
    await vi.waitFor(() => expect(stub.source_advice).toHaveBeenCalled());
  };

  it('moves focus to Convert after a file is added on a desktop, though the notice shows', async () => {
    await addedWithBothEngines(300);
    await screen.findByText(/ notes in your file\.$/);
    await vi.waitFor(() => expect(convertButton()).toHaveFocus());
  });

  it('moves focus on a phone to the notice once the advice shows it, instead of to Convert', async () => {
    onAPhone();
    await addedWithBothEngines(300);
    const sentence = await screen.findByText(/ notes in your file\.$/);
    await vi.waitFor(() => expect(sentence).toHaveFocus());
    expect(sentence).toHaveRole('status');
    expect(convertButton()).not.toHaveFocus();
  });

  it('moves focus on a phone to Convert once the advice shows no notice', async () => {
    onAPhone();
    await addedWithBothEngines(412);
    await vi.waitFor(() => expect(convertButton()).toHaveFocus());
    expect(screen.queryByText(/ notes in your file\.$/)).not.toBeInTheDocument();
  });

  it('shows on a phone in the file step, under the chips', async () => {
    onAPhone();
    await addedWithBothEngines(300);
    await screen.findByText(/ notes in your file\.$/);
    expect(within(step('Your drum file')).getByRole('status')).toHaveTextContent('notes in your file');
    expect(within(step('From one drum layout to another')).queryByText(/ notes in your file\.$/)).not.toBeInTheDocument();
  });

  it('moves focus to FROM on a phone when its Use button is pressed', async () => {
    onAPhone();
    await addedWithBothEngines(300);
    await userEvent.click(await screen.findByRole('button', { name: 'Use GGD Modern & Massive' }));
    await vi.waitFor(() => expect(engineCard('FROM')).toHaveFocus());
  });

  it('shows nothing when the source recognizes every note', async () => {
    fitsWithInvasionAt(412);
    await startApp();
    await pickEngines();
    await addMidi('groove.mid');
    await vi.waitFor(() => expect(stub.source_advice).toHaveBeenCalled());
    expect(notice()).not.toBeInTheDocument();
  });
});

describe('the done card when the source may be wrong', () => {
  beforeEach(() => {
    vi.mocked(stub.engine_catalog).mockReturnValue(SOURCE_ENGINES);
    convertsWithUnrecognized();
  });

  const remapped = () => vi.mocked(stub.remap).mock.lastCall!;

  it('converts again from the first suggestion in one click, with target edits present, and the done card stays', async () => {
    await convertMyKit();
    expect(remapped()[3]).toEqual({ edits: { 'kick.main': 40 }, srcEdits: {} });
    await userEvent.click(screen.getByRole('button', { name: 'Convert again from GGD Modern & Massive' }));
    await screen.findByText('Read as GGD Modern & Massive.');
    expect([remapped()[1], remapped()[2], remapped()[3]]).toEqual(['ggd_mm', 'ezdrummer', { edits: {}, srcEdits: {} }]);
    expect(screen.getByRole('button', { name: /View report/i })).toBeInTheDocument();
    expect(chosen('FROM')).toHaveTextContent('GGD Modern & Massive');
  });

  it('shows the notice no longer once a file is converted', async () => {
    await convertMyKit();
    expect(screen.queryByRole('button', { name: 'Use GGD Modern & Massive' })).not.toBeInTheDocument();
  });

  it('goes back to the whole pair after converting the other way', async () => {
    await convertTheOtherWay();
    await userEvent.click(screen.getByRole('button', { name: 'Back to GGD Invasion → EZdrummer' }));
    await vi.waitFor(() => expect([remapped()[1], remapped()[2]]).toEqual(['ggd_invasion', 'ezdrummer']));
    expect([chosen('FROM'), chosen('TO')].map((e) => e.textContent)).toEqual(['GGD Invasion', 'EZdrummer']);
  });
});

describe('Convert asks first when the source reads no kit', () => {
  beforeEach(() => {
    vi.mocked(stub.engine_catalog).mockReturnValue(SOURCE_ENGINES);
    fitsThatAsk();
  });

  const question = () => screen.queryByRole('group', { name: ASK_SENTENCE });

  it('holds Convert, says why, and puts focus on its sentence', async () => {
    await ask();
    expect(stub.remap).not.toHaveBeenCalled();
    expect(screen.getByText(ASK_SENTENCE)).toHaveFocus();
  });

  it('goes away when the source changes', async () => {
    await ask();
    await pickFrom('GGD Rock Fundamentals');
    expect(question()).not.toBeInTheDocument();
  });

  it('is not asked after going back to the source it left', async () => {
    await ask();
    await userEvent.click(screen.getByRole('button', { name: 'Convert as GGD Modern & Massive' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Back to GGD Invasion' }));
    await vi.waitFor(() => expect(vi.mocked(stub.remap).mock.lastCall![1]).toBe('ggd_invasion'));
    await pickTo('Superior Drummer 3');
    await userEvent.click(convertButton());
    await screen.findByRole('button', { name: /View report/i });
    expect(question()).not.toBeInTheDocument();
  });
});

describe('Convert asks first when the target knows the notes the source misses', () => {
  beforeEach(() => {
    vi.mocked(stub.engine_catalog).mockReturnValue(SOURCE_ENGINES);
    fitsTheTargetAndAsks();
  });

  async function askAboutTheTarget() {
    await startApp();
    await pickEngines();
    await addMidi('groove.mid');
    await screen.findByText(/ notes in your file\.$/);
    await userEvent.click(convertButton());
    return screen.findByRole('group', { name: TARGET_ASK_SENTENCE });
  }

  it('offers to pick another source or to convert anyway, and no swap', async () => {
    const question = await askAboutTheTarget();
    expect(within(question).getAllByRole('button').map((b) => b.textContent)).toEqual(['Pick another source', 'Convert anyway']);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('closes on Pick another source and converts nothing', async () => {
    await askAboutTheTarget();
    await userEvent.click(screen.getByRole('button', { name: 'Pick another source' }));
    expect(screen.queryByRole('group', { name: TARGET_ASK_SENTENCE })).not.toBeInTheDocument();
    expect(stub.remap).not.toHaveBeenCalled();
  });

  it('opens the FROM picker on Pick another source', async () => {
    await askAboutTheTarget();
    await userEvent.click(screen.getByRole('button', { name: 'Pick another source' }));
    expect(await screen.findByRole('dialog', { name: 'Choose the FROM engine' })).toBeInTheDocument();
  });
});
