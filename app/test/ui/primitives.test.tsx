import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '../../src/ui/Button';
import { ChipRadioGroup } from '../../src/ui/ChipRadioGroup';
import { ChipSelect } from '../../src/ui/ChipSelect';
import { IconButton } from '../../src/ui/IconButton';
import { ProseLink } from '../../src/ui/ProseLink';
import { TextButton } from '../../src/ui/TextButton';
import { TextField } from '../../src/ui/TextField';
import { chip, tag, TAG_TONES } from '../../src/ui/styles';
import css from '../../src/index.css?raw';

const utility = (name: string) => css.slice(css.indexOf(`@utility ${name} {`), css.indexOf('}', css.indexOf(`@utility ${name} {`)));

const SIZES = [
  { value: 's', label: 'Small' },
  { value: 'l', label: 'Large' },
] as const;

describe('chip', () => {
  it('styles the on state', () => {
    expect(chip('on', 'sm')).toContain('border-accent bg-accent/15 text-t1');
  });

  it('styles the changed state', () => {
    expect(chip('changed', 'md')).toContain('border-accent/40');
  });

  it('styles the off state', () => {
    expect(chip('off', 'sm')).toContain('border-white/12 text-t4');
  });

  it('puts each state on the chip base', () => {
    const on = chip('on', 'sm');
    const off = chip('off', 'md');
    expect(on).toContain('rounded-chip');
    expect(on).toContain('font-mono');
    expect(off).toContain('rounded-chip');
    expect(off).toContain('font-mono');
  });

  it('sizes the small chip', () => {
    expect(chip('off', 'sm')).toContain('text-label');
  });

  it('sizes the medium chip', () => {
    expect(chip('off', 'md')).toContain('text-ui');
  });
});

describe('tag', () => {
  const start = css.indexOf('@utility tag {');
  const block = css.slice(start, css.indexOf('\n}\n', start));

  it.each(TAG_TONES)('every tag tone has a rule: %s', (tone) => {
    expect(block).toContain(`&[data-tone='${tone}'] {`);
  });

  it('names its tone for the utility', () => {
    expect(tag('danger')).toEqual({ className: 'tag', 'data-tone': 'danger' });
  });
});

