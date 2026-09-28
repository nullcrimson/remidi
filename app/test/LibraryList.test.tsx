import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LibraryList } from '../src/components/LibraryList';

const engines = [
  { id: 'addictive', name: 'Addictive Drums 2' },
  { id: 'ggd_invasion', name: 'GGD Invasion' },
  { id: 'ezdrummer', name: 'EZdrummer' },
];
const noFav = { favorites: new Set<string>(), onToggleFavorite: () => {} };

const combobox = () => screen.getByRole('combobox', { name: 'Filter FROM engines' });
const active = () => {
  const id = combobox().getAttribute('aria-activedescendant');
  return id ? document.getElementById(id)?.getAttribute('aria-label') : null;
};

describe('LibraryList', () => {
  it('is one combobox over a listbox of options', () => {
    render(<LibraryList label="FROM" value="ggd_invasion" engines={engines} onChange={() => {}} {...noFav} />);
    const box = combobox();
    const list = screen.getByRole('listbox', { name: 'FROM engines' });
    expect(box).toHaveAttribute('aria-controls', list.id);
    expect(box).toHaveAttribute('aria-expanded', 'true');
    expect(box).toHaveAttribute('aria-autocomplete', 'list');
    expect(within(list).getAllByRole('option')).toHaveLength(3);
    expect(screen.getByRole('option', { name: 'GGD Invasion' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('option', { name: 'EZdrummer' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.queryByRole('button', { name: /GGD Invasion|Favorite/ })).not.toBeInTheDocument();
    expect(box).toHaveAccessibleDescription(/Enter picks/);
  });

  it('starts on the chosen engine and moves with the arrow keys', async () => {
    const onChange = vi.fn();
    render(<LibraryList label="FROM" value="ggd_invasion" engines={engines} onChange={onChange} {...noFav} />);
    await userEvent.click(combobox());
    expect(active()).toBe('GGD Invasion');
    await userEvent.keyboard('{ArrowDown}');
    expect(active()).toBe('EZdrummer');
    await userEvent.keyboard('{ArrowDown}');
    expect(active()).toBe('EZdrummer');
    await userEvent.keyboard('{ArrowUp}{ArrowUp}');
    expect(active()).toBe('Addictive Drums 2');
    await userEvent.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith('addictive');
  });

  it('skips the engine chosen on the other side', async () => {
    const onChange = vi.fn();
    render(
      <LibraryList
        label="FROM"
        value="addictive"
        disabledId="ggd_invasion"
        engines={engines}
        onChange={onChange}
        {...noFav}
      />,
    );
    const disabled = screen.getByRole('option', { name: 'GGD Invasion' });
    expect(disabled).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(combobox());
    await userEvent.keyboard('{ArrowDown}');
    expect(active()).toBe('EZdrummer');
    await userEvent.click(disabled);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('makes the first match active while typing and picks it with Enter', async () => {
    const onChange = vi.fn();
    render(<LibraryList label="FROM" value="ggd_invasion" engines={engines} onChange={onChange} {...noFav} />);
    await userEvent.type(combobox(), 'ez');
    expect(screen.queryByRole('option', { name: 'GGD Invasion' })).toBeNull();
    expect(active()).toBe('EZdrummer');
    await userEvent.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith('ezdrummer');
  });

  it('filters case-insensitively and says when nothing matches', async () => {
    render(<LibraryList label="FROM" value="ggd_invasion" engines={engines} onChange={() => {}} {...noFav} />);
    await userEvent.type(combobox(), 'INV');
    expect(screen.getAllByRole('option').map((o) => o.getAttribute('aria-label'))).toEqual(['GGD Invasion']);
    await userEvent.type(combobox(), 'zzz');
    expect(screen.getByText('no matches')).toBeInTheDocument();
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(combobox()).not.toHaveAttribute('aria-activedescendant');
  });

  it('clears the filter on Escape while keeping focus', async () => {
    render(<LibraryList label="FROM" value="ggd_invasion" engines={engines} onChange={() => {}} {...noFav} />);
    await userEvent.type(combobox(), 'inv');
    await userEvent.keyboard('{Escape}');
    expect(combobox()).toHaveValue('');
    expect(combobox()).toHaveFocus();
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  it('clears the filter with the clear button', async () => {
    render(<LibraryList label="FROM" value="ggd_invasion" engines={engines} onChange={() => {}} {...noFav} />);
    await userEvent.type(combobox(), 'inv');
    await userEvent.click(screen.getByRole('button', { name: 'Clear filter' }));
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  it('picks an engine with a click', async () => {
    const onChange = vi.fn();
    render(<LibraryList label="FROM" value="ggd_invasion" engines={engines} onChange={onChange} {...noFav} />);
    await userEvent.click(screen.getByRole('option', { name: 'EZdrummer' }));
    expect(onChange).toHaveBeenCalledWith('ezdrummer');
  });

  it('matches the full engine name while showing the short one', async () => {
    const named = [...engines, { id: 'sd3', name: 'Superior Drummer 3', fullName: 'Toontrack Superior Drummer 3' }];
    render(<LibraryList label="FROM" value="" engines={named} onChange={() => {}} {...noFav} />);
    await userEvent.type(combobox(), 'toontrack');
    expect(screen.getAllByRole('option').map((o) => o.getAttribute('aria-label'))).toEqual(['Superior Drummer 3']);
  });

  it('shows the full engine name on hover when it differs', async () => {
    const named = [{ id: 'sd3', name: 'Superior Drummer 3', fullName: 'Toontrack Superior Drummer 3' }];
    render(<LibraryList label="FROM" value="" engines={named} onChange={() => {}} {...noFav} />);
    await userEvent.hover(screen.getByText('Superior Drummer 3'));
    expect(screen.getByRole('tooltip')).toHaveTextContent('Toontrack Superior Drummer 3');
  });

  it('does not change selection when filtering hides it', async () => {
    const onChange = vi.fn();
    render(<LibraryList label="FROM" value="ezdrummer" engines={engines} onChange={onChange} {...noFav} />);
    await userEvent.type(combobox(), 'invasion');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('toggles a favourite with Ctrl+Enter or the star, without selecting', async () => {
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
    await userEvent.click(combobox());
    await userEvent.keyboard('{Control>}{Enter}{/Control}');
    expect(onToggleFavorite).toHaveBeenLastCalledWith('ggd_invasion');
    await userEvent.click(screen.getByTestId('star-ezdrummer'));
    expect(onToggleFavorite).toHaveBeenLastCalledWith('ezdrummer');
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('star-ezdrummer')).toHaveAttribute('aria-hidden', 'true');
  });

  it('pins starred engines in a Favourites group above the rest', () => {
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
    const favourites = screen.getByRole('group', { name: 'Favourites' });
    expect(within(favourites).getAllByRole('option').map((o) => o.getAttribute('aria-label'))).toEqual(['EZdrummer']);
    const rest = screen.getByRole('group', { name: 'All engines' });
    expect(within(rest).getAllByRole('option')).toHaveLength(2);
  });

  it('uses no groups when none or all are starred', () => {
    const { rerender } = render(
      <LibraryList label="FROM" value="ggd_invasion" engines={engines} onChange={() => {}} {...noFav} />,
    );
    expect(screen.queryByRole('group', { name: 'Favourites' })).toBeNull();
    rerender(
      <LibraryList
        label="FROM"
        value="ggd_invasion"
        engines={engines}
        onChange={() => {}}
        favorites={new Set(['ggd_invasion', 'ezdrummer', 'addictive'])}
        onToggleFavorite={() => {}}
      />,
    );
    expect(screen.queryByRole('group', { name: 'Favourites' })).toBeNull();
  });

  it('scrolls the list to the selected engine when it is out of view', () => {
    const props = ['offsetTop', 'offsetHeight', 'clientHeight'] as const;
    const saved = props.map((p) => Object.getOwnPropertyDescriptor(HTMLElement.prototype, p));
    const layout: Record<(typeof props)[number], (el: HTMLElement) => number> = {
      offsetTop: (el) => (el.getAttribute('aria-selected') === 'true' ? 600 : 0),
      offsetHeight: () => 30,
      clientHeight: () => 240,
    };
    for (const p of props) {
      Object.defineProperty(HTMLElement.prototype, p, {
        configurable: true,
        get(this: HTMLElement) {
          return layout[p](this);
        },
      });
    }
    try {
      const { rerender } = render(
        <LibraryList label="FROM" value="" engines={engines} onChange={() => {}} {...noFav} />,
      );
      const list = screen.getByRole('listbox');
      expect(list.scrollTop).toBe(0);
      rerender(<LibraryList label="FROM" value="ezdrummer" engines={engines} onChange={() => {}} {...noFav} />);
      expect(list.scrollTop).toBe(495);
    } finally {
      props.forEach((p, i) => {
        const d = saved[i];
        if (d) Object.defineProperty(HTMLElement.prototype, p, d);
      });
    }
  });
});
