import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { InfoPopover } from '../../src/convert/InfoPopover';

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

  it('opens on hover', async () => {
    const trigger = renderPopover();
    await userEvent.hover(trigger);
    expect(await screen.findByRole('dialog')).toBeVisible();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('closes a moment after the mouse leaves', async () => {
    const trigger = renderPopover();
    await userEvent.hover(trigger);
    await screen.findByRole('dialog');
    await userEvent.unhover(trigger);
    expect(panel()).toBeInTheDocument();
    await waitFor(() => expect(panel()).not.toBeInTheDocument());
  });

  it('stays open after a click when the mouse leaves', async () => {
    const trigger = renderPopover();
    await userEvent.click(trigger);
    await userEvent.unhover(trigger);
    await wait(500);
    expect(panel()).toBeInTheDocument();
  });

  it('closes a pinned panel on Esc', async () => {
    const trigger = renderPopover();
    await userEvent.click(trigger);
    await userEvent.unhover(trigger);
    await wait(500);
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(panel()).not.toBeInTheDocument());
  });

  it('opens again after Esc closed it', async () => {
    const trigger = renderPopover();
    await userEvent.click(trigger);
    await screen.findByRole('dialog');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(panel()).not.toBeInTheDocument());
    await userEvent.click(trigger);
    expect(await screen.findByRole('dialog')).toBeVisible();
  });

  it('closes a pinned panel on a click outside', async () => {
    const trigger = renderPopover();
    await userEvent.click(trigger);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'elsewhere' }));
    await waitFor(() => expect(panel()).not.toBeInTheDocument());
  });

  it('opens from the keyboard', async () => {
    const trigger = renderPopover();
    trigger.focus();
    await userEvent.keyboard('{Enter}');
    expect(await screen.findByRole('dialog')).toBeVisible();
  });

  it('tabs straight into its controls', async () => {
    const trigger = renderPopover();
    trigger.focus();
    await userEvent.keyboard('{Enter}');
    await screen.findByRole('dialog');
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Change in note editor →' })).toHaveFocus();
  });
});
