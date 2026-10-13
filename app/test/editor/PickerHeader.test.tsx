import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PickerHeader } from '../../src/editor/PickerHeader';

describe('PickerHeader', () => {
  it('puts the given class beside its own', () => {
    const { container } = render(<PickerHeader heading="Pick Kick" className="mb-3" onClose={() => {}} />);
    expect(container.firstElementChild).toHaveClass('mb-3', 'flex', 'items-center', 'justify-between');
  });

  it('holds the heading directly in the line when it has no children', () => {
    const { container } = render(<PickerHeader heading="Pick Kick" onClose={() => {}} />);
    expect(screen.getByText('Pick Kick').parentElement).toBe(container.firstElementChild);
  });

  it('sets its children beside the heading on the baseline', () => {
    render(<PickerHeader heading="Pick Kick" onClose={() => {}}><span>C3</span></PickerHeader>);
    const wrapper = screen.getByText('Pick Kick').parentElement;
    expect(wrapper).toHaveClass('flex', 'items-baseline');
    expect(wrapper).toContainElement(screen.getByText('C3'));
  });
});
