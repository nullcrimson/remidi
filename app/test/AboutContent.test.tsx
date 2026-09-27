import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { AboutContent } from '../src/components/AboutContent';

describe('AboutContent', () => {
  it('shows the section links', () => {
    render(<AboutContent />);
    expect(screen.getByRole('button', { name: 'How it works' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Engines' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'FAQ' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit an issue' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Contact' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Terms' })).toBeInTheDocument();
  });

  it('links to the engine note maps', () => {
    render(<AboutContent />);
    expect(screen.getByRole('link', { name: 'Engine note maps' })).toHaveAttribute(
      'href',
      '/engines/',
    );
  });

  it('opens a terms dialog disclaiming warranty and liability', async () => {
    render(<AboutContent />);
    await userEvent.click(screen.getByRole('button', { name: 'Terms' }));
    expect(screen.getByRole('dialog', { name: 'Terms of use' })).toBeVisible();
    expect(screen.getByText(/not liable for any damages or data loss/i)).toBeVisible();
  });

  it('opens a contact dialog with a mailto link', async () => {
    render(<AboutContent />);
    await userEvent.click(screen.getByRole('button', { name: 'Contact' }));
    expect(screen.getByRole('dialog', { name: 'Contact' })).toBeVisible();
    const email = screen.getByRole('link', { name: 'null.crimson.dev@gmail.com' });
    expect(email).toHaveAttribute('href', 'mailto:null.crimson.dev@gmail.com');
    expect(email).toHaveAttribute('target', '_blank');
  });

  it('opens an issue dialog with a GitHub link and a contact email', async () => {
    render(<AboutContent />);
    await userEvent.click(screen.getByRole('button', { name: 'Submit an issue' }));
    expect(screen.getByRole('dialog', { name: 'Report an issue' })).toBeVisible();
    const issue = screen.getByRole('link', { name: 'GitHub issue' });
    expect(issue).toHaveAttribute('href', 'https://github.com/nullcrimson/remidi/issues');
    expect(issue).toHaveAttribute('target', '_blank');
    expect(issue).toHaveAttribute('rel', 'noopener noreferrer');
    const email = screen.getByRole('link', { name: 'null.crimson.dev@gmail.com' });
    expect(email).toHaveAttribute('href', 'mailto:null.crimson.dev@gmail.com');
    expect(email).toHaveAttribute('target', '_blank');
  });

  it('keeps dialog content in the DOM while collapsed (crawlable)', () => {
    render(<AboutContent />);
    expect(screen.getByText(/free drum MIDI remapper for every sample engine/i)).toBeInTheDocument();
    expect(screen.getByText(/files never leave your device/i)).toBeInTheDocument();
    expect(screen.getByText('Steven Slate Drums SSD5')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens a dialog on card click and closes it', async () => {
    render(<AboutContent />);
    await userEvent.click(screen.getByRole('button', { name: /FAQ/i }));
    const dialog = screen.getByRole('dialog', { name: 'Frequently asked questions' });
    expect(dialog).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Is Drumverter free?' })).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
