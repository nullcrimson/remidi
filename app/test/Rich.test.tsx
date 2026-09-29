import { render, screen } from '@testing-library/react';
import { Rich } from '../src/components/Rich';
import { StatusNotice } from '../src/components/StatusNotice';

describe('Rich', () => {
  it('renders a whole-sentence message with an element in its slot', () => {
    const { container } = render(
      <p>
        <Rich id="summary-remapped" args={{ total: 12 }} slots={{ remapped: <b>9</b> }} />
      </p>,
    );
    expect(container).toHaveTextContent('9 of 12 drums remapped');
    expect(container.querySelector('b')).toHaveTextContent('9');
  });

  it('fills every slot in the order the translation puts them', () => {
    const { container } = render(
      <p>
        <Rich id="report-contact" slots={{ issue: <a href="/i">GitHub issue</a>, email: <a href="/e">mail</a> }} />
      </p>,
    );
    expect(container).toHaveTextContent('Wrong mapping or missing engine? Open a GitHub issue or email mail.');
    expect([...container.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual(['/i', '/e']);
  });
});

describe('StatusNotice', () => {
  it('shows a failed import as one sentence with the detail set apart', () => {
    render(<StatusNotice lines={[{ failed: 'kit.json', error: { kind: 'badPreset', detail: 'bad json' } }]} onDismiss={() => {}} />);
    expect(screen.getByRole('status')).toHaveTextContent("Couldn't import kit.json: Not a preset file Details: bad json");
    expect(screen.getByText('Details: bad json')).toHaveClass('font-mono');
  });
});
