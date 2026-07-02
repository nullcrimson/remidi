import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SavedMappingChips } from '../src/components/SavedMappingChips';
import type { SavedMapping } from '../src/lib/mappings';

const engines = [
  { id: 'ggd_invasion', name: 'GGD Invasion' },
  { id: 'ezdrummer', name: 'EZdrummer' },
];

const mapping: SavedMapping = {
  id: 'p1',
  name: 'My kit',
  src: 'ggd_invasion',
  tgt: 'ezdrummer',
  edits: { 'kick.main': 36 },
  srcEdits: {},
  updatedAt: 1,
};

describe('SavedMappingChips', () => {
  it('renders nothing when there are no mappings', () => {
    const { container } = render(
      <SavedMappingChips
        mappings={[]}
        engines={engines}
        onLoad={vi.fn()}
        onDelete={vi.fn()}
        onRename={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('loads a mapping on click and deletes via its control', async () => {
    const onLoad = vi.fn();
    const onDelete = vi.fn();
    render(
      <SavedMappingChips
        mappings={[mapping]}
        engines={engines}
        onLoad={onLoad}
        onDelete={onDelete}
        onRename={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /^My kit/ }));
    expect(onLoad).toHaveBeenCalledWith(mapping);
    await userEvent.click(screen.getByRole('button', { name: 'Delete preset My kit' }));
    expect(onDelete).toHaveBeenCalledWith('p1');
  });

  it('renames a mapping inline via the pencil control', async () => {
    const onRename = vi.fn();
    const onLoad = vi.fn();
    render(
      <SavedMappingChips
        mappings={[mapping]}
        engines={engines}
        onLoad={onLoad}
        onDelete={vi.fn()}
        onRename={onRename}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Rename preset My kit' }));
    const input = screen.getByRole('textbox', { name: /rename/i });
    await userEvent.clear(input);
    await userEvent.type(input, 'New name{Enter}');
    expect(onRename).toHaveBeenCalledWith('p1', 'New name');
    expect(onLoad).not.toHaveBeenCalled();
  });

  it('disables loading a stale mapping whose engine is gone', () => {
    const stale = { ...mapping, tgt: 'removed_engine' };
    render(
      <SavedMappingChips
        mappings={[stale]}
        engines={engines}
        onLoad={vi.fn()}
        onDelete={vi.fn()}
        onRename={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /^My kit/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Delete preset My kit' })).toBeEnabled();
  });
});
