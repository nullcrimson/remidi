import { describe, expect, it } from 'vitest';
import type { Offered } from '../../src/convert/sourceOffer';
import { knows, lacks, misses } from '../../src/convert/sourceWords';
import { ENGLISH } from '../../src/locale/i18n';
import { typed } from '../typed';

const { t } = ENGLISH;
const NAMES: Record<string, string> = { general_midi: 'General MIDI', superior_drummer3: 'Superior Drummer 3' };
const nameOf = (id: string) => NAMES[id] ?? id;

const suggest = (missing: number, recognized: number, ask: Offered['ask'] = null) =>
  typed<Offered>({ kind: 'suggest', missing, hits: 53, engine: 'general_midi', recognized, ask, source: 'ggd_invasion' });
const target = (recognized: number) =>
  typed<Offered>({ kind: 'looksLikeTarget', missing: 53, hits: 53, target: 'superior_drummer3', recognized, ask: 'kickAndSnare', source: 'ggd_invasion' });

describe('the words about a source', () => {
  it('says the source knows none of the notes', () => {
    expect(t(misses(suggest(53, 53), 'GGD Invasion'))).toBe("GGD Invasion doesn't know any of the 53 notes in your file.");
  });

  it('says how many notes the source does not know', () => {
    expect(t(misses(suggest(7, 53), 'GGD Invasion'))).toBe("GGD Invasion doesn't know 7 of the 53 notes in your file.");
  });

  it('says what the source lacks when it misses some notes', () => {
    expect(t(lacks(suggest(20, 53, 'kick'), 'GGD Invasion'))).toBe("GGD Invasion finds no kick in your file and doesn't know 20 of its 53 notes.");
  });

  it('says only what the source misses when it misses every note', () => {
    expect(t(lacks(suggest(53, 53, 'kickAndSnare'), 'GGD Invasion'))).toBe("GGD Invasion doesn't know any of the 53 notes in your file.");
  });

  it('says the suggested engine knows every note', () => {
    expect(t(knows(suggest(53, 53), nameOf))).toBe('General MIDI knows every note.');
  });

  it('says how many notes the suggested engine knows', () => {
    expect(t(knows(suggest(53, 40), nameOf))).toBe('General MIDI knows 40 of them.');
  });

  it('says the file may already be in the target layout when the target knows every note', () => {
    expect(t(knows(target(53), nameOf))).toBe('Superior Drummer 3 knows every note: your file may already be in its layout.');
  });

  it('says the file may already be in the target layout when the target knows some notes', () => {
    expect(t(knows(target(50), nameOf))).toBe('Superior Drummer 3 knows 50 of them: your file may already be in its layout.');
  });
});
