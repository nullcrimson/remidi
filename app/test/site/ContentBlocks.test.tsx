import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ContentBlocks } from '../../src/site/ContentBlocks';

describe('ContentBlocks', () => {
  it('titles the converter steps as the converter does', () => {
    render(<ContentBlocks blocks={[{ 'converter-steps': { file: 'Drop it.', engines: 'Pick two.', convert: 'Press it.' } }]} />);
    const steps = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(steps).toEqual([
      'Your drum file Drop it.',
      'From one drum layout to another Pick two.',
      'Convert Press it.',
    ]);
  });

  it('links an answer to the page it names', () => {
    render(<ContentBlocks blocks={[{ faq: [{ q: 'Which note?', a: ['See the ', { text: 'note maps', href: '/engines/' }, '.'] }] }]} />);
    expect(screen.getByRole('heading', { name: 'Which note?' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'note maps' })).toHaveAttribute('href', '/engines/');
  });
});
