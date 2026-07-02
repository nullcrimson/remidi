import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SavedMappingChip } from '../src/components/SavedMappingChip';
import type { SavedMapping } from '../src/lib/mappings';

const mapping: SavedMapping = {
  id: 'p1',
  name: 'My kit',
  src: 'ggd_invasion',
  tgt: 'ezdrummer',
  edits: { 'kick.main': 36 },
  srcEdits: {},
  updatedAt: 1,
};

function makeProps(overrides = {}) {
  return {
    mapping,
    known: true,
    atCap: false,
    onLoad: vi.fn(),
    onEdit: vi.fn(),
    onRename: vi.fn(),
    onDuplicate: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  };
}

function renderChip(overrides = {}) {
  const props = makeProps(overrides);
  render(
    <ul>
      <SavedMappingChip {...props} />
    </ul>,
  );
  return props;
}

describe('SavedMappingChip', () => {
  it('applies the preset on body click', async () => {
    const p = renderChip();
    await userEvent.click(screen.getByRole('button', { name: /^My kit/ }));
    expect(p.onLoad).toHaveBeenCalledWith(mapping);
  });

  it('edits notes via the pencil', async () => {
    const p = renderChip();
    await userEvent.click(screen.getByRole('button', { name: 'Edit notes for My kit' }));
    expect(p.onEdit).toHaveBeenCalledWith(mapping);
  });

  it('opens the more-actions menu', async () => {
    renderChip();
    await userEvent.click(screen.getByRole('button', { name: 'More actions for My kit' }));
    expect(screen.getByRole('menu')).toBeVisible();
  });

  it('renames via the menu using the inline input', async () => {
    const p = renderChip();
    await userEvent.click(screen.getByRole('button', { name: 'More actions for My kit' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Rename' }));
    const input = screen.getByRole('textbox', { name: /rename/i });
    await userEvent.clear(input);
    await userEvent.type(input, 'New name{Enter}');
    expect(p.onRename).toHaveBeenCalledWith('p1', 'New name');
  });

  it('duplicates via the menu', async () => {
    const p = renderChip();
    await userEvent.click(screen.getByRole('button', { name: 'More actions for My kit' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Duplicate' }));
    expect(p.onDuplicate).toHaveBeenCalledWith(mapping);
  });

  it('disables Duplicate at the cap', async () => {
    const p = renderChip({ atCap: true });
    await userEvent.click(screen.getByRole('button', { name: 'More actions for My kit' }));
    const dup = screen.getByRole('menuitem', { name: 'Duplicate' });
    expect(dup).toBeDisabled();
    await userEvent.click(dup);
    expect(p.onDuplicate).not.toHaveBeenCalled();
  });

  it('deletes via the menu', async () => {
    const p = renderChip();
    await userEvent.click(screen.getByRole('button', { name: 'More actions for My kit' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    expect(p.onDelete).toHaveBeenCalledWith('p1');
  });

  it('closes the menu on Escape', async () => {
    renderChip();
    await userEvent.click(screen.getByRole('button', { name: 'More actions for My kit' }));
    expect(screen.getByRole('menu')).toBeVisible();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('disables body and edit for a stale preset', () => {
    renderChip({ known: false });
    expect(screen.getByRole('button', { name: /^My kit/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Edit notes for My kit' })).toBeDisabled();
  });
});
