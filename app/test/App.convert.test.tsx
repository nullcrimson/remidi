import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import App from '../src/App';
import { RUNTIME } from './runtime';
import * as stub from './stubs/wasm';
import { typed } from './typed';
import type { VoiceRow } from '../src/core/midiremap';

describe('App convert view', () => {
  beforeEach(() => {
    vi.mocked(stub.plan).mockReturnValue(typed<VoiceRow[]>([
      { canon: 'KickMain', label: 'Kick', family: 'Kick', srcNotes: [24], defaultTgtNote: 36, outcome: { status: 'direct', tgtNote: 36 } },
    ]));
  });

  it('disables convert and hides edit until both engines are chosen', async () => {
    render(<App runtime={RUNTIME} />);
    await waitFor(() => expect(screen.getByText('FROM')).toBeInTheDocument());
    expect(screen.getByRole('heading', { name: /^Drumverter/ })).toBeInTheDocument();
    expect(screen.getByText('TO')).toBeInTheDocument();

    const editButton = () => screen.queryByRole('button', { name: /Edit individual notes/i });
    expect(editButton()).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Convert' })).toBeDisabled();

    await userEvent.click(screen.getAllByRole('option', { name: 'GGD Invasion' })[0]);
    await userEvent.click(screen.getAllByRole('option', { name: 'EZdrummer' })[1]);

    expect(editButton()).toBeEnabled();
  });
});
