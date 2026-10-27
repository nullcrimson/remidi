import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import App from '../src/App';
import { RUNTIME } from './runtime';
import * as stub from './stubs/wasm';
import { typed } from './typed';
import type { VoicePlan } from '../src/core/midiremap';
import { pickFrom, pickTo } from './eventSteps';

describe('App convert view', () => {
  beforeEach(() => {
    vi.mocked(stub.plan).mockReturnValue(typed<VoicePlan[]>([
      { canon: 'KickMain', label: 'Kick', family: 'Kick', srcNotes: [24], defaultTgtNote: 36, outcome: { status: 'direct', note: 36 } },
    ]));
  });

  it('disables convert and hides edit until both engines are chosen', async () => {
    render(<App runtime={RUNTIME} />);
    await waitFor(() => expect(screen.getByText('FROM')).toBeInTheDocument());
    expect(screen.getByRole('heading', { name: /^Drumverter/ })).toBeInTheDocument();
    expect(screen.getByText('TO')).toBeInTheDocument();

    const editButton = () => screen.queryByRole('button', { name: /Edit individual notes/i });
    expect(editButton()).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Convert( \d+ files? to .+)?$/ })).toBeDisabled();

    await pickFrom('GGD Invasion');
    await pickTo('EZdrummer');

    expect(editButton()).toBeEnabled();
  });
});
