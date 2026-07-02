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

function makeProps(overrides = {}) {
  return {
    mappings: [mapping],
    engines,
    atCap: false,
    onLoad: vi.fn(),
    onEdit: vi.fn(),
    onRename: vi.fn(),
    onDuplicate: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  };
}

describe('SavedMappingChips', () => {
  it('renders nothing when there are no mappings', () => {
    const { container } = render(<SavedMappingChips {...makeProps({ mappings: [] })} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a chip per mapping and applies on body click', async () => {
    const p = makeProps({
      mappings: [mapping, { ...mapping, id: 'p2', name: 'Second' }],
    });
    render(<SavedMappingChips {...p} />);
    expect(screen.getByRole('button', { name: /^My kit/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Second/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^My kit/ }));
    expect(p.onLoad).toHaveBeenCalledWith(mapping);
  });

  it('disables the body of a stale mapping whose engine is gone', () => {
    render(<SavedMappingChips {...makeProps({ mappings: [{ ...mapping, tgt: 'removed_engine' }] })} />);
    expect(screen.getByRole('button', { name: /^My kit/ })).toBeDisabled();
  });
});
