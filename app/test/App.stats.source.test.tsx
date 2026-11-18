import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as stub from './stubs/wasm';
import { ask, convertMyKit, convertsWithUnrecognized, convertTheOtherWay, fitsTheTargetAndAsks, fitsThatAsk, SOURCE_ENGINES } from './sourceAdviceSteps';
import { addMidi, convertButton, pickEngines, startApp } from './eventSteps';
import { fakeUmami } from './umami';

const umami = fakeUmami();
const lastConverted = () => umami.mock.calls.filter(([name]) => name === 'converted').at(-1)?.[1];

describe('the events of the done card when the source may be wrong', () => {
  beforeEach(() => {
    vi.mocked(stub.engine_catalog).mockReturnValue(SOURCE_ENGINES);
    convertsWithUnrecognized();
  });

  async function convertAgainFromTheFirst() {
    await convertMyKit();
    await userEvent.click(screen.getByRole('button', { name: 'Convert again from GGD Modern & Massive' }));
    await screen.findByText('Read as GGD Modern & Massive.');
  }

  async function goBack() {
    await convertAgainFromTheFirst();
    await userEvent.click(screen.getByRole('button', { name: 'Back to GGD Invasion' }));
  }

  it('sends source-suggestion-used with its engine and where it was taken', async () => {
    await convertAgainFromTheFirst();
    expect(umami).toHaveBeenCalledWith('source-suggestion-used', { engine: 'ggd_mm', where: 'done' });
  });

  it('reports the conversion from a suggestion with the new pair, no preset and no edits', async () => {
    await convertAgainFromTheFirst();
    expect(lastConverted()).toMatchObject({ from: 'ggd_mm', preset: false, edited: false, via: 'suggested', closer: '' });
  });

  it('sends source-reverted for the way back', async () => {
    await goBack();
    expect(umami).toHaveBeenCalledWith('source-reverted');
  });

  it('reports the conversion back with the preset and edits it restored, as picked', async () => {
    await goBack();
    await vi.waitFor(() => expect(lastConverted()).toMatchObject({ from: 'ggd_invasion', preset: true, edited: true, via: 'picked' }));
  });

  it('sends engines-swapped from the done card for the target line', async () => {
    await convertTheOtherWay();
    expect(umami).toHaveBeenCalledWith('engines-swapped', { where: 'done' });
  });
});

describe('the events of the question before converting', () => {
  beforeEach(() => {
    vi.mocked(stub.engine_catalog).mockReturnValue(SOURCE_ENGINES);
    fitsThatAsk();
  });

  async function switchAndConvert() {
    await ask();
    await userEvent.click(screen.getByRole('button', { name: 'Convert as GGD Modern & Massive' }));
    await screen.findByRole('button', { name: /View report/i });
  }

  async function convertAnyway() {
    await ask();
    await userEvent.click(screen.getByRole('button', { name: 'Convert anyway' }));
    await screen.findByRole('button', { name: /View report/i });
  }

  it('sends source-asked with the share missed, the suggestion and how the source was chosen', async () => {
    await ask();
    expect(umami).toHaveBeenCalledWith('source-asked', { missed: 'under50', engine: 'ggd_mm', via: 'picked' });
  });

  it('sends source-answered switched', async () => {
    await switchAndConvert();
    expect(umami).toHaveBeenCalledWith('source-answered', { answer: 'switched' });
  });

  it('reports a conversion after switching as asked and switched to a suggestion', async () => {
    await switchAndConvert();
    expect(lastConverted()).toMatchObject({ from: 'ggd_mm', asked: 'switched', via: 'suggested' });
  });

  it('sends source-answered anyway', async () => {
    await convertAnyway();
    expect(umami).toHaveBeenCalledWith('source-answered', { answer: 'anyway' });
  });

  it('reports a conversion anyway from the chosen source as asked anyway', async () => {
    await convertAnyway();
    expect(lastConverted()).toMatchObject({ from: 'ggd_invasion', asked: 'anyway' });
  });

  it('sends source-answered dismissed for Escape', async () => {
    await ask();
    await userEvent.keyboard('{Escape}');
    expect(umami).toHaveBeenCalledWith('source-answered', { answer: 'dismissed' });
  });
});

describe('the events of the question when the target knows the notes', () => {
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
    await screen.findByRole('button', { name: 'Pick another source' });
  }

  it('sends source-asked naming the target', async () => {
    await askAboutTheTarget();
    expect(umami).toHaveBeenCalledWith('source-asked', { missed: 'under50', engine: 'ezdrummer', via: 'picked' });
  });

  it('sends source-answered picked for Pick another source', async () => {
    await askAboutTheTarget();
    await userEvent.click(screen.getByRole('button', { name: 'Pick another source' }));
    expect(umami).toHaveBeenCalledWith('source-answered', { answer: 'picked' });
  });
});
