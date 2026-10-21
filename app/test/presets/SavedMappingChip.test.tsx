import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SavedMappingChip } from '../../src/presets/SavedMappingChip';
import type { SavedMapping } from '../../src/presets/mappings';
import { presetName, typed } from '../typed';

const mapping = typed<SavedMapping>({
  id: 'p1',
  name: presetName('My kit'),
  src: 'ggd_invasion',
  tgt: 'ezdrummer',
  edits: { 'kick.main': 36 },
  srcEdits: {},
  updatedAt: 1,
});

function makeProps(overrides = {}) {
  return {
    mapping,
    known: true,
    atCap: false,
    onLoad: vi.fn(),
    onEdit: vi.fn(),
    onRename: vi.fn(),
    onDuplicate: vi.fn(),
    onExport: vi.fn(),
    onRack: vi.fn(),
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

  it('exports via the menu', async () => {
    const p = renderChip();
    await userEvent.click(screen.getByRole('button', { name: 'More actions for My kit' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Export' }));
    expect(p.onExport).toHaveBeenCalledWith(mapping);
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

  it('lists Rename, Duplicate, Export, Ableton rack and Delete in that order', async () => {
    renderChip();
    await userEvent.click(screen.getByRole('button', { name: 'More actions for My kit' }));
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
      'Rename',
      'Duplicate',
      'Export',
      'Ableton rack',
      'Delete',
    ]);
  });

  it('downloads the rack via the menu', async () => {
    const p = renderChip();
    await userEvent.click(screen.getByRole('button', { name: 'More actions for My kit' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Ableton rack' }));
    expect(p.onRack).toHaveBeenCalledWith(mapping);
  });

  it('disables Ableton rack for a stale preset', async () => {
    const p = renderChip({ known: false });
    await userEvent.click(screen.getByRole('button', { name: 'More actions for My kit' }));
    const rack = screen.getByRole('menuitem', { name: 'Ableton rack' });
    expect(rack).toBeDisabled();
    await userEvent.click(rack);
    expect(p.onRack).not.toHaveBeenCalled();
  });

  it('disables body and edit for a stale preset', () => {
    renderChip({ known: false });
    expect(screen.getByRole('button', { name: /^My kit/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Edit notes for My kit' })).toBeDisabled();
  });
});
