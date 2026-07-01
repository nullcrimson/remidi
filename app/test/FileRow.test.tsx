import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FileRow } from '../src/components/FileRow';

describe('FileRow', () => {
  it('reads a chosen file into bytes', async () => {
    const onFile = vi.fn();
    render(<FileRow file={null} onFile={onFile} onReplace={() => {}} />);
    const input = screen.getByTestId('file-input') as HTMLInputElement;
    const file = new File([new Uint8Array([10, 20, 30])], 'beat.mid', { type: 'audio/midi' });
    await userEvent.upload(input, file);
    await waitFor(() => expect(onFile).toHaveBeenCalledTimes(1));
    const arg = onFile.mock.calls[0][0];
    expect(arg.name).toBe('beat.mid');
    expect(Array.from(arg.bytes)).toEqual([10, 20, 30]);
  });

  it('shows the loaded file name and a replace control', async () => {
    const onReplace = vi.fn();
    render(
      <FileRow
        file={{ bytes: new Uint8Array(4), name: 'loop.mid' }}
        onFile={() => {}}
        onReplace={onReplace}
      />,
    );
    expect(screen.getByText('loop.mid')).toBeInTheDocument();
    await userEvent.click(screen.getByText('replace'));
    expect(onReplace).toHaveBeenCalledOnce();
  });
});
