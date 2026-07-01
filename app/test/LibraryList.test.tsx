import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LibraryList } from '../src/components/LibraryList';

const engines = [
  { id: 'ggd_invasion', name: 'GGD Invasion' },
  { id: 'ezdrummer', name: 'EZdrummer' },
];
const noFav = { favorites: new Set<string>(), onToggleFavorite: () => {} };

describe('LibraryList', () => {
  it('marks the selected engine pressed', () => {
    render(
      <LibraryList label="FROM" value="ggd_invasion" engines={engines} onChange={() => {}} {...noFav} />,
    );
    expect(screen.getByRole('button', { name: 'GGD Invasion' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'EZdrummer' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('emits the chosen id', async () => {
    const onChange = vi.fn();
    render(
      <LibraryList label="TO" value="ggd_invasion" engines={engines} onChange={onChange} {...noFav} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'EZdrummer' }));
    expect(onChange).toHaveBeenCalledWith('ezdrummer');
  });

  it('disables the engine matching disabledId and never emits it', async () => {
    const onChange = vi.fn();
    render(
      <LibraryList
        label="TO"
        value="ezdrummer"
        disabledId="ggd_invasion"
        engines={engines}
        onChange={onChange}
        {...noFav}
      />,
    );
    const disabled = screen.getByRole('button', { name: 'GGD Invasion' });
    expect(disabled).toBeDisabled();
    await userEvent.click(disabled);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('filters the list by name substring (case-insensitive)', async () => {
    render(
      <LibraryList label="FROM" value="ggd_invasion" engines={engines} onChange={() => {}} {...noFav} />,
    );
    await userEvent.type(screen.getByRole('textbox', { name: 'Filter FROM engines' }), 'INV');
    expect(screen.getByRole('button', { name: 'GGD Invasion' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'EZdrummer' })).toBeNull();
  });

  it('shows "no matches" and no engine buttons when nothing matches', async () => {
    render(
      <LibraryList label="FROM" value="ggd_invasion" engines={engines} onChange={() => {}} {...noFav} />,
    );
    await userEvent.type(screen.getByRole('textbox', { name: 'Filter FROM engines' }), 'zzz');
    expect(screen.getByText('no matches')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'GGD Invasion' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'EZdrummer' })).toBeNull();
  });

  it('clears the filter with the clear button', async () => {
    render(
      <LibraryList label="FROM" value="ggd_invasion" engines={engines} onChange={() => {}} {...noFav} />,
    );
    await userEvent.type(screen.getByRole('textbox', { name: 'Filter FROM engines' }), 'inv');
    await userEvent.click(screen.getByRole('button', { name: 'Clear filter' }));
    expect(screen.getByRole('button', { name: 'EZdrummer' })).toBeInTheDocument();
  });

  it('does not change selection when filtering hides it', async () => {
    const onChange = vi.fn();
    render(
      <LibraryList label="FROM" value="ezdrummer" engines={engines} onChange={onChange} {...noFav} />,
    );
    await userEvent.type(screen.getByRole('textbox', { name: 'Filter FROM engines' }), 'invasion');
    expect(screen.queryByRole('button', { name: 'EZdrummer' })).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('toggles a favourite via the star button without selecting', async () => {
    const onChange = vi.fn();
    const onToggleFavorite = vi.fn();
    render(
      <LibraryList
        label="FROM"
        value="ggd_invasion"
        engines={engines}
        onChange={onChange}
        favorites={new Set()}
        onToggleFavorite={onToggleFavorite}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Favorite EZdrummer' }));
    expect(onToggleFavorite).toHaveBeenCalledWith('ezdrummer');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('pins starred engines above the rest', () => {
    render(
      <LibraryList
        label="FROM"
        value="ggd_invasion"
        engines={engines}
        onChange={() => {}}
        favorites={new Set(['ezdrummer'])}
        onToggleFavorite={() => {}}
      />,
    );
    const ez = screen.getByRole('button', { name: 'EZdrummer' });
    const ggd = screen.getByRole('button', { name: 'GGD Invasion' });
    expect(ez.compareDocumentPosition(ggd) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByTestId('fav-divider')).toBeInTheDocument();
  });

  it('omits the divider when none or all are starred', () => {
    const { rerender } = render(
      <LibraryList
        label="FROM"
        value="ggd_invasion"
        engines={engines}
        onChange={() => {}}
        favorites={new Set()}
        onToggleFavorite={() => {}}
      />,
    );
    expect(screen.queryByTestId('fav-divider')).toBeNull();
    rerender(
      <LibraryList
        label="FROM"
        value="ggd_invasion"
        engines={engines}
        onChange={() => {}}
        favorites={new Set(['ggd_invasion', 'ezdrummer'])}
        onToggleFavorite={() => {}}
      />,
    );
    expect(screen.queryByTestId('fav-divider')).toBeNull();
  });
});
