import { errorDetail, errorMessage, toAppError, WasmCallError } from '../../src/core/errors';
import { ENGLISH } from '../../src/locale/i18n';

const { t } = ENGLISH;

describe('errors', () => {
  it('keeps the detail in the message of a WASM call error, for logs', () => {
    expect(new WasmCallError({ kind: 'badMidi', detail: 'invalid midi: truncated' }).message).toBe('badMidi: invalid midi: truncated');
  });

  it('keeps the role and id in the message of an unknown engine error, for logs', () => {
    expect(new WasmCallError({ kind: 'unknownEngine', role: 'target', id: 'gone' }).message).toBe('unknownEngine: target gone');
  });

  it('keeps a WASM error as it is', () => {
    const e = new WasmCallError({ kind: 'badMidi', detail: 'invalid midi: truncated' });
    expect(toAppError(e)).toEqual({ kind: 'badMidi', detail: 'invalid midi: truncated' });
  });

  it('passes an error that already crossed a worker through unchanged', () => {
    expect(toAppError({ kind: 'badMidi', detail: 'x' })).toEqual({ kind: 'badMidi', detail: 'x' });
  });

  it('turns an Error into an internal error with its text', () => {
    expect(toAppError(new Error('boom'))).toEqual({ kind: 'internal', detail: 'boom' });
  });

  it('turns a string into an internal error with its text', () => {
    expect(toAppError('plain')).toEqual({ kind: 'internal', detail: 'plain' });
  });

  it('turns an unknown object into an internal error', () => {
    expect(toAppError({ weird: 1 })).toEqual({ kind: 'internal', detail: '[object Object]' });
  });

  it('turns an object of an unknown kind into an internal error', () => {
    expect(toAppError({ kind: 'made-up' })).toEqual({ kind: 'internal', detail: '[object Object]' });
  });

  it('translates an error from its kind and fields', () => {
    expect(t(errorMessage({ kind: 'unknownEngine', role: 'target', id: 'gone' }))).toBe("Unknown target engine 'gone'");
  });

  it('translates an error from its kind alone', () => {
    expect(t(errorMessage({ kind: 'wasmUnavailable', detail: 'x' }))).toBe('Failed to load converter');
  });

  it('keeps the technical detail apart from the message', () => {
    expect(errorDetail({ kind: 'badMidi', detail: 'x' })).toBe('x');
  });

  it('has no technical detail for an error without one', () => {
    expect(errorDetail({ kind: 'unknownEngine', role: 'target', id: 'gone' })).toBeNull();
  });
});
