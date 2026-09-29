import { errorDetail, errorMessage, toAppError, WasmCallError } from '../src/lib/errors';
import { ENGLISH } from '../src/i18n';

const { t } = ENGLISH;

describe('errors', () => {
  it('keeps the cause in the message of a WASM call error, for logs', () => {
    expect(new WasmCallError({ kind: 'badMidi', detail: 'invalid midi: truncated' }).message).toBe('badMidi: invalid midi: truncated');
    expect(new WasmCallError({ kind: 'unknownEngine', role: 'target', id: 'gone' }).message).toBe('unknownEngine: target gone');
  });

  it('keeps a WASM error as it is', () => {
    const e = new WasmCallError({ kind: 'badMidi', detail: 'invalid midi: truncated' });
    expect(toAppError(e)).toEqual({ kind: 'badMidi', detail: 'invalid midi: truncated' });
  });

  it('passes an error that already crossed a worker through unchanged', () => {
    expect(toAppError({ kind: 'badMidi', detail: 'x' })).toEqual({ kind: 'badMidi', detail: 'x' });
  });

  it('turns anything else into an internal error with its text', () => {
    expect(toAppError(new Error('boom'))).toEqual({ kind: 'internal', detail: 'boom' });
    expect(toAppError('plain')).toEqual({ kind: 'internal', detail: 'plain' });
    expect(toAppError({ weird: 1 })).toEqual({ kind: 'internal', detail: '[object Object]' });
    expect(toAppError({ kind: 'made-up' })).toEqual({ kind: 'internal', detail: '[object Object]' });
  });

  it('translates an error from its kind and fields', () => {
    expect(t(errorMessage({ kind: 'unknownEngine', role: 'target', id: 'gone' }))).toBe("Unknown target engine 'gone'");
    expect(t(errorMessage({ kind: 'wasmUnavailable', detail: 'x' }))).toBe('Failed to load converter');
  });

  it('keeps the technical detail apart from the message', () => {
    expect(errorDetail({ kind: 'badMidi', detail: 'x' })).toBe('x');
    expect(errorDetail({ kind: 'unknownEngine', role: 'target', id: 'gone' })).toBeNull();
  });
});
