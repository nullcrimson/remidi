type StatEvent
  = | 'midi-added'
    | 'converted'
    | 'convert-failed'
    | 'downloaded'
    | 'editor-opened'
    | 'preset-saved'
    | 'preset-loaded'
    | 'preset-imported';

type StatProps = Record<string, string | number | boolean>;

declare global {
  interface Window {
    umami?: { track: (event: string, props?: StatProps) => void };
  }
}

/** Counts `event` in Umami; does nothing when its script is absent, blocked or off-domain. */
export function track(event: StatEvent, props?: StatProps): void {
  window.umami?.track(event, props);
}
