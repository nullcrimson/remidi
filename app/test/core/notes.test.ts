import { describe, expect, it } from 'vitest';
import { note } from '../typed';
import { noteInOctave, noteName, octaveIndexOf, octaveTabLabel } from '../../src/core/notes';

describe('notes', () => {
  it('names notes in the c1 base', () => {
    expect(noteName(note(60), 'c1')).toBe('C4');
    expect(noteName(note(24), 'c1')).toBe('C1');
    expect(noteName(note(36), 'c1')).toBe('C2');
  });

  it('names notes in the c2 base', () => {
    expect(noteName(note(60), 'c2')).toBe('C3');
  });

  it('names sharps', () => {
    expect(noteName(note(37), 'c1')).toBe('C#2');
  });

  it('picks the note number of an octave independent of base', () => {
    expect(noteInOctave(3, 0)).toBe(48);
  });

  it('finds the octave of a note independent of base', () => {
    expect(octaveIndexOf(note(48))).toBe(3);
    expect(octaveIndexOf(note(60))).toBe(4);
  });

  it('relabels tabs by base', () => {
    expect(octaveTabLabel(4, 'c1')).toBe(4);
    expect(octaveTabLabel(4, 'c2')).toBe(3);
  });

  it('gives no label to an octave above the last note', () => {
    expect(octaveTabLabel(10, 'c1')).toBeNull();
  });

  it('labels the lowest octave with its negative number', () => {
    expect(octaveTabLabel(-1, 'c2')).toBe(-2);
  });
});
