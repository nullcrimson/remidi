import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { Modal } from '../src/components/Modal';
import { useFocusIntent } from '../src/hooks/useFocusIntent';

function Screen() {
  const focus = useFocusIntent();
  const [editing, setEditing] = useState(true);
  return (
    <>
      {editing
        ? (
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                focus.request('editLink');
              }}
            >
              Back
            </button>
          )
        : (
            <button type="button" ref={focus.ref('editLink')}>Edit notes</button>
          )}
      <button type="button" ref={focus.ref('convert')} onClick={() => focus.request('convert')}>
        Convert
      </button>
    </>
  );
}

describe('useFocusIntent', () => {
  it('focuses a target that only appears in the render the request causes', async () => {
    render(<Screen />);
    act(() => screen.getByRole('button', { name: 'Back' }).click());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Edit notes' })).toHaveFocus());
  });

  it('wins over a closing dialog that hands focus back to its opener', async () => {
    function WithDialog() {
      const focus = useFocusIntent();
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>Open report</button>
          <select aria-label="Drum channel" ref={focus.ref('channel')} />
          <Modal open={open} heading="Report" onClose={() => setOpen(false)}>
            <button
              type="button"
              onClick={() => {
                focus.request('channel');
                setOpen(false);
              }}
            >
              Drum channel →
            </button>
          </Modal>
        </>
      );
    }
    render(<WithDialog />);
    await userEvent.click(screen.getByRole('button', { name: 'Open report' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Drum channel →' }));
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByRole('combobox', { name: 'Drum channel' })).toHaveFocus();
  });

  it('focuses the same target again on a second request', async () => {
    render(<Screen />);
    const convert = screen.getByRole('button', { name: 'Convert' });
    act(() => convert.click());
    await waitFor(() => expect(convert).toHaveFocus());
    act(() => convert.blur());
    act(() => convert.click());
    await waitFor(() => expect(convert).toHaveFocus());
  });

  it('gives each target one stable ref', () => {
    let refs: unknown[] = [];
    function Probe() {
      const focus = useFocusIntent();
      refs = [...refs, focus.ref('main')];
      return null;
    }
    const { rerender } = render(<Probe />);
    rerender(<Probe />);
    expect(refs[0]).toBe(refs[1]);
  });
});
