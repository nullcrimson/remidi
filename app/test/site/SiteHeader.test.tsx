import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SiteHeader } from '../../src/site/SiteHeader';

describe('SiteHeader', () => {
  it('shows the brand heading', () => {
    render(<SiteHeader />);
    expect(screen.getByRole('heading', { level: 1, name: /^Drumverter/ })).toBeInTheDocument();
  });

  it('shows the shared nav', () => {
    render(<SiteHeader />);
    const nav = screen.getByRole('navigation', { name: 'Main' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((l) => [l.textContent, l.getAttribute('href')])).toEqual([
      ['Converter', '/'],
      ['How to use', '/how-it-works/'],
      ['Note maps', '/engines/'],
      ['Drum maps', '/drum-maps/'],
      ['FAQ', '/faq/'],
    ]);
  });

  it('marks the converter current in the nav', () => {
    render(<SiteHeader />);
    const nav = screen.getByRole('navigation', { name: 'Main' });
    const links = within(nav).getAllByRole('link');
    expect(links[0]).toHaveAttribute('aria-current', 'page');
    expect(links[1]).not.toHaveAttribute('aria-current');
  });
});
