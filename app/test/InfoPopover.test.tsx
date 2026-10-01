import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { InfoPopover } from '../src/components/InfoPopover';

function renderPopover() {
  render(
    <div>
      <InfoPopover label="2 drums played on another drum">
        <button type="button">Change in note editor →</button>
      </InfoPopover>
      <button type="button">elsewhere</button>
    </div>,
  );
  return screen.getByRole('button', { name: '2 drums played on another drum' });
}

const panel = () => screen.queryByRole('dialog');
const wait = (ms: number) => act(() => new Promise((r) => setTimeout(r, ms)));

describe('InfoPopover', () => {
  it('marks the text as having more to show', () => {
    const trigger = renderPopover();
    expect(trigger).toHaveClass('border-dotted');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens on hover and closes a moment after the mouse leaves', async () => {
    const trigger = renderPopover();
    await userEvent.hover(trigger);
    expect(await screen.findByRole('dialog')).toBeVisible();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await userEvent.unhover(trigger);
    expect(panel()).toBeInTheDocument();
    await waitFor(() => expect(panel()).not.toBeInTheDocument());
  });

  it('stays open after a click until Esc', async () => {
    const trigger = renderPopover();
    await userEvent.click(trigger);
    await userEvent.unhover(trigger);
    await wait(500);
    expect(panel()).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(panel()).not.toBeInTheDocument());
  });

  it('closes a pinned panel on a click outside', async () => {
    const trigger = renderPopover();
    await userEvent.click(trigger);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'elsewhere' }));
    await waitFor(() => expect(panel()).not.toBeInTheDocument());
  });

  it('opens from the keyboard and tabs straight into its controls', async () => {
    const trigger = renderPopover();
    trigger.focus();
    await userEvent.keyboard('{Enter}');
    expect(await screen.findByRole('dialog')).toBeVisible();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Change in note editor →' })).toHaveFocus();
  });
});
