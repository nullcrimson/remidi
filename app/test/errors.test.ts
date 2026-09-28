import { describe, expect, it } from 'vitest';
import { errorMessage } from '../src/lib/errors';
import { WasmCallError } from '../src/lib/midiremap';

describe('errorMessage', () => {
  it('gives an error’s message without its class name', () => {
    const err = new WasmCallError({ kind: 'badMidi', message: 'MIDI parse error: not a midi file', id: null });
    expect(errorMessage(err)).toBe('MIDI parse error: not a midi file');
    expect(errorMessage(new Error('wasm fetch failed'))).toBe('wasm fetch failed');
  });

  it('prints anything else thrown as text', () => {
    expect(errorMessage('boom')).toBe('boom');
    expect(errorMessage(42)).toBe('42');
  });
});
