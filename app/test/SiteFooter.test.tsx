import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { SiteFooter } from '../src/components/SiteFooter';
import { content } from '../src/content/site';

const footerLinks = () => within(screen.getByRole('navigation', { name: 'Site' })).getAllByRole('link');

describe('SiteFooter', () => {
  it('links every section to its page, plus the note maps', () => {
    render(<SiteFooter />);
    expect(footerLinks().map((l) => [l.textContent, l.getAttribute('href')])).toEqual([
      ['How it works', '/how-it-works/'],
      ['FAQ', '/faq/'],
      ['Note maps', '/engines/'],
      ['Report an issue', '/report-an-issue/'],
      ['Contact', '/contact/'],
      ['Terms', '/terms/'],
    ]);
    expect(screen.getByText(content.trademark)).toBeInTheDocument();
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

  it('shows the steps and supported engines in How it works, linking internal pages in place', async () => {
    render(<SiteFooter />);
    await userEvent.click(screen.getByRole('link', { name: 'How it works' }));
    const dialog = screen.getByRole('dialog', { name: 'How to convert drum MIDI' });
    expect(within(dialog).getByText('Pick source and target.')).toBeVisible();
    expect(within(dialog).getByRole('heading', { name: 'Supported drum engines' })).toBeVisible();
    const maps = within(dialog).getByRole('link', { name: 'every engine’s note map' });
    expect(maps).toHaveAttribute('href', '/engines/');
    expect(maps).not.toHaveAttribute('target');
  });

  it('keeps dialog content in the DOM while collapsed (crawlable)', () => {
    render(<SiteFooter />);
    expect(screen.getByText(/free drum MIDI remapper for every sample engine/i)).toBeInTheDocument();
    expect(screen.getByText(/files never leave your device/i)).toBeInTheDocument();
    expect(screen.getByText('Steven Slate Drums SSD5')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
