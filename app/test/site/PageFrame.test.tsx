import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Page } from '../../src/site/PageFrame';

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

  it('leaves the converter body open to search snippets', () => {
    render(<Page onSkip={() => {}}><p>Converter body</p></Page>);
    expect(screen.getByText('Converter body').closest('[data-nosnippet]')).toBeNull();
  });
});
