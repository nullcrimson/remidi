import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CardDropzone } from '../src/components/CardDropzone';

const mid = () => new File([new Uint8Array([1, 2])], 'a.mid', { type: 'audio/midi' });
const txt = () => new File([new Uint8Array([9])], 'note.txt', { type: 'text/plain' });

describe('CardDropzone', () => {
  it('shows the overlay while dragging and hides on balanced leave', () => {
    render(
      <CardDropzone onFiles={() => {}}>
        <div>body</div>
      </CardDropzone>,
    );
    expect(screen.queryByText(/drop \.mid/i)).toBeNull();
    fireEvent.dragEnter(window);
    expect(screen.getByText(/drop \.mid/i)).toBeInTheDocument();
    fireEvent.dragLeave(window);
    expect(screen.queryByText(/drop \.mid/i)).toBeNull();
  });

  it('loads dropped .mid files and ignores non-mid', async () => {
    const onFiles = vi.fn();
    render(
      <CardDropzone onFiles={onFiles}>
        <div>body</div>
      </CardDropzone>,
    );
    fireEvent.drop(window, { dataTransfer: { files: [mid(), txt()] } });
    await waitFor(() => expect(onFiles).toHaveBeenCalledTimes(1));
    const arg = onFiles.mock.calls[0][0];
    expect(arg.map((f: { name: string }) => f.name)).toEqual(['a.mid']);
    expect(Array.from(arg[0].bytes)).toEqual([1, 2]);
  });

  it('does not call onFiles when only non-mid files are dropped', () => {
    const onFiles = vi.fn();
    render(
      <CardDropzone onFiles={onFiles}>
        <div>body</div>
      </CardDropzone>,
    );
    fireEvent.drop(window, { dataTransfer: { files: [txt()] } });
    expect(onFiles).not.toHaveBeenCalled();
  });

  it('hides the overlay after a drop', () => {
    render(
      <CardDropzone onFiles={() => {}}>
        <div>body</div>
      </CardDropzone>,
    );
    fireEvent.dragEnter(window);
    fireEvent.drop(window, { dataTransfer: { files: [mid()] } });
    expect(screen.queryByText(/drop \.mid/i)).toBeNull();
  });
});
