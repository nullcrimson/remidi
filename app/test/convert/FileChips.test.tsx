import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { FailedFile } from '../../src/convert/batch';
import { FileChips } from '../../src/convert/FileChips';
import type { AppError } from '../../src/core/errors';
import type { LoadedFile } from '../../src/core/files';

const file = (name: string): LoadedFile => ({ bytes: new Uint8Array(1), name });

function chips({ files, failures = [], waiting = new Set(), onRemove = () => {}, onClear = () => {}, onPick = () => {} }: {
  files: LoadedFile[];
  failures?: FailedFile[];
  waiting?: ReadonlySet<string>;
  onRemove?: (name: string) => void;
  onClear?: () => void;
  onPick?: () => void;
}) {
  return render(
    <FileChips files={files} failures={failures} waiting={waiting} onPick={onPick} onRemove={onRemove} onClear={onClear} skippedLine={false} />,
  );
}

describe('FileChips', () => {
  it('renders a rectangle per file', () => {
    chips({ files: [file('a.mid'), file('b.mid')] });
    expect(screen.getByText('a.mid')).toBeInTheDocument();
    expect(screen.getByText('b.mid')).toBeInTheDocument();
  });

  it('removes one file', async () => {
    const onRemove = vi.fn();
    chips({ files: [file('a.mid'), file('b.mid')], onRemove });
    await userEvent.click(screen.getByRole('button', { name: /Remove a.mid/i }));
    expect(onRemove).toHaveBeenCalledWith('a.mid');
  });

  it('clears all files via the clear-all button', async () => {
    const onClear = vi.fn();
    chips({ files: [file('a.mid')], onClear });
    await userEvent.click(screen.getByRole('button', { name: /clear all/i }));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it('asks for the file input from + add more', async () => {
    const onPick = vi.fn();
    chips({ files: [file('a.mid')], onPick });
    await userEvent.click(screen.getByRole('button', { name: '+ add more' }));
    expect(onPick).toHaveBeenCalledOnce();
  });

  it('marks a failed file with danger state', () => {
    chips({ files: [file('bad.mid')], failures: [{ name: 'bad.mid', error: { kind: 'badMidi', detail: 'parse failed' } }] });
    const chip = screen.getByText('bad.mid').closest('[data-state]');
    expect(chip).toHaveAttribute('data-state', 'failed');
    expect(chip).toHaveAttribute('title', 'Not a MIDI file this converter can read Details: parse failed');
  });

  const failedChip = (error: AppError) => {
    chips({ files: [file('bad.mid')], failures: [{ name: 'bad.mid', error }] });
    return screen.getByText('bad.mid').closest('[data-state]');
  };

  it('says on its chip that a file it could not read is unreadable', () => {
    expect(failedChip({ kind: 'badMidi', detail: 'parse failed' })).toHaveTextContent(/bad\.midunreadable/);
  });

  it('says on its chip that a file converted before its drum parts were picked has parts not picked', () => {
    expect(failedChip({ kind: 'needsParts' })).toHaveTextContent(/bad\.midparts not picked/);
  });

  it('says on its chip that a file that failed for any other reason failed', () => {
    expect(failedChip({ kind: 'internal', detail: 'boom' })).toHaveTextContent(/bad\.midfailed/);
  });

  it('marks a file waiting for its drum parts and says why', () => {
    chips({ files: [file('song.mid'), file('drums.mid')], waiting: new Set(['song.mid']) });
    const waiting = screen.getByText('song.mid').closest('[data-state]');
    expect(waiting).toHaveAttribute('data-state', 'waiting');
    expect(waiting).toHaveTextContent(/pick this file's drum parts first/i);
    expect(screen.getByText('drums.mid').closest('[data-state]')).toHaveAttribute('data-state', 'ok');
  });

  it('marks a file that failed as failed even while it waits for its drum parts', () => {
    chips({
      files: [file('bad.mid')],
      failures: [{ name: 'bad.mid', error: { kind: 'badMidi', detail: 'parse failed' } }],
      waiting: new Set(['bad.mid']),
    });
    expect(screen.getByText('bad.mid').closest('[data-state]')).toHaveAttribute('data-state', 'failed');
  });
});
