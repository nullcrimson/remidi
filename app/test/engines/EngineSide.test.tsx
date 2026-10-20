import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EngineSide } from '../../src/engines/EngineSide';
import { storedName } from '../../src/core/storage';
import type { Engine } from '../../src/core/midiremap';
import { typed } from '../typed';

const engines = typed<Engine[]>([
  { id: 'addictive', name: 'Addictive Drums 2', fullName: 'Addictive Drums 2' },
  { id: 'ggd_invasion', name: 'GGD Invasion', fullName: 'GGD Invasion' },
  { id: 'ezdrummer', name: 'EZdrummer', fullName: 'EZdrummer' },
]);

function side(value: string | null, onChange = vi.fn()) {
  render(
    <EngineSide
      side="to"
      label="TO"
      value={value}
      disabledId="ggd_invasion"
      engines={engines}
      next={value === null}
      onChange={onChange}
      cardRef={() => {}}
    />,
  );
  return onChange;
}

const card = () => screen.getByRole('button', { name: /^TO/ });
const picker = () => screen.queryByRole('dialog', { name: 'Choose the TO engine' });

describe('EngineSide', () => {
  beforeEach(() => localStorage.clear());

  it('invites a choice on the card until an engine is chosen', () => {
    side(null);
    expect(card()).toHaveTextContent('Choose a drum plugin…');
    expect(card()).toHaveClass('border-star/45');
    expect(card()).toHaveAttribute('aria-haspopup', 'dialog');
  });

  it('names the chosen engine on the card', () => {
    side('ezdrummer');
    expect(within(card()).getByTestId('chosen-engine')).toHaveTextContent('EZdrummer');
    expect(card()).not.toHaveClass('border-star/45');
  });

  it('opens the picker with its filter focused', async () => {
    side(null);
    await userEvent.click(card());
    expect(picker()).toBeInTheDocument();
    expect(within(picker()!).getByRole('combobox', { name: 'Filter TO engines' })).toHaveFocus();
  });

  it('closes the picker on a pick and gives focus back to the card', async () => {
    const onChange = side(null);
    await userEvent.click(card());
    await userEvent.click(within(picker()!).getByRole('option', { name: 'EZdrummer' }));
    expect(onChange).toHaveBeenCalledWith('ezdrummer');
    expect(picker()).not.toBeInTheDocument();
    expect(card()).toHaveFocus();
  });

  it('closes the picker on Escape without picking', async () => {
    const onChange = side(null);
    await userEvent.click(card());
    await userEvent.keyboard('{Escape}');
    expect(picker()).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('offers every favourite as a one-press pick', () => {
    localStorage.setItem(storedName('favorites:to'), JSON.stringify(['addictive', 'ezdrummer', 'extra_one', 'extra_two']));
    render(
      <EngineSide
        side="to"
        label="TO"
        value={null}
        disabledId={null}
        engines={[
          ...engines,
          ...typed<Engine[]>([
            { id: 'extra_one', name: 'Extra One', fullName: 'Extra One' },
            { id: 'extra_two', name: 'Extra Two', fullName: 'Extra Two' },
          ]),
        ]}
        next
        onChange={() => {}}
        cardRef={() => {}}
      />,
    );
    expect(within(screen.getByRole('list', { name: 'Favourites' })).getAllByRole('button')).toHaveLength(4);
  });

  it('offers the favourites as one-press picks, leaving out the chosen and the other side’s engine', async () => {
    localStorage.setItem(storedName('favorites:to'), JSON.stringify(['ezdrummer', 'addictive', 'ggd_invasion']));
    const onChange = side('ezdrummer');
    const quick = screen.getByRole('list', { name: 'Favourites' });
    expect(within(quick).getAllByRole('button').map((b) => b.textContent)).toEqual(['★Addictive Drums 2']);
    await userEvent.click(within(quick).getByRole('button', { name: 'Addictive Drums 2' }));
    expect(onChange).toHaveBeenCalledWith('addictive');
  });
});
