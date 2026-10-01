import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MissingDrumsSetting } from '../src/components/MissingDrumsSetting';

describe('MissingDrumsSetting', () => {
  it('shows Nearest and Drop with the current one checked, and the hint', () => {
    render(<MissingDrumsSetting value="nearest" hint="2 drums played on another drum" onChange={() => {}} />);
    expect(screen.getByRole('radiogroup', { name: 'Missing drums' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Nearest' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Drop' })).not.toBeChecked();
    expect(screen.getByText('2 drums played on another drum')).toBeInTheDocument();
  });

  it('reports the clicked choice', async () => {
    const onChange = vi.fn();
    render(<MissingDrumsSetting value="nearest" hint="" onChange={onChange} />);
    await userEvent.click(screen.getByText('Drop'));
    expect(onChange).toHaveBeenCalledWith('drop');
  });

  it('lists the replaced drums on hover and opens the note editor from there', async () => {
    const onOpenEditor = vi.fn();
    render(
      <MissingDrumsSetting
        value="nearest"
        hint="2 drums played on another drum"
        swaps={[{ drum: 'China', now: 'Crash 1' }, { drum: 'Tom 4', now: 'Tom 3' }]}
        onOpenEditor={onOpenEditor}
        onChange={() => {}}
      />,
    );
    await userEvent.hover(screen.getByRole('button', { name: '2 drums played on another drum' }));
    const panel = await screen.findByRole('dialog');
    expect(panel).toHaveTextContent('Played on another drum');
    expect(within(panel).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['China→Crash 1', 'Tom 4→Tom 3']);
    await userEvent.click(within(panel).getByRole('button', { name: 'Change in note editor →' }));
    expect(onOpenEditor).toHaveBeenCalledOnce();
  });

  it('lists the left-out drums under Drop', async () => {
    render(
      <MissingDrumsSetting value="drop" hint="1 drum dropped" swaps={[{ drum: 'China', now: null }]} onOpenEditor={() => {}} onChange={() => {}} />,
    );
    await userEvent.hover(screen.getByRole('button', { name: '1 drum dropped' }));
    const panel = await screen.findByRole('dialog');
    expect(panel).toHaveTextContent('Left out of the file');
    expect(within(panel).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['China']);
  });

  it('keeps the hint plain text when no drum moves', () => {
    render(<MissingDrumsSetting value="nearest" hint="no drum moves to another drum" swaps={[]} onOpenEditor={() => {}} onChange={() => {}} />);
    expect(screen.queryByRole('button', { name: /no drum moves/ })).not.toBeInTheDocument();
    expect(screen.getByText('no drum moves to another drum')).toBeInTheDocument();
  });

  it('explains both choices and that same-drum articulations stay', () => {
    render(<MissingDrumsSetting value="drop" hint="" onChange={() => {}} />);
    const group = screen.getByRole('radiogroup', { name: 'Missing drums' });
    expect(group).toHaveAccessibleDescription(/Nearest plays it on the closest drum/);
    expect(group).toHaveAccessibleDescription(/Drop leaves it out/);
    expect(group).toHaveAccessibleDescription(/Ghost notes, rimshots/);
  });
});
