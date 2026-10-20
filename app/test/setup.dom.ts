import '@testing-library/jest-dom/vitest';

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
HTMLElement.prototype.showPopover ??= function showPopover() {};
HTMLElement.prototype.hidePopover ??= function hidePopover() {};
Element.prototype.scrollIntoView ??= function scrollIntoView() {};

globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

const closedPopovers = document.createElement('style');
closedPopovers.textContent = `
  [popover]:not(:popover-open) { display: none; }
  details:not([open]) > :not(summary) { display: none; }
`;
document.head.append(closedPopovers);
