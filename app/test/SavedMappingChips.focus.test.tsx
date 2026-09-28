import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { SavedMappingChips } from '../src/components/SavedMappingChips';
import type { SavedMapping } from '../src/lib/mappings';

const engines = [
  { id: 'ggd_invasion', name: 'GGD Invasion', fullName: 'GGD Invasion' },
  { id: 'ezdrummer', name: 'EZdrummer', fullName: 'EZdrummer' },
];

const preset = (id: string, name: string): SavedMapping => ({
  id,
  name,
  src: 'ggd_invasion',
  tgt: 'ezdrummer',
  edits: {},
  srcEdits: {},
  updatedAt: 1,
});

function Harness({ initial }: { initial: SavedMapping[] }) {
  const [mappings, setMappings] = useState(initial);
  return (
    <>
      <input aria-label="FROM" />
      <SavedMappingChips
        mappings={mappings}
        engines={engines}
        atCap={false}
        onFocusFallback={() => screen.getByRole('textbox', { name: 'FROM' }).focus()}
        onLoad={() => {}}
        onEdit={() => {}}
        onRename={(id, name) => setMappings((ms) => ms.map((m) => (m.id === id ? { ...m, name } : m)))}
        onDuplicate={() => {}}
        onExport={() => {}}
        onDelete={(id) => setMappings((ms) => ms.filter((m) => m.id !== id))}
      />
    </>
  );
}

async function openMenu(name: string) {
  await userEvent.click(screen.getByRole('button', { name: `More actions for ${name}` }));
  return screen.getByRole('menu');
}

describe('saved preset focus', () => {
  it('returns to the chip after a rename is saved or cancelled', async () => {
    render(<Harness initial={[preset('a', 'Alpha')]} />);
    await userEvent.click(within(await openMenu('Alpha')).getByRole('menuitem', { name: 'Rename' }));
    await userEvent.keyboard('{Control>}a{/Control}Beta{Enter}');
    expect(screen.getByRole('button', { name: /^Beta/ })).toHaveFocus();
    await userEvent.click(within(await openMenu('Beta')).getByRole('menuitem', { name: 'Rename' }));
    await userEvent.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: /^Beta/ })).toHaveFocus();
  });

  it('moves to the next chip, then the previous, then the fallback after deletes', async () => {
    render(<Harness initial={[preset('a', 'Alpha'), preset('b', 'Bravo'), preset('c', 'Charlie')]} />);
    await userEvent.click(within(await openMenu('Alpha')).getByRole('menuitem', { name: 'Delete' }));
    expect(screen.getByRole('button', { name: /^Bravo/ })).toHaveFocus();
    await userEvent.click(within(await openMenu('Charlie')).getByRole('menuitem', { name: 'Delete' }));
    expect(screen.getByRole('button', { name: /^Bravo/ })).toHaveFocus();
    await userEvent.click(within(await openMenu('Bravo')).getByRole('menuitem', { name: 'Delete' }));
    expect(screen.getByRole('textbox', { name: 'FROM' })).toHaveFocus();
  });

  it('puts focus in the name field when renaming starts', async () => {
    render(<Harness initial={[preset('a', 'Alpha')]} />);
    await userEvent.click(within(await openMenu('Alpha')).getByRole('menuitem', { name: 'Rename' }));
    expect(screen.getByRole('textbox', { name: 'Rename Alpha' })).toHaveFocus();
  });

  it('returns to the menu button after Escape or Duplicate', async () => {
    render(<Harness initial={[preset('a', 'Alpha')]} />);
    await openMenu('Alpha');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'More actions for Alpha' })).toHaveFocus();
    await userEvent.click(within(await openMenu('Alpha')).getByRole('menuitem', { name: 'Duplicate' }));
    expect(screen.getByRole('button', { name: 'More actions for Alpha' })).toHaveFocus();
  });
});
