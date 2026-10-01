/** The anonymous usage events the app counts; no file names or contents ever go with them. */
export type StatEvent
  = | 'midi-added'
    | 'converted'
    | 'convert-failed'
    | 'downloaded'
    | 'editor-opened'
    | 'preset-saved'
    | 'preset-loaded'
    | 'preset-imported';

export type StatProps = Record<string, string | number | boolean>;

declare global {
  interface Window {
    umami?: { track: (event: string, props?: StatProps) => void };
  }
}

/** Counts `event` in Umami; does nothing when its script is absent, blocked or off-domain. */
export function track(event: StatEvent, props?: StatProps): void {
  window.umami?.track(event, props);
}
