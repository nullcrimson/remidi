import '@testing-library/jest-dom/vitest';

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
HTMLElement.prototype.showPopover ??= function showPopover() {};
HTMLElement.prototype.hidePopover ??= function hidePopover() {};

globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
