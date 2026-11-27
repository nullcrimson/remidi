import { useSyncExternalStore } from 'react';
import { track } from '../core/stats';
import type { TipAfter } from '../core/umami';
import { askAfterDownload } from './tipAsk';

/** A tip ask on screen: the element that had focus when the download raised it, to take focus back on close. */
export interface TipAsked {
  opener: HTMLElement | null;
}

let asked: TipAsked | null = null;
const listeners = new Set<() => void>();

function publish(next: TipAsked | null): void {
  asked = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Counts a download the visitor keeps from the converter and, when `askAfterDownload` says so,
 * puts the tip ask on screen and counts it once, naming the download that raised it.
 */
export function noteDownload(after: TipAfter): void {
  if (!askAfterDownload()) return;
  track('tip-asked', { after, page: 'converter' });
  publish({ opener: document.activeElement instanceof HTMLElement ? document.activeElement : null });
}

/** Takes the tip ask off the screen. */
export function closeTipAsk(): void {
  publish(null);
}

/** The tip ask on screen, or null. */
export function useTipAsked(): TipAsked | null {
  return useSyncExternalStore(subscribe, () => asked);
}
