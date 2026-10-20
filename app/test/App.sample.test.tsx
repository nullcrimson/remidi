import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import * as stub from './stubs/wasm';
import { addMidi, pickEngines, pickFrom, startApp } from './eventSteps';

const sampleButton = () => screen.queryByRole('button', { name: 'Try it with a sample groove' });

describe('the sample groove', () => {
  it('waits for a FROM engine, saying so', async () => {
    await startApp();
    expect(sampleButton()).toBeDisabled();
    expect(sampleButton()).toHaveAccessibleDescription('Pick a FROM engine first');
  });

  it('adds a sample built for the FROM engine as a file, without converting while TO is not chosen', async () => {
    await startApp();
    await pickFrom('GGD Invasion');
    await userEvent.click(sampleButton()!);
    expect(stub.sample_file).toHaveBeenCalledWith('ggd_invasion');
    expect(screen.getByRole('button', { name: 'Remove sample-GGD.mid' })).toBeInTheDocument();
    expect(stub.remap).not.toHaveBeenCalled();
    expect(sampleButton()).not.toBeInTheDocument();
  });

  it('converts the sample at once when both engines are chosen', async () => {
    await startApp();
    await pickEngines();
    await userEvent.click(sampleButton()!);
    await screen.findByRole('button', { name: /View report/i });
    expect(vi.mocked(stub.remap).mock.calls.map((call) => call.slice(0, 3))).toEqual([[stub.SAMPLE_BYTES, 'ggd_invasion', 'ezdrummer']]);
    expect(screen.getByRole('link', { name: '↓ Download .mid' })).toHaveAttribute('download', 'sample-GGD-ezdrummer.mid');
  });

  it('is not offered once a file is added', async () => {
    await startApp();
    await addMidi('groove.mid');
    expect(sampleButton()).not.toBeInTheDocument();
  });
});
