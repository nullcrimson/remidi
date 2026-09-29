import type { WasmError } from '@wasm';
import type { Message } from '../generated/i18n';

/** A call into the WASM module failed; `error` says how. */
export class WasmCallError extends Error {
  constructor(readonly error: WasmError) {
    super(`${error.kind}: ${'detail' in error ? error.detail : `${error.role} ${error.id}`}`);
    this.name = 'WasmCallError';
  }
}

/** Every error the app shows: a WASM call's error, or the module failing to load. */
export type AppError = WasmError | { kind: 'wasmUnavailable'; detail: string };

const KINDS = {
  unknownEngine: true,
  badOverrides: true,
  badMissing: true,
  badChannel: true,
  badMidi: true,
  badPreset: true,
  internal: true,
} as const satisfies Record<WasmError['kind'], true>;

/** Whether `err` is a `WasmError`, as the module throws it or a worker passes it on. */
export function isWasmError(err: unknown): err is WasmError {
  return typeof err === 'object' && err !== null && 'kind' in err && Object.prototype.hasOwnProperty.call(KINDS, String(err.kind));
}

/** The one conversion from anything caught into an `AppError`. */
export function toAppError(err: unknown): AppError {
  if (err instanceof WasmCallError) return err.error;
  if (isWasmError(err)) return err;
  return { kind: 'internal', detail: err instanceof Error ? err.message : String(err) };
}

/** The WASM module could not load; `err` is why. */
export function wasmUnavailable(err: unknown): AppError {
  return { kind: 'wasmUnavailable', detail: err instanceof Error ? err.message : String(err) };
}

export function errorMessage(e: AppError): Message {
  switch (e.kind) {
    case 'unknownEngine': return { id: 'error-unknown-engine', args: { role: e.role, id: e.id } };
    case 'badMidi': return { id: 'error-bad-midi' };
    case 'badPreset': return { id: 'error-bad-preset' };
    case 'badOverrides': return { id: 'error-bad-overrides' };
    case 'badMissing': return { id: 'error-bad-missing' };
    case 'badChannel': return { id: 'error-bad-channel' };
    case 'internal': return { id: 'error-internal' };
    case 'wasmUnavailable': return { id: 'error-wasm-unavailable' };
  }
}

/** The untranslated technical cause, when there is one. */
export function errorDetail(e: AppError): string | null {
  return 'detail' in e ? e.detail : null;
}
