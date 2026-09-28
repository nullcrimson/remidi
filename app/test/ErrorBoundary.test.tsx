import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from '../src/components/ErrorBoundary';

function Boom(): never {
  throw new Error('render exploded');
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('renders its children when nothing throws', () => {
    render(<ErrorBoundary><p>fine</p></ErrorBoundary>);
    expect(screen.getByText('fine')).toBeInTheDocument();
  });

  it('shows the error with reload and report actions instead of a blank page', async () => {
    const onReload = vi.fn();
    render(<ErrorBoundary onReload={onReload}><Boom /></ErrorBoundary>);
    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();
    expect(screen.getByText('Error: render exploded')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Report an issue' })).toHaveAttribute(
      'href',
      'https://github.com/nullcrimson/remidi/issues',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(onReload).toHaveBeenCalledOnce();
  });

  it('resets only its own saved data after a confirmation, then reloads', async () => {
    localStorage.setItem('midiremap:mappings', '[]');
    localStorage.setItem('midiremap:missing', 'drop');
    localStorage.setItem('other-app', 'keep');
    const onReload = vi.fn();
    render(<ErrorBoundary onReload={onReload}><Boom /></ErrorBoundary>);

    await userEvent.click(screen.getByRole('button', { name: 'Reset saved data…' }));
    expect(screen.getByText('Delete saved presets, favourites and settings?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(localStorage.getItem('midiremap:mappings')).toBe('[]');
    expect(onReload).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Reset saved data…' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete and reload' }));
    expect(localStorage.getItem('midiremap:mappings')).toBeNull();
    expect(localStorage.getItem('midiremap:missing')).toBeNull();
    expect(localStorage.getItem('other-app')).toBe('keep');
    expect(onReload).toHaveBeenCalledOnce();
  });
});
