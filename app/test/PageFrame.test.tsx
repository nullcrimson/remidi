import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Page } from '../src/components/PageFrame';

describe('Page', () => {
  it('keeps the skip link, header and footer links out of search snippets', () => {
    render(<Page onSkip={() => {}}><p>Converter body</p></Page>);
    expect(screen.getByRole('link', { name: 'Skip to content' }).closest('[data-nosnippet]')).not.toBeNull();
    expect(screen.getByRole('banner').closest('[data-nosnippet]')).not.toBeNull();
    expect(screen.getByRole('navigation', { name: 'Site' }).closest('[data-nosnippet]')).not.toBeNull();
    expect(screen.getByText('Converter body').closest('[data-nosnippet]')).toBeNull();
  });
});
