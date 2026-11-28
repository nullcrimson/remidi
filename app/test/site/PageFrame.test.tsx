import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import tip from '../../../content/tip.json';
import { Page } from '../../src/site/PageFrame';
import { fakeUmami } from '../umami';

const umami = fakeUmami();
const sideTip = () => document.querySelector('.tip-side-rail a');

describe('Page', () => {
  it('keeps the skip link out of search snippets', () => {
    render(<Page onSkip={() => {}}><p>Converter body</p></Page>);
    expect(screen.getByRole('link', { name: 'Skip to content' }).closest('[data-nosnippet]')).not.toBeNull();
  });

  it('keeps the header out of search snippets', () => {
    render(<Page onSkip={() => {}}><p>Converter body</p></Page>);
    expect(screen.getByRole('banner').closest('[data-nosnippet]')).not.toBeNull();
  });

  it('keeps the footer links out of search snippets', () => {
    render(<Page onSkip={() => {}}><p>Converter body</p></Page>);
    expect(screen.getByRole('navigation', { name: 'Site' }).closest('[data-nosnippet]')).not.toBeNull();
  });

  it('puts the tip link in the margin after the content, out of search snippets', () => {
    render(<Page onSkip={() => {}}><main>Converter body</main></Page>);
    const link = sideTip()!;
    expect(link).toHaveTextContent('Buy me a coffee');
    expect(link).toHaveAttribute('href', tip.other);
    expect(link.closest('[data-nosnippet]')).not.toBeNull();
    expect(screen.getByRole('main').compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('counts the margin tip link as a tip answered from the side', async () => {
    render(<Page onSkip={() => {}}><main>Converter body</main></Page>);
    await userEvent.click(sideTip()!);
    expect(umami).toHaveBeenCalledWith('tip-answered', { answer: 'other', where: 'side', site: 'converter' });
  });

  it('leaves the margin tip link out of a page that asks no tip', () => {
    render(<Page asksTip={false} onSkip={() => {}}><main>Note editor</main></Page>);
    expect(sideTip()).toBeNull();
  });

  it('leaves the margin tip link out while the page loads', () => {
    render(<Page loading onSkip={() => {}}><main>Loading</main></Page>);
    expect(sideTip()).toBeNull();
  });

  it('leaves the converter body open to search snippets', () => {
    render(<Page onSkip={() => {}}><p>Converter body</p></Page>);
    expect(screen.getByText('Converter body').closest('[data-nosnippet]')).toBeNull();
  });
});
