import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FileChips } from '../src/components/FileChips';

describe('FileChips', () => {
  it('shows the prompt when empty', () => {
    render(
      <FileChips files={[]} failures={[]} onFiles={() => {}} onRemove={() => {}} onClear={() => {}} />,
    );
    expect(screen.getByText(/drop a .mid/i)).toBeInTheDocument();
  });

  it('renders a rectangle per file and removes one', async () => {
    const onRemove = vi.fn();
    render(
      <FileChips
        files={[
          { bytes: new Uint8Array(1), name: 'a.mid' },
          { bytes: new Uint8Array(1), name: 'b.mid' },
        ]}
        failures={[]}
        onFiles={() => {}}
        onRemove={onRemove}
        onClear={() => {}}
      />,
    );
    expect(screen.getByText('a.mid')).toBeInTheDocument();
    expect(screen.getByText('b.mid')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Remove a.mid/i }));
    expect(onRemove).toHaveBeenCalledWith('a.mid');
  });

  it('clears all files via the clear-all button', async () => {
    const onClear = vi.fn();
    render(
      <FileChips
        files={[{ bytes: new Uint8Array(1), name: 'a.mid' }]}
        failures={[]}
        onFiles={() => {}}
        onRemove={() => {}}
        onClear={onClear}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /clear all/i }));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it('marks a failed file with danger state', () => {
    render(
      <FileChips
        files={[{ bytes: new Uint8Array(1), name: 'bad.mid' }]}
        failures={[{ name: 'bad.mid', error: 'parse failed' }]}
        onFiles={() => {}}
        onRemove={() => {}}
        onClear={() => {}}
      />,
    );
    const chip = screen.getByText('bad.mid').closest('[data-state]');
    expect(chip).toHaveAttribute('data-state', 'failed');
    expect(chip).toHaveAttribute('title', 'parse failed');
  });
});
