import { describe, expect, it } from 'vitest';
import { noteInOctave, noteName, octaveIndexOf, octaveTabLabel } from '../src/lib/notes';

describe('notes', () => {
  it('names notes per octave base', () => {
    expect(noteName(60, 'c1')).toBe('C4');
    expect(noteName(60, 'c2')).toBe('C3');
    expect(noteName(24, 'c1')).toBe('C1');
    expect(noteName(36, 'c1')).toBe('C2');
    expect(noteName(37, 'c1')).toBe('C#2');
  });

  it('picks note numbers independent of base', () => {
    expect(noteInOctave(3, 0)).toBe(48);
    expect(octaveIndexOf(48)).toBe(3);
    expect(octaveIndexOf(60)).toBe(4);
  });

  it('relabels tabs by base without changing the number', () => {
    expect(octaveTabLabel(4, 'c1')).toBe(4);
    expect(octaveTabLabel(4, 'c2')).toBe(3);
    expect(noteInOctave(4, 0)).toBe(60);
  });
});