describe('ChipRadioGroup', () => {
  it('renders radios with the checked one styled on', () => {
    render(<ChipRadioGroup labelledBy="x" options={SIZES} value="s" onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: 'Small' })).toBeChecked();
    expect(screen.getByText('Small').closest('label')).toHaveClass('bg-accent/15');
    expect(screen.getByText('Large').closest('label')).not.toHaveClass('bg-accent/15');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('reports clicks', async () => {
    const onChange = vi.fn();
    render(<ChipRadioGroup labelledBy="x" options={SIZES} value="s" onChange={onChange} />);
    await userEvent.click(screen.getByText('Large'));
    expect(onChange).toHaveBeenLastCalledWith('l');
  });

  it('reports arrow keys', async () => {
    const onChange = vi.fn();
    render(<ChipRadioGroup labelledBy="x" options={SIZES} value="s" onChange={onChange} />);
    screen.getByRole('radio', { name: 'Small' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith('l');
  });
});

describe('ChipSelect', () => {
  const renderSelect = (onChange = vi.fn()) => {
    render(
      <>
        <span id="lbl">Size</span>
        <ChipSelect labelledBy="lbl" options={SIZES} value="s" onChange={onChange} />
      </>,
    );
    return screen.getByRole('combobox', { name: 'Size' });
  };

  it('is a native select in chip dress', () => {
    const select = renderSelect();
    expect(select).toHaveClass('rounded-chip', 'appearance-none');
  });

  it('hides its caret from assistive technology', () => {
    renderSelect();
    expect(screen.getByText('▾')).toHaveAttribute('aria-hidden', 'true');
  });

  it('reports the chosen option', async () => {
    const onChange = vi.fn();
    const select = renderSelect(onChange);
    await userEvent.selectOptions(select, 'l');
    expect(onChange).toHaveBeenCalledWith('l');
  });
});

describe('Button', () => {
  it('shows and links the reason while disabled', () => {
    render(
      <Button variant="primary" size="lg" disabled reason="Add a file" onClick={() => {}}>
        Go
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Go' });
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription('Add a file');
  });

  it('shows no reason while enabled', () => {
    render(
      <Button variant="primary" size="lg" reason="Add a file" onClick={() => {}}>
        Go
      </Button>,
    );
    expect(screen.queryByText('Add a file')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go' })).not.toHaveAttribute('aria-describedby');
  });

  it('styles primary solid', () => {
    render(<Button variant="primary" size="md" onClick={() => {}}>P</Button>);
    expect(screen.getByRole('button', { name: 'P' })).toHaveClass('bg-accent', 'text-ink');
  });

  it('styles secondary outlined', () => {
    render(<Button variant="secondary" size="sm" onClick={() => {}}>S</Button>);
    expect(screen.getByRole('button', { name: 'S' })).toHaveClass('border-accent/40', 'text-accent');
  });

  it('fires onClick', async () => {
    const onClick = vi.fn();
    render(<Button variant="primary" size="md" onClick={onClick}>P</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'P' }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe('TextButton', () => {
  it('is a gold action button', async () => {
    const onClick = vi.fn();
    render(<TextButton onClick={onClick}>View report →</TextButton>);
    await userEvent.click(screen.getByRole('button', { name: 'View report →' }));
    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'View report →' })).toHaveClass('text-star/85', 'hover:underline');
  });

  it('is a link when given href', () => {
    render(<TextButton href="blob:x" download="a.mid">Download</TextButton>);
    expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute('download', 'a.mid');
  });

  it('danger tone rests muted', () => {
    render(<TextButton tone="danger" onClick={() => {}}>clear all</TextButton>);
    expect(screen.getByRole('button', { name: 'clear all' })).toHaveClass('text-t4', 'hover:text-danger');
  });

  it('link tone looks like a link', () => {
    render(<TextButton tone="link" onClick={() => {}}>Change in note editor →</TextButton>);
    const button = screen.getByRole('button', { name: 'Change in note editor →' });
    expect(button).toHaveClass('prose-link');
    expect(button).not.toHaveClass('text-star/85');
  });
});

describe('IconButton', () => {
  it('is named by its label', async () => {
    const onClick = vi.fn();
    render(<IconButton label="Close" onClick={onClick}>×</IconButton>);
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe('ProseLink', () => {
  it('opens outside the app safely', () => {
    render(<ProseLink href="https://example.com">site</ProseLink>);
    const link = screen.getByRole('link', { name: 'site' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('styles as a prose link', () => {
    render(<ProseLink href="https://example.com">site</ProseLink>);
    const link = screen.getByRole('link', { name: 'site' });
    expect(link).toHaveClass('prose-link');
  });
});

describe('TextField', () => {
  it('avoids iOS zoom on phones', () => {
    render(<TextField aria-label="Name" mono value="" onChange={vi.fn()} />);
    const input = screen.getByRole('textbox', { name: 'Name' });
    expect(input).toHaveClass('text-body', 'sm:text-label', 'rounded-chip');
  });

  it('passes input props through', async () => {
    const onChange = vi.fn();
    render(<TextField aria-label="Name" mono value="" onChange={onChange} />);
    const input = screen.getByRole('textbox', { name: 'Name' });
    await userEvent.type(input, 'a');
    expect(onChange).toHaveBeenCalled();
  });
});

describe('touch targets', () => {
  it('grows the hit area of icon buttons on coarse pointers', () => {
    render(<IconButton label="Close" onClick={() => {}}>×</IconButton>);
    expect(screen.getByRole('button', { name: 'Close' })).toHaveClass('tap');
  });

  it('grows the hit area of text buttons on coarse pointers', () => {
    render(<TextButton onClick={() => {}}>View report →</TextButton>);
    expect(screen.getByRole('button', { name: 'View report →' })).toHaveClass('tap');
  });

  it('grows the hit area of prose links on coarse pointers', () => {
    render(<ProseLink href="https://example.com">site</ProseLink>);
    expect(screen.getByRole('link', { name: 'site' })).toHaveClass('prose-link');
    expect(utility('prose-link')).toMatch(/@apply tap /);
  });

  it('grows the hit area of nav links on coarse pointers', () => {
    expect(utility('nav-link')).toMatch(/@apply tap /);
  });

  it('grows the hit area of chips on coarse pointers', () => {
    expect(chip('off', 'sm')).toContain('tap');
    expect(chip('off', 'sm')).toContain('pointer-coarse:py-3');
  });

  it('makes the chip select full height on coarse pointers', () => {
    render(<ChipSelect labelledBy="x" options={SIZES} value="s" onChange={() => {}} />);
    expect(screen.getByRole('combobox')).toHaveClass('pointer-coarse:py-3');
  });
});
