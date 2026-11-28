import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import tip from '../../../content/tip.json';
import { SiteHeader } from '../../src/site/SiteHeader';
import { fakeUmami } from '../umami';

const umami = fakeUmami();
const cup = () => screen.queryByRole('link', { name: 'Buy me a coffee' });

describe('SiteHeader', () => {
  it('shows the brand heading', () => {
    render(<SiteHeader asksTip />);
    expect(screen.getByRole('heading', { level: 1, name: /^Drumverter/ })).toBeInTheDocument();
  });

  it('shows the shared nav', () => {
    render(<SiteHeader asksTip />);
    const nav = screen.getByRole('navigation', { name: 'Main' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((l) => [l.getAttribute('aria-label') ?? l.textContent, l.getAttribute('href')])).toEqual([
      ['Converter', '/'],
      ['How to use', '/how-it-works/'],
      ['Note maps', '/engines/'],
      ['Drum maps', '/drum-maps/'],
      ['FAQ', '/faq/'],
      ['Buy me a coffee', tip.other],
    ]);
  });

  it('puts the tip cup after the language menu', () => {
    render(<SiteHeader asksTip />);
    const language = screen.getByRole('button', { name: /Language/ });
    expect(language.compareDocumentPosition(cup()!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('titles the tip cup with its words', () => {
    render(<SiteHeader asksTip />);
    expect(cup()).toHaveAttribute('title', 'Buy me a coffee');
  });

  it('opens the tip cup in a new tab', () => {
    render(<SiteHeader asksTip />);
    expect(cup()).toHaveAttribute('target', '_blank');
  });

  it('counts the tip cup as a tip answered from the header', async () => {
    render(<SiteHeader asksTip />);
    await userEvent.click(cup()!);
    expect(umami).toHaveBeenCalledWith('tip-answered', { answer: 'other', where: 'header', site: 'converter' });
  });

  it('leaves the tip cup out of a page that asks no tip', () => {
    render(<SiteHeader asksTip={false} />);
    expect(cup()).toBeNull();
  });

  it('marks the converter current in the nav', () => {
    render(<SiteHeader asksTip />);
    const nav = screen.getByRole('navigation', { name: 'Main' });
    const links = within(nav).getAllByRole('link');
    expect(links[0]).toHaveAttribute('aria-current', 'page');
    expect(links[1]).not.toHaveAttribute('aria-current');
  });
});
