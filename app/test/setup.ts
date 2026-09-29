import '@testing-library/jest-dom/vitest';
import { beforeEach, vi } from 'vitest';
import enFtl from '../../locales/en/app.ftl?raw';
import { MESSAGE_IDS } from '../src/generated/i18n';
import { initForTests } from '../src/i18n';

initForTests(enFtl, MESSAGE_IDS);

globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
globalThis.URL.revokeObjectURL = vi.fn();

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

class MemoryStorage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null;
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  value: new MemoryStorage() as unknown as Storage,
  writable: true,
  configurable: true,
});

beforeEach(() => localStorage.clear());
