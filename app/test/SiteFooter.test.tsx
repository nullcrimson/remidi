import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { SiteFooter } from '../src/components/SiteFooter';

const footerLinks = () => within(screen.getByRole('navigation', { name: 'Site' })).getAllByRole('link');

describe('SiteFooter', () => {
  it('links every section to its page, plus the note maps', () => {
    render(<SiteFooter />);
    expect(footerLinks().map((l) => [l.textContent, l.getAttribute('href')])).toEqual([
      ['How to use', '/how-it-works/'],
      ['FAQ', '/faq/'],
      ['Note maps', '/engines/'],
      ['Report an issue', '/report-an-issue/'],
      ['Contact', '/contact/'],
      ['Terms', '/terms/'],
      ['Buy me a coffee', 'https://buy.stripe.com/eVq7sL81J4pp91s1xe6wE03'],
    ]);
  });

  it('opens the tip page in a new tab, marked with a coffee', () => {
    render(<SiteFooter />);
    const tip = screen.getByRole('link', { name: 'Buy me a coffee' });
    expect(tip).toHaveAttribute('target', '_blank');
    expect(tip).toHaveAttribute('rel', 'noopener');
    expect(tip).toHaveClass('tip-link');
  });

  it('leaves the trademark notice to the terms', () => {
    render(<SiteFooter />);
    expect(screen.getByText(/trademarks/)).not.toBeVisible();
  });

  it('shows gold links, centred', () => {
    render(<SiteFooter />);
    for (const link of footerLinks()) expect(link).toHaveClass('prose-link');
    expect(screen.getByRole('navigation', { name: 'Site' }).firstElementChild).toHaveClass('justify-center');
  });

  it('opens a section in a dialog on a plain click and closes it', async () => {
    render(<SiteFooter />);
    await userEvent.click(within(screen.getByRole('navigation', { name: 'Site' })).getByRole('link', { name: 'FAQ' }));
    expect(screen.getByRole('dialog', { name: 'Frequently asked questions' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Is Drumverter free?' })).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('lets a modified click open the page instead', () => {
    render(<SiteFooter />);
    const notPrevented = fireEvent.click(screen.getByRole('link', { name: 'Terms' }), { ctrlKey: true });
    expect(notPrevented).toBe(true);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens a terms dialog disclaiming warranty and liability', async () => {
    render(<SiteFooter />);
    await userEvent.click(screen.getByRole('link', { name: 'Terms' }));
    expect(screen.getByRole('dialog', { name: 'Terms of use' })).toBeVisible();
    expect(screen.getByText(/not liable for any damages or data loss/i)).toBeVisible();
  });

  it('opens an issue dialog with a GitHub link and a contact email', async () => {
    render(<SiteFooter />);
    await userEvent.click(screen.getByRole('link', { name: 'Report an issue' }));
    const dialog = screen.getByRole('dialog', { name: 'Report an issue' });
    const issue = within(dialog).getByRole('link', { name: 'GitHub issue' });
    expect(issue).toHaveAttribute('href', 'https://github.com/nullcrimson/remidi/issues');
    expect(issue).toHaveAttribute('target', '_blank');
    expect(issue).toHaveAttribute('rel', 'noopener noreferrer');
    expect(within(dialog).getByRole('link', { name: 'null.crimson.dev@gmail.com' })).toHaveAttribute(
      'href',
      'mailto:null.crimson.dev@gmail.com',
    );
  });

  it('shows three short steps and tips in How to use, linking internal pages in place', async () => {
    render(<SiteFooter />);
    await userEvent.click(screen.getByRole('link', { name: 'How to use' }));
    const dialog = screen.getByRole('dialog', { name: 'How to convert drum MIDI' });
    expect(within(dialog).getAllByRole('listitem').map((li) => li.textContent?.split('.')[0])).toEqual([
      'Add your files',
      'Pick two engines',
      'Convert and download',
      'Hover dotted text to see what changed; the note editor fixes any drum',
      'Save a preset to reuse your setup',
      'Every supported engine and its notes: note maps',
    ]);
    expect(within(dialog).queryByRole('heading', { name: 'Supported drum engines' })).not.toBeInTheDocument();
    const maps = within(dialog).getByRole('link', { name: 'note maps' });
    expect(maps).toHaveAttribute('href', '/engines/');
    expect(maps).not.toHaveAttribute('target');
  });

  it('tells where presets live and how to move them', async () => {
    render(<SiteFooter />);
    await userEvent.click(within(screen.getByRole('navigation', { name: 'Site' })).getByRole('link', { name: 'FAQ' }));
    const dialog = screen.getByRole('dialog', { name: 'Frequently asked questions' });
    expect(within(dialog).getByRole('heading', { name: 'Where are my presets saved?' })).toBeVisible();
    expect(within(dialog).getByText(/Only in this browser on this device/)).toBeVisible();
    expect(within(dialog).getByText(/choose Export in its menu/)).toBeVisible();
  });

  it('keeps dialog content in the DOM while collapsed (crawlable)', () => {
    render(<SiteFooter />);
    expect(screen.getByText('Pick two engines.')).toBeInTheDocument();
    expect(screen.getByText(/files never leave your device/i)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
