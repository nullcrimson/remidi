import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SiteHeader } from '../src/components/SiteHeader';

describe('SiteHeader', () => {
  it('shows the brand heading and the shared nav with the converter current', () => {
    render(<SiteHeader />);
    expect(screen.getByRole('heading', { level: 1, name: /^Drumverter/ })).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Main' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((l) => [l.textContent, l.getAttribute('href')])).toEqual([
      ['Converter', '/'],
      ['Note maps', '/engines/'],
      ['FAQ', '/faq/'],
    ]);
    expect(links[0]).toHaveAttribute('aria-current', 'page');
    expect(links[1]).not.toHaveAttribute('aria-current');
  });
});
