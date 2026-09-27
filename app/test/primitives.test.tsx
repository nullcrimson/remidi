import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '../src/components/Button';
import { ChipRadioGroup } from '../src/components/ChipRadioGroup';
import { ChipSelect } from '../src/components/ChipSelect';
import { IconButton } from '../src/components/IconButton';
import { ProseLink } from '../src/components/ProseLink';
import { TextButton } from '../src/components/TextButton';
import { TextField } from '../src/components/TextField';
import { chip } from '../src/components/styles';

const SIZES = [
  { value: 's', label: 'Small' },
  { value: 'l', label: 'Large' },
] as const;

describe('chip', () => {
  it('styles each state on one base', () => {
    expect(chip('on', 'sm')).toContain('border-accent bg-accent/15 text-t1');
    expect(chip('changed', 'md')).toContain('border-accent/40');
    expect(chip('off', 'sm')).toContain('border-white/12 text-t4');
    for (const c of [chip('on', 'sm'), chip('off', 'md')]) {
      expect(c).toContain('rounded-chip');
      expect(c).toContain('font-mono');
    }
    expect(chip('off', 'sm')).toContain('text-label');
    expect(chip('off', 'md')).toContain('text-ui');
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

  it('reports clicks and arrow keys', async () => {
    const onChange = vi.fn();
    render(<ChipRadioGroup labelledBy="x" options={SIZES} value="s" onChange={onChange} />);
    await userEvent.click(screen.getByText('Large'));
    expect(onChange).toHaveBeenLastCalledWith('l');
    onChange.mockClear();
    screen.getByRole('radio', { name: 'Small' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith('l');
  });
});

describe('ChipSelect', () => {
  it('is a native select in chip dress with a hidden caret', async () => {
    const onChange = vi.fn();
    render(
      <>
        <span id="lbl">Size</span>
        <ChipSelect labelledBy="lbl" options={SIZES} value="s" onChange={onChange} />
      </>,
    );
    const select = screen.getByRole('combobox', { name: 'Size' });
    expect(select).toHaveClass('rounded-chip', 'appearance-none');
    expect(screen.getByText('▾')).toHaveAttribute('aria-hidden', 'true');
    await userEvent.selectOptions(select, 'l');
    expect(onChange).toHaveBeenCalledWith('l');
  });
});

describe('Button', () => {
  it('shows and links the reason only while disabled', () => {
    const { rerender } = render(
      <Button variant="primary" size="lg" disabled reason="Add a file" onClick={() => {}}>
        Go
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Go' });
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription('Add a file');
    rerender(
      <Button variant="primary" size="lg" reason="Add a file" onClick={() => {}}>
        Go
      </Button>,
    );
    expect(screen.queryByText('Add a file')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go' })).not.toHaveAttribute('aria-describedby');
  });

  it('styles primary solid and secondary outlined', () => {
    render(
      <>
        <Button variant="primary" size="md" onClick={() => {}}>P</Button>
        <Button variant="secondary" size="sm" onClick={() => {}}>S</Button>
      </>,
    );
    expect(screen.getByRole('button', { name: 'P' })).toHaveClass('bg-accent', 'text-ink');
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
  it('is a button, or a link when given href', async () => {
    const onClick = vi.fn();
    render(
      <>
        <TextButton onClick={onClick}>View report →</TextButton>
        <TextButton href="blob:x" download="a.mid">Download</TextButton>
      </>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'View report →' }));
    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute('download', 'a.mid');
    expect(screen.getByRole('button', { name: 'View report →' })).toHaveClass('text-t2');
  });

  it('danger tone rests muted', () => {
    render(<TextButton tone="danger" onClick={() => {}}>clear all</TextButton>);
    expect(screen.getByRole('button', { name: 'clear all' })).toHaveClass('text-t4', 'hover:text-danger');
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
    expect(link).toHaveClass('text-star/85');
  });
});

describe('TextField', () => {
  it('passes input props through and avoids iOS zoom on phones', async () => {
    const onChange = vi.fn();
    render(<TextField aria-label="Name" mono value="" onChange={onChange} />);
    const input = screen.getByRole('textbox', { name: 'Name' });
    expect(input).toHaveClass('text-body', 'sm:text-label', 'rounded-chip');
    await userEvent.type(input, 'a');
    expect(onChange).toHaveBeenCalled();
  });
});
