import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FileIntake } from '../../src/convert/FileIntake';
import type { OnFiles } from '../../src/core/files';

describe('FileIntake', () => {
  it('shows the prompt when empty', () => {
    render(
      <FileIntake files={[]} failures={[]} onFiles={() => {}} onRemove={() => {}} onClear={() => {}} />,
    );
    expect(screen.getByText(/drop one or more .mid files/i)).toBeInTheDocument();
    expect(
      screen.getByText('Preset files you exported (.json) can be dropped or chosen the same way.'),
    ).toBeInTheDocument();
  });

  it('shows a choose-files button that opens the file picker', async () => {
    const click = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    render(
      <FileIntake files={[]} failures={[]} onFiles={() => {}} onRemove={() => {}} onClear={() => {}} />,
    );
    const picker = screen.getByRole('button', { name: /Drop one or more \.mid files anywhere Choose files$/ });
    expect(screen.getByText('Choose files')).toHaveClass('border-accent/45');
    await userEvent.click(picker);
    expect(click).toHaveBeenCalledOnce();
    click.mockRestore();
  });

  const empty = (onFiles: OnFiles = () => {}) => (
    <FileIntake files={[]} failures={[]} onFiles={onFiles} onRemove={() => {}} onClear={() => {}} />
  );
  const midi = (name: string, bytes: number[]) => new File([new Uint8Array(bytes)], name, { type: 'audio/midi' });

  it('offers the MIDI and preset extensions in its file dialog', () => {
    render(empty());
    expect(screen.getByTestId('file-input')).toHaveAttribute('accept', '.mid,.midi,.json');
  });

  it('reads multiple chosen files into byte arrays', async () => {
    const onFiles = vi.fn();
    render(empty(onFiles));
    await userEvent.upload(screen.getByTestId('file-input'), [midi('a.mid', [1, 2]), midi('b.mid', [3])]);
    await waitFor(() => expect(onFiles).toHaveBeenCalledTimes(1));
    const arg = onFiles.mock.calls[0][0];
    expect(arg.map((f: { name: string }) => f.name)).toEqual(['a.mid', 'b.mid']);
    expect(Array.from(arg[0].bytes)).toEqual([1, 2]);
  });

  it('passes only .mid/.midi files and names the skipped ones', async () => {
    const onFiles = vi.fn();
    const user = userEvent.setup({ applyAccept: false });
    render(empty(onFiles));
    await user.upload(screen.getByTestId('file-input'), [
      new File([new Uint8Array([1])], 'a.MIDI'),
      new File([new Uint8Array([2])], 'notes.txt'),
    ]);
    await waitFor(() => expect(onFiles).toHaveBeenCalledTimes(1));
    expect(onFiles.mock.calls[0][0].map((f: { name: string }) => f.name)).toEqual(['a.MIDI']);
    expect(onFiles.mock.calls[0][1]).toEqual(['notes.txt']);
  });

  it('opens the same file input from + add more as from the empty card', async () => {
    const click = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    const props = { failures: [], onFiles: () => {}, onRemove: () => {}, onClear: () => {} };
    const { rerender } = render(<FileIntake files={[]} {...props} />);
    const kept = screen.getByTestId('file-input');
    rerender(<FileIntake files={[{ bytes: new Uint8Array(1), name: 'one.mid' }]} {...props} />);
    await userEvent.click(screen.getByRole('button', { name: '+ add more' }));
    expect(screen.getByTestId('file-input')).toBe(kept);
    expect(click.mock.contexts).toHaveLength(1);
    expect(click.mock.contexts[0]).toBe(kept);
    click.mockRestore();
  });

  it('offers the sample groove, disabled with a hint saying to pick a FROM engine first', () => {
    render(<FileIntake files={[]} failures={[]} onFiles={() => {}} onRemove={() => {}} onClear={() => {}} />);
    const sample = screen.getByRole('button', { name: 'Try it with a sample groove' });
    expect(sample).toBeDisabled();
    expect(sample).toHaveAccessibleDescription('Pick a FROM engine first');
  });

  it('adds the sample groove when it is offered and pressed', async () => {
    const trySample = vi.fn();
    render(<FileIntake files={[]} failures={[]} onFiles={() => {}} onRemove={() => {}} onClear={() => {}} onTrySample={trySample} />);
    const sample = screen.getByRole('button', { name: 'Try it with a sample groove' });
    expect(sample).not.toHaveAccessibleDescription();
    await userEvent.click(sample);
    expect(trySample).toHaveBeenCalledOnce();
  });

  it('keeps the preset line out of the way once files are added', () => {
    render(
      <FileIntake
        files={[{ bytes: new Uint8Array(1), name: 'a.mid' }]}
        failures={[]}
        onFiles={() => {}}
        onRemove={() => {}}
        onClear={() => {}}
      />,
    );
    expect(screen.getByText(/Preset files you exported/)).not.toBeVisible();
    expect(screen.queryByRole('button', { name: /Choose files/ })).not.toBeInTheDocument();
  });

  it('keeps the empty card on the page once files are added, out of reach, with the notice under the chips', () => {
    const props = { failures: [], onFiles: () => {}, onRemove: () => {}, onClear: () => {} };
    const { rerender } = render(<FileIntake files={[]} {...props} />);
    const card = screen.getByText(/Preset files you exported/).parentElement!;
    expect(card).not.toHaveAttribute('inert');
    rerender(<FileIntake files={[{ bytes: new Uint8Array(1), name: 'a.mid' }]} {...props} notice={<p>notice</p>} />);
    expect(screen.getByText(/Preset files you exported/).parentElement).toBe(card);
    expect(card).toHaveAttribute('inert');
    expect(screen.getByText('notice')).toBeVisible();
  });

  it('names files that were skipped for not being MIDI', () => {
    render(
      <FileIntake
        files={[{ bytes: new Uint8Array(1), name: 'a.mid' }]}
        failures={[]}
        skipped={['notes.txt', 'cover.png']}
        onFiles={() => {}}
        onRemove={() => {}}
        onClear={() => {}}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Skipped notes.txt, cover.png — only .mid files and exported presets (.json) can be added',
    );
  });

  it('names the files a file added under their name replaced', () => {
    render(
      <FileIntake
        files={[{ bytes: new Uint8Array(1), name: 'kick.mid' }]}
        failures={[]}
        replaced={['kick.mid']}
        onFiles={() => {}}
        onRemove={() => {}}
        onClear={() => {}}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Replaced kick.mid with the file you just added.');
  });
});
